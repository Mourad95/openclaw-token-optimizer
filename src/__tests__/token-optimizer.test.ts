import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { TokenOptimizer } from '../token-optimizer';
import { mockVectra, mockTransformers, mockLogger } from './mocks';

// Mock dependencies
jest.mock('vectra', () => mockVectra);
jest.mock('@xenova/transformers', () => mockTransformers);

describe('TokenOptimizer', () => {
  let optimizer: TokenOptimizer;

  beforeEach(() => {
    optimizer = new TokenOptimizer();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with default settings', async () => {
      await optimizer.initialize();
      
      expect(optimizer.maxContextLength).toBe(1000);
      expect(optimizer.maxTokens).toBe(800);
      expect(optimizer.minRelevanceScore).toBe(0.4);
    });

    test('should initialize with custom settings', async () => {
      const customOptimizer = new TokenOptimizer({
        maxContextLength: 1500,
        maxTokens: 1200,
        minRelevanceScore: 0.3,
        cacheSize: 100
      });

      await customOptimizer.initialize();

      expect(customOptimizer.maxContextLength).toBe(1500);
      expect(customOptimizer.maxTokens).toBe(1200);
      expect(customOptimizer.minRelevanceScore).toBe(0.3);
    });
  });

  describe('Context Optimization', () => {
    beforeEach(async () => {
      await optimizer.initialize();
    });

    test('should optimize context by removing duplicates', () => {
      const testResults = [
        { text: 'Duplicate text', score: 0.9, metadata: { source: 'test' } },
        { text: 'Duplicate text', score: 0.8, metadata: { source: 'test' } },
        { text: 'Different text', score: 0.7, metadata: { source: 'test' } },
        { text: 'Another unique text', score: 0.6, metadata: { source: 'test' } }
      ];

      const optimized = optimizer.optimizeContext(testResults, 'test-query');

      expect(optimized.selectedResults).toBe(3); // 1 duplicate removed
      expect(optimized.duplicatesRemoved).toBe(1);
      expect(optimized.optimizedResults).toHaveLength(3);
    });

    test('should respect maxContextLength', () => {
      const longText = 'A'.repeat(2000);
      const testResults = [
        { text: longText, score: 0.9, metadata: { source: 'test' } },
        { text: 'Short text', score: 0.8, metadata: { source: 'test' } }
      ];

      const optimized = optimizer.optimizeContext(testResults, 'test-query');

      // Overlong text should be truncated or excluded
      expect(optimized.optimizedResults[0].text.length).toBeLessThanOrEqual(1000);
    });

    test('should filter by minRelevanceScore', () => {
      const testResults = [
        { text: 'High relevance', score: 0.8, metadata: { source: 'test' } },
        { text: 'Medium relevance', score: 0.5, metadata: { source: 'test' } },
        { text: 'Low relevance', score: 0.2, metadata: { source: 'test' } } // En dessous du seuil
      ];

      const optimized = optimizer.optimizeContext(testResults, 'test-query');

      expect(optimized.selectedResults).toBe(2); // Seulement les 2 premiers
      expect(optimized.optimizedResults).toHaveLength(2);
    });
  });

  describe('Cache System', () => {
    test('should cache query results', async () => {
      await optimizer.initialize();
      
      const query = 'test query';
      const result1 = await optimizer.getOptimizedContext(query, 3);
      const result2 = await optimizer.getOptimizedContext(query, 3);

      // Cache should work
      const stats = optimizer.getPerformanceStats();
      expect(stats.cacheSize).toBeGreaterThan(0);
    });

    test('should clear cache', async () => {
      await optimizer.initialize();
      
      // Add some queries to the cache
      await optimizer.getOptimizedContext('query1', 2);
      await optimizer.getOptimizedContext('query2', 2);

      const clearResult = optimizer.clearCache();
      
      expect(clearResult.cleared).toBeGreaterThan(0);
      expect(clearResult.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle empty search results', () => {
      const optimized = optimizer.optimizeContext([], 'test-query');
      
      expect(optimized.selectedResults).toBe(0);
      expect(optimized.optimizedResults).toHaveLength(0);
      expect(optimized.totalTokens).toBe(0);
    });

    test('should handle initialization errors gracefully', async () => {
      // Simuler une erreur d'initialisation
      mockVectra.LocalIndex.mockImplementationOnce(() => ({
        isIndexCreated: jest.fn().mockRejectedValue(new Error('Initialization failed'))
      }));

      const errorOptimizer = new TokenOptimizer();
      
      await expect(errorOptimizer.initialize()).rejects.toThrow('Initialization failed');
    });
  });

  describe('Performance Stats', () => {
    test('should return performance statistics', async () => {
      await optimizer.initialize();
      
      // Run a few queries
      await optimizer.getOptimizedContext('query1', 2);
      await optimizer.getOptimizedContext('query2', 2);
      await optimizer.getOptimizedContext('query1', 2); // Cache hit

      const stats = optimizer.getPerformanceStats();
      
      expect(stats).toHaveProperty('totalQueries');
      expect(stats).toHaveProperty('cacheHits');
      expect(stats).toHaveProperty('cacheMisses');
      expect(stats).toHaveProperty('cacheHitRate');
      expect(stats).toHaveProperty('averageResponseTime');
      expect(stats.totalQueries).toBe(3);
    });
  });
});