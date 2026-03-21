#!/usr/bin/env node

import chalk from 'chalk';
import ora from 'ora';
import { OpenClawTokenOptimizerPlugin } from './openclaw-plugin';
import { TokenOptimizer } from './token-optimizer';
import { program } from 'commander';
import * as fs from 'fs';
import { ModelLoadError } from './errors';
import {
  loadMetrics,
  resolveMetricsFilePath,
  averageSavingsPercent,
  resetMetrics,
} from './metrics-store';
import {
  buildOpenClawAgentArgs,
  resolveOpenClawBinary,
  runOpenClawAgent,
} from './openclaw-cli';

program
  .name('openclaw-token-optimizer')
  .description('Optimize OpenClaw token consumption by 70-90% using vector embeddings')
  .version('1.0.0');

program
  .command('search')
  .description('Search for relevant context using semantic search')
  .argument('<query>', 'Search query')
  .option('-l, --limit <number>', 'Maximum number of results', '5')
  .option('-v, --verbose', 'Show verbose output')
  .action(async (query: string, options: { limit?: string; verbose?: boolean }) => {
    const spinner = ora('Searching for relevant context...').start();

    try {
      const plugin = new OpenClawTokenOptimizerPlugin();
      const result = await plugin.memorySearch(query, {
        maxResults: parseInt(options.limit ?? '5'),
      });

      spinner.succeed(chalk.green('Search completed'));

      if (options.verbose) {
        console.log(chalk.cyan('\n=== SEARCH RESULTS ==='));
        console.log(chalk.gray(`Query: "${query}"`));
        console.log(
          chalk.gray(
            `Results: ${result.stats.selectedResults}/${result.stats.searchResults}`
          )
        );
        console.log(chalk.gray(`Duplicates removed: ${result.stats.duplicatesRemoved}`));
        console.log(chalk.gray(`Response time: ${result.stats.responseTime}ms`));

        console.log(chalk.cyan('\n=== TOKEN STATISTICS ==='));
        console.log(chalk.gray(`Estimated tokens: ${result.stats.estimatedTokens}`));
        console.log(chalk.gray(`Potential tokens: ${result.stats.potentialTokens}`));
        console.log(
          chalk.green(
            `Tokens saved: ${result.stats.tokensSaved} (${result.stats.savingsPercent}%)`
          )
        );

        console.log(chalk.cyan('\n=== OPTIMIZED CONTEXT ==='));
        console.log(result.context);
      } else {
        console.log(chalk.cyan('\nOptimized Context:'));
        console.log(result.context);
        console.log(
          chalk.gray(
            `\nSaved ${result.stats.savingsPercent}% tokens (${result.stats.tokensSaved} tokens)`
          )
        );
      }
    } catch (error) {
      spinner.fail(chalk.red('Search failed'));
      console.error(chalk.red('Error:'), (error as Error).message);
      if (error instanceof ModelLoadError) {
        console.error(chalk.gray('Tip: Check network connectivity and disk space, then retry.'));
        process.exit(2);
      }
      process.exit(1);
    }
  });

program
  .command('analyze')
  .description('Analyze token savings for your memory files')
  .option('-d, --dir <path>', 'Memory directory path')
  .option('-e, --export <file>', 'Export analysis to JSON file')
  .option('-v, --verbose', 'Show detailed analysis')
  .action(
    async (options: { dir?: string; export?: string; verbose?: boolean }) => {
      const spinner = ora('Analyzing token savings...').start();

      try {
        const optimizer = new TokenOptimizer();
        await optimizer.initialize();

        const analysis = await optimizer.analyzeTokenSavings(options.dir);

        if (analysis.error) {
          spinner.fail(chalk.red('Analysis failed'));
          console.error(chalk.red('Error:'), analysis.error);
          return;
        }

        spinner.succeed(chalk.green('Analysis completed'));

        if (options.export && analysis) {
          fs.writeFileSync(options.export, JSON.stringify(analysis, null, 2));
          console.log(chalk.gray(`Exported to: ${options.export}`));
        }

        if (!analysis.analysis) return;

        const {
          totalFiles,
          totalCharacters,
          estimatedTokensFull,
          estimatedTokensOptimized,
          tokensSaved,
          savingsPercent,
        } = analysis.analysis;

        console.log(chalk.cyan('\n=== TOKEN SAVINGS ANALYSIS ==='));
        console.log(chalk.gray(`Memory files: ${totalFiles}`));
        console.log(chalk.gray(`Total characters: ${totalCharacters.toLocaleString()}`));
        console.log(
          chalk.gray(
            `Estimated tokens (full memory): ${estimatedTokensFull.toLocaleString()}`
          )
        );
        console.log(
          chalk.gray(
            `Estimated tokens (optimized): ${estimatedTokensOptimized.toLocaleString()}`
          )
        );
        console.log(
          chalk.green(`Tokens saved: ${tokensSaved.toLocaleString()} (${savingsPercent}%)`)
        );

        console.log(chalk.cyan('\n=== EXPLANATION ==='));
        console.log(chalk.gray(analysis.explanation ?? ''));

        if (options.verbose && analysis.recommendations && analysis.recommendations.length > 0) {
          console.log(chalk.cyan('\n=== RECOMMENDATIONS ==='));
          analysis.recommendations.forEach((rec: string) => {
            console.log(chalk.yellow(`• ${rec}`));
          });
        }

        if (savingsPercent > 0) {
          console.log(chalk.cyan('\n=== SAVINGS VISUALIZATION ==='));
          const barLength = 50;
          const savedBars = Math.floor((savingsPercent / 100) * barLength);
          const remainingBars = barLength - savedBars;

          console.log(
            chalk.green('█'.repeat(savedBars)) +
              chalk.gray('█'.repeat(remainingBars)) +
              chalk.gray(` ${savingsPercent}% saved`)
          );
        }
      } catch (error) {
        spinner.fail(chalk.red('Analysis failed'));
        console.error(chalk.red('Error:'), (error as Error).message);
        if (error instanceof ModelLoadError) {
          console.error(chalk.gray('Tip: Check network connectivity and disk space, then retry.'));
          process.exit(2);
        }
        process.exit(1);
      }
    }
  );

