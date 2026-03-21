# Gateway memory plugin (token optimizer + metrics)

This package ships an OpenClaw **memory** plugin so the gateway’s `memory_search` / `memory_get` tools call **`TokenOptimizer.getOptimizedContext`** (`src/token-optimizer.ts`). That updates **`logs/token-metrics.json`** the same way CLI searches do.

Only **one** memory implementation can be active: OpenClaw selects it with **`plugins.slots.memory`**.

## Requirements

- [OpenClaw](https://docs.openclaw.ai) with plugin support (same major line as `peerDependencies.openclaw` in this repo’s `package.json`).
- This package **built** (`npm run build`) so `dist/src/openclaw-memory-plugin.js` exists (see `package.json` → `openclaw.extensions`).
- Manifest `openclaw.plugin.json` at the plugin root (shipped in the npm package / repo).

## Install the plugin

**From a local clone** (typical while developing):

1. Add the plugin root to **`plugins.load.paths`** in `~/.openclaw/openclaw.json` (absolute path to this repo), **or** install the package under your workspace / `node_modules` so discovery finds it.
2. Allow the plugin id in **`plugins.allow`** (and ensure **`plugins.entries.openclaw-token-optimizer`** if you use per-plugin config). The plugin **`id` must match `package.json` `name`** (`openclaw-token-optimizer`) — OpenClaw derives an id hint from the package name; a different manifest id causes a config warning.
3. Point the memory slot at this plugin:

```json
{
  "plugins": {
    "slots": {
      "memory": "openclaw-token-optimizer"
    }
  }
}
```

4. Restart the gateway: `openclaw gateway restart`.
5. Run **`openclaw doctor`** and fix any plugin validation errors.

**From npm** (if you publish or install the tarball): same steps; the package must include `openclaw.plugin.json` and the built extension file per `package.json` → `openclaw.extensions`.

## Behaviour

- **`memory_search`**: runs the token optimizer (vector search + dedup + `recordOptimizerRun`). Passes **`workspaceDir`** from the tool context so `memory/` resolves under the correct OpenClaw workspace.
- **`memory_get`**: reads a workspace-relative file (e.g. `MEMORY.md`, `memory/notes.md`) for small targeted reads after search.

Selecting this plugin **replaces** bundled **`memory-core`** (and other `kind: "memory"` plugins) for that slot — you do not run both at once.

## See also

- [metrics.md](metrics.md) — what `token-metrics.json` counts
- [README](../README.md) — `openclaw:link` vs this plugin (`openclaw:link` only wires `extraPaths` for the **default** memory stack; use **this** plugin when you want gateway traffic to hit the optimizer).
