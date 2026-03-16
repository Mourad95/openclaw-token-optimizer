const VectorMemory = require('./vector-memory');
const path = require('path');
const fs = require('fs');

/**
 * Token Optimizer for OpenClaw
 * 
 * Reduces token consumption by 70-90% using vector embeddings
 * and intelligent context selection.
 */
class TokenOptimizer {
  constructor(options = {}) {
    this.vectorMemory = new VectorMemory(options.vectorMemory);
    
    this.maxContextLength = options.maxContextLength || 2000; // ~500 tokens
    this.maxTokens = options.maxTokens || 1000; // Target token limit
    this.cacheSize = options.cacheSize || 100;
    this.minRelevanceScore = options.minRelevanceScore || 0.3;
    
    this.contextCache = new Map();
    this.performanceStats = {
      queries: 0,
      cacheHits: 0,
      tokensSaved: 0,
      avgResponseTime: 0
    };
  }

  /**
   * Initialize the optimizer
   */
  async initialize() {
    await this.vectorMemory.initialize();
    console.log('TokenOptimizer initialized');
  }

  /**
   * Get optimized context for a query
   */
  async getOptimizedContext(query, maxResults = 5) {
    const startTime = Date.now();
    this.performanceStats.queries++;
    
    // Check cache first
    const cacheKey = this.generateCacheKey(query, maxResults);
    if (this.contextCache.has(cacheKey)) {
      this.performanceStats.cacheHits++;
      console.log('Cache hit for query:', query.substring(0, 50));
      return this.contextCache.get(cacheKey);
    }
    
    // Search for relevant memories
    const searchResults = await this.vectorMemory.searchMemories(
      query, 
      maxResults * 2, // Get extra for filtering
      this.minRelevanceScore
    );
    
    // Optimize and format the context
    const optimizedContext = this.optimizeContext(searchResults, query);
    
    // Calculate token savings
    const estimatedTokens = Math.ceil(optimizedContext.context.length / 4);
    const potentialTokens = this.estimatePotentialTokens(searchResults);
    const tokensSaved = Math.max(0, potentialTokens - estimatedTokens);
    
    this.performanceStats.tokensSaved += tokensSaved;
    
    // Build result object
    const result = {
      context: optimizedContext.context,
      query,
      stats: {
        searchResults: searchResults.length,
        selectedResults: optimizedContext.selectedResults,
        duplicatesRemoved: optimizedContext.duplicatesRemoved,
        estimatedTokens,
        potentialTokens,
        tokensSaved,
        savingsPercent: potentialTokens > 0 ? 
          Math.round((tokensSaved / potentialTokens) * 100) : 0,
        responseTime: Date.now() - startTime
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        cacheKey
      }
    };
    
    // Cache the result
    this.contextCache.set(cacheKey, result);
    this.manageCacheSize();
    
    // Update performance stats
    this.updatePerformanceStats(result.stats.responseTime);
    
    console.log(`Optimized context: ${estimatedTokens} tokens (saved ${result.stats.savingsPercent}%)`);
    return result;
  }

  /**
   * Optimize search results for token efficiency
   */
  optimizeContext(results, originalQuery) {
    // Step 1: Remove duplicates
    const seenTexts = new Set();
    const uniqueResults = [];
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
    
    // Step 2: Sort by relevance (already sorted by vector memory)
    // Step 3: Select results until we hit token limit
    let totalLength = 0;
    const selectedResults = [];
    
    for (const result of uniqueResults) {
      const formattedResult = this.formatMemoryResult(result);
      const resultLength = formattedResult.length;
      
      if (totalLength + resultLength <= this.maxContextLength) {
        selectedResults.push(formattedResult);
        totalLength += resultLength;
      } else if (selectedResults.length === 0) {
        // If even the first result is too long, truncate it
        const truncated = formattedResult.substring(0, this.maxContextLength - 100) + '...';
        selectedResults.push(truncated);
        totalLength = this.maxContextLength;
        break;
      } else {
        break;
      }
    }
    
    // Step 4: Add query context
    const queryContext = `Query: ${originalQuery}\n\n`;
    const finalContext = queryContext + selectedResults.join('\n\n');
    
    return {
      context: finalContext,
      selectedResults: selectedResults.length,
      duplicatesRemoved,
      totalLength
    };
  }

