# Cumulative metrics (tokens saved)

The plugin persists **on disk** how many tokens were saved over time, in addition to **in-memory** statistics (process lifetime).

## File

Default: `logs/token-metrics.json` (the `logs/` directory is created if needed). That folder is often gitignored — to version or backup elsewhere:

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

## Limitations

- Totals are **estimates** (same heuristic as the rest of the project: ~4 characters per token).  
- If **multiple processes** write concurrently, updates can be lost (typical case: a single gateway).
