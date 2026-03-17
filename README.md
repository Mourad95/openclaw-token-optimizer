<div align="center">
  <img src="assets/logo.png" alt="OpenClaw" width="160" />
</div>

# OpenClaw Token Optimizer

Reduce OpenClaw token consumption by **70–90%** using vector embeddings and semantic search. Only the most relevant memory is sent to the LLM.

- **Stack:** TypeScript, Node.js ≥16, vectra, Xenova/transformers (local embeddings)
- **Requirements:** Node.js ≥16, npm ≥7

---

## Quick Start

```bash
git clone https://github.com/openclaw-community/openclaw-token-optimizer.git
cd openclaw-token-optimizer
npm install
npm run build

mkdir -p memory
echo "# My notes\n\nWorking on project X." > memory/notes.md

npm run index
node dist/src/index.js search "what am I working on?"
```

With **Make**:

```bash
make install
make build
make index
make search Q="what am I working on?"
```

Optional — use with OpenClaw:

```bash
npm run setup
openclaw gateway restart
```

---

## Commands (npm)

| Command | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript → `dist/` |
| `npm run index` | Index `memory/*.md` |
| `node dist/src/index.js search "query"` | Semantic search |
| `npm run stats` | Plugin statistics |
| `npm run analyze` | Token savings analysis |
| `npm run maintenance` | Cache cleanup, index maintenance |
| `npm test` | Run test suite |

**CLI options (examples):**

- `node dist/src/index.js search "query" --limit 10 --verbose`
- `node dist/src/index.js index --dir ./notes --clear`
- `node dist/src/index.js analyze --export report.json`
- `node dist/src/index.js maintenance --clear-cache --rebuild-index`

---

## Make targets

| Target | Description |
|--------|-------------|
| `make` / `make help` | List all targets |
| `make install` | npm install |
| `make build` | Compile TypeScript |
| `make test` | Run tests (builds if needed) |
| `make clean` | Remove `dist/` |
| `make index` | Index memories (`make index DIR=./memory` optional) |
| `make search Q="query"` | Semantic search |
| `make analyze` | Token savings analysis |
| `make stats` | Plugin statistics |
| `make maintenance` | Cache + index maintenance |
| `make setup` | OpenClaw integration |
| `make lint` | ESLint on `src/` |

---

## Configuration

- **Memory directory:** default `./memory`. Override with `OPENCLAW_MEMORY_DIR` or `OPENCLAW_WORKSPACE` (uses `$OPENCLAW_WORKSPACE/memory`).
- **OpenClaw:** `make setup` or `npm run setup` writes the memory-search command into `~/.openclaw/openclaw.json`.

**Debug / verbose:** Set `OPENCLAW_TOKEN_OPTIMIZER_VERBOSE=true` for init and search logs; `OPENCLAW_TOKEN_OPTIMIZER_DEBUG=true` for more detail (e.g. cache hits). By default the plugin is quiet when used by OpenClaw.

**Exit codes:** `0` = success, `1` = general error, `2` = embedding model load failed (check network/disk, then retry).

---

## Docs

- [Getting Started](docs/getting-started.md)
- [Advanced Usage](docs/advanced-usage.md)
- [Troubleshooting](docs/troubleshooting.md)

---

## License

MIT — see [LICENSE](LICENSE).
