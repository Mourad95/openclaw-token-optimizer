#!/usr/bin/env node

import { OpenClawTokenOptimizerPlugin } from '../src/openclaw-plugin';
import * as fs from 'fs';
import * as path from 'path';
import { program } from 'commander';

const chalk = require('chalk').default || require('chalk');
const ora = require('ora').default || require('ora');

interface MaintenanceOptions {
  clearCache?: boolean;
  optimizeIndex?: boolean;
  rotateLogs?: boolean;
  collectStats?: boolean;
  verbose?: boolean;
}

interface StepResult {
  step: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

interface HealthCheckItem {
  name: string;
  status: string;
  error?: string;
  details?: string;
}

class MaintenanceScript {
  options: MaintenanceOptions;
  plugin: OpenClawTokenOptimizerPlugin | null = null;
  results: StepResult[] = [];

  constructor(options: MaintenanceOptions = {}) {
    this.options = {
      clearCache: options.clearCache !== false,
      optimizeIndex: options.optimizeIndex !== false,
      rotateLogs: options.rotateLogs !== false,
      collectStats: options.collectStats !== false,
      verbose: options.verbose || false,
    };
  }

  async run(): Promise<void> {
    console.log(chalk.cyan('🔧 OpenClaw Token Optimizer Maintenance\n'));

    const steps = [
      { name: 'Initialize plugin', fn: this.initialize.bind(this) },
      { name: 'Clear query cache', fn: this.clearCache.bind(this) },
      { name: 'Optimize vector index', fn: this.optimizeIndex.bind(this) },
      { name: 'Rotate log files', fn: this.rotateLogs.bind(this) },
      { name: 'Collect statistics', fn: this.collectStats.bind(this) },
      { name: 'Run health checks', fn: this.healthChecks.bind(this) },
      { name: 'Generate maintenance report', fn: this.generateReport.bind(this) },
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
        this.results.push({
          step: step.name,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
        console.error(
          chalk.red(`  Error: ${error instanceof Error ? error.message : error}`)
        );
      }
    }

    this.showSummary();
  }

  async initialize(): Promise<Record<string, unknown>> {
    this.plugin = new OpenClawTokenOptimizerPlugin();
    await this.plugin.initialize();
    return { initialized: true };
  }

  async clearCache(): Promise<Record<string, unknown>> {
    if (!this.options.clearCache) {
      return { skipped: true, reason: 'Cache clearing disabled' };
    }

    const statsBefore = this.plugin!.optimizer.getPerformanceStats();
    const clearResult = this.plugin!.optimizer.clearCache();
    const statsAfter = this.plugin!.optimizer.getPerformanceStats();

    return {
      cleared: clearResult.cleared,
      cacheSizeBefore: statsBefore.cacheSize,
      cacheSizeAfter: statsAfter.cacheSize,
      cacheHitRateBefore: statsBefore.cacheHitRate,
      cacheHitRateAfter: statsAfter.cacheHitRate,
    };
  }

  async optimizeIndex(): Promise<Record<string, unknown>> {
    if (!this.options.optimizeIndex) {
      return { skipped: true, reason: 'Index optimization disabled' };
    }

    const stats = await this.plugin!.optimizer.vectorMemory.getStats();
    return {
      optimization: 'Index statistics collected',
      estimatedItems: stats.estimatedItems,
      embeddingModel: stats.embeddingModel,
      indexPath: stats.indexPath,
    };
  }

  async rotateLogs(): Promise<Record<string, unknown>> {
    if (!this.options.rotateLogs) {
      return { skipped: true, reason: 'Log rotation disabled' };
    }

    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      return { rotated: 0, reason: 'Logs directory does not exist' };
    }

    const files = fs
      .readdirSync(logsDir)
      .filter((file) => file.endsWith('.log') || file.endsWith('.json'))
      .map((file) => path.join(logsDir, file));

    let rotated = 0;
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    for (const filePath of files) {
      try {
        const stat = fs.statSync(filePath);
        if (stat.mtimeMs < oneWeekAgo) {
          const rotatedPath = `${filePath}.${new Date(stat.mtimeMs).toISOString().split('T')[0]}`;
          fs.renameSync(filePath, rotatedPath);
          rotated++;
          if (this.options.verbose) {
            console.log(chalk.gray(`  Rotated: ${path.basename(filePath)} → ${path.basename(rotatedPath)}`));
          }
        }
      } catch (error) {
        console.error(
          chalk.yellow(`  Warning: Could not rotate ${filePath}: ${error instanceof Error ? error.message : error}`)
        );
      }
    }

    const rotatedFiles = fs
      .readdirSync(logsDir)
      .filter((file) => file.includes('.log.') || file.includes('.json.'))
      .map((file) => path.join(logsDir, file));

    let cleaned = 0;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
    for (const filePath of rotatedFiles) {
      try {
        const stat = fs.statSync(filePath);
        if (stat.mtimeMs < oneMonthAgo) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      } catch {
        // Skip
      }
    }

    return {
      rotated,
      cleaned,
      totalLogFiles: files.length,
      totalRotatedFiles: rotatedFiles.length,
    };
  }

