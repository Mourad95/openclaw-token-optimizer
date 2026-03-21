#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { OpenClawTokenOptimizerPlugin } from '../src/openclaw-plugin';
import {
  DEFAULT_MEMORY_EMBEDDING_FALLBACK,
  DEFAULT_OLLAMA_EMBEDDING_MODEL,
} from '../src/openclaw-memory-defaults';

const chalk = require('chalk').default || require('chalk');
const ora = require('ora').default || require('ora');

interface StepResult {
  step: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

class SetupScript {
  openclawConfigPath: string;
  pluginPath: string;
  backupPath: string;

  constructor() {
    this.openclawConfigPath = this.getOpenClawConfigPath();
    this.pluginPath = path.resolve(__dirname, '..', 'src', 'openclaw-plugin.js');
    this.backupPath = `${this.openclawConfigPath}.backup-${Date.now()}`;
  }

  getOpenClawConfigPath(): string {
    const home = process.env.HOME || '';
    const possiblePaths = [
      path.join(home, '.openclaw', 'openclaw.json'),
      path.join(home, '.config', 'openclaw', 'openclaw.json'),
      path.join('/etc', 'openclaw', 'openclaw.json'),
    ];

    for (const configPath of possiblePaths) {
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }

    return path.join(home, '.openclaw', 'openclaw.json');
  }

  async run(): Promise<void> {
    console.log(chalk.cyan('🚀 OpenClaw Token Optimizer Setup\n'));

    const steps = [
      { name: 'Check OpenClaw installation', fn: this.checkOpenClaw.bind(this) },
      { name: 'Backup existing configuration', fn: this.backupConfig.bind(this) },
      { name: 'Update OpenClaw configuration', fn: this.updateConfig.bind(this) },
      { name: 'Create necessary directories', fn: this.createDirectories.bind(this) },
      { name: 'Test the integration', fn: this.testIntegration.bind(this) },
      { name: 'Generate setup report', fn: this.generateReport.bind(this) },
    ];

    const results: StepResult[] = [];

    for (const step of steps) {
      const spinner = ora(step.name).start();

      try {
        const result = await step.fn();
        spinner.succeed(chalk.green(`${step.name}: SUCCESS`));
        results.push({ step: step.name, success: true, result });
      } catch (error) {
        spinner.fail(chalk.red(`${step.name}: FAILED`));
        results.push({
          step: step.name,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });

        if (!(await this.askContinue())) {
          console.log(chalk.yellow('\nSetup aborted by user.'));
          this.restoreBackup();
          process.exit(1);
        }
      }
    }

    this.showSummary(results);
  }

  checkOpenClaw(): Record<string, unknown> {
    try {
      execSync('which openclaw', { stdio: 'pipe' });
      console.log(chalk.gray('  ✓ OpenClaw command found'));

      const versionOutput = execSync('openclaw --version', { stdio: 'pipe' }).toString();
      console.log(chalk.gray(`  ✓ OpenClaw version: ${versionOutput.trim()}`));

      return { version: versionOutput.trim() };
    } catch {
      throw new Error('OpenClaw not found. Please install OpenClaw first: https://docs.openclaw.ai');
    }
  }

  /**
   * OpenClaw 2026.3+ only allows memorySearch.provider in
   * openai | local | gemini | voyage | mistral | ollama — not "custom" + command.
   * Strip legacy keys written by older versions of this setup script.
   * @see https://docs.openclaw.ai/reference/memory-config
   */
  static sanitizeMemorySearch(ms: Record<string, unknown> | undefined): Record<string, unknown> {
    const out: Record<string, unknown> = { ...(ms ?? {}) };
    delete out.command;
    delete out.maxResults;
    delete out.maxTokens;
    if (out.provider === 'custom') {
      delete out.provider;
    }
    return out;
  }

  /**
   * When OPENCLAW_TOKEN_OPTIMIZER_OLLAMA_MEMORY=1|true|yes, force memory embeddings via Ollama
   * and optional cloud fallback (small embedding models — used only if Ollama fails).
   * @see docs/openclaw-memory-ollama.md
   */
  static shouldUseOllamaMemoryEmbeddings(): boolean {
    const v = process.env.OPENCLAW_TOKEN_OPTIMIZER_OLLAMA_MEMORY?.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
  }

