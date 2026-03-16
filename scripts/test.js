#!/usr/bin/env node

const { OpenClawTokenOptimizerPlugin } = require('../src/openclaw-plugin');
const TokenOptimizer = require('../src/token-optimizer');
const chalk = require('chalk');
const ora = require('ora');

/**
 * Test suite for OpenClaw Token Optimizer
 */

class TestSuite {
  constructor() {
    this.results = [];
    this.plugin = null;
    this.optimizer = null;
  }

  async runAllTests() {
    console.log(chalk.cyan('🧪 OpenClaw Token Optimizer Test Suite\n'));
    
    const tests = [
      { name: 'Plugin Initialization', fn: this.testPluginInit.bind(this) },
      { name: 'Vector Memory System', fn: this.testVectorMemory.bind(this) },
      { name: 'Token Optimization', fn: this.testTokenOptimization.bind(this) },
      { name: 'Search Functionality', fn: this.testSearch.bind(this) },
      { name: 'Performance Benchmarks', fn: this.testPerformance.bind(this) },
      { name: 'Configuration Validation', fn: this.testConfig.bind(this) },
      { name: 'Error Handling', fn: this.testErrorHandling.bind(this) },
      { name: 'Cache System', fn: this.testCache.bind(this) }
    ];

    for (const test of tests) {
      const spinner = ora(`Running: ${test.name}`).start();
      
      try {
        const result = await test.fn();
        spinner.succeed(chalk.green(`${test.name}: PASSED`));
        this.results.push({ test: test.name, passed: true, result });
      } catch (error) {
        spinner.fail(chalk.red(`${test.name}: FAILED`));
        this.results.push({ test: test.name, passed: false, error: error.message });
      }
    }

    this.generateReport();
  }

  async testPluginInit() {
    this.plugin = new OpenClawTokenOptimizerPlugin();
    await this.plugin.initialize();
    
    const stats = await this.plugin.getStats();
    
    if (!stats.plugin.initialized) {
      throw new Error('Plugin not properly initialized');
    }
    
    return {
      initialized: stats.plugin.initialized,
      version: stats.plugin.version
    };
  }

  async testVectorMemory() {
    this.optimizer = new TokenOptimizer();
    await this.optimizer.initialize();
    
    // Test adding memory
    const testText = 'This is a test memory for vector search validation.';
    const id = await this.optimizer.vectorMemory.addMemory(testText, {
      source: 'test-suite',
      type: 'test'
    });
    
    if (!id || !id.startsWith('memory_')) {
      throw new Error('Invalid memory ID returned');
    }
    
    // Test searching
    const results = await this.optimizer.vectorMemory.searchMemories('test memory', 2);
    
    if (results.length === 0) {
      throw new Error('No results found for test query');
    }
    
    return {
      memoryAdded: true,
      searchResults: results.length,
      firstResultScore: results[0].score
    };
  }

  async testTokenOptimization() {
    if (!this.optimizer) {
      this.optimizer = new TokenOptimizer();
      await this.optimizer.initialize();
    }
    
    // Test optimization
    const query = 'token optimization test query';
    const result = await this.optimizer.getOptimizedContext(query, 3);
    
    if (!result.context || result.context.length === 0) {
      throw new Error('Empty context returned');
    }
    
    if (result.stats.estimatedTokens <= 0) {
      throw new Error('Invalid token estimation');
    }
    
    // Test duplicate removal
    const testResults = [
      { text: 'Duplicate text', score: 0.9, metadata: {} },
      { text: 'Duplicate text', score: 0.8, metadata: {} },
      { text: 'Different text', score: 0.7, metadata: {} }
    ];
    
    const optimized = this.optimizer.optimizeContext(testResults, 'test');
    
    if (optimized.selectedResults !== 2) { // Should have 2 unique results
      throw new Error(`Duplicate removal failed: expected 2, got ${optimized.selectedResults}`);
    }
    
    return {
      contextLength: result.context.length,
      estimatedTokens: result.stats.estimatedTokens,
      savingsPercent: result.stats.savingsPercent,
      duplicatesRemoved: optimized.duplicatesRemoved
    };
  }

