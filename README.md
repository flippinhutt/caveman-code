<h1 align="center">Cave</h1>

<p align="center">
<strong>Same work. 40× fewer tokens.</strong><br/>
The terminal coding agent that compresses every layer — prompts, tool output, file reads, structured data.<br/>
20+ provider OAuth. Plan mode. Subagents. MCP. MIT.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/cave"><img src="https://img.shields.io/npm/v/cave?color=blue&label=npm" alt="npm version" /></a>
  <a href="https://github.com/JuliusBrussee/caveman-cli/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen" alt="Node.js 20+" /></a>
  <a href="https://discord.gg/cave-cli"><img src="https://img.shields.io/badge/discord-join-5865F2" alt="Discord" /></a>
  <a href="https://cave.sh/docs"><img src="https://img.shields.io/badge/docs-cave.sh%2Fdocs-d97757" alt="Docs" /></a>
</p>

<p align="center">
  <img src="vhs/install.gif" width="720" alt="cave install + first prompt — 30 seconds" />
</p>

```
  Tokens per resolved task

  cave         ▏ 59k · $0.07            ← you are here
  Codex        █████████████████████████████ 1,348k · $3.37
  Claude Code  ██████████████████████████████████████████████████ 2,353k · $7.35
```

> **23×** fewer tokens than Codex. **40×** fewer than Claude Code. **105×** cheaper per resolved task.
> Cave MicroBench vs published SWE-bench baselines — different task sets.
> **[Full eval methodology + reproduce every number →](research/README.md)**

---

## Install

```bash
curl -fsSL https://cave.sh/install | bash
```

That's the canonical install. Authenticate, then go:

```bash
export ANTHROPIC_API_KEY=sk-ant-...    # or any other supported provider
cave                                    # or: cave "explain this codebase"
```

<details>
<summary><strong>Other install paths</strong> — Homebrew, npm, Docker, Windows, manual</summary>

```bash
# Homebrew (macOS / Linux)
brew tap juliusbrussee/cave https://github.com/JuliusBrussee/caveman-cli && brew install cave

# npm (any platform with Node 20+)
npm install -g cave

# Docker
docker run --rm -it -v "$PWD:/work" ghcr.io/juliusbrussee/caveman-cli:latest

# Windows (PowerShell)
irm https://cave.sh/install.ps1 | iex
```

