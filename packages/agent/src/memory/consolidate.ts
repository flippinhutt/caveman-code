/**
 * Episodic → Semantic consolidation pass (cave's value-add over cavemem).
 *
 * Takes a batch of observations from the active provider, clusters them by
 * topic with a deterministic local algorithm, and (optionally) asks an LLM to
 * extract semantic facts which are written back as `kind:semantic` with
 * provenance ids pointing to the source observations.
 *
 * Why not push this upstream? It's a *policy* layer — when to consolidate,
 * which model to use, what counts as a topic. Cavemem is the storage layer
 * (writes, embeddings, FTS). Cave owns the policy.
 *
 * The clustering is intentionally simple (token Jaccard over a stop-list-
 * stripped bag of words). It is deterministic, has no dependencies, and
 * matches well enough on coding-agent transcripts that the LLM stage carries
 * the rest of the load. We expose `clusterObservations()` separately so the
 * `/memory consolidate` command can show clusters before the user pays for
 * the LLM call.
 */

import type { ConsolidationCluster, ConsolidationOutput, MemoryObservation, MemoryProvider } from "./provider.js";

/** Function used to extract semantic facts from a cluster. Pluggable for tests. */
export type SemanticExtractor = (cluster: ConsolidationCluster) => Promise<ConsolidationOutput[]>;

export interface ConsolidateOptions {
	/** Min observations per cluster before we bother extracting facts. */
	minClusterSize?: number;
	/** Cap on number of clusters returned. */
	maxClusters?: number;
	/** Jaccard threshold for greedy single-link clustering [0..1]. */
	threshold?: number;
	/** LLM-backed extractor. If omitted, returns clusters but writes nothing. */
	extractor?: SemanticExtractor;
	/**
	 * If true, write facts back to the provider via save({ kind: "semantic" }).
	 * Default true when extractor is supplied.
	 */
	writeBack?: boolean;
}

export interface ConsolidateResult {
	clusters: ConsolidationCluster[];
	facts: ConsolidationOutput[];
	written: number;
}

const STOPWORDS = new Set([
	"the",
	"a",
	"an",
	"and",
	"or",
	"but",
	"to",
	"of",
	"in",
	"on",
	"at",
	"for",
	"with",
	"by",
	"is",
	"was",
	"were",
	"be",
	"been",
	"being",
	"this",
	"that",
	"these",
	"those",
	"it",
	"its",
	"as",
	"if",
	"so",
	"do",
	"does",
	"did",
	"have",
	"has",
	"had",
	"i",
	"you",
	"he",
	"she",
	"we",
	"they",
	"them",
	"his",
	"her",
	"our",
	"their",
	"my",
	"your",
	"me",
	"us",
	"about",
	"into",
	"from",
	"will",
	"can",
	"could",
	"should",
	"would",
	"may",
	"might",
	"just",
	"not",
	"no",
	"yes",
]);

export function tokenize(text: string): Set<string> {
	const out = new Set<string>();
	for (const tok of text.toLowerCase().split(/[^a-z0-9_/.@-]+/g)) {
		if (!tok || tok.length < 3) continue;
		if (STOPWORDS.has(tok)) continue;
		out.add(tok);
	}
	return out;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
	if (a.size === 0 && b.size === 0) return 0;
	let inter = 0;
	for (const t of a) if (b.has(t)) inter++;
	const union = a.size + b.size - inter;
	return union === 0 ? 0 : inter / union;
}

/**
 * Greedy single-link clustering by token Jaccard. Deterministic; merges any
 * pair whose similarity ≥ threshold. Topic name is the most frequent token
 * across the cluster.
 */
export function clusterObservations(observations: MemoryObservation[], threshold = 0.18): ConsolidationCluster[] {
	const items = observations.map((o) => ({
		obs: o,
		tokens: tokenize(o.content),
	}));

	const clusters: Array<{ obs: MemoryObservation[]; tokens: Set<string> }> = [];
	for (const item of items) {
		if (item.tokens.size === 0) continue;
		let placed = false;
		for (const c of clusters) {
			if (jaccard(item.tokens, c.tokens) >= threshold) {
				c.obs.push(item.obs);
				for (const t of item.tokens) c.tokens.add(t);
				placed = true;
				break;
			}
		}
		if (!placed) {
			clusters.push({ obs: [item.obs], tokens: new Set(item.tokens) });
		}
	}

	return clusters.map((c) => ({
		topic: pickTopic(c.tokens, c.obs),
		observationIds: c.obs.map((o) => o.id),
		previews: c.obs.map((o) => o.content.split("\n", 1)[0]?.slice(0, 200) ?? ""),
	}));
}

function pickTopic(tokens: Set<string>, obs: MemoryObservation[]): string {
	if (tokens.size === 0) return obs[0]?.content.slice(0, 32) ?? "topic";
	// Weight: token frequency across observations.
	const freq = new Map<string, number>();
	for (const o of obs) {
		for (const t of tokenize(o.content)) {
			freq.set(t, (freq.get(t) ?? 0) + 1);
		}
	}
	let best = "";
	let bestScore = -1;
	for (const [tok, score] of freq) {
		// Bias toward tokens that appear in multiple observations and are
		// reasonably distinctive (length > 4).
		const adjusted = score + (tok.length > 5 ? 0.5 : 0);
		if (adjusted > bestScore) {
			bestScore = adjusted;
			best = tok;
		}
	}
	return best || obs[0]?.content.slice(0, 32) || "topic";
}

/**
 * Run the full consolidation pass: cluster → extract facts → write back.
 * Safe to call without an extractor (just returns clusters).
 */
export async function consolidate(
	provider: MemoryProvider,
	observations: MemoryObservation[],
	options: ConsolidateOptions = {},
): Promise<ConsolidateResult> {
	const minClusterSize = Math.max(1, options.minClusterSize ?? 2);
	const maxClusters = Math.max(1, options.maxClusters ?? 8);
	const threshold = options.threshold ?? 0.18;

	const clusters = clusterObservations(observations, threshold)
		.filter((c) => c.observationIds.length >= minClusterSize)
		.slice(0, maxClusters);

	if (!options.extractor) {
		return { clusters, facts: [], written: 0 };
	}

	const facts: ConsolidationOutput[] = [];
	for (const c of clusters) {
		try {
			const got = await options.extractor(c);
			for (const f of got) {
				facts.push({
					content: f.content,
					kind: "semantic",
					provenance: f.provenance.length > 0 ? f.provenance : c.observationIds,
					metadata: { topic: c.topic, ...(f.metadata ?? {}) },
				});
			}
		} catch {
			// One cluster failing must not abort the rest.
		}
	}

	let written = 0;
	if (facts.length > 0 && (options.writeBack ?? true)) {
		for (const f of facts) {
			try {
				await provider.save(f.content, "semantic", { provenance: f.provenance, ...(f.metadata ?? {}) });
				written++;
			} catch {
				// Provider may be read-only or temporarily unavailable.
			}
		}
	}

	return { clusters, facts, written };
}