program
  .command('stats')
  .description('Get plugin statistics and performance metrics')
  .option('-j, --json', 'Output as JSON')
  .action(async (options: { json?: boolean }) => {
    const spinner = ora('Gathering statistics...').start();

    try {
      const plugin = new OpenClawTokenOptimizerPlugin();
      const stats = await plugin.getStats();

      spinner.succeed(chalk.green('Statistics gathered'));

      if (options.json) {
        console.log(JSON.stringify(stats, null, 2));
        return;
      }

      console.log(chalk.cyan('\n=== PLUGIN STATISTICS ==='));
      console.log(chalk.gray(`Name: ${stats.plugin.name}`));
      console.log(chalk.gray(`Version: ${stats.plugin.version}`));
      console.log(chalk.gray(`Memory directory: ${stats.plugin.memoryDir}`));
      console.log(chalk.gray(`Initialized: ${stats.plugin.initialized ? 'Yes' : 'No'}`));

      console.log(chalk.cyan('\n=== VECTOR MEMORY ==='));
      console.log(chalk.gray(`Embedding model: ${stats.vectorMemory.embeddingModel}`));
      console.log(chalk.gray(`Index path: ${stats.vectorMemory.indexPath}`));
      console.log(chalk.gray(`Estimated items: ${stats.vectorMemory.estimatedItems}`));

      console.log(chalk.cyan('\n=== PERFORMANCE ==='));
      console.log(chalk.gray(`Total queries: ${stats.performance.queries}`));
      console.log(chalk.gray(`Cache hits: ${stats.performance.cacheHits}`));
      console.log(chalk.gray(`Cache hit rate: ${stats.performance.cacheHitRate}`));
      console.log(chalk.gray(`Total tokens saved: ${stats.performance.tokensSaved}`));
      console.log(
        chalk.gray(`Average response time: ${Math.round(stats.performance.avgResponseTime)}ms`)
      );

      const cm = stats.metrics.cumulative;
      console.log(chalk.cyan('\n=== CUMULATIVE METRICS (persisted) ==='));
      console.log(chalk.gray(`File: ${stats.metrics.filePath}`));
      console.log(
        chalk.green(
          `Tokens saved (all time): ${cm.tokensSaved.toLocaleString()} (~${cm.averageSavingsPercent}% vs potential)`
        )
      );
      console.log(
        chalk.gray(
          `Optimizer runs recorded: ${cm.optimizerRuns.toLocaleString()} · Potential tokens (sum): ${cm.potentialTokensTotal.toLocaleString()}`
        )
      );
      console.log(chalk.gray(`Last update: ${cm.updatedAt}`));

      console.log(chalk.cyan('\n=== SETTINGS ==='));
      console.log(chalk.gray(`Max context length: ${stats.settings.maxContextLength} chars`));
      console.log(chalk.gray(`Max tokens: ${stats.settings.maxTokens}`));
    } catch (error) {
      spinner.fail(chalk.red('Failed to get statistics'));
      console.error(chalk.red('Error:'), (error as Error).message);
      if (error instanceof ModelLoadError) {
        console.error(chalk.gray('Tip: Check network connectivity and disk space, then retry.'));
        process.exit(2);
      }
      process.exit(1);
    }
  });