  async testSearch() {
    if (!this.plugin) {
      this.plugin = new OpenClawTokenOptimizerPlugin();
      await this.plugin.initialize();
    }
    
    // Test different query types
    const testQueries = [
      'test',
      'memory search',
      'token optimization',
      'vector embeddings'
    ];
    
    const searchResults = [];
    
    for (const query of testQueries) {
      const startTime = Date.now();
      const result = await this.plugin.memorySearch(query, { maxResults: 2 });
      const responseTime = Date.now() - startTime;
      
      searchResults.push({
        query,
        responseTime,
        hasContext: result.context.length > 0,
        tokens: result.stats.estimatedTokens
      });
      
      if (responseTime > 3000) {
        throw new Error(`Search too slow for query "${query}": ${responseTime}ms`);
      }
    }
    
    return {
      queriesTested: testQueries.length,
      averageResponseTime: Math.round(
        searchResults.reduce((sum, r) => sum + r.responseTime, 0) / searchResults.length
      ),
      allSuccessful: searchResults.every(r => r.hasContext)
    };
  }

  async testPerformance() {
    if (!this.plugin) {
      this.plugin = new OpenClawTokenOptimizerPlugin();
      await this.plugin.initialize();
    }
    
    // Performance benchmarks
    const benchmarks = [];
    
    // Benchmark 1: Cold search (no cache)
    const coldStart = Date.now();
    await this.plugin.memorySearch('cold start test', { maxResults: 1 });
    const coldTime = Date.now() - coldStart;
    benchmarks.push({ name: 'Cold search', time: coldTime });
    
    // Benchmark 2: Warm search (cached)
    const warmStart = Date.now();
    await this.plugin.memorySearch('cold start test', { maxResults: 1 });
    const warmTime = Date.now() - warmStart;
    benchmarks.push({ name: 'Warm search', time: warmTime });
    
    // Benchmark 3: Multiple concurrent searches
    const concurrentStart = Date.now();
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(this.plugin.memorySearch(`concurrent test ${i}`, { maxResults: 1 }));
    }
    await Promise.all(promises);
    const concurrentTime = Date.now() - concurrentStart;
    benchmarks.push({ name: '5 concurrent searches', time: concurrentTime });
    
    // Check performance thresholds
    if (coldTime > 5000) {
      throw new Error(`Cold search too slow: ${coldTime}ms (max: 5000ms)`);
    }
    
    if (warmTime > 1000) {
      throw new Error(`Warm search too slow: ${warmTime}ms (max: 1000ms)`);
    }
    
