# OpenClaw Token Optimizer

Reduce OpenClaw token consumption by **70–90%** using vector embeddings and semantic search. Only the most relevant memory is sent to the LLM.

**Requirements:** Node.js ≥16, npm ≥7

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/openclaw-community/openclaw-token-optimizer.git
cd openclaw-token-optimizer
npm install

# 2. Add memory files (Markdown)
mkdir -p memory
echo "# My notes\n\nWorking on project X." > memory/notes.md

# 3. Index memories (first run downloads the embedding model)
npm run index

# 4. Search
node src/index.js search "what am I working on?"
```

Optional: integrate with OpenClaw so it uses the optimizer automatically:

```bash
npm run setup
openclaw gateway restart
```

---

## Commands

| Command | Description |
|--------|-------------|
| `node src/index.js index` | Index `memory/*.md` (run after adding/editing files) |
| `node src/index.js search "query"` | Get optimized context for a query |
| `node src/index.js stats` | Plugin stats and performance |
| `node src/index.js analyze` | Token savings analysis |
| `node src/index.js maintenance` | Cache cleanup, rebuild index |
| `npm test` | Run test suite |

**Options (examples):**

- `search "query" --limit 10 --verbose`
- `index --dir /path/to/notes --clear`
- `analyze --export report.json`
- `maintenance --clear-cache` or `--rebuild-index`

---

## Configuration

- **Memory directory:** default is `./memory`. Override with `OPENCLAW_MEMORY_DIR` or `OPENCLAW_WORKSPACE` (uses `$OPENCLAW_WORKSPACE/memory`).
- **OpenClaw:** setup writes the custom memory-search command into your OpenClaw config (`~/.openclaw/openclaw.json`).

---

## Docs

- [Getting Started](docs/getting-started.md)
- [Advanced Usage](docs/advanced-usage.md)
- [Troubleshooting](docs/troubleshooting.md)

---

## License

MIT — see [LICENSE](LICENSE).
