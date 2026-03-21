#!/usr/bin/env node
/**
 * Pulls the default Ollama embedding model (keep in sync with src/openclaw-memory-defaults.ts).
 */
import { spawnSync } from 'child_process';

const DEFAULT_MODEL = 'nomic-embed-text';
const model = process.env.OPENCLAW_OLLAMA_EMBEDDING_MODEL?.trim() || DEFAULT_MODEL;

console.log(`ollama: pulling embedding model "${model}" …`);
const pull = spawnSync('ollama', ['pull', model], { stdio: 'inherit' });
if (pull.error && 'code' in pull.error && pull.error.code === 'ENOENT') {
  console.error(
    'ollama: command not found. Install Ollama first: https://ollama.com/download'
  );
  process.exit(127);
}
process.exit(pull.status ?? 1);
