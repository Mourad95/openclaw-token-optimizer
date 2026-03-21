import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  loadMetrics,
  recordOptimizerRun,
  resetMetrics,
  averageSavingsPercent,
  resolveMetricsFilePath,
} from '../metrics-store';

describe('metrics-store', () => {
  let tmpDir: string;
  let metricsPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'octo-metrics-'));
    metricsPath = path.join(tmpDir, 'm.json');
    process.env.OPENCLAW_TOKEN_OPTIMIZER_METRICS_PATH = metricsPath;
  });

  afterEach(() => {
    delete process.env.OPENCLAW_TOKEN_OPTIMIZER_METRICS_PATH;
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  test('loadMetrics returns zeros when file missing', () => {
    const m = loadMetrics();
    expect(m.cumulative.tokensSaved).toBe(0);
    expect(m.cumulative.optimizerRuns).toBe(0);
    expect(resolveMetricsFilePath()).toBe(metricsPath);
  });

  test('recordOptimizerRun accumulates and persists', () => {
    recordOptimizerRun({ tokensSaved: 10, potentialTokens: 100 });
    recordOptimizerRun({ tokensSaved: 5, potentialTokens: 50 });

    const m = loadMetrics();
    expect(m.cumulative.tokensSaved).toBe(15);
    expect(m.cumulative.optimizerRuns).toBe(2);
    expect(m.cumulative.potentialTokensTotal).toBe(150);

    const raw = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
    expect(raw.cumulative.tokensSaved).toBe(15);
  });

  test('resetMetrics clears file', () => {
    recordOptimizerRun({ tokensSaved: 99, potentialTokens: 200 });
    resetMetrics();
    const m = loadMetrics();
    expect(m.cumulative.tokensSaved).toBe(0);
    expect(m.cumulative.optimizerRuns).toBe(0);
  });

  test('averageSavingsPercent', () => {
    expect(
      averageSavingsPercent({
        tokensSaved: 25,
        optimizerRuns: 1,
        potentialTokensTotal: 100,
        updatedAt: '',
      })
    ).toBe(25);
    expect(
      averageSavingsPercent({
        tokensSaved: 0,
        optimizerRuns: 0,
        potentialTokensTotal: 0,
        updatedAt: '',
      })
    ).toBe(0);
  });
});
