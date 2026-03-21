/**
 * OpenClaw gateway plugin: memory slot implementation using TokenOptimizer
 * so gateway memory_search calls getOptimizedContext (and token-metrics.json updates).
 *
 * Types are kept local so `tsc` does not require `moduleResolution: node16` for
 * `openclaw/plugin-sdk` package exports (see openclaw package.json "exports").
 */
import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';
import * as fs from 'fs/promises';
import * as path from 'path';
import { OpenClawTokenOptimizerPlugin } from './openclaw-plugin';

/** Subset of OpenClawPluginToolContext — enough for memory tools. */
type MemoryToolContext = {
  config?: unknown;
  workspaceDir?: string;
  sessionKey?: string;
  agentId?: string;
};

type AgentToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  details: unknown;
};

const MemorySearchSchema = Type.Object({
  query: Type.String(),
  maxResults: Type.Optional(Type.Number()),
  minScore: Type.Optional(Type.Number()),
});

const MemoryGetSchema = Type.Object({
  path: Type.String(),
  from: Type.Optional(Type.Number()),
  lines: Type.Optional(Type.Number()),
});

/** Compatible with OpenClaw AnyAgentTool for memory_search / memory_get. */
type MemoryAgentTool = {
  label: string;
  name: string;
  description: string;
  parameters: typeof MemorySearchSchema | typeof MemoryGetSchema;
  execute: (
    toolCallId: string,
    params: unknown,
    signal?: AbortSignal
  ) => Promise<AgentToolResult>;
};

type OpenClawPluginApiSubset = {
  registerTool: (
    factory: (ctx: MemoryToolContext) => MemoryAgentTool[] | MemoryAgentTool | null | undefined,
    opts?: { names?: string[] }
  ) => void;
};

function jsonResult(payload: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
    details: payload,
  };
}

function readStringParam(
  params: Record<string, unknown>,
  key: string,
  opts?: { required?: boolean }
): string | undefined {
  const v = params[key];
  if (v === undefined || v === null) {
    if (opts?.required) {
      throw new Error(`missing ${key}`);
    }
    return undefined;
  }
  if (typeof v !== 'string') {
    throw new Error(`${key} must be a string`);
  }
  return v;
}

function readNumberParam(
  params: Record<string, unknown>,
  key: string,
  opts?: { integer?: boolean }
): number | undefined {
  const v = params[key];
  if (v === undefined || v === null) {
    return undefined;
  }
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) {
    throw new Error(`${key} must be a number`);
  }
  if (opts?.integer && !Number.isInteger(n)) {
    throw new Error(`${key} must be an integer`);
  }
  return n;
}

function safeResolveWorkspacePath(workspaceDir: string | undefined, relPath: string): string {
  const root = workspaceDir ? path.resolve(workspaceDir) : path.resolve(process.cwd());
  const normalized = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const full = path.resolve(root, normalized);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (full !== root && !full.startsWith(rootWithSep)) {
    throw new Error('path escapes workspace');
  }
  return full;
}

const pluginSingleton = new OpenClawTokenOptimizerPlugin();

const memoryPlugin = {
  id: 'openclaw-token-optimizer',
  name: 'Memory (Token Optimizer)',
  description:
    'Semantic memory via openclaw-token-optimizer (vector search + token savings metrics).',
  kind: 'memory' as const,
  configSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  },
  register(api: OpenClawPluginApiSubset) {
    api.registerTool(
      (ctx: MemoryToolContext) => {
        if (!ctx.config) {
          return null;
        }

        const searchTool: MemoryAgentTool = {
          label: 'Memory Search',
          name: 'memory_search',
          description:
            'Mandatory recall step: semantically search MEMORY.md + memory/*.md before answering questions about prior work, decisions, or preferences. Uses the token optimizer (metrics in logs/token-metrics.json).',
          parameters: MemorySearchSchema,
          execute: async (_toolCallId: string, params: unknown) => {
            const raw = params as Static<typeof MemorySearchSchema> & Record<string, unknown>;
            const query = readStringParam(raw, 'query', { required: true })!;
            const maxResults = readNumberParam(raw, 'maxResults');
            const workspaceDir = ctx.workspaceDir;
            try {
              const result = await pluginSingleton.memorySearch(query, {
                maxResults: maxResults ?? 5,
                workspaceDir: workspaceDir ?? undefined,
              });
              return jsonResult({
                results: [
                  {
                    path: 'token-optimizer-context.md',
                    startLine: 1,
                    endLine: 1,
                    score: 1,
                    snippet: result.context,
                    source: 'memory',
                  },
                ],
                provider: 'openclaw-token-optimizer',
                citations: 'auto',
                optimizerStats: result.stats,
              });
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              return jsonResult({
                results: [],
                disabled: true,
                unavailable: true,
                error: msg,
                warning: 'Memory search failed (token optimizer).',
                action: 'Check embedding model, memory paths, and logs.',
              });
            }
          },
        };

        const getTool: MemoryAgentTool = {
          label: 'Memory Get',
          name: 'memory_get',
          description:
            'Read a snippet from MEMORY.md or memory/*.md under the workspace (path relative to workspace root).',
          parameters: MemoryGetSchema,
          execute: async (_toolCallId: string, params: unknown) => {
            const raw = params as Static<typeof MemoryGetSchema> & Record<string, unknown>;
            const relPath = readStringParam(raw, 'path', { required: true })!;
            const from = readNumberParam(raw, 'from', { integer: true });
            const lines = readNumberParam(raw, 'lines', { integer: true });
            try {
              const fullPath = safeResolveWorkspacePath(ctx.workspaceDir, relPath);
              const fileText = await fs.readFile(fullPath, 'utf8');
              const textLines = fileText.split(/\r?\n/);
              const start = from ?? 1;
              const slice =
                lines !== undefined && lines > 0
                  ? textLines.slice(start - 1, start - 1 + lines)
                  : textLines.slice(start - 1);
              const text = slice.join('\n');
              return jsonResult({ path: relPath, text });
            } catch (err) {
              return jsonResult({
                path: relPath,
                text: '',
                disabled: true,
                error: err instanceof Error ? err.message : String(err),
              });
            }
          },
        };

        return [searchTool, getTool];
      },
      { names: ['memory_search', 'memory_get'] }
    );
  },
};

export default memoryPlugin;
