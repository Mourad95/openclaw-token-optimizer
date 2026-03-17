import { VectorMemory } from './vector-memory';
import * as path from 'path';
import * as fs from 'fs';
import type {
  TokenOptimizerOptions,
  MemorySearchResult,
  OptimizedContextResult,
  AnalysisResult,
} from './types';
import { logger } from './logger';

export interface GetOptimizedContextResult {
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
  metadata: { generatedAt: string; cacheKey: string };
}

export class TokenOptimizer {
  vectorMemory: VectorMemory;
  maxContextLength: number;
  maxTokens: number;
  private cacheSize: number;
  minRelevanceScore: number;
  private contextCache = new Map<string, GetOptimizedContextResult>();
  private performanceStats = {
    queries: 0,
    cacheHits: 0,
    tokensSaved: 0,
    avgResponseTime: 0,
  };

  constructor(options: TokenOptimizerOptions = {}) {
    this.vectorMemory = new VectorMemory(options.vectorMemory);
    this.maxContextLength = options.maxContextLength ?? 2000;
    this.maxTokens = options.maxTokens ?? 1000;
    this.cacheSize = options.cacheSize ?? 100;
    this.minRelevanceScore = options.minRelevanceScore ?? 0.3;
  }

  async initialize(): Promise<void> {
    await this.vectorMemory.initialize();
    logger.debug('TokenOptimizer initialized');
  }

  async getOptimizedContext(query: string, maxResults = 5): Promise<GetOptimizedContextResult> {
    const startTime = Date.now();
    this.performanceStats.queries++;

    const cacheKey = this.generateCacheKey(query, maxResults);
    if (this.contextCache.has(cacheKey)) {
      this.performanceStats.cacheHits++;
      logger.debug('Cache hit for query:', query.substring(0, 50));
      return this.contextCache.get(cacheKey)!;
    }

    const searchResults = await this.vectorMemory.searchMemories(
      query,
      maxResults * 2,
      this.minRelevanceScore
    );

    const optimizedContext = this.optimizeContext(searchResults, query);

    const estimatedTokens = Math.ceil(optimizedContext.context.length / 4);
    const potentialTokens = this.estimatePotentialTokens(searchResults);
    const tokensSaved = Math.max(0, potentialTokens - estimatedTokens);

    this.performanceStats.tokensSaved += tokensSaved;

    const result: GetOptimizedContextResult = {
      context: optimizedContext.context,
      query,
      stats: {
        searchResults: searchResults.length,
        selectedResults: optimizedContext.selectedResults,
        duplicatesRemoved: optimizedContext.duplicatesRemoved,
        estimatedTokens,
        potentialTokens,
        tokensSaved,
        savingsPercent:
          potentialTokens > 0 ? Math.round((tokensSaved / potentialTokens) * 100) : 0,
        responseTime: Date.now() - startTime,
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        cacheKey,
      },
    };

    this.contextCache.set(cacheKey, result);
    this.manageCacheSize();
    this.updatePerformanceStats(result.stats.responseTime);

    logger.verbose(
      `Optimized context: ${estimatedTokens} tokens (saved ${result.stats.savingsPercent}%)`
    );
    return result;
  }

  optimizeContext(results: MemorySearchResult[], originalQuery: string): OptimizedContextResult {
    const seenTexts = new Set<string>();
    const uniqueResults: MemorySearchResult[] = [];
    let duplicatesRemoved = 0;

    for (const result of results) {
      const normalizedText = result.text.trim().toLowerCase();
      if (!seenTexts.has(normalizedText)) {
        seenTexts.add(normalizedText);
        uniqueResults.push(result);
      } else {
        duplicatesRemoved++;
      }
    }

    let totalLength = 0;
    const selectedResults: string[] = [];

    for (const result of uniqueResults) {
      const formattedResult = this.formatMemoryResult(result);
      const resultLength = formattedResult.length;

      if (totalLength + resultLength <= this.maxContextLength) {
        selectedResults.push(formattedResult);
        totalLength += resultLength;
      } else if (selectedResults.length === 0) {
        const truncated =
          formattedResult.substring(0, this.maxContextLength - 100) + '...';
        selectedResults.push(truncated);
        totalLength = this.maxContextLength;
        break;
      } else {
        break;
      }
    }

    const queryContext = `Query: ${originalQuery}\n\n`;
    const finalContext = queryContext + selectedResults.join('\n\n');

    return {
      context: finalContext,
      selectedResults: selectedResults.length,
      duplicatesRemoved,
      totalLength,
    };
  }

  formatMemoryResult(result: MemorySearchResult): string {
    const source = (result.metadata.source as string) || 'memory';
    const date = result.metadata.timestamp
      ? new Date(result.metadata.timestamp as string).toLocaleDateString()
      : 'unknown';
    return `[${source}, ${date}, relevance: ${result.score.toFixed(2)}] ${result.text}`;
  }

