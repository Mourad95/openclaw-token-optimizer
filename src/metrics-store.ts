import * as fs from 'fs';
import * as path from 'path';

const FILE_VERSION = 1;

export interface CumulativeTokenMetrics {
  tokensSaved: number;
  optimizerRuns: number;
  potentialTokensTotal: number;
  updatedAt: string;
}

export interface TokenMetricsFile {
  version: typeof FILE_VERSION;
  cumulative: CumulativeTokenMetrics;
}

const emptyCumulative = (): CumulativeTokenMetrics => ({
  tokensSaved: 0,
  optimizerRuns: 0,
  potentialTokensTotal: 0,
  updatedAt: new Date().toISOString(),
});

/** Repo root when this file is `dist/src/metrics-store.js` (or `src/` in ts-node). */
function packageRootFromFile(): string {
  return path.resolve(__dirname, '..', '..');
}

function defaultMetricsPath(): string {
  const override = process.env.OPENCLAW_TOKEN_OPTIMIZER_METRICS_PATH?.trim();
  if (override) return path.resolve(override);
  const repo = process.env.OPENCLAW_TOKEN_OPTIMIZER_REPO?.trim();
  if (repo) {
    return path.join(path.resolve(repo), 'logs', 'token-metrics.json');
  }
  // Use package location, not process.cwd() — the OpenClaw gateway often has cwd
  // $HOME or ~/.openclaw, so cwd-based paths never wrote to the clone's logs/.
  return path.join(packageRootFromFile(), 'logs', 'token-metrics.json');
}

export function resolveMetricsFilePath(): string {
  return defaultMetricsPath();
}

export function loadMetrics(): TokenMetricsFile {
  const filePath = defaultMetricsPath();
  if (!fs.existsSync(filePath)) {
    return { version: FILE_VERSION, cumulative: emptyCumulative() };
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<TokenMetricsFile>;
    if (!parsed.cumulative) {
      return { version: FILE_VERSION, cumulative: emptyCumulative() };
    }
    return {
      version: FILE_VERSION,
      cumulative: {
        ...emptyCumulative(),
        ...parsed.cumulative,
        tokensSaved: Number(parsed.cumulative.tokensSaved) || 0,
        optimizerRuns: Number(parsed.cumulative.optimizerRuns) || 0,
        potentialTokensTotal: Number(parsed.cumulative.potentialTokensTotal) || 0,
        updatedAt: parsed.cumulative.updatedAt || new Date().toISOString(),
      },
    };
  } catch {
    return { version: FILE_VERSION, cumulative: emptyCumulative() };
  }
}

/**
 * Persists a real search (not an in-memory cache hit) to the JSON file.
 */
export function recordOptimizerRun(stats: {
  tokensSaved: number;
  potentialTokens: number;
}): void {
  const filePath = defaultMetricsPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const current = loadMetrics();
  const saved = Math.max(0, Math.floor(stats.tokensSaved));
  const potential = Math.max(0, Math.floor(stats.potentialTokens));

  current.cumulative.tokensSaved += saved;
  current.cumulative.optimizerRuns += 1;
  current.cumulative.potentialTokensTotal += potential;
  current.cumulative.updatedAt = new Date().toISOString();

  const payload: TokenMetricsFile = {
    version: FILE_VERSION,
    cumulative: current.cumulative,
  };

  const tmp = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2) + '\n');
  fs.renameSync(tmp, filePath);
}

export function resetMetrics(): void {
  const filePath = defaultMetricsPath();
  const fresh: TokenMetricsFile = {
    version: FILE_VERSION,
    cumulative: emptyCumulative(),
  };
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(fresh, null, 2) + '\n');
}

/** Average savings ratio on cumulative totals (potential vs saved). */
export function averageSavingsPercent(c: CumulativeTokenMetrics): number {
  if (c.potentialTokensTotal <= 0) return 0;
  const ratio = c.tokensSaved / c.potentialTokensTotal;
  return Math.min(100, Math.round(ratio * 100));
}