Auto-update channels (`stable`, `beta`, `canary`) and headless / CI install: see [docs/getting-started/installation](https://cave.sh/docs/getting-started/installation).

</details>

---

## I want to…

| Goal | Where to look |
|---|---|
| Try cave right now | [Quickstart](https://cave.sh/docs/getting-started/quickstart) |
| Migrate from Claude Code (zero-migration: paste your config) | [Migration guide](https://cave.sh/docs/migration/from-claude-code) |
| Migrate from Codex | [Codex migration](https://cave.sh/docs/migration/from-codex) |
| Migrate from Aider (repo map and edit-formats are first-class) | [Aider migration](https://cave.sh/docs/migration/from-aider) |
| Use my ChatGPT Plus / Claude Pro / Copilot subscription | [Auth & Providers](https://cave.sh/docs/getting-started/auth) |
| Compare cave vs the field | [Comparison](https://cave.sh/docs/comparison) |
| Run cave headless in CI | [Cookbook → cave exec](https://cave.sh/docs/cookbook#cave-exec-in-github-actions) |
| Author a slash command or skill | [Skills & Commands](https://cave.sh/docs/reference/slash-commands) |
| Read everything as one file (LLM-friendly) | [llms.txt](https://cave.sh/llms.txt) |

---

## Why cave

| Axis | Cave | Claude Code | Codex | Aider | opencode |
|---|---|---|---|---|---|
| Token compression (3-layer Cave Mode) | yes (unique) | no | no | repo map only | no |
| 20+ provider OAuth | yes (unique) | Anthropic only | ChatGPT only | env keys only | env keys |
| Session branching + fork | yes | no | fork only | git only | no |
| Native MCP | yes | yes | yes | no | yes |
| Native sandbox (Seatbelt / Landlock / Restricted) | yes | partial | yes | no | partial |
| Plan mode | yes | yes | yes | architect | yes |
| Repo map (PageRank) | yes | no | no | yes | no |
| Edit-format-per-model | yes | no | no | yes | no |
| Worktree-isolated subagents | yes | yes | yes | no | no |
| Daemon / multi-client | yes | no | yes | no | yes |
| Shadow-git checkpoints + `/rollback N` | yes | no | no | git only | no |
| Cost transparency (per-msg $) | yes | partial | partial | yes | no |
| MIT open source | yes | closed | Apache | Apache | MIT |

Full version of this table with Crush included: [docs/comparison](https://cave.sh/docs/comparison).

---

## How it saves tokens

Four compression layers. Always on. Break-even after one tool call.

| Layer | What happens | Impact |
|-------|-------------|--------|
| **Cave Mode** | Model responds in terse technical fragments — no filler, no hedging. `lite` / `full` / `ultra` | Prompt + response compression |
| **Tool Budgets** | Per-tool line limits (bash: 80, read: 300, grep: 120) + ANSI strip + blank collapse + semantic JSON/XML extraction | **-67% to -94%** on tool output |
| **Read Dedup** | Files fingerprinted per session — re-reads return a stub, not the content | **-99%** on repeated reads |
| **RTK** | Optional Rust binary rewrites bash output before it enters context | **~60%** additional reduction |

<details>
<summary>Full benchmark: 10 real-world tool output fixtures</summary>

```
  git diff (901 lines)   ██████████████████████████████████████████████████  -94%
  npm ls (701 lines)     ████████████████████████████████████████████████    -92%
  ls recursive (601 ln)  ███████████████████████████████████████████████     -90%
  grep results (801 ln)  █████████████████████████████████████████████       -89%
  test output (501 ln)   ████████████████████████████████████████████        -88%
  XML/pom.xml (382 ln)   ████████████████████████████████████████            -79%
  docker inspect (258)   ██████████████████████████████████                  -68%
  ANSI colored (97 ln)   █████████████████████████████                       -50%
  read file (429 lines)  ████████████████                                    -32%
  build output (19 ln)   █████████                                           -18%
                         ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
  AGGREGATE              ███████████████████████████████████████████████     -86%
```

| Metric | Value |
|--------|-------|
| Tokens saved (10 fixtures) | ~72,400 out of 337K chars |
| System prompt overhead | 120–195 tokens (lite–ultra) |
| Net savings (15-turn session) | **+567K tokens (~$1.70 with Sonnet)** |
| Net savings (30-turn session) | **+1.13M tokens (~$6.92 with Sonnet)** |

```bash
npm run bench:offline   # compression analysis — free, <1s
npm run bench:replay    # analyze your real sessions — free
npm run bench:live      # A/B with LLM calls — needs API key
```

</details>

<details>
<summary>MicroBench eval: 25 coding tasks, $1.19 total, 14 minutes</summary>

25 self-contained tasks (read/edit/bash) at three difficulty levels. No Docker, no repo cloning.

| Difficulty | Pass Rate | Avg Cost | Avg Duration |
|-----------|-----------|----------|-------------|
| Easy | 8/8 (100%) | $0.03 | 17s |
| Medium | 6/10 (60%) | $0.04 | 33s |
| Hard | 2/7 (29%) | $0.06 | 55s |
| **Total** | **16/25 (64%)** | **$0.05** | **33s** |

**75% prompt cache hit rate** from caveman compression. **[Run it yourself →](research/README.md)**

</details>

---

## Quick Start

```bash
# Authenticate (pick one)
export ANTHROPIC_API_KEY=sk-ant-...          # any supported provider's API key
cave && /login                                # or OAuth: Claude Pro, ChatGPT Plus, Copilot, Gemini...

# Use
cave                              # interactive mode
cave "explain this codebase"      # start with a prompt
cave -p "summarize this file"     # non-interactive, print and exit
cat README.md | cave -p "review"  # pipe stdin
cave -c                           # continue last session
cave -r                           # browse sessions
cave --plan                       # plan mode (read-only, structured plan output)
```

Full slash-command list: type `/` inside the TUI. Or browse [docs/reference/slash-commands](https://cave.sh/docs/reference/slash-commands).

---

## Differentiators

<details>
<summary><strong>Cave Mode compression</strong> — 3-layer, ~85% reduction on tool output</summary>

Always on. Per-tool budgets, read dedup, optional Rust binary for bash rewriting. Disable with `--no-cave-mode`.

```bash
cave --cave-mode ultra      # most aggressive
cave --cave-mode lite       # only system-prompt compression
cave --no-cave-mode         # off
```

[Reference →](https://cave.sh/docs/reference/tools)

</details>

<details>
<summary><strong>Plan mode</strong> — read-only exploration, structured plan, then /act</summary>

```bash
cave --plan
> refactor packages/agent/src/sandbox to use the policy IR
# model returns a structured ## Plan section
/act    # walks each step in order
```

Architect / editor split: `cave --architect claude-opus-4-7 --editor claude-haiku-4` runs Opus for planning and Haiku for execution. Drops cost ~3-5×.

[Plan Mode reference →](https://cave.sh/docs/reference/plan-mode)

</details>

<details>
<summary><strong>Subagents</strong> — up to 7 parallel, worktree-isolated</summary>

Custom agents at `.cave/agents/<name>.md` and `~/.cave/agents/<name>.md`. Frontmatter is a Claude Code superset.

```yaml
---
description: "Read-only directory exploration. Returns 500-token summary."
prompt: "Walk the directory at $1. List subdirs with one-line purpose hints."
tools: [Read, Glob, Grep, Bash]
model: claude-haiku-4
permissionMode: plan
isolation: worktree
---
```

5 default agents shipped: `Explore`, `Reviewer`, `Tester`, `Implementer`, `Critic`.

[Subagents reference →](https://cave.sh/docs/reference/subagents)

</details>

<details>
<summary><strong>Sessions, branching, replay</strong> — auto-save, /tree, /fork</summary>

JSONL files in `~/.cave/agent/sessions/`, organized by working directory. Branching never overwrites history.

```bash
cave -c                    # continue most recent
cave -r                    # browse and select
cave --session <path|id>   # open specific session
cave --fork <path|id>      # fork into new file
```

`/tree` — navigate and branch in-place with search, fold, page, filter. `/compact` — manual context compaction. `/checkpoint` and `/rollback N` — shadow-git snapshots.

</details>

<details>
<summary><strong>20+ providers, 6 OAuth flows</strong> — your existing subscription works</summary>

**OAuth subscriptions** — Claude Pro/Max · ChatGPT Plus/Pro · GitHub Copilot · Google Gemini · Antigravity

**API keys** — Anthropic · OpenAI · Azure OpenAI · Google Vertex · Bedrock · Mistral · Groq · Cerebras · xAI · OpenRouter · Vercel AI Gateway · Hugging Face · Kimi · MiniMax · ZAI · DeepSeek

**Custom** — Any OpenAI-/Anthropic-/Google-compatible endpoint via `~/.cave/agent/models.json`.

[Auth & Providers →](https://cave.sh/docs/getting-started/auth)

</details>

<details>
<summary><strong>MCP, hooks, skills, commands</strong> — Claude Code-compatible</summary>

Cave's authoring formats are a **superset** of Claude Code's:

| Claude Code path | Cave path | Notes |
|---|---|---|
| `~/.claude/settings.json` | `~/.cave/settings.json` | Hooks + permissions identical schema |
| `~/.claude/commands/*.md` | `~/.cave/commands/*.md` | Frontmatter superset |
| `~/.claude/skills/<name>/SKILL.md` | `~/.cave/skills/<name>/SKILL.md` | Identical |
| `~/.claude/agents/<name>.md` | `~/.cave/agents/<name>.md` | Frontmatter superset |
| `.mcp.json` | `.mcp.json` | Same path; no change |

Paste your existing config and it works. [Migration guide →](https://cave.sh/docs/migration/from-claude-code)

</details>

<details>
<summary><strong>Memory via cavemem</strong> — episodic→semantic consolidation</summary>

Cave delegates persistent memory to [cavemem](https://github.com/JuliusBrussee/cavemem) (MIT, ~75% prose-token reduction, hybrid BM25 + local vectors).

Cave's value-add: **policy** — when to write, what to inject, episodic→semantic consolidation, MEMORY.md bridge to Claude Code.

```bash
/memory search "auth migration"
/memory consolidate            # cluster recent observations, write back as semantic facts
/memory sync --from claude     # import Claude Code's MEMORY.md
```

[Memory reference →](https://cave.sh/docs/reference/memory)

</details>

<details>
<summary><strong>Daemon</strong> — cave serve, multi-client attach, survive SSH drops</summary>

```bash
cave serve --port 39245            # start the daemon
cave attach --host localhost:39245 # attach a TUI to it
cave list                          # list sessions
```

Sessions live in SQLite and survive SSH drops. Worker mode: prepend `&` to any prompt to dispatch to a registered remote `cave worker`.

[Daemon reference →](https://cave.sh/docs/reference/daemon)

</details>

<details>
<summary><strong>SDK & scripting</strong> — embed, RPC, print mode, JSON mode</summary>

```typescript
import { AuthStorage, createAgentSession, ModelRegistry, SessionManager } from "cave";

const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  authStorage: AuthStorage.create(),
  modelRegistry: ModelRegistry.create(AuthStorage.create()),
});
await session.prompt("What files are in the current directory?");
```

```bash
cave --mode rpc                     # JSONL over stdin/stdout
cave -p "Summarize this codebase"   # print and exit
cave --mode json "List todos"       # structured JSON output
cave exec "lint and fix" --output-schema schema.json   # CI mode
```

[API reference →](https://cave.sh/docs/api)

</details>

<details>
<summary><strong>CLI flags</strong></summary>

| Flag | Description |
|------|-------------|
| `-c`, `--continue` | Continue most recent session |
| `-r`, `--resume` | Browse and select session |
| `-p`, `--print` | Non-interactive: print and exit |
| `--mode json\|rpc` | Structured output modes |
| `--plan` | Boot in plan mode (read-only) |
| `--provider <name>` | `anthropic`, `openai`, `google`, ... |
| `--model <pattern>` | Model ID or `provider/id`; supports `:<thinking>` suffix |
| `--thinking <level>` | `off` · `minimal` · `low` · `medium` · `high` · `xhigh` |
| `--tools <list>` | Enable specific tools (default: `read,bash,edit,write`) |
| `-e`, `--extension <src>` | Load a specific extension (repeatable) |
| `--cave-mode <level>` | `lite` · `full` · `ultra` |
| `--no-cave-mode` | Disable Cave Mode compression |

| Env var | Description |
|---------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `CAVE_CODING_AGENT_DIR` | Override config directory |
| `CAVE_CACHE_RETENTION` | `long` for extended prompt cache (Anthropic: 1h, OpenAI: 24h) |

</details>

---

## Community

- **Discord** — [discord.gg/cave-cli](https://discord.gg/cave-cli)
- **Issues** — [github.com/JuliusBrussee/caveman-cli/issues](https://github.com/JuliusBrussee/caveman-cli/issues)
- **Releases** — [github.com/JuliusBrussee/caveman-cli/releases](https://github.com/JuliusBrussee/caveman-cli/releases)
- **Changelog** — [CHANGELOG.md](CHANGELOG.md) — auto-generated from conventional commits on tag push

---

## Monorepo

| Package | Description |
|---------|-------------|
| [`cave`](packages/coding-agent) | Coding agent CLI |
| [`@cave/ai`](packages/ai) | Multi-provider LLM API |
| [`@cave/agent`](packages/agent) | Agent runtime + tool calling |
| [`@cave/tui`](packages/tui) | Terminal UI with differential rendering |
| [`@cave/web-ui`](packages/web-ui) | Web components for AI chat |
| [`@cave/mom`](packages/mom) | Slack bot → coding agent |
| [`@cave/pods`](packages/pods) | vLLM on GPU pods |

## Contributing

```bash
git clone https://github.com/JuliusBrussee/caveman-cli.git
cd caveman-cli && npm install && npm run build
npm run check   # lint + format + type check
./test.sh       # run tests
```

[Biome](https://biomejs.dev/) for lint/format. TypeScript strict.

## License

MIT