program
  .command('metrics')
  .description('Show cumulative token savings persisted on disk (survives restarts)')
  .option('-j, --json', 'Output as JSON')
  .option('--reset', 'Reset cumulative metrics file')
  .action(async (options: { json?: boolean; reset?: boolean }) => {
    if (options.reset) {
      resetMetrics();
      if (options.json) {
        console.log(JSON.stringify({ reset: true, filePath: resolveMetricsFilePath() }, null, 2));
      } else {
        console.log(chalk.green('Cumulative metrics reset.'));
        console.log(chalk.gray(`File: ${resolveMetricsFilePath()}`));
      }
      return;
    }

    const m = loadMetrics();
    const avg = averageSavingsPercent(m.cumulative);
    const filePath = resolveMetricsFilePath();

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            filePath,
            cumulative: {
              ...m.cumulative,
              averageSavingsPercent: avg,
            },
          },
          null,
          2
        )
      );
      return;
    }

    console.log(chalk.cyan('\n=== CUMULATIVE TOKEN METRICS ==='));
    console.log(chalk.gray(`File: ${filePath}`));
    console.log(
      chalk.green(`Tokens saved (total): ${m.cumulative.tokensSaved.toLocaleString()}`)
    );
    console.log(
      chalk.gray(
        `Approx. average savings vs potential: ${avg}% (sum of potential tokens: ${m.cumulative.potentialTokensTotal.toLocaleString()})`
      )
    );
    console.log(
      chalk.gray(
        `Optimizer runs recorded: ${m.cumulative.optimizerRuns.toLocaleString()} (excludes in-memory cache hits)`
      )
    );
    console.log(chalk.gray(`Last update: ${m.cumulative.updatedAt}`));
  });

program
  .command('ask')
  .description(
    'Send a message to OpenClaw (runs `openclaw agent --message …`; gateway must be running unless you use --local)'
  )
  .argument('<message...>', 'Message for the agent')
  .option('-a, --agent <id>', 'Target agent id (e.g. main, coder)')
  .option('-s, --session-id <id>', 'Existing session id')
  .option('--thinking <level>', 'Thinking level (e.g. low, medium, high)')
  .option('--deliver', 'Deliver response via channel')
  .option('--local', 'Use embedded/local agent (OpenClaw --local)')
  .option('--to <target>', 'Delivery target (e.g. phone), for --deliver flows')
  .option('--reply-channel <name>', 'With --deliver: reply channel (e.g. slack)')
  .option('--reply-to <ref>', 'With --deliver: reply target (e.g. #channel)')
  .option('--dry-run', 'Print the openclaw invocation without running it')
  .action(
    (
      messageParts: string[],
      options: {
        agent?: string;
        sessionId?: string;
        thinking?: string;
        deliver?: boolean;
        local?: boolean;
        to?: string;
        replyChannel?: string;
        replyTo?: string;
        dryRun?: boolean;
      }
    ) => {
      const text = messageParts.join(' ').trim();
      if (!text) {
        console.error(chalk.red('Message is required.'));
        process.exit(1);
      }

      const invoke = {
        message: text,
        agent: options.agent,
        sessionId: options.sessionId,
        thinking: options.thinking,
        deliver: options.deliver,
        local: options.local,
        to: options.to,
        replyChannel: options.replyChannel,
        replyTo: options.replyTo,
      };

      if (options.dryRun) {
        const bin = resolveOpenClawBinary();
        const argv = buildOpenClawAgentArgs(invoke);
        const quoted = (s: string) => (/\s/.test(s) ? `'${s.replace(/'/g, "'\\''")}'` : s);
        console.log(chalk.gray([bin, ...argv.map(quoted)].join(' ')));
        return;
      }

      process.exit(runOpenClawAgent(invoke));
    }
  );

program
  .command('index')
  .description('Index memory files for vector search')
  .option('-d, --dir <path>', 'Memory directory to index')
  .option('-c, --clear', 'Clear existing index before indexing')
  .option('-v, --verbose', 'Show detailed progress')
  .action(async (options: { dir?: string; clear?: boolean; verbose?: boolean }) => {
    const spinner = ora('Indexing memory files...').start();

    try {
      const plugin = new OpenClawTokenOptimizerPlugin();
      await plugin.initialize();

      if (options.clear) {
        spinner.text = 'Clearing existing index...';
        await plugin.optimizer.vectorMemory.clearIndex();
      }

      const memoryDir = options.dir ?? plugin.getMemoryDir();
      spinner.text = `Indexing files from: ${memoryDir}`;

      const result = await plugin.optimizer.vectorMemory.indexMemoryFiles(memoryDir);

      spinner.succeed(chalk.green('Indexing completed'));

      console.log(chalk.cyan('\n=== INDEXING RESULTS ==='));
      console.log(chalk.gray(`Files indexed: ${result.files}`));
      console.log(chalk.gray(`Chunks created: ${result.indexed}`));

      if (options.verbose && result.fileStats) {
        console.log(chalk.cyan('\n=== FILE DETAILS ==='));
        result.fileStats.forEach((stat: { file: string; chunks: number; size: number }) => {
          console.log(chalk.gray(`${stat.file}: ${stat.chunks} chunks, ${stat.size} chars`));
        });
      }
    } catch (error) {
      spinner.fail(chalk.red('Indexing failed'));
      console.error(chalk.red('Error:'), (error as Error).message);
      if (error instanceof ModelLoadError) {
        console.error(chalk.gray('Tip: Check network connectivity and disk space, then retry.'));
        process.exit(2);
      }
      process.exit(1);
    }
  });

