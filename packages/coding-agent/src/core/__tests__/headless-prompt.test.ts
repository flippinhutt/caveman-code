import { describe, expect, it } from "vitest";
import { HeadlessPromptUI } from "../permission-prompt-headless.js";

describe("HeadlessPromptUI", () => {
	it("returns the reducer's default verb without blocking", async () => {
		const lines: string[] = [];
		const stub = {
			write(line: string | Buffer): boolean {
				lines.push(typeof line === "string" ? line : line.toString());
				return true;
			},
		} as unknown as NodeJS.WritableStream;

		const ui = new HeadlessPromptUI(stub);
		const verb = await ui.chooseVerb({
			summary: "Run `git status`",
			defaultVerb: "allow_once",
			allowAlwaysKey: "bash:git status",
		});

		expect(verb).toBe("allow_once");
		expect(lines).toHaveLength(1);
		expect(lines[0]).toContain("[permission] auto-allow_once");
		expect(lines[0]).toContain("Run `git status`");
	});

	it("returns deny when the reducer recommends deny", async () => {
		const ui = new HeadlessPromptUI({ write: () => true } as any);
		const verb = await ui.chooseVerb({
			summary: "Network call to evil.com",
			defaultVerb: "deny",
			allowAlwaysKey: "net:evil.com",
		});
		expect(verb).toBe("deny");
	});
});
