#!/usr/bin/env node

import { TokenOptimizer } from './token-optimizer';
import * as path from 'path';
import * as fs from 'fs';
import type { MemorySearchOptions, MaintenanceOptions } from './types';
import { logger } from './logger';
import { ModelLoadError } from './errors';

export class OpenClawTokenOptimizerPlugin {
  optimizer: TokenOptimizer;
  initialized = false;

  constructor() {
    this.optimizer = new TokenOptimizer({
      maxContextLength: 2000,
      maxTokens: 1000,
      cacheSize: 100,
      minRelevanceScore: 0.3,
      vectorMemory: { chunkSize: 500, overlap: 50 },
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    logger.verbose('Initializing OpenClaw Token Optimizer Plugin...');
    await this.optimizer.initialize();

    const memoryDir = this.getMemoryDir();
    if (fs.existsSync(memoryDir)) {
      logger.verbose('Auto-indexing memory files...');
      const stats = await this.optimizer.vectorMemory.indexMemoryFiles(memoryDir);
      logger.verbose(`Auto-indexed ${stats.indexed} chunks from ${stats.files} files`);
    }

    this.initialized = true;
    logger.debug('OpenClaw Token Optimizer Plugin ready');
  }

  getMemoryDir(): string {
    if (process.env.OPENCLAW_MEMORY_DIR) {
      return process.env.OPENCLAW_MEMORY_DIR;
    }
    if (process.env.OPENCLAW_WORKSPACE) {
      return path.join(process.env.OPENCLAW_WORKSPACE, 'memory');
    }
    return path.join(process.cwd(), 'memory');
  }

  async memorySearch(
    query: string,
    options: MemorySearchOptions = {}
  ): Promise<{
    context: string;
    query: string;
    stats: {
      searchResults: number;
      selectedResults: number;
      duplicatesRemoved: number;
      estimatedTokens: number;
      potentialTokens: number;
      tokensSaved: number;
      savingsPercent: number;
      responseTime: number;
    };
    metadata: Record<string, unknown>;
  }> {
    await this.initialize();

    const maxResults = options.maxResults ?? 5;
    const _maxTokens = options.maxTokens ?? 1000;

    logger.verbose(`OpenClaw memory search: "${query}" (maxResults: ${maxResults}, maxTokens: ${_maxTokens})`);

    const result = await this.optimizer.getOptimizedContext(query, maxResults);

    return {
      context: result.context,
      query: result.query,
      stats: result.stats,
      metadata: {
        provider: 'openclaw-token-optimizer',
        version: '1.0.0',
        ...result.metadata,
      },
    };
  }

  async addConversation(
    userMessage: string,
    assistantResponse: string,
    metadata: Record<string, unknown> = {}
  ): Promise<{ plugin: string; [key: string]: unknown }> {
    await this.initialize();

    const result = await this.optimizer.addConversationToMemory(
      userMessage,
      assistantResponse,
      metadata
    );

    return { ...result, plugin: 'openclaw-token-optimizer' };
  }

  async getStats(): Promise<{
    plugin: { name: string; version: string; initialized: boolean; memoryDir: string };
    vectorMemory: Awaited<ReturnType<TokenOptimizer['vectorMemory']['getStats']>>;
    performance: ReturnType<TokenOptimizer['getPerformanceStats']>;
    settings: { maxContextLength: number; maxTokens: number };
  }> {
    await this.initialize();

    const vectorStats = await this.optimizer.vectorMemory.getStats();
    const performanceStats = this.optimizer.getPerformanceStats();
    const memoryDir = this.getMemoryDir();

    return {
      plugin: {
        name: 'OpenClaw Token Optimizer',
        version: '1.0.0',
        initialized: this.initialized,
        memoryDir,
      },
      vectorMemory: vectorStats,
      performance: performanceStats,
      settings: {
        maxContextLength: this.optimizer.maxContextLength,
        maxTokens: this.optimizer.maxTokens,
      },
    };
  }

  async analyzeSavings(): Promise<{ analysis: unknown; generatedAt: string }> {
    await this.initialize();

    const memoryDir = this.getMemoryDir();
    const analysis = await this.optimizer.analyzeTokenSavings(memoryDir);

    return {
      analysis,
      generatedAt: new Date().toISOString(),
    };
  }

  async maintenance(options: MaintenanceOptions = {}): Promise<{
    actions: Array<{ action: string; result: unknown }>;
    timestamp: string;
  }> {
    await this.initialize();

    const actions: Array<{ action: string; result: unknown }> = [];

    if (options.clearCache !== false) {
      const cacheResult = this.optimizer.clearCache();
      actions.push({ action: 'clearCache', result: cacheResult });
    }

    if (options.rebuildIndex) {
      await this.optimizer.vectorMemory.clearIndex();
      const memoryDir = this.getMemoryDir();
      const indexResult = await this.optimizer.vectorMemory.indexMemoryFiles(memoryDir);
      actions.push({ action: 'rebuildIndex', result: indexResult });
    }

    if (options.optimize) {
      actions.push({
        action: 'optimize',
        result: { message: 'Optimization not yet implemented' },
      });
    }

    return {
      actions,
      timestamp: new Date().toISOString(),
    };
  }
}

async function main(): Promise<void> {
  const plugin = new OpenClawTokenOptimizerPlugin();
  const command = process.argv[2];

  if (command === 'memory-search') {
    let input = '';
    process.stdin.on('data', (chunk: Buffer | string) => {
      input += chunk.toString();
    });

    process.stdin.on('end', async () => {
      try {
        const request = JSON.parse(input) as { query: string; options?: MemorySearchOptions };
        const result = await plugin.memorySearch(request.query, request.options || {});

        process.stdout.write(JSON.stringify(result));
      } catch (error) {
        console.error('Error processing memory search:', error);
        process.stdout.write(
          JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
            context: '',
          })
        );
      }
    });

    return;
  }

