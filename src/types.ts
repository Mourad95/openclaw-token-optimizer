/**
 * Shared types for OpenClaw Token Optimizer
 */

export interface VectorMemoryOptions {
  indexPath?: string;
  embeddingModel?: string;
  chunkSize?: number;
  overlap?: number;
}

export interface MemorySearchResult {
  id: string;
  text: string;
  fullText?: string;
  metadata: Record<string, unknown>;
  score: number;
}

export interface IndexFileStats {
  file: string;
  chunks: number;
  size: number;
}

export interface IndexResult {
  indexed: number;
  files: number;
  fileStats?: IndexFileStats[];
}

export interface OptimizedContextResult {
  context: string;
  selectedResults: number;
  duplicatesRemoved: number;
  totalLength: number;
}

export interface TokenOptimizerOptions {
  maxContextLength?: number;
  maxTokens?: number;
  cacheSize?: number;
  minRelevanceScore?: number;
  vectorMemory?: VectorMemoryOptions;
}

export interface AnalysisResult {
  error?: string;
  path?: string;
  analysis?: {
    totalFiles: number;
    totalCharacters: number;
    estimatedTokensFull: number;
    estimatedTokensOptimized: number;
    tokensSaved: number;
    savingsPercent: number;
    maxContextLength?: number;
  };
  explanation?: string;
  recommendations?: string[];
}

export interface MemorySearchOptions {
  maxResults?: number;
  maxTokens?: number;
  /** OpenClaw gateway workspace root (memory/ lives under it). */
  workspaceDir?: string;
}

export interface MaintenanceOptions {
  clearCache?: boolean;
  rebuildIndex?: boolean;
  optimize?: boolean;
}
