/**
 * Optional logging for OpenClaw Token Optimizer.
 * Logs are only printed when OPENCLAW_TOKEN_OPTIMIZER_DEBUG or
 * OPENCLAW_TOKEN_OPTIMIZER_VERBOSE is set, so the plugin stays quiet in production.
 */

const DEBUG = process.env.OPENCLAW_TOKEN_OPTIMIZER_DEBUG === 'true' || process.env.OPENCLAW_TOKEN_OPTIMIZER_DEBUG === '1';
const VERBOSE = DEBUG || process.env.OPENCLAW_TOKEN_OPTIMIZER_VERBOSE === 'true' || process.env.OPENCLAW_TOKEN_OPTIMIZER_VERBOSE === '1';

export const logger = {
  debug(message: string, ...args: unknown[]): void {
    if (DEBUG) {
      console.log(`[token-optimizer] ${message}`, ...args);
    }
  },

  verbose(message: string, ...args: unknown[]): void {
    if (VERBOSE) {
      console.log(`[token-optimizer] ${message}`, ...args);
    }
  },
};