  switch (command) {
    case 'search': {
      const query = process.argv[3];
      const limit = process.argv[4] || '5';

      if (!query) {
        console.error('Usage: node openclaw-plugin.js search <query> [limit]');
        process.exit(1);
      }

      const result = await plugin.memorySearch(query, { maxResults: parseInt(limit) });
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case 'stats': {
      const stats = await plugin.getStats();
      console.log(JSON.stringify(stats, null, 2));
      break;
    }

    case 'analyze': {
      const analysis = await plugin.analyzeSavings();
      console.log(JSON.stringify(analysis, null, 2));
      break;
    }

    case 'maintenance': {
      const options: MaintenanceOptions = {
        clearCache: process.argv.includes('--clear-cache'),
        rebuildIndex: process.argv.includes('--rebuild'),
        optimize: process.argv.includes('--optimize'),
      };
      const maintenanceResult = await plugin.maintenance(options);
      console.log(JSON.stringify(maintenanceResult, null, 2));
      break;
    }

    case 'add': {
      const userMsg = process.argv[3];
      const assistantMsg = process.argv[4];

      if (!userMsg || !assistantMsg) {
        console.error(
          'Usage: node openclaw-plugin.js add "<user message>" "<assistant response>"'
        );
        process.exit(1);
      }

      const added = await plugin.addConversation(userMsg, assistantMsg);
      console.log(JSON.stringify(added, null, 2));
      break;
    }

    case 'test': {
      console.log('Testing OpenClaw Token Optimizer Plugin...');

      const testQuery = 'token optimization';
      const testResult = await plugin.memorySearch(testQuery, { maxResults: 3 });

      console.log('\n=== TEST RESULTS ===');
      console.log(`Query: "${testQuery}"`);
      console.log(`Context length: ${testResult.context.length} characters`);
      console.log(`Estimated tokens: ${testResult.stats.estimatedTokens}`);
      console.log(`Token savings: ${testResult.stats.savingsPercent}%`);
      console.log(`Response time: ${testResult.stats.responseTime}ms`);

      const pluginStats = await plugin.getStats();
      console.log('\n=== PLUGIN STATS ===');
      console.log(`Cache hit rate: ${pluginStats.performance.cacheHitRate}`);
      console.log(`Total queries: ${pluginStats.performance.queries}`);
      console.log(`Total tokens saved: ${pluginStats.performance.tokensSaved}`);
      break;
    }

    default:
      console.log('OpenClaw Token Optimizer Plugin');
      console.log('Usage:');
      console.log('  node openclaw-plugin.js memory-search          # OpenClaw integration (reads from stdin)');
      console.log('  node openclaw-plugin.js search <query> [limit] # Manual search');
      console.log('  node openclaw-plugin.js stats                  # Get plugin statistics');
      console.log('  node openclaw-plugin.js analyze                # Analyze token savings');
      console.log('  node openclaw-plugin.js maintenance [--rebuild] [--clear-cache]');
      console.log('  node openclaw-plugin.js add "<user>" "<assistant>"');
      console.log('  node openclaw-plugin.js test                   # Run tests');
      break;
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Plugin error:', error instanceof Error ? error.message : error);
    process.exit(error instanceof ModelLoadError ? 2 : 1);
  });
}
