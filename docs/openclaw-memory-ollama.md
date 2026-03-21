# OpenClaw memory with Ollama (local embeddings)

This document explains the full flow: what this repository does, what OpenClaw does, the **default model**, environment variables, and optional cloud fallback.

Default constants live in [`src/openclaw-memory-defaults.ts`](../src/openclaw-memory-defaults.ts).

---

## At a glance

| Item | Default | Role |
|------|---------|------|
| **Ollama model (embeddings)** | **`nomic-embed-text`** | Embeds memory chunks locally via Ollama. |
| **Cloud fallback** | **`gemini`** | Used **only** if Ollama is unavailable or errors (embedding API, not chat). |
| **Activation** | `OPENCLAW_TOKEN_OPTIMIZER_OLLAMA_MEMORY=1` + `npm run setup` | Writes `provider: "ollama"` into `openclaw.json`. |
| **npm shortcut** | `npm run setup:ollama` | Sets the variable for you (Unix/macOS). |

Override the Ollama model with `OPENCLAW_OLLAMA_EMBEDDING_MODEL` and fallback with `OPENCLAW_MEMORY_EMBEDDING_FALLBACK` (see table below).

---

## 1. Install Ollama

Ollama is a separate runtime from Node; it must be **installed on the machine** before the commands below.

| Platform | How |
|----------|-----|
| **macOS** | Download the app from [ollama.com/download](https://ollama.com/download) or `brew install ollama` with Homebrew. |
| **Linux** | Official install script: `curl -fsSL https://ollama.com/install.sh \| sh` (see the download page for details). |
| **Windows** | Installer from [ollama.com/download](https://ollama.com/download) (WSL2 is often recommended for Linux-like usage). |

Verify the CLI:

```bash
ollama --version
```

The service usually listens on `http://127.0.0.1:11434` (starts automatically after install).

---

## 2. Download the embedding model (pull)

This repo defaults to **`nomic-embed-text`** ([`src/openclaw-memory-defaults.ts`](../src/openclaw-memory-defaults.ts)). It must exist in Ollama (`ollama list`).

### Automated command (recommended)

From the repository root:

```bash
npm run ollama:pull-embedding
```

This script runs `ollama pull` for the default model, or for `OPENCLAW_OLLAMA_EMBEDDING_MODEL` if set. No TypeScript build is required for this step.

### Integration with OpenClaw setup

**`npm run setup:ollama`** runs:

1. `npm run ollama:pull-embedding` (downloads the model if needed)  
2. `npm run setup` with Ollama memory mode enabled (writes `openclaw.json`)

You still need **`npm run build`** at least once beforehand, because `setup` uses `dist/scripts/setup.js`.

### Manual

```bash
ollama pull nomic-embed-text
```

---

## Two different pipelines (do not confuse)

1. **This repo (`openclaw-token-optimizer`)**  
   - Commands `npm run index` / `node dist/src/index.js search …`  
   - Uses **Vectra + Transformers.js** (local embeddings in `.vectra-index/`) — **independent** of OpenClaw.

2. **OpenClaw memory** (`memory_search` in the gateway)  
   - Configured in `~/.openclaw/openclaw.json` under `agents.defaults.memorySearch`.  
   - This is what you configure with **Ollama** and optional **cloud fallback**.  
   - It does **not** directly set the **chat** model (orchestrator, DeepSeek, etc.): that is a different part of the config.

The `npm run setup` script in this repo:

- adds **`extraPaths`** to this repo’s `memory/` folder so OpenClaw indexes the same files;
- if you enable Ollama mode (`OPENCLAW_TOKEN_OPTIMIZER_OLLAMA_MEMORY`), it also writes **`provider`**, **`model`**, and **`fallback`** as above.

---

## Why `nomic-embed-text` by default?

- Common **embedding** model on Ollama, good **quality / size** tradeoff.  
- Widely used for semantic text search.  
- Replace it (e.g. `mxbai-embed-large`, `all-minilm`) via `OPENCLAW_OLLAMA_EMBEDDING_MODEL` after `ollama pull <name>`.

---

## Verify the model responds

After installing Ollama and a `pull` (manual or `npm run ollama:pull-embedding`):

```bash
curl -s http://127.0.0.1:11434/api/embeddings \
  -d '{"model":"nomic-embed-text","prompt":"test"}' | head -c 200
```

(Change the model name in the JSON if you use another.)

---

## Environment variables (reference)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENCLAW_TOKEN_OPTIMIZER_OLLAMA_MEMORY` | Yes for Ollama mode | — | `1`, `true`, or `yes`: setup forces `memorySearch.provider = "ollama"`. |
| `OPENCLAW_OLLAMA_EMBEDDING_MODEL` | No | `nomic-embed-text` | Exact Ollama model name (`ollama list`). |
| `OPENCLAW_MEMORY_EMBEDDING_FALLBACK` | No | `gemini` | Fallback if Ollama fails: `gemini`, `openai`, `none`, `mistral`, `voyage`, `local`, `ollama`. `none` = no cloud. |

After **any** change to these variables, rerun:

```bash
npm run build
npm run setup          # or: npm run setup:ollama
openclaw gateway restart
openclaw memory index --force   # often needed when provider/model changes
```

---

## End-to-end procedure (recommended)

**Shortest path** (build + sample `memory/` + local index + Ollama pull + OpenClaw `setup`):

```bash
npm install
npm run openclaw:link:ollama
openclaw gateway restart
```

`openclaw:link:ollama` runs **`quickstart`** (`build`, **`memory/`** bootstrap, **`index`**) then **`setup:ollama`**.

Manual equivalent:

1. **Install Ollama** ([section 1](#1-install-ollama)).  
2. In this repo: `npm install && npm run quickstart`  
3. **`npm run setup:ollama`** — chains **pull** then OpenClaw **setup** ([section 2](#2-download-the-embedding-model-pull)).  
   Alternative without automatic pull: `npm run ollama:pull-embedding` then `npm run setup` with `OPENCLAW_TOKEN_OPTIMIZER_OLLAMA_MEMORY=1`.  
4. Restart the gateway: `openclaw gateway restart`  
5. Check: `openclaw memory status --deep` — **ollama** provider and `extraPaths` to this repo.

**Windows (cmd.exe)** : `VAR=1 command` does not work; use PowerShell, Git Bash, or run `npm run ollama:pull-embedding` then `set OPENCLAW_TOKEN_OPTIMIZER_OLLAMA_MEMORY=1` + `node dist/scripts/setup.js`.

---

## Tokens and cloud cost (fallback)

- **Embeddings** are billed (or quota’d) on **text sent to embed** (chunks), not on chat completions.  
- **Fallback** runs only if **Ollama** fails: in normal operation everything stays **local**.  
- For **no** cloud calls on memory:  
  `export OPENCLAW_MEMORY_EMBEDDING_FALLBACK=none` then `npm run setup` with Ollama mode enabled.

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| **Gemini** still as primary provider | `OPENCLAW_TOKEN_OPTIMIZER_OLLAMA_MEMORY` was not set when you ran `setup`, or config was overwritten manually. |
| **Ollama** not responding | `ollama serve`, firewall, remote host (`OLLAMA_HOST`). |
| Empty / inconsistent index | `openclaw memory index --force` (or per agent, depending on version). |
| OpenClaw schema errors | [Memory configuration](https://docs.openclaw.ai/reference/memory-config) |

---

## See also

- [README](../README.md) — Configuration section  
- [Troubleshooting](troubleshooting.md)  
- [Metrics](metrics.md) — token savings for this repo’s **CLI**
