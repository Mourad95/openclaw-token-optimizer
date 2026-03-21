<div align="center">
  <img src="assets/logo.png" alt="OpenClaw" width="160" />
</div>

# OpenClaw Token Optimizer

Reduce OpenClaw token consumption by **roughly 70–90%** by sending only the **most relevant** memories to the LLM. This project indexes your notes, runs **semantic search**, and **estimates** how many tokens you save compared to dumping full memory into the context.

**Stack:** TypeScript, Node.js ≥16, vectra, Xenova/transformers (local embeddings).

### Fast path (OpenClaw in a few commands)

1. `git clone … && cd openclaw-token-optimizer && npm install`
2. **Link with OpenClaw** (pick one):
   - **Default embeddings** (OpenClaw uses your existing API keys / auto provider):  
     `npm run openclaw:link`
   - **Ollama embeddings** (`nomic-embed-text` + optional cloud fallback — see [docs/openclaw-memory-ollama.md](docs/openclaw-memory-ollama.md)):  
     `npm run openclaw:link:ollama`  
     (requires [Ollama](https://ollama.com) installed)
3. `openclaw gateway restart`

These scripts **build**, ensure **`memory/`** exists (the repo ships **`memory/notes.md`**; the bootstrap step adds a sample only if the folder is empty), run **`npm run index`** (local Vectra index), then run **`setup`** / **`setup:ollama`** so `~/.openclaw/openclaw.json` points at this repo’s `memory/`.

---

## Prerequisites

- **Node.js** ≥16 and **npm** ≥7  
- First run will **download an embedding model** (needs network once; then cached on disk)  
- **Indexing** (`npm run index`, quickstart, `openclaw:link`) can use several GB RAM; the `index` / `analyze` npm scripts raise Node’s heap. If you still hit OOM, see [Vector Memory → heap OOM](docs/troubleshooting.md#issue-javascript-heap-out-of-memory-during-indexing) in the troubleshooting guide.

---

## Setup (step by step)

Follow these steps in order. You only need **OpenClaw** if you want this optimizer inside your OpenClaw workflow; the tool also works **standalone** for search and analysis.

### 1. Get the code and install dependencies

```bash
git clone https://github.com/openclaw-community/openclaw-token-optimizer.git
cd openclaw-token-optimizer
npm install
```

### 2. Compile TypeScript

```bash
npm run build
```

This produces the CLI under `dist/`. Run this again after pulling code changes.

### 3–4. Memory folder + local index (automated)

Use **`npm run quickstart`** — it compiles TypeScript, ensures **`memory/`** exists, adds a sample **`memory/notes.md`** only if the folder is empty, then runs **`npm run index`** (local `.vectra-index/`).

```bash
npm run quickstart
```

Or do it manually: create `memory/`, add `.md` files, then `npm run build && npm run index`.

### 5. Try a semantic search

```bash
node dist/src/index.js search "what am I working on?"
# or: make search Q="what am I working on?"
```

You should see an **optimized context** plus a short line about **% tokens saved** for that query.

### 6. (Optional) Use with OpenClaw

Install the [OpenClaw](https://docs.openclaw.ai) CLI globally, then from this repo prefer **`npm run openclaw:link`** or **`npm run openclaw:link:ollama`** (see [Fast path](#fast-path-openclaw-in-a-few-commands) above) instead of separate `setup` steps — they already include **`quickstart`**.

If you only need **`setup`** without rebuilding or re-indexing:

```bash
npm run setup
# or: npm run setup:ollama
openclaw gateway restart
```

See **[docs/openclaw-memory-ollama.md](docs/openclaw-memory-ollama.md)** for Ollama defaults ([`src/openclaw-memory-defaults.ts`](src/openclaw-memory-defaults.ts)).

`setup` adjusts `~/.openclaw/openclaw.json` under **`agents.defaults.memorySearch`** (e.g. `extraPaths` toward this project’s `memory/`). Embeddings must use a [supported memory provider](https://docs.openclaw.ai/reference/memory-config) in OpenClaw — not a legacy `custom` + shell `command`.

**Check config:** `openclaw config get agents.defaults.memorySearch` (not `memorySearch` at the root — that path does not exist).

**Troubleshooting setup:** see [docs/troubleshooting.md](docs/troubleshooting.md).

---

## How to see tokens saved

There are **three** useful views; pick what matches your question.

### A. One-off estimate on your memory files (`analyze`)

Answers: *“If I used full memory vs optimized context, how much could I save?”*

```bash
npm run analyze
# Verbose: add --verbose   |   Export JSON: --export report.json
```

This analyzes files under your memory directory and compares **all raw `.md` content** (≈ chars÷4) to the **optimizer context cap** (`maxContextLength`, default 2000 chars → ~500 “tokens”). If your total memory is **smaller than that cap**, reported savings stay **0%** — that is expected until your notes grow beyond the cap.

### B. This process only — current session (`stats`)

Answers: *“How many queries, cache hits, and tokens saved **since this process started**?”*

```bash
npm run stats
# JSON: npm run stats -- --json
```

Useful when debugging or running the CLI/plugin in one long-lived process. Totals **reset** when the process exits.

### C. Total over time — persistent savings (`metrics`)

Answers: *“How many tokens have I saved **in total**, across runs?”*

Each time the optimizer **recomputes** context (not an in-memory cache hit), it **adds** to a file on disk:

| What | Default |
|------|--------|
| **File** | `logs/token-metrics.json` |
| **Command** | `npm run metrics` |
| **Also shown in** | `npm run stats` (section **CUMULATIVE METRICS (persisted)**) |

Examples:

```bash
npm run metrics                    # human-readable summary
npm run metrics -- --json        # machine-readable
npm run metrics -- --reset       # zero the counters (optional)
```

To store metrics elsewhere (e.g. under `~/.openclaw/`):

```bash
export OPENCLAW_TOKEN_OPTIMIZER_METRICS_PATH="$HOME/.openclaw/token-metrics.json"
```

Numbers are **estimates** (~4 characters per token). See [docs/metrics.md](docs/metrics.md) for field meanings (`tokensSaved`, `optimizerRuns`, etc.).

---

## Command reference (npm)

| Command | What it does |
|--------|----------------|
| `npm run quickstart` | `build` + ensure `memory/` + sample `notes.md` if empty + `index` |
| `npm run openclaw:link` | `quickstart` + `setup` (wire this repo into OpenClaw) |
| `npm run openclaw:link:ollama` | `quickstart` + `setup:ollama` (needs Ollama) |
| `npm run memory:init` | Only create `memory/` + sample file if empty |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm run index` | Index files under `memory/` (or `--dir`) |
| `node dist/src/index.js search "query"` | Semantic search + token stats for that query |
| `npm run analyze` | File-level token savings analysis |
| `npm run stats` | Session stats **+** cumulative metrics block |
| `npm run metrics` | **Persistent** cumulative tokens saved |
| `npm run ask -- "…"` | Send a message via OpenClaw CLI (`openclaw agent`) — [docs/openclaw-ask.md](docs/openclaw-ask.md) |
| `npm run maintenance` | Cache / index maintenance (see script) |
| `npm test` | Test suite |

**More examples:**

- `node dist/src/index.js search "query" --limit 10 --verbose`
- `node dist/src/index.js index --dir ./notes --clear`
- `node dist/src/index.js analyze --export report.json`
- `npm run ask -- --dry-run "hello"` (print `openclaw` command without running)

---

## Make targets

| Target | Description |
|--------|-------------|
| `make` / `make help` | List targets |
| `make install` | `npm install` |
| `make build` | Compile |
| `make index` | Index (`make index DIR=./memory` optional) |
| `make search Q="query"` | Search |
| `make analyze` | Analyze token savings |
| `make stats` | Stats |
| `make metrics` | Cumulative metrics |
| `make ask Q="…"` | Ask OpenClaw |
| `make maintenance` | Maintenance |
| `make setup` | OpenClaw integration |
| `make quickstart` | Same as `npm run quickstart` |
| `make openclaw-link` | Same as `npm run openclaw:link` |
| `make openclaw-link-ollama` | Same as `npm run openclaw:link:ollama` |
| `make test` | Tests |
| `make lint` | ESLint |

---

## Configuration

| Topic | What to set |
|------|-------------|
| **Memory folder** | Default `./memory`. Override: `OPENCLAW_MEMORY_DIR` or `OPENCLAW_WORKSPACE` (uses `$OPENCLAW_WORKSPACE/memory`). |
| **Metrics file** | Default `./logs/token-metrics.json`. Override: `OPENCLAW_TOKEN_OPTIMIZER_METRICS_PATH`. |
| **OpenClaw binary for `ask`** | `OPENCLAW_BIN` if `openclaw` is not on `PATH`. |
| **OpenClaw memory embeddings: Ollama + optional cloud fallback** | Set `OPENCLAW_TOKEN_OPTIMIZER_OLLAMA_MEMORY=1` and run `npm run setup`, or use `npm run setup:ollama`. Optional: `OPENCLAW_OLLAMA_EMBEDDING_MODEL` (default `nomic-embed-text`), `OPENCLAW_MEMORY_EMBEDDING_FALLBACK` (default `gemini` — small embedding model, only if Ollama fails). See [docs/openclaw-memory-ollama.md](docs/openclaw-memory-ollama.md). |
| **Verbose logs** | `OPENCLAW_TOKEN_OPTIMIZER_VERBOSE=true` or `OPENCLAW_TOKEN_OPTIMIZER_DEBUG=true`. |

**Exit codes:** `0` success · `1` error · `2` embedding model failed to load (network/disk).

---

## Documentation

| Doc | Contents |
|-----|----------|
| [Getting Started](docs/getting-started.md) | Longer walkthrough |
| [Advanced Usage](docs/advanced-usage.md) | Programmatic use |
| [Troubleshooting](docs/troubleshooting.md) | Config & gateway issues |
| [Metrics (details)](docs/metrics.md) | Cumulative file format |
| [Ask OpenClaw](docs/openclaw-ask.md) | `npm run ask` |
| [OpenClaw memory — Ollama + optional fallback](docs/openclaw-memory-ollama.md) | Defaults: `nomic-embed-text` + `gemini` fallback |
| [Diagnostics & usage](docs/openclaw-diagnostics-and-usage.md) | Model/token tracing in OpenClaw |
| [Testing via Telegram](docs/testing-telegram.md) | End-to-end memory check with Telegram + optional CLI metrics |

---

## License

MIT — see [LICENSE](LICENSE).