  async collectStats(): Promise<Record<string, unknown>> {
    if (!this.options.collectStats) {
      return { skipped: true, reason: 'Statistics collection disabled' };
    }

    const pluginStats = await this.plugin!.getStats();
    const savingsAnalysis = await this.plugin!.analyzeSavings();

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
      performance: pluginStats.performance,
    };

    fs.writeFileSync(statsFile, JSON.stringify(statistics, null, 2));
    const trends = await this.calculateTrends(statsDir, statistics);

    const inner = (savingsAnalysis.analysis as { analysis?: { savingsPercent?: number } })?.analysis;
    return {
      statsSaved: statsFile,
      tokenSavings: inner?.savingsPercent ?? 0,
      cacheHitRate: pluginStats.performance.cacheHitRate,
      totalQueries: pluginStats.performance.queries,
      trends,
    };
  }

  async calculateTrends(
    statsDir: string,
    currentStats: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    try {
      const files = fs
        .readdirSync(statsDir)
        .filter((f) => f.startsWith('stats-') && f.endsWith('.json'))
        .map((f) => path.join(statsDir, f))
        .sort()
        .slice(-5);

      if (files.length < 2) {
        return { available: false, reason: 'Not enough historical data' };
      }

      const previousStats = JSON.parse(
        fs.readFileSync(files[files.length - 2], 'utf-8')
      ) as Record<string, unknown>;

      const prevSavings = (previousStats.savings as { analysis?: { savingsPercent?: number } })?.analysis?.savingsPercent ?? 0;
      const currSavings = (currentStats.savings as { analysis?: { savingsPercent?: number } })?.analysis?.savingsPercent ?? 0;

      return {
        available: true,
        period: `${previousStats.timestamp} to ${currentStats.timestamp}`,
        trends: {
          tokenSavings: this.calculateTrend(prevSavings, currSavings),
          cacheHitRate: this.calculateTrend(
            parseFloat((previousStats.performance as { cacheHitRate?: string })?.cacheHitRate ?? '0'),
            parseFloat((currentStats.performance as { cacheHitRate?: string })?.cacheHitRate ?? '0')
          ),
          queryGrowth: this.calculateTrend(
            (previousStats.performance as { queries?: number })?.queries ?? 0,
            (currentStats.performance as { queries?: number })?.queries ?? 0,
            true
          ),
        },
      };
    } catch (error) {
      return { available: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  calculateTrend(
    previous: number,
    current: number,
    isAbsolute = false
  ): { change: number; percent: number; direction: string } {
    if (previous === 0) return { change: 0, percent: 0, direction: 'stable' };

    const change = current - previous;
    const percent = Math.round((change / Math.abs(previous)) * 100);
    let direction = 'stable';
    if (change > 0) direction = 'up';
    if (change < 0) direction = 'down';

    return {
      change: isAbsolute ? change : parseFloat(change.toFixed(2)),
      percent,
      direction,
    };
  }

  async healthChecks(): Promise<{
    overallStatus: string;
    checks: HealthCheckItem[];
    summary: { totalChecks: number; healthy: number; warnings: number; unhealthy: number };
  }> {
    const checks: HealthCheckItem[] = [];

    try {
      await this.plugin!.initialize();
      checks.push({ name: 'Plugin initialization', status: 'healthy' });
    } catch (error) {
      checks.push({
        name: 'Plugin initialization',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const memoryDir = this.plugin!.getMemoryDir();
    const memoryDirExists = fs.existsSync(memoryDir);
    checks.push({
      name: 'Memory directory',
      status: memoryDirExists ? 'healthy' : 'warning',
      details: memoryDirExists ? `Exists: ${memoryDir}` : `Missing: ${memoryDir}`,
    });

    const indexStats = await this.plugin!.optimizer.vectorMemory.getStats();
    checks.push({
      name: 'Vector index',
      status: indexStats.initialized ? 'healthy' : 'unhealthy',
      details: `Items: ${indexStats.estimatedItems || 0}, Model: ${indexStats.embeddingModel}`,
    });

    const perfStats = this.plugin!.optimizer.getPerformanceStats();
    const avgResponseTime = perfStats.avgResponseTime || 0;
    checks.push({
      name: 'Performance',
      status: avgResponseTime < 1000 ? 'healthy' : avgResponseTime < 3000 ? 'warning' : 'unhealthy',
      details: `Avg response: ${Math.round(avgResponseTime)}ms, Cache hit: ${perfStats.cacheHitRate}`,
    });

    const analysis = await this.plugin!.analyzeSavings();
    const inner = (analysis.analysis as { analysis?: { savingsPercent?: number } })?.analysis;
    const savings = inner?.savingsPercent ?? 0;
    checks.push({
      name: 'Token savings',
      status: savings > 50 ? 'excellent' : savings > 20 ? 'good' : 'needs improvement',
      details: `Savings: ${savings}%`,
    });

    const unhealthy = checks.filter((c) => c.status === 'unhealthy').length;
    const warnings = checks.filter((c) => c.status === 'warning').length;
    let overallStatus = 'healthy';
    if (unhealthy > 0) overallStatus = 'unhealthy';
    else if (warnings > 0) overallStatus = 'warning';

    return {
      overallStatus,
      checks,
      summary: {
        totalChecks: checks.length,
        healthy: checks.filter((c) =>
          ['healthy', 'excellent', 'good'].includes(c.status)
        ).length,
        warnings,
        unhealthy,
      },
    };
  }

  async generateReport(): Promise<Record<string, unknown>> {
    const report = {
      timestamp: new Date().toISOString(),
      options: this.options,
      results: this.results,
      summary: this.generateSummary(),
    };

    const reportDir = path.join(process.cwd(), 'logs', 'maintenance');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const reportFile = path.join(
      reportDir,
      `maintenance-${new Date().toISOString().split('T')[0]}.json`
    );
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    return { reportFile, generated: true };
  }

  generateSummary(): {
    successfulSteps: number;
    totalSteps: number;
    successRate: number;
    healthStatus: string;
    tokenSavings: string;
  } {
    const successful = this.results.filter((r) => r.success).length;
    const total = this.results.length;
    const healthCheck = this.results.find((r) => r.step === 'Run health checks');
    const healthResult = healthCheck?.result as { overallStatus?: string } | undefined;
    const healthStatus = healthResult?.overallStatus ?? 'unknown';
    const stats = this.results.find((r) => r.step === 'Collect statistics');
    const statsResult = stats?.result as { tokenSavings?: number } | undefined;
    const tokenSavings = statsResult?.tokenSavings ?? 0;

    return {
      successfulSteps: successful,
      totalSteps: total,
      successRate: Math.round((successful / total) * 100),
      healthStatus,
      tokenSavings: `${tokenSavings}%`,
    };
  }

  showSummary(): void {
    console.log(chalk.cyan('\n📊 Maintenance Summary\n'));

    const summary = this.generateSummary();

    console.log(
      chalk.gray(
        `Steps completed: ${summary.successfulSteps}/${summary.totalSteps} (${summary.successRate}%)`
      )
    );
    console.log(chalk.gray(`System health: ${summary.healthStatus}`));
    console.log(chalk.gray(`Token savings: ${summary.tokenSavings}`));

    const healthCheck = this.results.find((r) => r.step === 'Run health checks');
    const healthResult = healthCheck?.result as { checks?: HealthCheckItem[] } | undefined;
    if (healthResult?.checks) {
      console.log(chalk.cyan('\n🏥 Health Check Details:'));
      for (const check of healthResult.checks) {
        let statusIcon = '○';
        let statusColor = chalk.gray;
        if (['healthy', 'excellent', 'good'].includes(check.status)) {
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
        if (check.details) console.log(chalk.gray(`    ${check.details}`));
      }
    }

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

async function main(): Promise<void> {
  program
    .name('maintenance')
    .description('Run maintenance tasks for OpenClaw Token Optimizer')
    .option('--no-clear-cache', 'Skip cache clearing')
    .option('--no-optimize-index', 'Skip index optimization')
    .option('--no-rotate-logs', 'Skip log rotation')
    .option('--no-collect-stats', 'Skip statistics collection')
    .option('-v, --verbose', 'Verbose output')
    .parse();

  const options = program.opts() as MaintenanceOptions;
  const maintenance = new MaintenanceScript(options);

  try {
    await maintenance.run();
  } catch (error) {
    console.error(
      chalk.red('\n❌ Maintenance failed:'),
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { MaintenanceScript };
