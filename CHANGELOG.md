## Unreleased

### Documentation
- OpenClaw **2026.3+** stores memory search under **`agents.defaults.memorySearch`**. Docs and README now use `openclaw config get agents.defaults.memorySearch` (root `memorySearch` is not a valid CLI path). Added troubleshooting for *Config path not found: memorySearch*; [docs/advanced-usage.md](docs/advanced-usage.md) no longer shows the rejected `custom` + `command` pattern.
- [docs/testing-telegram.md](docs/testing-telegram.md): end-to-end checklist to validate memory over **Telegram** and optional CLI `search` / `metrics`.

### Improvements
- **`npm run index`** / **`analyze`** and **`quickstart`** use a larger Node heap (`--max-old-space-size=8192`) to avoid OOM while indexing with local embeddings; **`make index`** / **`make search`** match. **`npm run setup`** / **`setup:ollama`** / **`openclaw:link`** use the same heap so the setup “integration test” (loads Xenova) does not OOM at the default ~4 GB cap. See [docs/troubleshooting.md](docs/troubleshooting.md#issue-javascript-heap-out-of-memory-during-indexing).
- **`npm run quickstart`** ends with **`memory:sync-workspace`**: copies `memory/*.md` to `<OpenClaw workspace>/memory/` when workspace is resolved from `~/.openclaw/openclaw.json` or `OPENCLAW_WORKSPACE`. Disable with `OPENCLAW_TOKEN_OPTIMIZER_SKIP_WORKSPACE_MEMORY_SYNC=1`.

### Bug fixes
- **Chunking:** `splitIntoChunks` advances the window correctly when a segment is shorter than `overlap` (no backward step, no char-by-char tail sliding), fixing **Invalid array length**, runaway chunk counts, and huge RAM use on small `.md` files (e.g. `memory/notes.md`).
- **`analyze`:** When total memory is smaller than the context cap (`maxContextLength`), savings were always **0%** with a confusing “optimized: 500” line — the explanation now states that this is expected until raw memory exceeds the cap; README updated.

### Features
- **OpenClaw gateway memory plugin** (`openclaw.plugin.json`, id `openclaw-token-optimizer`, same as npm `name`): register with `plugins.slots.memory` so `memory_search` uses `getOptimizedContext` and updates `logs/token-metrics.json`. See [docs/openclaw-gateway-memory-plugin.md](docs/openclaw-gateway-memory-plugin.md).
- **`npm run quickstart`**: build + auto `memory/` sample + local `index`; **`openclaw:link`** / **`openclaw:link:ollama`**: one-shot link with OpenClaw after quickstart (`scripts/bootstrap-memory.mjs`).
- Persistent cumulative token-savings metrics (`logs/token-metrics.json` by default), CLI `npm run metrics`, and `stats` output; override path with `OPENCLAW_TOKEN_OPTIMIZER_METRICS_PATH`. See [docs/metrics.md](docs/metrics.md).
- CLI command `ask` to send a message to OpenClaw (`openclaw agent --message …`), with `OPENCLAW_BIN` override; see [docs/openclaw-ask.md](docs/openclaw-ask.md).
- Optional OpenClaw memory embeddings via **Ollama** (`OPENCLAW_TOKEN_OPTIMIZER_OLLAMA_MEMORY=1` + `npm run setup`, or `npm run setup:ollama`) with configurable **cloud fallback** for cheap embedding models; see [docs/openclaw-memory-ollama.md](docs/openclaw-memory-ollama.md).

---

## v1.1.0 - Auth System Integration

### Features
- Added authentication system with API keys and JWT support
- New security middleware for request validation
- Key management system for secure credential storage

### Improvements
- Enhanced security protocols for token validation
- Updated dependency versions for security patches