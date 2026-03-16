#!/usr/bin/env node

const { OpenClawTokenOptimizerPlugin } = require('../src/openclaw-plugin');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');

/**
 * Maintenance script for OpenClaw Token Optimizer
 * 
 * Performs regular maintenance tasks:
 * 1. Cache cleanup
 * 2. Index optimization
 * 3. Log rotation
 * 4. Statistics collection
 * 5. Health checks
 */

class MaintenanceScript {
  constructor(options = {}) {
    this.options = {
      clearCache: options.clearCache !== false,
      optimizeIndex: options.optimizeIndex !== false,
      rotateLogs: options.rotateLogs !== false,
      collectStats: options.collectStats !== false,
      verbose: options.verbose || false
    };
    
    this.plugin = null;
    this.results = [];
  }

  async run() {
    console.log(chalk.cyan('🔧 OpenClaw Token Optimizer Maintenance\n'));
    
    const steps = [
      { name: 'Initialize plugin', fn: this.initialize.bind(this) },
      { name: 'Clear query cache', fn: this.clearCache.bind(this) },
      { name: 'Optimize vector index', fn: this.optimizeIndex.bind(this) },
      { name: 'Rotate log files', fn: this.rotateLogs.bind(this) },
      { name: 'Collect statistics', fn: this.collectStats.bind(this) },
      { name: 'Run health checks', fn: this.healthChecks.bind(this) },
      { name: 'Generate maintenance report', fn: this.generateReport.bind(this) }
    ];

    for (const step of steps) {
      const spinner = ora(step.name).start();
      
      try {
        const result = await step.fn();
        spinner.succeed(chalk.green(`${step.name}: COMPLETED`));
        this.results.push({ step: step.name, success: true, result });
        
        if (this.options.verbose && result) {
          console.log(chalk.gray(`  Details: ${JSON.stringify(result)}`));
        }
      } catch (error) {
        spinner.fail(chalk.red(`${step.name}: FAILED`));
        this.results.push({ step: step.name, success: false, error: error.message });
        console.error(chalk.red(`  Error: ${error.message}`));
      }
    }

    this.showSummary();
  }

  async initialize() {
    this.plugin = new OpenClawTokenOptimizerPlugin();
    await this.plugin.initialize();
    
    return { initialized: true };
  }

  async clearCache() {
    if (!this.options.clearCache) {
      return { skipped: true, reason: 'Cache clearing disabled' };
    }
    
    const statsBefore = this.plugin.optimizer.getPerformanceStats();
    const clearResult = this.plugin.optimizer.clearCache();
    const statsAfter = this.plugin.optimizer.getPerformanceStats();
    
    return {
      cleared: clearResult.cleared,
      cacheSizeBefore: statsBefore.cacheSize,
      cacheSizeAfter: statsAfter.cacheSize,
      cacheHitRateBefore: statsBefore.cacheHitRate,
      cacheHitRateAfter: statsAfter.cacheHitRate
    };
  }

  async optimizeIndex() {
    if (!this.options.optimizeIndex) {
      return { skipped: true, reason: 'Index optimization disabled' };
    }
    
    // For now, we'll just report index statistics
    // Future: implement actual index optimization
    const stats = await this.plugin.optimizer.vectorMemory.getStats();
    
    return {
      optimization: 'Index statistics collected',
      estimatedItems: stats.estimatedItems,
      embeddingModel: stats.embeddingModel,
      indexPath: stats.indexPath
    };
  }

  async rotateLogs() {
    if (!this.options.rotateLogs) {
      return { skipped: true, reason: 'Log rotation disabled' };
    }
    
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      return { rotated: 0, reason: 'Logs directory does not exist' };
    }
    
    const files = fs.readdirSync(logsDir)
      .filter(file => file.endsWith('.log') || file.endsWith('.json'))
      .map(file => path.join(logsDir, file));
    
    let rotated = 0;
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    for (const filePath of files) {
      try {
        const stats = fs.statSync(filePath);
        
        // Rotate files older than 1 week
        if (stats.mtimeMs < oneWeekAgo) {
          const rotatedPath = `${filePath}.${new Date(stats.mtimeMs).toISOString().split('T')[0]}`;
          fs.renameSync(filePath, rotatedPath);
          rotated++;
          
          if (this.options.verbose) {
            console.log(chalk.gray(`  Rotated: ${path.basename(filePath)} → ${path.basename(rotatedPath)}`));
          }
        }
      } catch (error) {
        // Skip files we can't rotate
        console.error(chalk.yellow(`  Warning: Could not rotate ${filePath}: ${error.message}`));
      }
    }
    
    // Clean up rotated files older than 30 days
    const rotatedFiles = fs.readdirSync(logsDir)
      .filter(file => file.includes('.log.') || file.includes('.json.'))
      .map(file => path.join(logsDir, file));
    
