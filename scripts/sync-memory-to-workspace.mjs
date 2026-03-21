#!/usr/bin/env node
/**
 * Copies `memory/*.md` from this repo into `<OpenClaw workspace>/memory/`.
 * OpenClaw agents often use `agents.defaults.workspace` (e.g. $HOME) so memory
 * is `$HOME/memory`, not the repo's `./memory` — gateway memory_search uses that path.
 *
 * Skip: OPENCLAW_TOKEN_OPTIMIZER_SKIP_WORKSPACE_MEMORY_SYNC=1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'memory');

function readWorkspaceFromOpenClawConfig() {
  const cfgPath = path.join(os.homedir(), '.openclaw', 'openclaw.json');
  if (!fs.existsSync(cfgPath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(cfgPath, 'utf8');
    const cfg = JSON.parse(raw);
    const ws = cfg?.agents?.defaults?.workspace;
    return typeof ws === 'string' && ws.trim() ? path.resolve(ws.trim()) : null;
  } catch {
    return null;
  }
}

function main() {
  if (process.env.OPENCLAW_TOKEN_OPTIMIZER_SKIP_WORKSPACE_MEMORY_SYNC?.trim()) {
    console.log('sync-memory-to-workspace: skipped (OPENCLAW_TOKEN_OPTIMIZER_SKIP_WORKSPACE_MEMORY_SYNC)');
    return;
  }

  const workspace =
    process.env.OPENCLAW_WORKSPACE?.trim() || readWorkspaceFromOpenClawConfig();

  if (!workspace) {
    console.log(
      'sync-memory-to-workspace: no workspace (set OPENCLAW_WORKSPACE or agents.defaults.workspace in ~/.openclaw/openclaw.json); repo memory/ is unchanged on disk elsewhere.'
    );
    return;
  }

  const destDir = path.join(workspace, 'memory');
  if (!fs.existsSync(srcDir)) {
    console.warn('sync-memory-to-workspace: missing repo memory/; run memory:init first.');
    return;
  }

  fs.mkdirSync(destDir, { recursive: true });
  const names = fs.readdirSync(srcDir, { withFileTypes: true });
  let n = 0;
  for (const ent of names) {
    if (!ent.isFile() || !ent.name.endsWith('.md') || ent.name.startsWith('.')) {
      continue;
    }
    const from = path.join(srcDir, ent.name);
    const to = path.join(destDir, ent.name);
    fs.copyFileSync(from, to);
    n += 1;
    console.log(`sync-memory-to-workspace: ${ent.name} → ${to}`);
  }
  if (n === 0) {
    console.log('sync-memory-to-workspace: no .md files in repo memory/');
  }
}

main();
