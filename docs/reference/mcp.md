---
title: MCP
description: Model Context Protocol — clients, transports, and cave-as-MCP-server.
---

# MCP

Cave is a first-class MCP client and can also serve as an MCP server. Three transports: **stdio** (subprocess + JSON-RPC), **Streamable HTTP** (SSE deprecating mid-2026), and **in-process** (zero-spawn for cave's own tools).

<CopyForLlms />

## Quick start

```bash
cave mcp add cavemem
cave mcp add gh --command "github-mcp" --transport stdio
cave mcp list
cave mcp doctor
```

`cave mcp add` reads from a registry and writes to `~/.cave/mcp.json` or `.mcp.json` (project-scope).

## Configuration

`.mcp.json` (project) or `~/.cave/mcp.json` (user):

```json
{
    "servers": {
        "cavemem": {
            "transport": "stdio",
            "command": "cavemem",
            "args": ["mcp"],
            "env": {}
        },
        "github": {
            "transport": "http",
            "url": "https://mcp.github.com/v1",
            "auth": "oauth"
        },
        "filesystem": {
            "transport": "inproc",
            "module": "@cave/mcp-filesystem"
        }
    }
}
```

User config is merged on top of project config. The `transport` determines how Cave connects.

## Transports

| Transport | When to use |
|---|---|
| `stdio` | Local subprocess. Standard for community MCP servers. |
| `http` | Remote MCP servers. Streamable HTTP (SSE deprecating). |
| `inproc` | Bundled with Cave; zero spawn, lowest latency. |

## OAuth 2.1

Servers that require auth use the **two-tool pattern**:

1. The model calls `<server>__authenticate` — returns an OAuth URL.
2. The user opens the URL, completes auth.
3. The model calls `<server>__complete_authentication` to finalize.

Tokens land in your OS keychain (via `keytar`). Re-auth on token expiry is automatic.

## Tool namespacing

MCP tools are namespaced as `mcp__<server>__<tool>` to avoid collisions. The model sees them under their registered names; the system prompt explains the namespace convention.

## Schema deferral (ToolSearch)

By default Cave only lists MCP tool **names** in the always-on context. Schemas are fetched on demand via `ToolSearch`. This matches Anthropic's pattern and cuts ~85% of context bloat.

Disable per session:

```bash
cave --eager-mcp-schemas
```

## Warm pool

Idle stdio MCP servers are SIGSTOP'd to reclaim memory. They're SIGCONT'd on the next call. Eviction policy: LRU, max idle 10 minutes.

## Cave as MCP server

```bash
cave mcp-server
```

Exposes Cave's coding-agent tools to other MCP clients (Claude Desktop, Codex, opencode). Useful for multi-agent setups where Cave is the "executor" and another agent is the planner.

## Importing Claude Code / Codex MCP config

Cave reads `.mcp.json` at the project root (Claude Code / Codex format). No conversion needed.

```bash
cp .claude.json .mcp.json   # if you had a Claude-only config in the same shape
```

## Troubleshooting

- **`cave mcp doctor`** — pings every configured server, reports timeouts and auth failures.
- **`cave mcp logs <server>`** — tails the stderr of a stdio server.
- **Server crashes loop** — Cave backs off to 1 / 5 / 30 minute retry intervals; you'll see a doctor warning.
