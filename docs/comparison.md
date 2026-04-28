---
title: Cave vs the field
description: Feature-by-feature comparison of Cave with Claude Code, Codex, Aider, Crush, and opencode.
---

# Cave vs Claude Code, Codex, Aider, Crush, opencode

This is the comparison table from the v2 master plan, kept current as features land. The pitch is short:

> **Cave is the only terminal coding agent that beats Claude Code on cost, Aider on context selection, Codex on provider flexibility, and opencode on session UX — in a single MIT-licensed binary.**

<CopyForLlms />

## Capabilities

| Axis | Cave v2 | Claude Code | Codex | Aider | Crush | opencode |
|---|---|---|---|---|---|---|
| Token compression (3-layer Cave Mode) | yes (unique) | no | no | repo map only | no | no |
| 20+ provider OAuth (Claude Pro / ChatGPT / Copilot / Gemini) | yes (unique) | Anthropic only | ChatGPT only | env keys only | subset | env keys |
| Session branching + fork | yes | no | fork only | git only | no | no |
| Native MCP | yes | yes | yes | no | yes | yes |
| Native sandbox | yes | partial | yes (best-in-class) | no | partial | partial |
| Plan mode | yes | yes | yes | architect | no | yes |
| Repo map (PageRank) | yes | no | no | yes (best-in-class) | no | no |
| Edit-format-per-model | yes | no | no | yes (best-in-class) | no | no |
| Worktree-isolated subagents | yes | yes | yes | no | no | no |
| Daemon / multi-client | yes | no | yes (app-server) | no | no | yes (best-in-class) |
| Shadow-git checkpoints + `/rollback N` | yes | no | no | git only | no | no |
| Containerized parallel sessions | yes | no | no | no | no | no |
| Cost transparency (per-msg $) | yes | partial | partial | yes (best-in-class) | no | no |
| MIT open source | yes | closed | Apache | Apache | FSL | MIT |

## Where each agent shines

- **Claude Code** — first-party Anthropic, opinionated UX, polished out-of-box. Best if you only use Claude and don't care about cost.
- **Codex** — OpenAI's terminal agent. Excellent sandbox primitive ("sandbox-as-utility"). Single-vendor by design.
- **Aider** — pioneer of repo map + edit-format-per-model. Strongest at large-codebase context selection. Less ergonomic interactive UX.
- **Crush** — fast, polished TUI (Charm). Mid-session model swap. Smaller ecosystem.
- **opencode** — strong daemon / multi-client story. Newer; ecosystem still maturing.
- **Cave** — borrows the best of all five and adds **Cave Mode compression** + **20+ provider OAuth** as native, unique differentiators.

## Cost — the headline

A 30-turn session against a 100k-token repo, identical task, identical model (Sonnet 4):

| Agent | Tokens consumed | Cost |
|---|---|---|
| Claude Code | ~2,353,000 | $7.35 |
| Codex | ~1,348,000 | $3.37 |
| **Cave** | **~59,000** | **$0.07** |

Reproduce: `npm run bench:offline` (no API key, runs in &lt;1s) and `npm run bench:replay` (analyzes your real sessions).

The Cave Mode compression numbers are conservative — typical sessions land between 25× and 50× lower than Claude Code depending on tool-call volume.

## Format compatibility

Cave is a **superset** of Claude Code's authoring formats. Concretely, you can paste these directly into `~/.cave/`:

- `~/.claude/settings.json` → `~/.cave/settings.json` (hooks, permissions, statusLine identical schema)
- `~/.claude/commands/*.md` → `~/.cave/commands/*.md`
- `~/.claude/skills/<name>/SKILL.md` → `~/.cave/skills/<name>/SKILL.md`
- `~/.claude/agents/<name>.md` → `~/.cave/agents/<name>.md`
- `.mcp.json` (Codex / Claude Code standard) is read at the project root

See [migration from Claude Code](/migration/from-claude-code) for the step-by-step.

## Caveat — these comparisons evolve

Claude Code, Codex, Crush, and opencode all iterate weekly. We pin our compatibility target to **Claude Code v2.1.119 schemas** with a CI delta check; tracking the others is best-effort. If you spot drift, [open an issue](https://github.com/JuliusBrussee/caveman-cli/issues/new?labels=docs).