    let cleaned = 0;
    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    for (const filePath of rotatedFiles) {
      try {
        const stats = fs.statSync(filePath);
        if (stats.mtimeMs < oneMonthAgo) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      } catch (error) {
        // Skip files we can't clean
      }
    }
    
    return {
      rotated,
      cleaned,
      totalLogFiles: files.length,
      totalRotatedFiles: rotatedFiles.length
    };
  }

  async collectStats() {
    if (!this.options.collectStats) {
      return { skipped: true, reason: 'Statistics collection disabled' };
    }
    
    const pluginStats = await this.plugin.getStats();
    const savingsAnalysis = await this.plugin.analyzeSavings();
    
    // Save statistics to file
    const statsDir = path.join(process.cwd(), 'logs', 'statistics');
    if (!fs.existsSync(statsDir)) {
      fs.mkdirSync(statsDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const statsFile = path.join(statsDir, `stats-${timestamp}.json`);
    
    const statistics = {
      timestamp: new Date().toISOString(),
      plugin: pluginStats,
      savings: savingsAnalysis,
      performance: pluginStats.performance
    };
    
    fs.writeFileSync(statsFile, JSON.stringify(statistics, null, 2));
    
    // Calculate trends if previous stats exist
    const trends = await this.calculateTrends(statsDir, statistics);
    
    return {
      statsSaved: statsFile,
      tokenSavings: savingsAnalysis.analysis?.savingsPercent || 0,
      cacheHitRate: pluginStats.performance.cacheHitRate,
      totalQueries: pluginStats.performance.queries,
      trends
    };
  }

  async calculateTrends(statsDir, currentStats) {
    try {
      const files = fs.readdirSync(statsDir)
        .filter(file => file.startsWith('stats-') && file.endsWith('.json'))
        .map(file => path.join(statsDir, file))
        .sort()
        .slice(-5); // Last 5 stats files
      
      if (files.length < 2) {
        return { available: false, reason: 'Not enough historical data' };
      }
      
      const previousStats = JSON.parse(fs.readFileSync(files[files.length - 2], 'utf-8'));
      
      const trends = {
        tokenSavings: this.calculateTrend(
          previousStats.savings?.analysis?.savingsPercent || 0,
          currentStats.savings?.analysis?.savingsPercent || 0
        ),
        cacheHitRate: this.calculateTrend(
          parseFloat(previousStats.performance?.cacheHitRate || '0'),
          parseFloat(currentStats.performance?.cacheHitRate || '0')
        ),
        queryGrowth: this.calculateTrend(
          previousStats.performance?.queries || 0,
          currentStats.performance?.queries || 0,
          true // Absolute growth
        )
      };
      
      return {
        available: true,
        period: `${previousStats.timestamp} to ${currentStats.timestamp}`,
        trends
      };
    } catch (error) {
      return { available: false, error: error.message };
    }
  }

  calculateTrend(previous, current, isAbsolute = false) {
    if (previous === 0) return { change: 0, percent: 0, direction: 'stable' };
    
    const change = current - previous;
    const percent = Math.round((change / Math.abs(previous)) * 100);
    
    let direction = 'stable';
    if (change > 0) direction = 'up';
    if (change < 0) direction = 'down';
    
    return {
      change: isAbsolute ? change : parseFloat(change.toFixed(2)),
      percent,
      direction
    };
  }

  async healthChecks() {
    const checks = [];
    
    // Check 1: Plugin initialization
    try {
      await this.plugin.initialize();
      checks.push({ name: 'Plugin initialization', status: 'healthy' });
    } catch (error) {
      checks.push({ name: 'Plugin initialization', status: 'unhealthy', error: error.message });
    }
    
    // Check 2: Memory directory
    const memoryDir = this.plugin.getMemoryDir();
    const memoryDirExists = fs.existsSync(memoryDir);
    checks.push({ 
      name: 'Memory directory', 
      status: memoryDirExists ? 'healthy' : 'warning',
      details: memoryDirExists ? `Exists: ${memoryDir}` : `Missing: ${memoryDir}`
    });
    
    // Check 3: Vector index
    const indexStats = await this.plugin.optimizer.vectorMemory.getStats();
    checks.push({
      name: 'Vector index',
      status: indexStats.initialized ? 'healthy' : 'unhealthy',
      details: `Items: ${indexStats.estimatedItems || 0}, Model: ${indexStats.embeddingModel}`
    });
    
    // Check 4: Performance
    const perfStats = this.plugin.optimizer.getPerformanceStats();
    const avgResponseTime = perfStats.avgResponseTime || 0;
    checks.push({
      name: 'Performance',
      status: avgResponseTime < 1000 ? 'healthy' : avgResponseTime < 3000 ? 'warning' : 'unhealthy',
      details: `Avg response: ${Math.round(avgResponseTime)}ms, Cache hit: ${perfStats.cacheHitRate}`
    });
    
    // Check 5: Token savings
    const analysis = await this.plugin.analyzeSavings();
    const savings = analysis.analysis?.savingsPercent || 0;
    checks.push({
      name: 'Token savings',
      status: savings > 50 ? 'excellent' : savings > 20 ? 'good' : 'needs improvement',
      details: `Savings: ${savings}%`
    });
    
    // Overall health
    const unhealthy = checks.filter(c => c.status === 'unhealthy').length;
    const warnings = checks.filter(c => c.status === 'warning').length;
    
    let overallStatus = 'healthy';
    if (unhealthy > 0) overallStatus = 'unhealthy';
    else if (warnings > 0) overallStatus = 'warning';
    
    return {
      overallStatus,
      checks,
      summary: {
        totalChecks: checks.length,
        healthy: checks.filter(c => c.status === 'healthy' || c.status === 'excellent' || c.status === 'good').length,
        warnings,
        unhealthy
      }
    };
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      options: this.options,
      results: this.results,
      summary: this.generateSummary()
    };
    
    const reportDir = path.join(process.cwd(), 'logs', 'maintenance');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const reportFile = path.join(reportDir, `maintenance-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    return {
      reportFile,
      generated: true
    };
  }

  generateSummary() {
    const successful = this.results.filter(r => r.success).length;
    const total = this.results.length;
    
    // Find health check results
    const healthCheck = this.results.find(r => r.step === 'Run health checks');
    const healthStatus = healthCheck?.result?.overallStatus || 'unknown';
    
    // Find statistics
    const stats = this.results.find(r => r.step === 'Collect statistics');
    const tokenSavings = stats?.result?.tokenSavings || 0;
    
    return {
      successfulSteps: successful,
      totalSteps: total,
      successRate: Math.round((successful / total) * 100),
      healthStatus,
      tokenSavings: `${tokenSavings}%`
    };
  }

  showSummary() {
    console.log(chalk.cyan('\n📊 Maintenance Summary\n'));
    
    const summary = this.generateSummary();
    
    console.log(chalk.gray(`Steps completed: ${summary.successfulSteps}/${summary.totalSteps} (${summary.successRate}%)`));
    console.log(chalk.gray(`System health: ${summary.healthStatus}`));
    console.log(chalk.gray(`Token savings: ${summary.tokenSavings}`));
    
    // Show health check details if available
    const healthCheck = this.results.find(r => r.step === 'Run health checks');
    if (healthCheck?.result) {
      console.log(chalk.cyan('\n🏥 Health Check Details:'));
      
      healthCheck.result.checks.forEach(check => {
        let statusIcon = '○';
        let statusColor = chalk.gray;
        
        if (check.status === 'healthy' || check.status === 'excellent' || check.status === 'good') {
          statusIcon = '✓';
          statusColor = chalk.green;
        } else if (check.status === 'warning') {
          statusIcon = '⚠';
          statusColor = chalk.yellow;
        } else if (check.status === 'unhealthy') {
          statusIcon = '✗';
          statusColor = chalk.red;
        }
        
        console.log(statusColor(`  ${statusIcon} ${check.name}: ${check.status}`));
        if (check.details) {
          console.log(chalk.gray(`    ${check.details}`));
        }
      });
    }
    
    // Recommendations
    console.log(chalk.cyan('\n💡 Recommendations:'));
    
    if (summary.healthStatus === 'unhealthy') {
      console.log(chalk.red('  • Address unhealthy components immediately'));
    }
    
    if (parseFloat(summary.tokenSavings) < 50) {
      console.log(chalk.yellow('  • Consider adding more memory files for better optimization'));
    }
    
    console.log(chalk.gray('  • Run maintenance weekly for optimal performance'));
    console.log(chalk.gray('  • Monitor token savings in logs/statistics/'));
    
    console.log(chalk.green('\n✅ Maintenance completed successfully!'));
  }
}

// CLI interface
async function main() {
  const { program } = require('commander');
  
  program
    .name('maintenance')
    .description('Run maintenance tasks for OpenClaw Token Optimizer')
    .option('--no-clear-cache', 'Skip cache clearing')
    .option('--no-optimize-index', 'Skip index optimization')
    .option('--no-rotate-logs', 'Skip log rotation')
    .option('--no-collect-stats', 'Skip statistics collection')
    .option('-v, --verbose', 'Verbose output')
    .parse();
  
  const options = program.opts();
  
  const maintenance = new MaintenanceScript(options);
  
  try {
    await maintenance.run();
  } catch (error) {
    console.error(chalk.red('\n❌ Maintenance failed:'), error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = MaintenanceScript;
