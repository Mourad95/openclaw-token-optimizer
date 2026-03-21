# OpenClaw — diagnostics, usage footer, model tracing

This document explains **how** to enable transparency (tokens per response, internal diagnostics) for **OpenClaw 2026.3.x**, and what automation this repository provides.

## Context (important)

- **`responseUsage`** (token usage footer on each reply) is stored **per session** in  
  `~/.openclaw/agents/<agentId>/sessions/sessions.json`, not in a global `agents.defaults.responseUsage` key in the schema version we inspected.
- The **`/usage`** chat command sets this mode for the current session:  
  `off` | `tokens` | `full` | `cost` (see gateway help text).
- **`model.usage`** diagnostic events (provider, model, tokens, duration) are emitted when **`diagnostics.enabled`** is `true` in `~/.openclaw/openclaw.json` — useful to correlate with [logs](https://docs.openclaw.ai/logging).

## What gets configured in `openclaw.json`

File: `~/.openclaw/openclaw.json` (or `OPENCLAW_CONFIG_PATH`).

### 1. `diagnostics.enabled: true`

- Enables **diagnostic events** in-process (including **`model.usage`**: provider, model, usage, estimated cost if applicable, duration).
- Does not replace chat: use **logs** (`openclaw logs --follow`) or OTel export if you configure it later.

Upstream: [Logging — Diagnostics](https://docs.openclaw.ai/logging).

### 2. `agents.defaults.verboseDefault: "on"`

- **New sessions** inherit a more verbose level (extra runtime notices: fallback, compaction, etc. depending on case).
- This is **not** the model name on every message; it increases **system** verbosity for the run.

## Apply the token footer to **all** existing sessions

Script in this repository:

```bash
cd /path/to/openclaw-token-optimizer
# Recommended: stop the gateway to avoid concurrent writes
openclaw gateway stop   # if your version exposes this; otherwise a controlled restart

node scripts/set-openclaw-session-response-usage.mjs
openclaw gateway restart
```

Behavior:

- Walks `~/.openclaw/agents/*/sessions/sessions.json`.
- For each session entry (object with `sessionId`), sets **`responseUsage`** to `tokens` (default) if missing.
- **`RESPONSE_USAGE_MODE=full`**: also adds the session key to the footer (OpenClaw `full` behavior).
- **`--force`**: overwrites even if `responseUsage` is already set.

## What you will see

| Mechanism | Effect |
|-----------|--------|
| Footer `Usage: … in / … out` | After each reply, if the session has `responseUsage` ≠ `off` and there are tokens. |
| `diagnostics` | Structured events including **provider** and **model** (not in Telegram text by default). |
| `/status` | Help block with **`🧠 Model:`** for the session (one-off command). |

## Honest limitation

OpenClaw does not expose (in the version we inspected) a single **“print model on every message”** option. The combination **`responseUsage` + diagnostics + logs** gives **tokens in chat** and **provider/model in diagnostics / traces**.

## OpenClaw references

- [Logging](https://docs.openclaw.ai/logging)  
- [Gateway configuration reference](https://docs.openclaw.ai/gateway/configuration-reference)