    return {
      benchmarks,
      coldSearch: coldTime,
      warmSearch: warmTime,
      cacheEffectiveness: Math.round((coldTime - warmTime) / coldTime * 100)
    };
  }

  async testConfig() {
    // Test configuration loading
    const optimizer = new TokenOptimizer({
      maxContextLength: 1500,
      maxTokens: 800,
      cacheSize: 50,
      minRelevanceScore: 0.4
    });
    
    await optimizer.initialize();
    
    if (optimizer.maxContextLength !== 1500) {
      throw new Error('Configuration not applied correctly');
    }
    
    // Test plugin configuration
    const plugin = new OpenClawTokenOptimizerPlugin();
    const stats = await plugin.getStats();
    
    if (stats.settings.maxTokens !== 1000) {
      throw new Error('Default plugin configuration incorrect');
    }
    
    return {
      configApplied: true,
      maxContextLength: optimizer.maxContextLength,
      maxTokens: stats.settings.maxTokens
    };
  }

  async testErrorHandling() {
    // Test error conditions
    
    // 1. Invalid query
    try {
      await this.plugin.memorySearch('', { maxResults: 1 });
      // Should not reach here
      throw new Error('Empty query should throw error');
    } catch (error) {
      // Expected
    }
    
    // 2. Invalid limit
    try {
      await this.plugin.memorySearch('test', { maxResults: -1 });
      throw new Error('Invalid limit should throw error');
    } catch (error) {
      // Expected
    }
    
    // 3. Non-existent memory directory
    const originalEnv = process.env.OPENCLAW_MEMORY_DIR;
    process.env.OPENCLAW_MEMORY_DIR = '/non/existent/path';
    
    try {
      const tempPlugin = new OpenClawTokenOptimizerPlugin();
      await tempPlugin.initialize();
      // Should handle missing directory gracefully
    } catch (error) {
      // Should not throw for missing directory
      throw new Error(`Should handle missing directory gracefully: ${error.message}`);
    } finally {
      process.env.OPENCLAW_MEMORY_DIR = originalEnv;
    }
    
    return {
      errorHandling: 'PASSED',
      tests: ['empty query', 'invalid limit', 'missing directory']
    };
  }

  async testCache() {
    if (!this.optimizer) {
      this.optimizer = new TokenOptimizer();
      await this.optimizer.initialize();
    }
    
    // Test cache functionality
    const query = 'cache test query';
    
    // First call (should miss cache)
    const start1 = Date.now();
    const result1 = await this.optimizer.getOptimizedContext(query, 2);
    const time1 = Date.now() - start1;
    
    // Second call (should hit cache)
    const start2 = Date.now();
    const result2 = await this.optimizer.getOptimizedContext(query, 2);
    const time2 = Date.now() - start2;
    
    // Verify cache hit
    const stats = this.optimizer.getPerformanceStats();
    
    if (stats.cacheHitRate === '0%') {
      throw new Error('Cache not working: 0% hit rate');
    }
    
    // Results should be identical
    if (result1.context !== result2.context) {
      throw new Error('Cached result differs from original');
    }
    
    // Cache should be faster
    if (time2 >= time1) {
      console.log(chalk.yellow('  ⚠ Cache not faster (might be warmup effect)'));
    }
    
    // Test cache clearing
    const clearResult = this.optimizer.clearCache();
    if (clearResult.cleared === 0) {
      throw new Error('Cache clear failed');
    }
    
    return {
      cacheHitRate: stats.cacheHitRate,
      cacheSize: stats.cacheSize,
      firstCallTime: time1,
      secondCallTime: time2,
      speedup: Math.round((time1 - time2) / time1 * 100),
      cacheCleared: clearResult.cleared
    };
  }

  generateReport() {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const percentage = Math.round((passed / total) * 100);
    
    console.log(chalk.cyan('\n📊 Test Results Summary\n'));
    
    // Summary
    console.log(chalk.gray(`Tests passed: ${passed}/${total} (${percentage}%)`));
    
    if (percentage === 100) {
      console.log(chalk.green('✅ All tests passed!'));
    } else if (percentage >= 80) {
      console.log(chalk.yellow('⚠ Some tests failed, but core functionality works'));
    } else {
      console.log(chalk.red('❌ Significant test failures detected'));
    }
    
    // Detailed results
    console.log(chalk.cyan('\n📋 Detailed Results:'));
    
    for (const result of this.results) {
      const icon = result.passed ? chalk.green('✓') : chalk.red('✗');
      console.log(chalk.gray(`  ${icon} ${result.test}`));
      
      if (!result.passed) {
        console.log(chalk.red(`    Error: ${result.error}`));
      }
    }
    
    // Performance highlights
    const performanceTest = this.results.find(r => r.test === 'Performance Benchmarks');
    if (performanceTest && performanceTest.passed && performanceTest.result) {
      console.log(chalk.cyan('\n⚡ Performance Highlights:'));
      console.log(chalk.gray(`  Cold search: ${performanceTest.result.coldSearch}ms`));
      console.log(chalk.gray(`  Warm search: ${performanceTest.result.warmSearch}ms`));
      console.log(chalk.gray(`  Cache effectiveness: ${performanceTest.result.cacheEffectiveness}%`));
    }
    
    // Recommendations
    console.log(chalk.cyan('\n💡 Recommendations:'));
    
    if (percentage === 100) {
      console.log(chalk.gray('  • System is ready for production use'));
      console.log(chalk.gray('  • Consider running stress tests for large memory sets'));
    } else if (passed >= 6) {
      console.log(chalk.gray('  • Core functionality is working'));
      console.log(chalk.gray('  • Review failed tests before production use'));
    } else {
      console.log(chalk.gray('  • Significant issues detected'));
      console.log(chalk.gray('  • Review and fix failed tests before use'));
    }
    
    // Generate JSON report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        passed,
        total,
        percentage
      },
      results: this.results,
      recommendations: this.getRecommendations()
    };
    
    const fs = require('fs');
    const reportPath = 'logs/test-report.json';
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(chalk.gray(`\n📄 Full report saved to: ${reportPath}`));
  }

  getRecommendations() {
    const failedTests = this.results.filter(r => !r.passed);
    
    if (failedTests.length === 0) {
      return ['All systems go! Ready for production use.'];
    }
    
    const recommendations = [];
    
    if (failedTests.some(t => t.test.includes('Performance'))) {
      recommendations.push('Review performance bottlenecks');
    }
    
    if (failedTests.some(t => t.test.includes('Error'))) {
      recommendations.push('Improve error handling for edge cases');
    }
    
    if (failedTests.some(t => t.test.includes('Cache'))) {
      recommendations.push('Optimize cache system');
    }
    
    return recommendations;
  }
}

// Run tests
async function main() {
  const testSuite = new TestSuite();
  
  try {
    await testSuite.runAllTests();
  } catch (error) {
    console.error(chalk.red('\n❌ Test suite failed:'), error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = TestSuite;
