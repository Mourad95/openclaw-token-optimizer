/**
 * Defaults for OpenClaw **memory embeddings** when using `npm run setup` with
 * `OPENCLAW_TOKEN_OPTIMIZER_OLLAMA_MEMORY=1` (see docs/openclaw-memory-ollama.md).
 *
 * These apply only to OpenClaw’s `agents.defaults.memorySearch` — not to chat/orchestrator models.
 */

/** Ollama model used for memory embeddings if `OPENCLAW_OLLAMA_EMBEDDING_MODEL` is unset. */
export const DEFAULT_OLLAMA_EMBEDDING_MODEL = 'nomic-embed-text';

/**
 * Cloud embedding provider used only when Ollama fails, if `OPENCLAW_MEMORY_EMBEDDING_FALLBACK` is unset.
 * Prefer `gemini` here (small embedding API; see OpenClaw memory docs).
 */
export const DEFAULT_MEMORY_EMBEDDING_FALLBACK = 'gemini';