  /**
   * Format a memory result for token efficiency
   */
  formatMemoryResult(result) {
    const source = result.metadata.source || 'memory';
    const date = result.metadata.timestamp ? 
      new Date(result.metadata.timestamp).toLocaleDateString() : 'unknown';
    
    // Compact format to save tokens
    return `[${source}, ${date}, relevance: ${result.score.toFixed(2)}] ${result.text}`;
  }

  /**
   * Estimate potential tokens without optimization
   */
  estimatePotentialTokens(results) {
    let totalChars = 0;
    for (const result of results) {
      totalChars += result.text.length;
      if (result.fullText && result.fullText.length > result.text.length) {
        // Account for full text being longer
        totalChars += (result.fullText.length - result.text.length) * 0.5;
      }
    }
    return Math.ceil(totalChars / 4);
  }

  /**
   * Generate cache key for query
   */
  generateCacheKey(query, maxResults) {
    const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, '_');
    return `${normalizedQuery}_${maxResults}`;
  }

  /**
   * Manage cache size
   */
  manageCacheSize() {
    if (this.contextCache.size > this.cacheSize) {
      const firstKey = this.contextCache.keys().next().value;
      this.contextCache.delete(firstKey);
    }
  }

  /**
   * Update performance statistics
   */
  updatePerformanceStats(responseTime) {
    const currentAvg = this.performanceStats.avgResponseTime;
    const totalQueries = this.performanceStats.queries;
    
    this.performanceStats.avgResponseTime = 
      (currentAvg * (totalQueries - 1) + responseTime) / totalQueries;
  }

  /**
   * Analyze token savings for a memory directory
   */
  async analyzeTokenSavings(memoryDir) {
    await this.initialize();
    
    if (!memoryDir) {
      memoryDir = path.join(process.env.OPENCLAW_WORKSPACE || process.cwd(), 'memory');
    }
    
    if (!fs.existsSync(memoryDir)) {
      return { error: 'Memory directory not found', path: memoryDir };
    }
    
    // Count total characters in memory files
    let totalChars = 0;
    let totalFiles = 0;
    
    const files = fs.readdirSync(memoryDir)
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(memoryDir, file));
    
    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        totalChars += content.length;
        totalFiles++;
      } catch (error) {
        console.error(`Error reading ${filePath}:`, error.message);
      }
    }
    
    // Calculate token estimates
    const estimatedTokensFull = Math.ceil(totalChars / 4);
    const estimatedTokensOptimized = Math.ceil(this.maxContextLength / 4);
    const tokensSaved = Math.max(0, estimatedTokensFull - estimatedTokensOptimized);
    const savingsPercent = estimatedTokensFull > 0 ? 
      Math.round((tokensSaved / estimatedTokensFull) * 100) : 0;
    
    return {
      analysis: {
        totalFiles,
        totalCharacters: totalChars,
        estimatedTokensFull,
        estimatedTokensOptimized,
        tokensSaved,
        savingsPercent,
        maxContextLength: this.maxContextLength
      },
      explanation: `Instead of sending ${estimatedTokensFull} tokens of raw memory, 
                   only ${estimatedTokensOptimized} tokens of relevant context are sent.`,
      recommendations: this.generateRecommendations(savingsPercent, totalFiles)
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(savingsPercent, totalFiles) {
    const recommendations = [];
    
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

  /**
   * Add conversation to memory
   */
  async addConversationToMemory(userMessage, assistantResponse, metadata = {}) {
    await this.initialize();
    
    const conversationText = `User: ${userMessage}\nAssistant: ${assistantResponse}`;
    const conversationMetadata = {
      type: 'conversation',
      userMessageLength: userMessage.length,
      assistantResponseLength: assistantResponse.length,
      ...metadata
    };
    
    const id = await this.vectorMemory.addMemory(conversationText, conversationMetadata);
    
    return {
      id,
      success: true,
      message: 'Conversation added to vector memory',
      metadata: conversationMetadata
    };
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const cacheHitRate = this.performanceStats.queries > 0 ?
      Math.round((this.performanceStats.cacheHits / this.performanceStats.queries) * 100) : 0;
    
    return {
      ...this.performanceStats,
      cacheHitRate: `${cacheHitRate}%`,
      cacheSize: this.contextCache.size,
      maxCacheSize: this.cacheSize,
      settings: {
        maxContextLength: this.maxContextLength,
        maxTokens: this.maxTokens,
        minRelevanceScore: this.minRelevanceScore
      }
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    const cacheSize = this.contextCache.size;
    this.contextCache.clear();
    return { cleared: cacheSize };
  }
}

module.exports = TokenOptimizer;