  /** Default: {@link DEFAULT_MEMORY_EMBEDDING_FALLBACK}; override with OPENCLAW_MEMORY_EMBEDDING_FALLBACK */
  static resolveEmbeddingFallback(): string {
    const raw = process.env.OPENCLAW_MEMORY_EMBEDDING_FALLBACK?.trim().toLowerCase();
    if (!raw) return DEFAULT_MEMORY_EMBEDDING_FALLBACK;
    const allowed = new Set(['gemini', 'openai', 'none', 'mistral', 'voyage', 'local', 'ollama']);
    return allowed.has(raw) ? raw : DEFAULT_MEMORY_EMBEDDING_FALLBACK;
  }

  static applyOllamaMemoryEmbeddings(memorySearch: Record<string, unknown>): Record<string, unknown> {
    if (!SetupScript.shouldUseOllamaMemoryEmbeddings()) {
      return memorySearch;
    }

    const model =
      process.env.OPENCLAW_OLLAMA_EMBEDDING_MODEL?.trim() || DEFAULT_OLLAMA_EMBEDDING_MODEL;
    const fallback = SetupScript.resolveEmbeddingFallback();

    return {
      ...memorySearch,
      provider: 'ollama',
      model,
      fallback,
    };
  }

  backupConfig(): Record<string, unknown> {
    if (!fs.existsSync(this.openclawConfigPath)) {
      console.log(chalk.yellow('  ℹ No existing OpenClaw configuration found'));
      return { backupCreated: false };
    }

    fs.copyFileSync(this.openclawConfigPath, this.backupPath);
    console.log(chalk.gray(`  ✓ Backup created: ${this.backupPath}`));

    return {
      backupCreated: true,
      backupPath: this.backupPath,
      originalSize: fs.statSync(this.openclawConfigPath).size,
    };
  }

  updateConfig(): Record<string, unknown> {
    type Config = { agents?: { defaults?: { memorySearch?: Record<string, unknown> } } };
    let config: Config = {};

    if (fs.existsSync(this.openclawConfigPath)) {
      const configContent = fs.readFileSync(this.openclawConfigPath, 'utf-8');
      config = JSON.parse(configContent) as Config;
      console.log(chalk.gray('  ✓ Existing configuration loaded'));
    } else {
      console.log(chalk.yellow('  ℹ Creating new OpenClaw configuration'));
      config = { agents: { defaults: {} } };
    }

    if (!config.agents) config.agents = {};
    if (!config.agents.defaults) config.agents.defaults = {};

    const memoryDirAbs = path.resolve(process.cwd(), 'memory');
    const prev = SetupScript.sanitizeMemorySearch(
      config.agents.defaults.memorySearch as Record<string, unknown> | undefined
    );
    const extraPathsRaw = prev.extraPaths;
    const extraPaths: string[] = Array.isArray(extraPathsRaw)
      ? extraPathsRaw.filter((p): p is string => typeof p === 'string')
      : [];
    if (!extraPaths.includes(memoryDirAbs)) {
      extraPaths.push(memoryDirAbs);
    }

    let memorySearch: Record<string, unknown> = {
      ...prev,
      extraPaths,
    };
    if (memorySearch.enabled === undefined) {
      memorySearch.enabled = true;
    }

    memorySearch = SetupScript.applyOllamaMemoryEmbeddings(memorySearch);

    config.agents.defaults.memorySearch = memorySearch;

    console.log(
      chalk.gray(
        '  ✓ memorySearch: removed legacy custom/command keys if present; set extraPaths for this repo'
      )
    );
    if (SetupScript.shouldUseOllamaMemoryEmbeddings()) {
      console.log(
        chalk.gray(
          `  ✓ memorySearch: Ollama provider (${String(memorySearch.model)}) · fallback=${String(memorySearch.fallback)}`
        )
      );
    }

    const configDir = path.dirname(this.openclawConfigPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    fs.writeFileSync(this.openclawConfigPath, JSON.stringify(config, null, 2));
    console.log(chalk.gray(`  ✓ Configuration updated: ${this.openclawConfigPath}`));

    return {
      configPath: this.openclawConfigPath,
      memorySearch: config.agents.defaults.memorySearch,
    };
  }

  createDirectories(): Record<string, unknown> {
    const directories = [
      path.join(process.cwd(), 'memory'),
      path.join(process.cwd(), 'logs'),
      path.join(process.cwd(), '.vectra-index'),
    ];

    const created: string[] = [];

    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        created.push(dir);
        console.log(chalk.gray(`  ✓ Created directory: ${dir}`));
      }
    }

    return { created };
  }

