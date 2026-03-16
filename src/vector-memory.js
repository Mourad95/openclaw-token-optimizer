const { LocalIndex } = require('vectra');
const { pipeline } = require('@xenova/transformers');
const fs = require('fs');
const path = require('path');

/**
 * Simple Vector Memory System
 * 
 * Uses local embeddings and vector search to store and retrieve memories
 * efficiently. Based on the all-MiniLM-L6-v2 model for embeddings.
 */
class VectorMemory {
  constructor(options = {}) {
    this.indexPath = options.indexPath || path.join(process.cwd(), '.vectra-index');
    this.embeddingModel = options.embeddingModel || 'Xenova/all-MiniLM-L6-v2';
    this.chunkSize = options.chunkSize || 500; // characters per chunk
    this.overlap = options.overlap || 50; // character overlap between chunks
    
    this.index = new LocalIndex(this.indexPath);
    this.embedder = null;
    this.initialized = false;
  }

  /**
   * Initialize the vector memory system
   */
  async initialize() {
    if (this.initialized) return;

    console.log('Loading embedding model:', this.embeddingModel);
    this.embedder = await pipeline('feature-extraction', this.embeddingModel);
    
    if (!await this.index.isIndexCreated()) {
      await this.index.createIndex();
      console.log('Created new vector index at:', this.indexPath);
    } else {
      console.log('Loaded existing vector index from:', this.indexPath);
    }

    this.initialized = true;
    console.log('VectorMemory initialized successfully');
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(text) {
    await this.initialize();
    const result = await this.embedder(text, { 
      pooling: 'mean', 
      normalize: true 
    });
    return Array.from(result.data);
  }

  /**
   * Add a memory to the vector store
   */
  async addMemory(text, metadata = {}) {
    await this.initialize();
    
    const id = `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const embedding = await this.generateEmbedding(text);
    
    await this.index.insertItem({
      vector: embedding,
      metadata: {
        id,
        text: text.substring(0, 1000), // Store first 1000 chars
        fullText: text, // Store full text separately
        timestamp: new Date().toISOString(),
        ...metadata
      }
    });

    console.log(`Memory added: ${id} (${text.length} chars)`);
    return id;
  }

  /**
   * Search memories by semantic similarity
   */
  async searchMemories(query, limit = 5, minScore = 0.3) {
    await this.initialize();
    
    const queryEmbedding = await this.generateEmbedding(query);
    const results = await this.index.queryItems(queryEmbedding, limit * 2); // Get extra for filtering
    
    // Filter by minimum score and format results
    const filteredResults = results
      .filter(result => result.score >= minScore)
      .slice(0, limit)
      .map(result => ({
        id: result.item.metadata.id,
        text: result.item.metadata.text,
        fullText: result.item.metadata.fullText,
        metadata: result.item.metadata,
        score: result.score
      }));
    
    console.log(`Found ${filteredResults.length} relevant memories (min score: ${minScore})`);
    return filteredResults;
  }

  /**
   * Index memory files from a directory
   */
  async indexMemoryFiles(memoryDir, options = {}) {
    await this.initialize();
    
    console.log(`Indexing memory files from: ${memoryDir}`);
    
    if (!fs.existsSync(memoryDir)) {
      fs.mkdirSync(memoryDir, { recursive: true });
      console.log(`Created memory directory: ${memoryDir}`);
      return { indexed: 0, files: 0 };
    }

    const files = fs.readdirSync(memoryDir)
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(memoryDir, file));

    let totalChunks = 0;
    const fileStats = [];

    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const fileName = path.basename(filePath);
        
        // Split content into chunks
        const chunks = this.splitIntoChunks(content);
        
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i].trim();
          if (chunk.length < 20) continue;
          
          await this.addMemory(chunk, {
            source: fileName,
            chunkIndex: i,
            totalChunks: chunks.length,
            filePath,
            type: 'memory-file'
          });
          totalChunks++;
        }
        
        fileStats.push({
          file: fileName,
          chunks: chunks.length,
          size: content.length
        });
        
        console.log(`Indexed: ${fileName} (${chunks.length} chunks)`);
      } catch (error) {
        console.error(`Error indexing ${filePath}:`, error.message);
      }
    }
    
    console.log(`Indexing complete: ${totalChunks} chunks from ${files.length} files`);
    return {
      indexed: totalChunks,
      files: files.length,
      fileStats
    };
  }

  /**
   * Split text into overlapping chunks
   */
  splitIntoChunks(text) {
    const chunks = [];
    let start = 0;
    
    while (start < text.length) {
      const end = Math.min(start + this.chunkSize, text.length);
      let chunk = text.substring(start, end);
      
      // Try to end at a sentence boundary
      const lastPeriod = chunk.lastIndexOf('.');
      const lastNewline = chunk.lastIndexOf('\n');
      const boundary = Math.max(lastPeriod, lastNewline);
      
      if (boundary > this.chunkSize / 2 && boundary < chunk.length - 10) {
        chunk = chunk.substring(0, boundary + 1);
      }
      
      chunks.push(chunk.trim());
      start += chunk.length - this.overlap;
      
      if (chunk.length === 0) break; // Prevent infinite loop
    }
    
    return chunks.filter(chunk => chunk.length > 0);
  }

  /**
   * Get statistics about the vector store
   */
  async getStats() {
    await this.initialize();
    
    // Note: Vectra doesn't expose item count directly
    // We'll estimate based on folder size
    let estimatedItems = 0;
    if (fs.existsSync(this.indexPath)) {
      const files = fs.readdirSync(this.indexPath);
      estimatedItems = Math.floor(files.length / 3); // Rough estimate
    }
    
    return {
      indexPath: this.indexPath,
      embeddingModel: this.embeddingModel,
      initialized: this.initialized,
      estimatedItems,
      chunkSize: this.chunkSize,
      overlap: this.overlap
    };
  }

  /**
   * Clear the entire index
   */
  async clearIndex() {
    await this.initialize();
    await this.index.deleteIndex();
    console.log('Vector index cleared');
    return { success: true };
  }

  /**
   * Export memories to JSON
   */
  async exportMemories(limit = 100) {
    await this.initialize();
    
    // This is a simplified export - in production you'd want
    // to implement proper pagination through the index
    const queryEmbedding = await this.generateEmbedding('general');
    const results = await this.index.queryItems(queryEmbedding, limit);
    
    const memories = results.map(result => ({
      id: result.item.metadata.id,
      text: result.item.metadata.text,
      metadata: result.item.metadata,
      score: result.score
    }));
    
    return {
      count: memories.length,
      memories,
      exportedAt: new Date().toISOString()
    };
  }
}

module.exports = VectorMemory;
