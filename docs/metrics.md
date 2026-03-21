# Cumulative metrics (tokens saved)

The plugin persists **on disk** how many tokens were saved over time, in addition to **in-memory** statistics (process lifetime).

## File

Default: **`logs/token-metrics.json` next to the installed package** (resolved from the path of `metrics-store`, not `process.cwd()`), so the **OpenClaw gateway** writes to the same file as `npm run metrics` from the repo.

That folder is often gitignored — to version or backup elsewhere, or to force a path:

```bash
export OPENCLAW_TOKEN_OPTIMIZER_METRICS_PATH="$HOME/.openclaw/token-metrics.json"
```

Restart the OpenClaw gateway after changing this variable if the plugin runs inside it.

## What is counted

| Field | Meaning |
|-------|---------|
| `tokensSaved` | Sum of `potentialTokens - estimatedTokens` for each **real** search (not in-process memory cache hits). |
| `optimizerRuns` | How many times context was recomputed (excluding cache hits). |
| `potentialTokensTotal` | Sum of raw “potential” estimates before optimization (~chars/4 on search results). |
| `averageSavingsPercent` | \( \text{tokensSaved} / \text{potentialTokensTotal} \) as % (capped at 100), useful as a rough guide. |

**TokenOptimizer** cache hits do not record savings again (same result as before).

## Commands

```bash
npm run build
npm run metrics              # human-readable
node dist/src/index.js metrics --json
node dist/src/index.js metrics --reset   # reset totals
```

`npm run stats` also includes a **CUMULATIVE METRICS (persisted)** section.

From the plugin script:

```bash
node dist/src/openclaw-plugin.js metrics
```

## OpenClaw gateway vs these metrics

**Important:** `recordOptimizerRun` runs only when **`TokenOptimizer.getOptimizedContext`** executes (see `src/token-optimizer.ts`). That happens for:

- CLI: `node dist/src/index.js search …`, `npm run search`, etc.
- The standalone **`memory-search`** stdin mode on `dist/src/openclaw-plugin.js` **if** something invokes it.
- **Gateway** chats when you use the **memory plugin** from this package (`openclaw.plugin.json`, id **`openclaw-token-optimizer`** — must match `package.json` `name` for OpenClaw) and set **`plugins.slots.memory`** to that id so `memory_search` / `memory_get` call `getOptimizedContext`. See [Gateway memory plugin](openclaw-gateway-memory-plugin.md).

The **`openclaw:link`** script only updates **`agents.defaults.memorySearch.extraPaths`** so **OpenClaw’s default memory** (`memory-core`) can index the same files. That **does not** call this package unless you also select the token-optimizer memory slot as above.

## Limitations

- Totals are **estimates** (same heuristic as the rest of the project: ~4 characters per token).  
- If **multiple processes** write concurrently, updates can be lost (typical case: a single gateway).
- **Gateway traffic** is not reflected in `token-metrics.json` unless the runtime path above calls `getOptimizedContext`.
