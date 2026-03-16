#!/usr/bin/env node

const OpenClawTokenOptimizerPlugin = require('./openclaw-plugin');
const TokenOptimizer = require('./token-optimizer');
const { program } = require('commander');
const chalk = require('chalk');
const ora = require('ora');

/**
 * Main CLI entry point for OpenClaw Token Optimizer
 */

// Create program instance
program
  .name('openclaw-token-optimizer')
  .description('Optimize OpenClaw token consumption by 70-90% using vector embeddings')
  .version('1.0.0');

// Search command
program
  .command('search')
  .description('Search for relevant context using semantic search')
  .argument('<query>', 'Search query')
  .option('-l, --limit <number>', 'Maximum number of results', '5')
  .option('-v, --verbose', 'Show verbose output')
  .action(async (query, options) => {
    const spinner = ora('Searching for relevant context...').start();
    
    try {
      const plugin = new OpenClawTokenOptimizerPlugin();
      const result = await plugin.memorySearch(query, { 
        maxResults: parseInt(options.limit) 
      });
      
      spinner.succeed(chalk.green('Search completed'));
      
      if (options.verbose) {
        console.log(chalk.cyan('\n=== SEARCH RESULTS ==='));
        console.log(chalk.gray(`Query: "${query}"`));
        console.log(chalk.gray(`Results: ${result.stats.selectedResults}/${result.stats.searchResults}`));
        console.log(chalk.gray(`Duplicates removed: ${result.stats.duplicatesRemoved}`));
        console.log(chalk.gray(`Response time: ${result.stats.responseTime}ms`));
        
        console.log(chalk.cyan('\n=== TOKEN STATISTICS ==='));
        console.log(chalk.gray(`Estimated tokens: ${result.stats.estimatedTokens}`));
        console.log(chalk.gray(`Potential tokens: ${result.stats.potentialTokens}`));
        console.log(chalk.green(`Tokens saved: ${result.stats.tokensSaved} (${result.stats.savingsPercent}%)`));
        
        console.log(chalk.cyan('\n=== OPTIMIZED CONTEXT ==='));
        console.log(result.context);
      } else {
        console.log(chalk.cyan('\nOptimized Context:'));
        console.log(result.context);
        console.log(chalk.gray(`\nSaved ${result.stats.savingsPercent}% tokens (${result.stats.tokensSaved} tokens)`));
      }
    } catch (error) {
      spinner.fail(chalk.red('Search failed'));
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Analyze command
program
  .command('analyze')
  .description('Analyze token savings for your memory files')
  .option('-d, --dir <path>', 'Memory directory path')
  .option('-e, --export <file>', 'Export analysis to JSON file')
  .option('-v, --verbose', 'Show detailed analysis')
  .action(async (options) => {
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
      
      // Export if requested
      if (options.export) {
        const fs = require('fs');
        fs.writeFileSync(options.export, JSON.stringify(analysis, null, 2));
        console.log(chalk.gray(`Exported to: ${options.export}`));
      }
      
      // Display results
      const { totalFiles, totalCharacters, estimatedTokensFull, 
              estimatedTokensOptimized, tokensSaved, savingsPercent } = analysis.analysis;
      
      console.log(chalk.cyan('\n=== TOKEN SAVINGS ANALYSIS ==='));
      console.log(chalk.gray(`Memory files: ${totalFiles}`));
      console.log(chalk.gray(`Total characters: ${totalCharacters.toLocaleString()}`));
      console.log(chalk.gray(`Estimated tokens (full memory): ${estimatedTokensFull.toLocaleString()}`));
      console.log(chalk.gray(`Estimated tokens (optimized): ${estimatedTokensOptimized.toLocaleString()}`));
      console.log(chalk.green(`Tokens saved: ${tokensSaved.toLocaleString()} (${savingsPercent}%)`));
      
      console.log(chalk.cyan('\n=== EXPLANATION ==='));
      console.log(chalk.gray(analysis.explanation));
      
      if (options.verbose && analysis.recommendations.length > 0) {
        console.log(chalk.cyan('\n=== RECOMMENDATIONS ==='));
        analysis.recommendations.forEach(rec => {
          console.log(chalk.yellow(`• ${rec}`));
        });
      }
      
      // Show savings visualization
      if (savingsPercent > 0) {
        console.log(chalk.cyan('\n=== SAVINGS VISUALIZATION ==='));
        const barLength = 50;
        const savedBars = Math.floor((savingsPercent / 100) * barLength);
        const remainingBars = barLength - savedBars;
        
        console.log(chalk.green('█'.repeat(savedBars)) + 
                   chalk.gray('█'.repeat(remainingBars)) +
                   chalk.gray(` ${savingsPercent}% saved`));
      }
      
    } catch (error) {
      spinner.fail(chalk.red('Analysis failed'));
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Stats command
program
  .command('stats')
  .description('Get plugin statistics and performance metrics')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
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
      console.log(chalk.gray(`Average response time: ${Math.round(stats.performance.avgResponseTime)}ms`));
      
      console.log(chalk.cyan('\n=== SETTINGS ==='));
      console.log(chalk.gray(`Max context length: ${stats.settings.maxContextLength} chars`));
      console.log(chalk.gray(`Max tokens: ${stats.settings.maxTokens}`));
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to get statistics'));
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Index command
program
  .command('index')
  .description('Index memory files for vector search')
  .option('-d, --dir <path>', 'Memory directory to index')
  .option('-c, --clear', 'Clear existing index before indexing')
  .option('-v, --verbose', 'Show detailed progress')
  .action(async (options) => {
    const spinner = ora('Indexing memory files...').start();
    
    try {
      const plugin = new OpenClawTokenOptimizerPlugin();
      await plugin.initialize();
      
      if (options.clear) {
        spinner.text = 'Clearing existing index...';
        await plugin.optimizer.vectorMemory.clearIndex();
      }
      
      const memoryDir = options.dir || plugin.getMemoryDir();
      spinner.text = `Indexing files from: ${memoryDir}`;
      
      const result = await plugin.optimizer.vectorMemory.indexMemoryFiles(memoryDir);
      
      spinner.succeed(chalk.green('Indexing completed'));
      
      console.log(chalk.cyan('\n=== INDEXING RESULTS ==='));
      console.log(chalk.gray(`Files indexed: ${result.files}`));
      console.log(chalk.gray(`Chunks created: ${result.indexed}`));
      
      if (options.verbose && result.fileStats) {
        console.log(chalk.cyan('\n=== FILE DETAILS ==='));
        result.fileStats.forEach(stat => {
          console.log(chalk.gray(`${stat.file}: ${stat.chunks} chunks, ${stat.size} chars`));
        });
      }
      
    } catch (error) {
      spinner.fail(chalk.red('Indexing failed'));
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Maintenance command
program
  .command('maintenance')
  .description('Run maintenance tasks (cache cleanup, index optimization)')
  .option('--clear-cache', 'Clear query cache')
  .option('--rebuild-index', 'Rebuild vector index from scratch')
  .option('--optimize', 'Optimize index (future feature)')
  .action(async (options) => {
    const spinner = ora('Running maintenance tasks...').start();
    
    try {
      const plugin = new OpenClawTokenOptimizerPlugin();
      const result = await plugin.maintenance({
        clearCache: options.clearCache,
        rebuildIndex: options.rebuildIndex,
        optimize: options.optimize
      });
      
      spinner.succeed(chalk.green('Maintenance completed'));
      
      console.log(chalk.cyan('\n=== MAINTENANCE RESULTS ==='));
      result.actions.forEach(action => {
        console.log(chalk.gray(`${action.action}: ${JSON.stringify(action.result)}`));
      });
      
    } catch (error) {
      spinner.fail(chalk.red('Maintenance failed'));
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Test command
program
  .command('test')
  .description('Run comprehensive tests')
  .option('-v, --verbose', 'Show detailed test output')
  .action(async (options) => {
    console.log(chalk.cyan('Running OpenClaw Token Optimizer tests...\n'));
    
    const tests = [
      { name: 'Plugin initialization', fn: testPluginInit },
      { name: 'Vector memory search', fn: testVectorSearch },
      { name: 'Token optimization', fn: testTokenOptimization },
      { name: 'Performance metrics', fn: testPerformance }
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
          console.error(chalk.red('Error:'), error.message);
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

// Test functions
async function testPluginInit() {
  const plugin = new OpenClawTokenOptimizerPlugin();
  await plugin.initialize();
  
  const stats = await plugin.getStats();
  if (!stats.plugin.initialized) {
    throw new Error('Plugin not initialized');
  }
}

async function testVectorSearch() {
  const plugin = new OpenClawTokenOptimizerPlugin();
  await plugin.initialize();
  
  const result = await plugin.memorySearch('test', { maxResults: 2 });
  if (!result.context || typeof result.context !== 'string') {
    throw new Error('Invalid search result');
  }
}

async function testTokenOptimization() {
  const optimizer = new TokenOptimizer();
  await optimizer.initialize();
  
  const analysis = await optimizer.analyzeTokenSavings();
  if (analysis.error && analysis.error !== 'Memory directory not found') {
    throw new Error('Token analysis failed');
  }
}

async function testPerformance() {
  const plugin = new OpenClawTokenOptimizerPlugin();
  await plugin.initialize();
  
  const startTime = Date.now();
  await plugin.memorySearch('performance test', { maxResults: 1 });
  const responseTime = Date.now() - startTime;
  
  if (responseTime > 5000) { // 5 seconds max
    throw new Error(`Response time too slow: ${responseTime}ms`);
  }
}

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
