#!/usr/bin/env node
/**
 * Ensures ./memory exists and seeds a sample Markdown file if the folder is empty.
 * Safe to run multiple times (does not overwrite existing notes).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const memoryDir = path.join(root, 'memory');

const SAMPLE_NAME = 'notes.md';
const SAMPLE = `# Memory

This folder is indexed by **OpenClaw Token Optimizer** (local Vectra index) and can be wired into OpenClaw via \`npm run openclaw:link\`.

Add your own \`.md\` files here; re-run \`npm run index\` after large changes (or use your OpenClaw memory indexer).
`;

if (!fs.existsSync(memoryDir)) {
  fs.mkdirSync(memoryDir, { recursive: true });
  console.log('Created directory: memory/');
}

const entries = fs.readdirSync(memoryDir, { withFileTypes: true });
const hasFile = entries.some((e) => e.isFile() && !e.name.startsWith('.'));
if (!hasFile) {
  const target = path.join(memoryDir, SAMPLE_NAME);
  fs.writeFileSync(target, SAMPLE, 'utf8');
  console.log(`Created sample file: memory/${SAMPLE_NAME}`);
} else {
  console.log('memory/ already contains files; left unchanged.');
}