program
  .command('maintenance')
  .description('Run maintenance tasks (cache cleanup, index optimization)')
  .option('--clear-cache', 'Clear query cache')
  .option('--rebuild-index', 'Rebuild vector index from scratch')
  .option('--optimize', 'Optimize index (future feature)')
  .action(
    async (options: { clearCache?: boolean; rebuildIndex?: boolean; optimize?: boolean }) => {
      const spinner = ora('Running maintenance tasks...').start();

      try {
        const plugin = new OpenClawTokenOptimizerPlugin();
        const result = await plugin.maintenance({
          clearCache: options.clearCache,
          rebuildIndex: options.rebuildIndex,
          optimize: options.optimize,
        });

        spinner.succeed(chalk.green('Maintenance completed'));

        console.log(chalk.cyan('\n=== MAINTENANCE RESULTS ==='));
        result.actions.forEach((action: { action: string; result: unknown }) => {
          console.log(chalk.gray(`${action.action}: ${JSON.stringify(action.result)}`));
        });
      } catch (error) {
        spinner.fail(chalk.red('Maintenance failed'));
        console.error(chalk.red('Error:'), (error as Error).message);
        if (error instanceof ModelLoadError) {
          console.error(chalk.gray('Tip: Check network connectivity and disk space, then retry.'));
          process.exit(2);
        }
        process.exit(1);
      }
    }
  );

program
  .command('test')
  .description('Run comprehensive tests')
  .option('-v, --verbose', 'Show detailed test output')
  .action(async (options: { verbose?: boolean }) => {
    console.log(chalk.cyan('Running OpenClaw Token Optimizer tests...\n'));

    const tests = [
      { name: 'Plugin initialization', fn: testPluginInit },
      { name: 'Vector memory search', fn: testVectorSearch },
      { name: 'Token optimization', fn: testTokenOptimization },
      { name: 'Performance metrics', fn: testPerformance },
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      const spinner = ora(`Running: ${test.name}`).start();

      try {
        await test.fn(options);
        spinner.succeed(chalk.green(`${test.name}: PASSED`));
        passed++;
      } catch (error) {
        spinner.fail(chalk.red(`${test.name}: FAILED`));
        if (options.verbose) {
          console.error(chalk.red('Error:'), (error as Error).message);
        }
        failed++;
      }
    }

    console.log(chalk.cyan('\n=== TEST SUMMARY ==='));
    console.log(chalk.green(`Passed: ${passed}`));
    if (failed > 0) {
      console.log(chalk.red(`Failed: ${failed}`));
    } else {
      console.log(chalk.green('All tests passed!'));
    }
  });

async function testPluginInit(_options?: { verbose?: boolean }): Promise<void> {
  const plugin = new OpenClawTokenOptimizerPlugin();
  await plugin.initialize();

  const stats = await plugin.getStats();
  if (!stats.plugin.initialized) {
    throw new Error('Plugin not initialized');
  }
}

async function testVectorSearch(_options?: { verbose?: boolean }): Promise<void> {
  const plugin = new OpenClawTokenOptimizerPlugin();
  await plugin.initialize();

  const result = await plugin.memorySearch('test', { maxResults: 2 });
  if (!result.context || typeof result.context !== 'string') {
    throw new Error('Invalid search result');
  }
}

async function testTokenOptimization(_options?: { verbose?: boolean }): Promise<void> {
  const optimizer = new TokenOptimizer();
  await optimizer.initialize();

  const analysis = await optimizer.analyzeTokenSavings();
  if (analysis.error && analysis.error !== 'Memory directory not found') {
    throw new Error('Token analysis failed');
  }
}

async function testPerformance(_options?: { verbose?: boolean }): Promise<void> {
  const plugin = new OpenClawTokenOptimizerPlugin();
  await plugin.initialize();

  const startTime = Date.now();
  await plugin.memorySearch('performance test', { maxResults: 1 });
  const responseTime = Date.now() - startTime;

  if (responseTime > 5000) {
    throw new Error(`Response time too slow: ${responseTime}ms`);
  }
}

program.parse();

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