  async testIntegration(): Promise<Record<string, unknown>> {
    const plugin = new OpenClawTokenOptimizerPlugin();
    await plugin.initialize();

    const result = await plugin.memorySearch('test setup', { maxResults: 1 });

    if (!result.context || typeof result.context !== 'string') {
      throw new Error('Plugin test failed: invalid response');
    }

    console.log(chalk.gray(`  ✓ Plugin test passed: ${result.stats.responseTime}ms response`));

    return {
      testPassed: true,
      responseTime: result.stats.responseTime,
      estimatedTokens: result.stats.estimatedTokens,
    };
  }

  generateReport(): Record<string, unknown> {
    const report = {
      setup: {
        timestamp: new Date().toISOString(),
        openclawConfigPath: this.openclawConfigPath,
        backupPath: this.backupPath,
        pluginPath: this.pluginPath,
      },
      directories: {
        memory: path.join(process.cwd(), 'memory'),
        logs: path.join(process.cwd(), 'logs'),
        vectraIndex: path.join(process.cwd(), '.vectra-index'),
      },
      configuration: {
        memorySearch: {
          note: 'extraPaths points OpenClaw at this repo memory/; use a supported provider (local, openai, …) per OpenClaw docs',
          extraPaths: [path.resolve(process.cwd(), 'memory')],
        },
      },
      nextSteps: [
        'Configure embedding provider if needed: https://docs.openclaw.ai/reference/memory-config',
        ...(SetupScript.shouldUseOllamaMemoryEmbeddings()
          ? [
              `Ollama embeddings: pull model — ollama pull ${process.env.OPENCLAW_OLLAMA_EMBEDDING_MODEL?.trim() || DEFAULT_OLLAMA_EMBEDDING_MODEL}`,
              'Docs: docs/openclaw-memory-ollama.md',
            ]
          : []),
        'Restart OpenClaw gateway: openclaw gateway restart',
        'Standalone CLI search: node dist/src/index.js search "your query"',
        'Add memory files to the "memory" directory',
        'Run maintenance weekly: npm run maintenance',
      ],
    };

    const reportPath = path.join(process.cwd(), 'logs', 'setup-report.json');
    const reportDir = path.dirname(reportPath);

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(chalk.gray(`  ✓ Setup report generated: ${reportPath}`));

    return { reportPath };
  }

  async askContinue(): Promise<boolean> {
    return true;
  }

  restoreBackup(): void {
    if (fs.existsSync(this.backupPath)) {
      fs.copyFileSync(this.backupPath, this.openclawConfigPath);
      console.log(chalk.gray('  ✓ Configuration restored from backup'));
    }
  }

  showSummary(results: StepResult[]): void {
    console.log(chalk.cyan('\n🎉 Setup Complete!\n'));

    const successful = results.filter((r) => r.success).length;
    const total = results.length;

    console.log(chalk.gray(`Steps completed: ${successful}/${total}`));

    console.log(chalk.cyan('\n📋 Next Steps:'));
    console.log(
      chalk.gray(
        '1. OpenClaw 2026.3+ uses built-in memorySearch providers (not custom shell commands).'
      )
    );
    console.log(
      chalk.gray(
        '   This setup adds extraPaths so your notes under ./memory are indexed. Pick a provider in ~/.openclaw/openclaw.json if needed (see docs).'
      )
    );
    console.log(chalk.gray('2. Restart OpenClaw gateway:'));
    console.log(chalk.yellow('   openclaw gateway restart\n'));

    console.log(chalk.gray('3. Verify:'));
    console.log(chalk.yellow('   openclaw status\n'));

    console.log(chalk.gray('4. Local vectra CLI (this repo, separate from OpenClaw embeddings):'));
    console.log(chalk.yellow('   node dist/src/index.js search "test query"\n'));

    console.log(chalk.gray('5. Memory files:'));
    console.log(chalk.yellow(`   ${path.join(process.cwd(), 'memory')}\n`));

    console.log(chalk.gray('6. Weekly maintenance:'));
    console.log(chalk.yellow('   npm run maintenance\n'));

    console.log(chalk.cyan('📚 Documentation:'));
    console.log(chalk.gray('• OpenClaw memory: https://docs.openclaw.ai/reference/memory-config'));
    console.log(chalk.gray('• README.md — this project'));
    console.log(chalk.gray('• docs/ — advanced usage\n'));
  }
}

async function main(): Promise<void> {
  const setup = new SetupScript();

  try {
    await setup.run();
  } catch (error) {
    console.error(
      chalk.red('\n❌ Setup failed:'),
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { SetupScript };
