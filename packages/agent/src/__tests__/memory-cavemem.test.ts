// Tests for CavememProvider — verifies hook dispatch via subprocess and MCP
// reads via a stub hub. We never actually spawn cavemem; spawn is mocked.

import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type CavememHubLike, CavememProvider, formatPrelude } from "../memory/cavemem.js";
import { MemoryUnavailableError } from "../memory/provider.js";

class FakeChild extends EventEmitter {
	stdin = { write: vi.fn(), end: vi.fn() };
	stdout = new EventEmitter();
	stderr = new EventEmitter();
	kill = vi.fn();
}

interface FakeSpawnCall {
	bin: string;
	args: string[];
	env?: Record<string, string>;
	stdinChunks: string[];
}

function makeFakeSpawn(exitCode = 0, stdoutText = "", stderrText = "", calls: FakeSpawnCall[] = []) {
	return ((bin: string, args: string[], opts: any) => {
		const child = new FakeChild();
		const call: FakeSpawnCall = {
			bin,
			args,
			env: opts?.env,
			stdinChunks: [],
		};
		calls.push(call);
		child.stdin.write = vi.fn((chunk: string) => {
			call.stdinChunks.push(String(chunk));
			return true;
		}) as any;
		setImmediate(() => {
			if (stdoutText) child.stdout.emit("data", Buffer.from(stdoutText));
			if (stderrText) child.stderr.emit("data", Buffer.from(stderrText));
			child.emit("close", exitCode);
		});
		return child as unknown as ReturnType<typeof import("node:child_process").spawn>;
	}) as unknown as typeof import("node:child_process").spawn;
}

class StubHub implements CavememHubLike {
	servers = new Set<string>();
	calls: Array<{ name: string; args: unknown }> = [];
	constructor(private readonly responder: (tool: string, args: unknown) => unknown) {}

	listServers(): string[] {
		return [...this.servers];
	}

	addServer(config: { name: string }): void {
		this.servers.add(config.name);
	}

	async connect(_name: string): Promise<void> {
		// no-op
	}

	async callNamespaced(name: string, args: unknown): Promise<unknown> {
		this.calls.push({ name, args });
		const tool = name.replace(/^mcp__cavemem__/, "");
		return this.responder(tool, args);
	}
}

function mcpJson(payload: unknown) {
	return { content: [{ type: "text", text: JSON.stringify(payload) }] };
}

describe("CavememProvider", () => {
	let calls: FakeSpawnCall[];

	beforeEach(() => {
		calls = [];
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("isAvailable returns true on cavemem --version exit 0", async () => {
		const p = new CavememProvider({
			binary: "cavemem",
			spawnImpl: makeFakeSpawn(0, "cavemem 0.1.3\n", "", calls),
		});
		expect(await p.isAvailable()).toBe(true);
		expect(calls[0]?.args).toEqual(["--version"]);
	});

	it("isAvailable returns false when cavemem missing (exit 127)", async () => {
		const p = new CavememProvider({
			binary: "no-cavemem-here",
			spawnImpl: makeFakeSpawn(127, "", "command not found", calls),
		});
		expect(await p.isAvailable()).toBe(false);
	});

	it("dispatchHook spawns `cavemem hook run <event> --ide cave` with JSON stdin", async () => {
		const p = new CavememProvider({
			spawnImpl: makeFakeSpawn(0, "", "", calls),
		});
		await p.dispatchHook("session-start", { session_id: "abc" });
		expect(calls).toHaveLength(1);
		expect(calls[0].args).toEqual(["hook", "run", "session-start", "--ide", "cave"]);
		expect(calls[0].stdinChunks.join("")).toContain('"session_id":"abc"');
	});

	it("registerOnHub is idempotent and uses the canonical server name", () => {
		const hub = new StubHub(() => mcpJson([]));
		const p = new CavememProvider({ hub });
		p.registerOnHub(hub);
		p.registerOnHub(hub);
		expect(hub.listServers()).toEqual([p.serverName]);
	});

	it("search returns parsed hits", async () => {
		const hub = new StubHub((tool, _args) => {
			expect(tool).toBe("search");
			return mcpJson([
				{ id: 1, kind: "episodic", ts: "2026-04-28T00:00:00Z", preview: "alpha", session_id: "s1" },
				{ id: 2, kind: "semantic", ts: "2026-04-27T00:00:00Z", preview: "bravo", session_id: "s2" },
			]);
		});
		const p = new CavememProvider({ hub });
		const hits = await p.search("alpha", { limit: 5 });
		expect(hits).toHaveLength(2);
		expect(hits[0]).toMatchObject({ id: 1, kind: "episodic", preview: "alpha" });
	});

	it("getObservations parses content out of mcp text frames", async () => {
		const hub = new StubHub((tool, args) => {
			expect(tool).toBe("get_observations");
			expect((args as any).ids).toEqual([7]);
			return mcpJson([
				{ id: 7, kind: "semantic", ts: "2026-04-28T00:00:00Z", content: "fact body", session_id: "s1" },
			]);
		});
		const p = new CavememProvider({ hub });
		const obs = await p.getObservations([7]);
		expect(obs).toHaveLength(1);
		expect(obs[0].content).toBe("fact body");
		expect(obs[0].kind).toBe("semantic");
	});

	it("listSessions parses session metadata", async () => {
		const hub = new StubHub(() =>
			mcpJson([{ id: "sess-1", ide: "cave", cwd: "/tmp/x", started_at: "2026-04-28T00:00:00Z", ended_at: null }]),
		);
		const p = new CavememProvider({ hub });
		const sessions = await p.listSessions({ limit: 3 });
		expect(sessions).toHaveLength(1);
		expect(sessions[0]).toMatchObject({ id: "sess-1", ide: "cave" });
	});

	it("throws MemoryUnavailableError when no hub is wired and a read is requested", async () => {
		const p = new CavememProvider({}); // no hub
		await expect(p.search("x")).rejects.toBeInstanceOf(MemoryUnavailableError);
	});

	it("save delegates through user-prompt-submit hook", async () => {
		const p = new CavememProvider({
			spawnImpl: makeFakeSpawn(0, "", "", calls),
		});
		await p.save("a fact", "fact", { session_id: "s99" });
		expect(calls).toHaveLength(1);
		expect(calls[0].args).toEqual(["hook", "run", "user-prompt-submit", "--ide", "cave"]);
		const stdin = calls[0].stdinChunks.join("");
		expect(stdin).toContain('"content":"a fact"');
		expect(stdin).toContain('"kind":"fact"');
	});

	it("formatPrelude composes a compact memory snippet", () => {
		const out = formatPrelude([
			{ id: 1, kind: "episodic", preview: "did the thing" },
			{ id: 2, kind: "semantic", preview: "established the fact" },
		]);
		expect(out).toContain("[memory]");
		expect(out).toContain("#1");
		expect(out).toContain("did the thing");
	});

	it("formatPrelude returns empty string when there are no hits", () => {
		expect(formatPrelude([])).toBe("");
	});
});
