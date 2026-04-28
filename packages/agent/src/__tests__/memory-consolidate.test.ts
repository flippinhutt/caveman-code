// Tests for cave's episodic→semantic consolidation pass.

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { clusterObservations, consolidate, jaccard, tokenize } from "../memory/consolidate.js";
import { FilesProvider } from "../memory/files.js";
import type { MemoryObservation } from "../memory/provider.js";

function obs(id: number, content: string): MemoryObservation {
	return { id, kind: "episodic", content, session_id: "s1", ts: `2026-04-28T00:00:0${id}Z` };
}

describe("consolidation pass", () => {
	it("tokenize strips stopwords and short tokens", () => {
		const t = tokenize("the agent ran biome on packages/agent/src/index.ts");
		expect(t.has("the")).toBe(false);
		expect(t.has("agent")).toBe(true);
		expect(t.has("biome")).toBe(true);
		expect(t.has("packages/agent/src/index.ts")).toBe(true);
	});

	it("jaccard returns 0 when there's no overlap", () => {
		expect(jaccard(new Set(["a"]), new Set(["b"]))).toBe(0);
	});

	it("jaccard returns 1 for identical token sets", () => {
		expect(jaccard(new Set(["a", "b"]), new Set(["a", "b"]))).toBe(1);
	});

	it("clusterObservations groups by token Jaccard", () => {
		const clusters = clusterObservations(
			[
				obs(1, "biome lint failed packages/agent/src/index.ts"),
				obs(2, "biome lint passed packages/agent/src/index.ts"),
				obs(3, "vitest run failed packages/coding-agent unit tests"),
				obs(4, "user updated readme docs"),
			],
			0.18,
		);
		// Biome obs 1+2 should cluster, vitest obs 3 stands alone, readme stands alone.
		const sizes = clusters.map((c) => c.observationIds.length).sort();
		expect(sizes).toContain(2);
		expect(clusters.some((c) => c.observationIds.includes(1) && c.observationIds.includes(2))).toBe(true);
	});

	it("consolidate(no extractor) returns clusters and writes nothing", async () => {
		const dir = mkdtempSync(join(tmpdir(), "cave-consolidate-noex-"));
		try {
			const provider = new FilesProvider({ memoryDir: dir });
			const result = await consolidate(provider, [
				obs(1, "alpha bravo charlie delta"),
				obs(2, "alpha bravo charlie echo"),
				obs(3, "completely different topic uvwxyz"),
			]);
			expect(result.facts).toEqual([]);
			expect(result.written).toBe(0);
			// Cluster of size 2 should still be present.
			expect(result.clusters.some((c) => c.observationIds.length === 2)).toBe(true);
			expect(provider.stats().entries).toBe(0);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("consolidate writes facts back to the provider with provenance", async () => {
		const dir = mkdtempSync(join(tmpdir(), "cave-consolidate-write-"));
		try {
			const provider = new FilesProvider({ memoryDir: dir });
			const extractor = vi.fn(async (cluster: { observationIds: number[]; topic: string }) => [
				{
					content: `Lesson: prefer biome over eslint (${cluster.topic})`,
					kind: "semantic" as const,
					provenance: cluster.observationIds,
				},
			]);
			const observations = [
				obs(1, "biome lint passed packages/agent index.ts"),
				obs(2, "biome lint passed packages/agent skills.ts"),
				obs(3, "biome lint passed packages/agent client.ts"),
			];
			const result = await consolidate(provider, observations, { extractor, minClusterSize: 2 });
			expect(result.facts.length).toBeGreaterThan(0);
			expect(result.facts[0].kind).toBe("semantic");
			expect(result.facts[0].provenance.length).toBeGreaterThan(0);
			expect(result.written).toBe(result.facts.length);
			// A semantic observation should now exist in the files store.
			const stats = provider.stats();
			expect(stats.entries).toBe(result.written);
			expect(extractor).toHaveBeenCalled();
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("consolidate keeps going when one extractor invocation throws", async () => {
		const dir = mkdtempSync(join(tmpdir(), "cave-consolidate-flaky-"));
		try {
			const provider = new FilesProvider({ memoryDir: dir });
			let calls = 0;
			const extractor = vi.fn(async (cluster: { observationIds: number[]; topic: string }) => {
				calls++;
				if (calls === 1) throw new Error("LLM hiccup");
				return [
					{
						content: `cluster ${calls}`,
						kind: "semantic" as const,
						provenance: cluster.observationIds,
					},
				];
			});
			const observations = [
				obs(1, "alpha alpha alpha"),
				obs(2, "alpha alpha alpha"),
				obs(3, "bravo bravo bravo"),
				obs(4, "bravo bravo bravo"),
			];
			const result = await consolidate(provider, observations, {
				extractor,
				minClusterSize: 2,
				threshold: 0.05,
			});
			expect(result.clusters.length).toBeGreaterThanOrEqual(2);
			// Despite the throw, at least one fact landed.
			expect(result.facts.length).toBeGreaterThan(0);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});
