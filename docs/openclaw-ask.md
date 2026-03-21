# Ask OpenClaw from this repository

The **`ask`** command wraps the official OpenClaw CLI:

```bash
openclaw agent --message "…"
```

Upstream reference: [CLI `openclaw agent`](https://docs.openclaw.ai/cli/agent).

## Prerequisites

- OpenClaw CLI installed and on `PATH` (`npm install -g openclaw`, or equivalent).  
- Usually the **gateway** must be running (`openclaw gateway …`), unless you use **`--local`** per your OpenClaw version.

## Usage

From the repo (after `npm run build`):

```bash
npm run ask -- "Summarize what I have in memory/"
npm run ask -- -a coder "Review src/token-optimizer.ts"
npm run ask -- --dry-run "test"
```

With **Make**:

```bash
make ask Q="What time is it?"
```

## Useful options

| Option | Role |
|--------|------|
| `-a, --agent <id>` | Target agent (`main`, `coder`, etc.). |
| `-s, --session-id <id>` | Resume an existing session. |
| `--thinking <level>` | Reasoning level (e.g. `medium`). |
| `--deliver` | Deliver the reply on a channel (see OpenClaw docs). |
| `--local` | Passes `--local` to `openclaw` (embedded mode per version). |
| `--to`, `--reply-channel`, `--reply-to` | See examples in `openclaw agent` docs. |
| `--dry-run` | Print the command line without running it. |

## OpenClaw binary

By default the `openclaw` command on **PATH** is used. To force a path:

```bash
export OPENCLAW_BIN=/path/to/openclaw
npm run ask -- "hello"
```

## See also

- [Diagnostics & usage](openclaw-diagnostics-and-usage.md)  
- [Troubleshooting](troubleshooting.md) (gateway, config)
