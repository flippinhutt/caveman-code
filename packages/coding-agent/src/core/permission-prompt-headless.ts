/**
 * Non-interactive PromptUI for `cave -p` / `cave exec` / RPC modes.
 *
 * When the agent has no TUI to host an overlay, this UI returns the policy
 * reducer's default verb and writes a one-line audit record to stderr so the
 * user can grep the run log later. It NEVER prompts and NEVER blocks.
 */

import type { PromptOptions, PromptUI } from "./permission-prompt.js";
import type { PromptVerb } from "@cave/agent";

export class HeadlessPromptUI implements PromptUI {
	constructor(private readonly stderr: NodeJS.WritableStream = process.stderr) {}

	async chooseVerb(opts: PromptOptions): Promise<PromptVerb> {
		const line = `[permission] auto-${opts.defaultVerb}: ${opts.summary}`;
		this.stderr.write(`${line}\n`);
		return opts.defaultVerb;
	}
}
