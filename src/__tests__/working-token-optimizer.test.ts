import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { TokenOptimizer } from '../token-optimizer';

// Mock simple pour VectorMemory
jest.mock('../vector-memory', () => {
  return {
    VectorMemory: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      searchMemories: jest.fn().mockResolvedValue([
        {
          id: 'memory_1',
          text: 'Test memory content for optimization',
          metadata: { source: 'test.md' },
          score: 0.9
        },
        {
          id: 'memory_2', 
          text: 'Another test memory with similar content',
          metadata: { source: 'test2.md' },
          score: 0.8
        }
      ]),
      addMemory: jest.fn().mockResolvedValue('mock-id'),
      getStats: jest.fn().mockResolvedValue({
        totalMemories: 2,
        indexSize: '1.2 MB',
        initialized: true
      })
    }))
  };
});

describe('TokenOptimizer - Working Tests', () => {
  let optimizer: TokenOptimizer;

  beforeEach(() => {
    optimizer = new TokenOptimizer();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should create TokenOptimizer instance', () => {
      expect(optimizer).toBeInstanceOf(TokenOptimizer);
      expect(optimizer.maxContextLength).toBe(2000);
      expect(optimizer.maxTokens).toBe(1000);
    });

    test('should initialize with custom options', () => {
      const customOptimizer = new TokenOptimizer({
        maxContextLength: 1500,
        maxTokens: 800,
        minRelevanceScore: 0.4
      });

      expect(customOptimizer.maxContextLength).toBe(1500);
      expect(customOptimizer.maxTokens).toBe(800);
      expect(customOptimizer.minRelevanceScore).toBe(0.4);
    });

    test('should initialize vector memory', async () => {
      await optimizer.initialize();
      // Vérifier que initialize a été appelé
      expect(optimizer.vectorMemory.initialize).toHaveBeenCalled();
    });
  });

  describe('Context Optimization', () => {
    beforeEach(async () => {
      await optimizer.initialize();
    });

    test('should optimize context from search results', () => {
      const searchResults = [
        {
          id: '1',
          text: 'First memory content for testing optimization',
          metadata: { source: 'test1.md' },
          score: 0.9
        },
        {
          id: '2',
          text: 'Second memory with different content',
          metadata: { source: 'test2.md' },
          score: 0.8
        }
      ];

      const optimized = optimizer.optimizeContext(searchResults, 'test query');
      
      expect(optimized).toHaveProperty('context');
      expect(optimized).toHaveProperty('selectedResults');
      expect(optimized).toHaveProperty('duplicatesRemoved');
      expect(optimized).toHaveProperty('totalLength');
      
      expect(typeof optimized.context).toBe('string');
      expect(optimized.selectedResults).toBeGreaterThan(0);
      expect(optimized.totalLength).toBeGreaterThan(0);
    });

    test('should handle empty search results', () => {
      const optimized = optimizer.optimizeContext([], 'empty query');
      
      expect(optimized.context).toBe('');
      expect(optimized.selectedResults).toBe(0);
      expect(optimized.duplicatesRemoved).toBe(0);
      expect(optimized.totalLength).toBe(0);
    });
  });

  describe('Cache System', () => {
    test('should get performance statistics', () => {
      const stats = optimizer.getPerformanceStats();
      
      expect(stats).toHaveProperty('queries');
      expect(stats).toHaveProperty('cacheHits');
      expect(stats).toHaveProperty('tokensSaved');
      expect(stats).toHaveProperty('avgResponseTime');
      expect(stats).toHaveProperty('cacheHitRate');
      expect(stats).toHaveProperty('cacheSize');
      
      expect(typeof stats.cacheHitRate).toBe('string');
      expect(stats.cacheSize).toBeGreaterThanOrEqual(0);
    });

    test('should clear cache', () => {
      const result = optimizer.clearCache();
      
      expect(result).toHaveProperty('cleared');
      expect(result.cleared).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle initialization errors gracefully', async () => {
      // Simuler une erreur d'initialisation
      const mockVectorMemory = require('../vector-memory').VectorMemory;
      const errorInstance = new mockVectorMemory();
      errorInstance.initialize = jest.fn().mockRejectedValue(new Error('Init failed'));
      
      const errorOptimizer = new TokenOptimizer();
      errorOptimizer.vectorMemory = errorInstance;
      
      await expect(errorOptimizer.initialize()).rejects.toThrow('Init failed');
    });
  });
});

describe('Integration Tests', () => {
  test('should perform complete search and optimization', async () => {
    const optimizer = new TokenOptimizer();
    await optimizer.initialize();
    
    const result = await optimizer.getOptimizedContext('test query', 3);
    
    expect(result).toHaveProperty('context');
    expect(result).toHaveProperty('query');
    expect(result).toHaveProperty('stats');
    expect(result).toHaveProperty('metadata');
    
    expect(result.query).toBe('test query');
    expect(result.stats).toHaveProperty('estimatedTokens');
    expect(result.stats).toHaveProperty('savingsPercent');
    expect(result.stats).toHaveProperty('responseTime');
    
    expect(result.metadata).toHaveProperty('generatedAt');
    expect(result.metadata).toHaveProperty('cacheKey');
  });

  test('should cache repeated queries', async () => {
    const optimizer = new TokenOptimizer();
    await optimizer.initialize();
    
    const query = 'cache test query';
    const result1 = await optimizer.getOptimizedContext(query, 2);
    const result2 = await optimizer.getOptimizedContext(query, 2);
    
    // Les résultats devraient être similaires
    expect(result1.context).toBe(result2.context);
    expect(result1.stats.estimatedTokens).toBe(result2.stats.estimatedTokens);
    
    const stats = optimizer.getPerformanceStats();
    expect(stats.cacheHits).toBe(1); // Une requête a dû être cachée
  });
});