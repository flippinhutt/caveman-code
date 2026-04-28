---
title: Permissions
description: Permission modes, sandboxing, and reversibility-aware prompts.
---

# Permissions

Five modes, cycled with `Shift+Tab` in the TUI. Sandbox enforcement is platform-native: macOS Seatbelt, Linux Landlock, Windows Restricted Tokens.

<CopyForLlms />

## Modes

| Mode | Tools allowed | Default for |
|---|---|---|
| `plan` | Read-only (`Read`, `Glob`, `Grep`, `Bash` with read-only allowlist) | `cave --plan` |
| `default` | All tools, with per-action prompts | first launch |
| `acceptEdits` | All tools, edits auto-allowed, exec still prompts | confident sessions |
| `auto` | LLM-classifier decides per call (Haiku, cached system prompt) | speed runs |
| `bypassPermissions` | All tools, no prompts | CI / `cave exec` |

Cycle: `Shift+Tab` rotates `default → plan → acceptEdits → auto → bypassPermissions → default`.

## Sandbox

`SandboxPolicy` is a tagged union with three variants:

| Variant | Effect |
|---|---|
| `read_only` | No filesystem writes, no network, no exec outside an allowlist |
| `workspace_write` | Writes confined to `cwd` subpath; network through a CONNECT proxy with per-host allowlist |
| `danger_full_access` | No sandbox. Used by `bypassPermissions`. |

### macOS — Seatbelt

Dynamic SBPL composed at session start:

```scheme
(version 1)
(deny default)
(allow file-read*)
(allow file-write* (subpath "/Users/julb/proj"))
(allow process-fork process-exec)
(allow network-outbound (remote tcp "127.0.0.1:9876"))   ; CONNECT proxy
```

The proxy at `127.0.0.1:9876` enforces a per-host allowlist (`api.anthropic.com`, `api.openai.com`, your registry, etc.).

### Linux — Landlock + bubblewrap

Landlock for path-level write confinement; bubblewrap for namespace isolation. Network through the same CONNECT proxy.

### Windows — Restricted Tokens

`CreateRestrictedToken` drops Administrators and SYSTEM, runs Cave's tool subprocess with reduced privileges. Network not yet sandboxed (preview).

## Prompts

The 4-verb prompt:

```
> cave wants to: Edit src/main.rs

[1] Allow once     ← default highlighted
[2] Allow always   (allow-key: "Edit src/main.rs")
[3] Reject
[4] Reject + tell the model why
```

The default verb is **reversibility-aware**:

| Reversibility | Default verb |
|---|---|
| Read-only | Allow once |
| Edit (revertible) | Allow once |
| Exec (potentially destructive) | Allow once |
| Network (POST/DELETE non-allowlist) | Reject + tell the model why |

`Allow always` writes to `.cave/permissions.json` keyed by **normalized command shape**, not raw string. So `git status -sb` and `git status` collapse to the same allow-key.

## sandbox-as-utility (Codex pattern)

```bash
cave sandbox -- npm install
```

Runs an arbitrary command under the same sandbox profile your Cave session uses. Useful for debugging "why does this fail inside cave but not in my shell".

```bash
cave debug sandbox          # show the active SBPL / Landlock policy
cave execpolicy check git   # explain whether `git` would be allowed
```

## permissions.json

```json
{
    "version": 1,
    "always": [
        { "key": "Read **", "added": "2026-04-28T10:11:12Z" },
        { "key": "Bash:git status", "added": "2026-04-28T10:12:00Z" }
    ],
    "never": [{ "key": "Write /etc/**" }]
}
```

Edit by hand, or use `cave permissions list` / `cave permissions remove <index>`.

## Importing Claude Code permissions

The settings.json `permissions` key is identical:

```json
{
    "permissions": {
        "alwaysAllow": ["Read **", "Bash:git status"],
        "neverAllow": ["Write /etc/**"]
    }
}
```

Paste from `~/.claude/settings.json` into `~/.cave/settings.json` and you're done.
