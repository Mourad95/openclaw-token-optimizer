const { LocalIndex } = require('vectra');
const { pipeline } = require('@xenova/transformers');
import * as fs from 'fs';
import * as path from 'path';
import type { VectorMemoryOptions, MemorySearchResult, IndexResult, IndexFileStats } from './types';
import { logger } from './logger';
import { ModelLoadError } from './errors';

export class VectorMemory {
  private indexPath: string;
  private embeddingModel: string;
  private chunkSize: number;
  private overlap: number;
  private index: InstanceType<typeof LocalIndex>;
  private embedder: ((text: string, opts: { pooling: string; normalize: boolean }) => Promise<{ data: Float32Array | number[] }>) | null = null;
  private initialized = false;

  constructor(options: VectorMemoryOptions = {}) {
    this.indexPath = options.indexPath ?? path.join(process.cwd(), '.vectra-index');
    this.embeddingModel = options.embeddingModel ?? 'Xenova/all-MiniLM-L6-v2';
    this.chunkSize = options.chunkSize ?? 500;
    this.overlap = options.overlap ?? 50;
    this.index = new LocalIndex(this.indexPath);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    logger.verbose('Loading embedding model:', this.embeddingModel);
    try {
      this.embedder = await pipeline('feature-extraction', this.embeddingModel);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ModelLoadError(
        `Failed to load embedding model "${this.embeddingModel}": ${msg}. ` +
          'Check network connectivity (first download), disk space, and that the model name is valid.',
        err
      );
    }

    if (!(await this.index.isIndexCreated())) {
      await this.index.createIndex();
      logger.verbose('Created new vector index at:', this.indexPath);
    } else {
      logger.verbose('Loaded existing vector index from:', this.indexPath);
    }

    this.initialized = true;
    logger.debug('VectorMemory initialized successfully');
  }

  async generateEmbedding(text: string): Promise<number[]> {
    await this.initialize();
    if (!this.embedder) throw new Error('Embedder not initialized');
    const result = await this.embedder(text, { pooling: 'mean', normalize: true });
    return Array.from(result.data);
  }

  async addMemory(text: string, metadata: Record<string, unknown> = {}): Promise<string> {
    await this.initialize();

    const id = `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const embedding = await this.generateEmbedding(text);

    await this.index.insertItem({
      vector: embedding,
      metadata: {
        id,
        text: text.substring(0, 1000),
        fullText: text,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });

    logger.debug('Memory added:', id, `(${text.length} chars)`);
    return id;
  }

  async searchMemories(query: string, limit = 5, minScore = 0.3): Promise<MemorySearchResult[]> {
    await this.initialize();

    const queryEmbedding = await this.generateEmbedding(query);
    const results = await this.index.queryItems(queryEmbedding, limit * 2);

    interface QueryItem {
      item: { metadata: Record<string, unknown> };
      score: number;
    }
    const filteredResults: MemorySearchResult[] = (results as QueryItem[])
      .filter((r: QueryItem) => r.score >= minScore)
      .slice(0, limit)
      .map((r: QueryItem) => ({
        id: r.item.metadata.id as string,
        text: r.item.metadata.text as string,
        fullText: r.item.metadata.fullText as string | undefined,
        metadata: r.item.metadata as Record<string, unknown>,
        score: r.score,
      }));

    logger.verbose(`Found ${filteredResults.length} relevant memories (min score: ${minScore})`);
    return filteredResults;
  }

  async indexMemoryFiles(memoryDir: string, _options: Record<string, unknown> = {}): Promise<IndexResult> {
    await this.initialize();

    logger.verbose('Indexing memory files from:', memoryDir);

    if (!fs.existsSync(memoryDir)) {
      fs.mkdirSync(memoryDir, { recursive: true });
      logger.verbose('Created memory directory:', memoryDir);
      return { indexed: 0, files: 0 };
    }

    const filePaths = fs
      .readdirSync(memoryDir)
      .filter((file) => file.endsWith('.md'))
      .map((file) => path.join(memoryDir, file));

    let totalChunks = 0;
    const fileStats: IndexFileStats[] = [];

    for (const filePath of filePaths) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const fileName = path.basename(filePath);
        const chunks = this.splitIntoChunks(content);

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i].trim();
          if (chunk.length < 20) continue;

          await this.addMemory(chunk, {
            source: fileName,
            chunkIndex: i,
            totalChunks: chunks.length,
            filePath,
            type: 'memory-file',
          });
          totalChunks++;
        }

        fileStats.push({ file: fileName, chunks: chunks.length, size: content.length });
        logger.verbose('Indexed:', fileName, `(${chunks.length} chunks)`);
      } catch (error) {
        console.error(`Error indexing ${filePath}:`, (error as Error).message);
      }
    }

    logger.verbose(`Indexing complete: ${totalChunks} chunks from ${filePaths.length} files`);
    return { indexed: totalChunks, files: filePaths.length, fileStats };
  }

  splitIntoChunks(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + this.chunkSize, text.length);
      let chunk = text.substring(start, end);

      const lastPeriod = chunk.lastIndexOf('.');
      const lastNewline = chunk.lastIndexOf('\n');
      const boundary = Math.max(lastPeriod, lastNewline);

      if (boundary > this.chunkSize / 2 && boundary < chunk.length - 10) {
        chunk = chunk.substring(0, boundary + 1);
      }

      chunks.push(chunk.trim());
      start += chunk.length - this.overlap;

      if (chunk.length === 0) break;
    }

    return chunks.filter((chunk) => chunk.length > 0);
  }

  async getStats(): Promise<{
    indexPath: string;
    embeddingModel: string;
    initialized: boolean;
    estimatedItems: number;
    chunkSize: number;
    overlap: number;
  }> {
    await this.initialize();

    let estimatedItems = 0;
    if (fs.existsSync(this.indexPath)) {
      const files = fs.readdirSync(this.indexPath);
      estimatedItems = Math.floor(files.length / 3);
    }

    return {
      indexPath: this.indexPath,
      embeddingModel: this.embeddingModel,
      initialized: this.initialized,
      estimatedItems,
      chunkSize: this.chunkSize,
      overlap: this.overlap,
    };
  }

  async clearIndex(): Promise<{ success: boolean }> {
    await this.initialize();
    await this.index.deleteIndex();
    logger.verbose('Vector index cleared');
    return { success: true };
  }

  async exportMemories(limit = 100): Promise<{ count: number; memories: unknown[]; exportedAt: string }> {
    await this.initialize();

    const queryEmbedding = await this.generateEmbedding('general');
    const results = await this.index.queryItems(queryEmbedding, limit);

    const memories = (results as Array<{ item: { metadata: Record<string, unknown> }; score: number }>).map((r) => ({
      id: r.item.metadata.id,
      text: r.item.metadata.text,
      metadata: r.item.metadata,
      score: r.score,
    }));

    return {
      count: memories.length,
      memories,
      exportedAt: new Date().toISOString(),
    };
  }
}
