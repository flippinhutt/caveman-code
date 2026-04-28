// Tests for the FilesProvider memory fallback.

import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { discoverFilesProviderReadDirs, FilesProvider } from "../memory/files.js";

describe("FilesProvider", () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "cave-memfiles-"));
	});

	afterEach(() => {
		try {
			rmSync(dir, { recursive: true, force: true });
		} catch {
			/* ignore */
		}
	});

	it("is always available (passive backend)", async () => {
		const p = new FilesProvider({ memoryDir: dir });
		expect(await p.isAvailable()).toBe(true);
	});

	it("save persists a body and updates the index", async () => {
		const p = new FilesProvider({ memoryDir: dir });
		const id = await p.save("first observation", "episodic", { session_id: "s1" });
		expect(id).toBe(1);
		const id2 = await p.save("second observation", "episodic", { session_id: "s1" });
		expect(id2).toBe(2);
		expect(existsSync(join(dir, "1.md"))).toBe(true);
		expect(existsSync(join(dir, "index.json"))).toBe(true);
		expect(p.stats().entries).toBe(2);
	});

	it("search finds substring matches and respects limit", async () => {
		const p = new FilesProvider({ memoryDir: dir });
		await p.save("alpha bravo charlie", "episodic", { session_id: "s1" });
		await p.save("delta echo foxtrot", "episodic", { session_id: "s1" });
		await p.save("alpha kilo", "episodic", { session_id: "s2" });

		const hits = await p.search("alpha", { limit: 5 });
		expect(hits.length).toBe(2);
		expect(hits.every((h) => h.preview?.toLowerCase().includes("alpha"))).toBe(true);

		const limited = await p.search("alpha", { limit: 1 });
		expect(limited.length).toBe(1);
	});

	it("getObservations returns full bodies for known ids", async () => {
		const p = new FilesProvider({ memoryDir: dir });
		const id = await p.save("an observation body", "episodic", { session_id: "s1" });
		expect(id).toBeDefined();
		const obs = await p.getObservations([id as number]);
		expect(obs).toHaveLength(1);
		expect(obs[0].content.trim()).toContain("an observation body");
		expect(obs[0].kind).toBe("episodic");
	});

	it("forget removes an entry from the index but keeps a backup body", async () => {
		const p = new FilesProvider({ memoryDir: dir });
		const id = await p.save("ephemeral note", "episodic");
		expect(id).toBeDefined();
		const removed = await p.forget([id as number]);
		expect(removed).toBe(1);
		expect(p.stats().entries).toBe(0);
		expect(existsSync(join(dir, `${id}.md.deleted`))).toBe(true);
	});

	it("export writes JSONL the same shape we'd ship to cavemem", async () => {
		const p = new FilesProvider({ memoryDir: dir });
		await p.save("first", "episodic");
		await p.save("second", "episodic");
		const out = join(dir, "export.jsonl");
		const r = await p.export(out);
		expect(r.ok).toBe(true);
		const lines = readFileSync(out, "utf-8").trim().split("\n");
		expect(lines).toHaveLength(2);
		const parsed = lines.map((l) => JSON.parse(l));
		expect(parsed[0]).toHaveProperty("id");
		expect(parsed[0]).toHaveProperty("content");
	});

	it("listSessions surfaces unique session ids", async () => {
		const p = new FilesProvider({ memoryDir: dir });
		await p.save("a", "episodic", { session_id: "s1" });
		await p.save("b", "episodic", { session_id: "s2" });
		await p.save("c", "episodic", { session_id: "s1" });
		const sessions = await p.listSessions();
		const ids = sessions.map((s) => s.id).sort();
		expect(ids).toEqual(["s1", "s2"]);
	});

	it("dispatchHook is a no-op for the files provider (best-effort)", async () => {
		const p = new FilesProvider({ memoryDir: dir });
		await expect(p.dispatchHook("post-tool-use", { session_id: "s1" })).resolves.toBeUndefined();
	});

	it("readOnly mode swallows writes", async () => {
		const p = new FilesProvider({ memoryDir: dir, readOnly: true });
		const id = await p.save("noop", "episodic");
		expect(id).toBeUndefined();
		expect(existsSync(join(dir, "index.json"))).toBe(false);
	});

	it("discoverFilesProviderReadDirs only returns existing dirs", () => {
		const cwd = mkdtempSync(join(tmpdir(), "cave-discover-"));
		try {
			expect(discoverFilesProviderReadDirs(cwd)).toEqual([]);
		} finally {
			rmSync(cwd, { recursive: true, force: true });
		}
	});
});
