#!/usr/bin/env node

const TokenOptimizer = require('./token-optimizer');
const path = require('path');
const fs = require('fs');

/**
 * OpenClaw Plugin for Token Optimization
 * 
 * Provides the interface that OpenClaw expects for memory search.
 * This is the main entry point that OpenClaw calls.
 */
class OpenClawTokenOptimizerPlugin {
  constructor() {
    this.optimizer = new TokenOptimizer({
      maxContextLength: 2000,
      maxTokens: 1000,
      cacheSize: 100,
      minRelevanceScore: 0.3,
      vectorMemory: {
        chunkSize: 500,
        overlap: 50
      }
    });
    
    this.initialized = false;
  }

  /**
   * Initialize the plugin
   */
  async initialize() {
    if (this.initialized) return;
    
    console.log('Initializing OpenClaw Token Optimizer Plugin...');
    await this.optimizer.initialize();
    
    // Auto-index memory files if they exist
    const memoryDir = this.getMemoryDir();
    if (fs.existsSync(memoryDir)) {
      console.log('Auto-indexing memory files...');
      const stats = await this.optimizer.vectorMemory.indexMemoryFiles(memoryDir);
      console.log(`Auto-indexed ${stats.indexed} chunks from ${stats.files} files`);
    }
    
    this.initialized = true;
    console.log('OpenClaw Token Optimizer Plugin ready');
  }

  /**
   * Get memory directory path
   */
  getMemoryDir() {
    // Check environment variable first
    if (process.env.OPENCLAW_MEMORY_DIR) {
      return process.env.OPENCLAW_MEMORY_DIR;
    }
    
    // Check workspace environment variable
    if (process.env.OPENCLAW_WORKSPACE) {
      return path.join(process.env.OPENCLAW_WORKSPACE, 'memory');
    }
    
    // Default to current directory
    return path.join(process.cwd(), 'memory');
  }

  /**
   * Main memory search function called by OpenClaw
   */
  async memorySearch(query, options = {}) {
    await this.initialize();
    
    const maxResults = options.maxResults || 5;
    const maxTokens = options.maxTokens || 1000;
    
    console.log(`OpenClaw memory search: "${query}" (maxResults: ${maxResults}, maxTokens: ${maxTokens})`);
    
    // Get optimized context
    const result = await this.optimizer.getOptimizedContext(query, maxResults);
    
    // Format response for OpenClaw
    return {
      context: result.context,
      query: result.query,
      stats: result.stats,
      metadata: {
        provider: 'openclaw-token-optimizer',
        version: '1.0.0',
        ...result.metadata
      }
    };
  }

  /**
   * Add conversation to memory (for OpenClaw integration)
   */
  async addConversation(userMessage, assistantResponse, metadata = {}) {
    await this.initialize();
    
    const result = await this.optimizer.addConversationToMemory(
      userMessage, 
      assistantResponse, 
      metadata
    );
    
    return {
      ...result,
      plugin: 'openclaw-token-optimizer'
    };
  }

  /**
   * Get plugin statistics
   */
  async getStats() {
    await this.initialize();
    
    const vectorStats = await this.optimizer.vectorMemory.getStats();
    const performanceStats = this.optimizer.getPerformanceStats();
    const memoryDir = this.getMemoryDir();
    
    return {
      plugin: {
        name: 'OpenClaw Token Optimizer',
        version: '1.0.0',
        initialized: this.initialized,
        memoryDir
      },
      vectorMemory: vectorStats,
      performance: performanceStats,
      settings: {
        maxContextLength: this.optimizer.maxContextLength,
        maxTokens: this.optimizer.maxTokens
      }
    };
  }

  /**
   * Run token savings analysis
   */
  async analyzeSavings() {
    await this.initialize();
    
    const memoryDir = this.getMemoryDir();
    const analysis = await this.optimizer.analyzeTokenSavings(memoryDir);
    
    return {
      analysis,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Clear cache and optionally rebuild index
   */
  async maintenance(options = {}) {
    await this.initialize();
    
    const actions = [];
    
    // Clear cache
    if (options.clearCache !== false) {
      const cacheResult = this.optimizer.clearCache();
      actions.push({ action: 'clearCache', result: cacheResult });
    }
    
    // Rebuild index if requested
    if (options.rebuildIndex) {
      await this.optimizer.vectorMemory.clearIndex();
      const memoryDir = this.getMemoryDir();
      const indexResult = await this.optimizer.vectorMemory.indexMemoryFiles(memoryDir);
      actions.push({ action: 'rebuildIndex', result: indexResult });
    }
    
    // Optimize index if supported
    if (options.optimize) {
      // Future: implement index optimization
      actions.push({ action: 'optimize', result: { message: 'Optimization not yet implemented' } });
    }
    
    return {
      actions,
      timestamp: new Date().toISOString()
    };
  }
}

// CLI Interface for OpenClaw
async function main() {
  const plugin = new OpenClawTokenOptimizerPlugin();
  
  const command = process.argv[2];
  
  // OpenClaw calls this with 'memory-search' as the first argument
  if (command === 'memory-search') {
    // Read query from stdin (OpenClaw sends JSON via stdin)
    let input = '';
    process.stdin.on('data', chunk => {
      input += chunk;
    });
    
    process.stdin.on('end', async () => {
      try {
        const request = JSON.parse(input);
        const result = await plugin.memorySearch(request.query, request.options || {});
        
        // Output result to stdout for OpenClaw
        process.stdout.write(JSON.stringify(result));
      } catch (error) {
        console.error('Error processing memory search:', error);
        process.stdout.write(JSON.stringify({
          error: error.message,
          context: ''
        }));
      }
    });
    
    return;
  }
  
  // Other CLI commands
  switch (command) {
    case 'search':
      const query = process.argv[3];
      const limit = process.argv[4] || 5;
      
      if (!query) {
        console.error('Usage: node openclaw-plugin.js search <query> [limit]');
        process.exit(1);
      }
      
      const result = await plugin.memorySearch(query, { maxResults: parseInt(limit) });
      console.log(JSON.stringify(result, null, 2));
      break;
      
    case 'stats':
      const stats = await plugin.getStats();
      console.log(JSON.stringify(stats, null, 2));
      break;
      
    case 'analyze':
      const analysis = await plugin.analyzeSavings();
      console.log(JSON.stringify(analysis, null, 2));
      break;
      
    case 'maintenance':
      const options = {
        clearCache: process.argv.includes('--clear-cache'),
        rebuildIndex: process.argv.includes('--rebuild'),
        optimize: process.argv.includes('--optimize')
      };
      const maintenanceResult = await plugin.maintenance(options);
      console.log(JSON.stringify(maintenanceResult, null, 2));
      break;
      
    case 'add':
      const userMsg = process.argv[3];
      const assistantMsg = process.argv[4];
      
      if (!userMsg || !assistantMsg) {
        console.error('Usage: node openclaw-plugin.js add "<user message>" "<assistant response>"');
        process.exit(1);
      }
      
      const added = await plugin.addConversation(userMsg, assistantMsg);
      console.log(JSON.stringify(added, null, 2));
      break;
      
    case 'test':
      // Test the plugin
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
  main().catch(error => {
    console.error('Plugin error:', error);
    process.exit(1);
  });
}

module.exports = OpenClawTokenOptimizerPlugin;
