#!/usr/bin/env node
/**
 * Sets `responseUsage` on every session entry in OpenClaw's `sessions.json` stores
 * so each reply can append a token usage footer (see OpenClaw `/usage` command).
 *
 * OpenClaw 2026.3.x does not expose `agents.defaults.responseUsage` in config;
 * new sessions start without `responseUsage` until `/usage tokens|full` is sent.
 * This script backfills (and optionally refreshes) all known session keys.
 *
 * Usage:
 *   node scripts/set-openclaw-session-response-usage.mjs
 *   RESPONSE_USAGE_MODE=full node scripts/set-openclaw-session-response-usage.mjs
 *   node scripts/set-openclaw-session-response-usage.mjs --force
 *
 * Env:
 *   OPENCLAW_STATE_DIR  default: ~/.openclaw
 *   RESPONSE_USAGE_MODE tokens | full | off  (default: tokens)
 *
 * Safety: stop the gateway before running if you want zero risk of concurrent writes:
 *   openclaw gateway stop   # or equivalent on your install
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const stateDir = process.env.OPENCLAW_STATE_DIR?.trim() || path.join(os.homedir(), '.openclaw');
const agentsDir = path.join(stateDir, 'agents');
const force = process.argv.includes('--force');
const rawMode = (process.env.RESPONSE_USAGE_MODE || 'tokens').toLowerCase().trim();
const allowed = new Set(['tokens', 'full', 'off', 'on']);
const mode = allowed.has(rawMode) ? rawMode : 'tokens';

if (!fs.existsSync(agentsDir)) {
  console.error(`No agents directory: ${agentsDir}`);
  process.exit(1);
}

let totalUpdated = 0;
for (const agentId of fs.readdirSync(agentsDir, { withFileTypes: true })) {
  if (!agentId.isDirectory()) continue;
  const file = path.join(agentsDir, agentId.name, 'sessions', 'sessions.json');
  if (!fs.existsSync(file)) continue;

  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.warn(`Skip (invalid JSON): ${file}`, e.message);
    continue;
  }

  let changed = 0;
  for (const [, entry] of Object.entries(data)) {
    if (!entry || typeof entry !== 'object' || typeof entry.sessionId !== 'string') continue;
    if (!force && entry.responseUsage !== undefined && entry.responseUsage !== null) continue;
    if (mode === 'off') {
      delete entry.responseUsage;
    } else {
      entry.responseUsage = mode === 'on' ? 'tokens' : mode;
    }
    changed++;
  }

  if (changed > 0) {
    fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
    console.log(`${file}  (${agentId.name})  → ${changed} session(s)`);
    totalUpdated += changed;
  }
}

console.log(totalUpdated === 0 ? 'No session entries updated (already set, or empty stores).' : `Done. Patched ${totalUpdated} session entr(y/ies).`);