  estimatePotentialTokens(results: MemorySearchResult[]): number {
    let totalChars = 0;
    for (const result of results) {
      totalChars += result.text.length;
      if (result.fullText && result.fullText.length > result.text.length) {
        totalChars += (result.fullText.length - result.text.length) * 0.5;
      }
    }
    return Math.ceil(totalChars / 4);
  }

  private generateCacheKey(query: string, maxResults: number): string {
    const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, '_');
    return `${normalizedQuery}_${maxResults}`;
  }

  private manageCacheSize(): void {
    if (this.contextCache.size > this.cacheSize) {
      const firstKey = this.contextCache.keys().next().value;
      if (firstKey) this.contextCache.delete(firstKey);
    }
  }

  private updatePerformanceStats(responseTime: number): void {
    const currentAvg = this.performanceStats.avgResponseTime;
    const totalQueries = this.performanceStats.queries;
    this.performanceStats.avgResponseTime =
      (currentAvg * (totalQueries - 1) + responseTime) / totalQueries;
  }

  async analyzeTokenSavings(memoryDir?: string): Promise<AnalysisResult> {
    await this.initialize();

    if (!memoryDir) {
      memoryDir = path.join(process.env.OPENCLAW_WORKSPACE || process.cwd(), 'memory');
    }

    if (!fs.existsSync(memoryDir)) {
      return { error: 'Memory directory not found', path: memoryDir };
    }

    let totalChars = 0;
    let totalFiles = 0;

    const filePaths = fs
      .readdirSync(memoryDir)
      .filter((file) => file.endsWith('.md'))
      .map((file) => path.join(memoryDir!, file));

    for (const filePath of filePaths) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        totalChars += content.length;
        totalFiles++;
      } catch (error) {
        console.error(`Error reading ${filePath}:`, (error as Error).message);
      }
    }

    const estimatedTokensFull = Math.ceil(totalChars / 4);
    const estimatedTokensOptimized = Math.ceil(this.maxContextLength / 4);
    const tokensSaved = Math.max(0, estimatedTokensFull - estimatedTokensOptimized);
    const savingsPercent =
      estimatedTokensFull > 0 ? Math.round((tokensSaved / estimatedTokensFull) * 100) : 0;

    return {
      analysis: {
        totalFiles,
        totalCharacters: totalChars,
        estimatedTokensFull,
        estimatedTokensOptimized,
        tokensSaved,
        savingsPercent,
        maxContextLength: this.maxContextLength,
      },
      explanation: `Instead of sending ${estimatedTokensFull} tokens of raw memory, 
                   only ${estimatedTokensOptimized} tokens of relevant context are sent.`,
      recommendations: this.generateRecommendations(savingsPercent, totalFiles),
    };
  }

  private generateRecommendations(savingsPercent: number, totalFiles: number): string[] {
    const recommendations: string[] = [];

    if (savingsPercent < 50) {
      recommendations.push(
        'Consider increasing maxContextLength for better context retention',
        'Add more diverse memories to improve semantic search coverage'
      );
    }

    if (totalFiles > 50) {
      recommendations.push(
        'Large memory size detected - optimization is highly effective',
        'Consider periodic cleanup of old memory files'
      );
    }

    if (savingsPercent > 90) {
      recommendations.push(
        'Excellent optimization achieved!',
        'Consider reducing maxContextLength slightly for even more savings'
      );
    }

    return recommendations;
  }

  async addConversationToMemory(
    userMessage: string,
    assistantResponse: string,
    metadata: Record<string, unknown> = {}
  ): Promise<{ id: string; success: boolean; message: string; metadata: Record<string, unknown> }> {
    await this.initialize();

    const conversationText = `User: ${userMessage}\nAssistant: ${assistantResponse}`;
    const conversationMetadata = {
      type: 'conversation',
      userMessageLength: userMessage.length,
      assistantResponseLength: assistantResponse.length,
      ...metadata,
    };

    const id = await this.vectorMemory.addMemory(conversationText, conversationMetadata);

    return {
      id,
      success: true,
      message: 'Conversation added to vector memory',
      metadata: conversationMetadata,
    };
  }

  getPerformanceStats(): {
    queries: number;
    cacheHits: number;
    tokensSaved: number;
    avgResponseTime: number;
    cacheHitRate: string;
    cacheSize: number;
    maxCacheSize: number;
    settings: { maxContextLength: number; maxTokens: number; minRelevanceScore: number };
  } {
    const cacheHitRate =
      this.performanceStats.queries > 0
        ? Math.round((this.performanceStats.cacheHits / this.performanceStats.queries) * 100)
        : 0;

    return {
      ...this.performanceStats,
      cacheHitRate: `${cacheHitRate}%`,
      cacheSize: this.contextCache.size,
      maxCacheSize: this.cacheSize,
      settings: {
        maxContextLength: this.maxContextLength,
        maxTokens: this.maxTokens,
        minRelevanceScore: this.minRelevanceScore,
      },
    };
  }

  clearCache(): { cleared: number } {
    const cacheSize = this.contextCache.size;
    this.contextCache.clear();
    return { cleared: cacheSize };
  }
}
