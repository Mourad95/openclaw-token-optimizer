import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { OpenClawTokenOptimizerPlugin } from '../openclaw-plugin';
import { mockVectra, mockTransformers, mockChalk, mockOra } from './mocks';

// Mock dependencies
jest.mock('vectra', () => mockVectra);
jest.mock('@xenova/transformers', () => mockTransformers);
jest.mock('chalk', () => mockChalk);
jest.mock('ora', () => mockOra);

describe('OpenClawTokenOptimizerPlugin', () => {
  let plugin: OpenClawTokenOptimizerPlugin;

  beforeEach(() => {
    plugin = new OpenClawTokenOptimizerPlugin();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize plugin successfully', async () => {
      await plugin.initialize();
      
      const stats = await plugin.getStats();
      
      expect(stats.plugin.initialized).toBe(true);
      expect(stats.plugin.version).toBe('1.0.0');
      expect(stats.plugin.name).toBe('OpenClaw Token Optimizer');
    });

    test('should load configuration from environment', async () => {
      process.env.OPENCLAW_TOKEN_OPTIMIZER_MAX_TOKENS = '1200';
      process.env.OPENCLAW_TOKEN_OPTIMIZER_CACHE_SIZE = '100';
      
      await plugin.initialize();
      const stats = await plugin.getStats();
      
      expect(stats.settings.maxTokens).toBe(1200);
      expect(stats.settings.cacheSize).toBe(100);
      
      // Cleanup
      delete process.env.OPENCLAW_TOKEN_OPTIMIZER_MAX_TOKENS;
      delete process.env.OPENCLAW_TOKEN_OPTIMIZER_CACHE_SIZE;
    });

    test('should handle initialization errors', async () => {
      // Simulate init failure
      mockVectra.LocalIndex.mockImplementationOnce(() => ({
        isIndexCreated: jest.fn().mockRejectedValue(new Error('Failed to create index'))
      }));

      await expect(plugin.initialize()).rejects.toThrow('Failed to create index');
    });
  });

  describe('Memory Search', () => {
    beforeEach(async () => {
      await plugin.initialize();
    });

    test('should search memories and return optimized context', async () => {
      const result = await plugin.memorySearch('test query', {
        maxResults: 3,
        minRelevance: 0.4
      });

      expect(result).toHaveProperty('context');
      expect(result).toHaveProperty('stats');
      expect(result).toHaveProperty('query');
      
      expect(result.query).toBe('test query');
      expect(result.context).toBeInstanceOf(Array);
      expect(result.stats.estimatedTokens).toBeGreaterThan(0);
      expect(result.stats.savingsPercent).toBeGreaterThanOrEqual(0);
    });

    test('should respect maxResults parameter', async () => {
      const result = await plugin.memorySearch('test query', {
        maxResults: 1
      });

      // At most one result
      expect(result.context.length).toBeLessThanOrEqual(1);
    });

    test('should apply token optimization', async () => {
      const result = await plugin.memorySearch('optimization test', {
        maxResults: 5
      });

      // Optimization should be applied
      expect(result.stats.savingsPercent).toBeGreaterThanOrEqual(0);
      expect(result.stats.duplicatesRemoved).toBeDefined();
      expect(result.stats.originalTokens).toBeGreaterThanOrEqual(result.stats.estimatedTokens);
    });

    test('should handle empty search results', async () => {
      // Simulate empty results
      const mockIndex = mockVectra.LocalIndex();
      mockIndex.query.mockResolvedValueOnce([]);

      const result = await plugin.memorySearch('nonexistent query', {
        maxResults: 5
      });

      expect(result.context).toHaveLength(0);
      expect(result.stats.estimatedTokens).toBe(0);
      expect(result.stats.savingsPercent).toBe(0);
    });
  });

  describe('Statistics', () => {
    test('should return comprehensive statistics', async () => {
      await plugin.initialize();
      
      // Run a few searches
      await plugin.memorySearch('query 1', { maxResults: 2 });
      await plugin.memorySearch('query 2', { maxResults: 2 });
      await plugin.memorySearch('query 1', { maxResults: 2 }); // Cache hit

      const stats = await plugin.getStats();

      expect(stats).toHaveProperty('plugin');
      expect(stats).toHaveProperty('performance');
      expect(stats).toHaveProperty('settings');
      expect(stats).toHaveProperty('memory');

      // Plugin stats
      expect(stats.plugin.initialized).toBe(true);
      expect(stats.plugin.version).toBeDefined();
      expect(stats.plugin.name).toBeDefined();

      // Performance stats
      expect(stats.performance.totalQueries).toBe(3);
      expect(stats.performance.cacheHits).toBe(1);
      expect(stats.performance.cacheHitRate).toBeDefined();
      expect(stats.performance.averageResponseTime).toBeGreaterThanOrEqual(0);

      // Settings
      expect(stats.settings.maxTokens).toBe(1000);
      expect(stats.settings.maxContextLength).toBe(1500);
      expect(stats.settings.minRelevanceScore).toBe(0.4);

      // Memory stats
      expect(stats.memory.totalMemories).toBeDefined();
      expect(stats.memory.indexSize).toBeDefined();
    });

    test('should reset statistics', async () => {
      await plugin.initialize();
      
      // Run a few searches
      await plugin.memorySearch('query 1', { maxResults: 2 });
      
      const statsBefore = await plugin.getStats();
      expect(statsBefore.performance.totalQueries).toBe(1);

      // Reset stats
      const resetResult = await plugin.resetStats();
      expect(resetResult.success).toBe(true);

      const statsAfter = await plugin.getStats();
      expect(statsAfter.performance.totalQueries).toBe(0);
    });
  });

  describe('Configuration', () => {
    test('should update configuration', async () => {
      await plugin.initialize();
      
      const updateResult = await plugin.updateConfig({
        maxTokens: 1200,
        cacheSize: 50,
        minRelevanceScore: 0.3
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.updated).toBe(3);

      const stats = await plugin.getStats();
      expect(stats.settings.maxTokens).toBe(1200);
      expect(stats.settings.cacheSize).toBe(50);
      expect(stats.settings.minRelevanceScore).toBe(0.3);
    });

    test('should validate configuration updates', async () => {
      await plugin.initialize();
      
      // Invalid config
      await expect(plugin.updateConfig({
        maxTokens: -100, // invalid
        cacheSize: 0     // invalid
      })).rejects.toThrow();

      // Config should be unchanged
      const stats = await plugin.getStats();
      expect(stats.settings.maxTokens).toBe(1000); // default
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid search parameters', async () => {
      await plugin.initialize();
      
      // Empty query
      await expect(plugin.memorySearch('', { maxResults: 5 }))
        .rejects.toThrow('Query cannot be empty');
      
      // Invalid maxResults
      await expect(plugin.memorySearch('test', { maxResults: 0 }))
        .rejects.toThrow('maxResults must be greater than 0');
      
      await expect(plugin.memorySearch('test', { maxResults: -1 }))
        .rejects.toThrow('maxResults must be greater than 0');
    });

    test('should handle plugin not initialized', async () => {
      const uninitializedPlugin = new OpenClawTokenOptimizerPlugin();
      
      await expect(uninitializedPlugin.memorySearch('test', { maxResults: 5 }))
        .rejects.toThrow('Plugin not initialized');
      
      await expect(uninitializedPlugin.getStats())
        .rejects.toThrow('Plugin not initialized');
    });

    test('should handle search timeout', async () => {
      await plugin.initialize();
      
      // Simulate timeout
      const mockIndex = mockVectra.LocalIndex();
      mockIndex.query.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Search timeout')), 100)
        )
      );

      await expect(plugin.memorySearch('slow query', { maxResults: 5 }))
        .rejects.toThrow('Search timeout');
    });
  });

  describe('Cache Management', () => {
    test('should clear cache', async () => {
      await plugin.initialize();
      
      // Populate cache
      await plugin.memorySearch('cache test 1', { maxResults: 2 });
      await plugin.memorySearch('cache test 2', { maxResults: 2 });

      const clearResult = await plugin.clearCache();
      
      expect(clearResult.success).toBe(true);
      expect(clearResult.cleared).toBeGreaterThan(0);
    });

    test('should return cache statistics', async () => {
      await plugin.initialize();
      
      // Exercise cache
      await plugin.memorySearch('query 1', { maxResults: 2 });
      await plugin.memorySearch('query 1', { maxResults: 2 }); // Cache hit
      await plugin.memorySearch('query 2', { maxResults: 2 }); // Cache miss

      const stats = await plugin.getStats();
      
      expect(stats.performance.cacheHits).toBe(1);
      expect(stats.performance.cacheMisses).toBe(2);
      expect(stats.performance.cacheHitRate).toBe('33%'); // 1 hit / 3 queries
    });
  });
});