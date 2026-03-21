import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { TokenOptimizer } from '../token-optimizer';
import { VectorMemory } from '../vector-memory';
import { OpenClawTokenOptimizerPlugin } from '../openclaw-plugin';
import { mockVectra, mockTransformers, mockChalk, mockOra } from './mocks';

// Mock dependencies
jest.mock('vectra', () => mockVectra);
jest.mock('@xenova/transformers', () => mockTransformers);
jest.mock('chalk', () => mockChalk);
jest.mock('ora', () => mockOra);

describe('Integration Tests', () => {
  let plugin: OpenClawTokenOptimizerPlugin;
  let optimizer: TokenOptimizer;
  let vectorMemory: VectorMemory;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Initialiser les composants
    vectorMemory = new VectorMemory();
    await vectorMemory.initialize();
    
    optimizer = new TokenOptimizer();
    await optimizer.initialize();
    
    plugin = new OpenClawTokenOptimizerPlugin();
    await plugin.initialize();
  });

  describe('Complete Search Flow', () => {
    test('should perform end-to-end search with optimization', async () => {
      // 1. Add memories
      const memoryId1 = await vectorMemory.addMemory(
        'OpenClaw is an AI assistant framework that helps developers build intelligent applications.',
        { source: 'docs.md', type: 'documentation' }
      );

      const memoryId2 = await vectorMemory.addMemory(
        'Token optimization reduces AI model costs by removing duplicate and irrelevant content.',
        { source: 'guide.md', type: 'guide' }
      );

      const memoryId3 = await vectorMemory.addMemory(
        'Vector embeddings enable semantic search by converting text to numerical representations.',
        { source: 'tech.md', type: 'technical' }
      );

      // 2. Search with VectorMemory
      const searchResults = await vectorMemory.searchMemories('AI token optimization', 5);
      expect(searchResults).toHaveLength(3);
      expect(searchResults[0].score).toBeGreaterThan(0);

      // 3. Optimize results with TokenOptimizer
      const optimized = optimizer.optimizeContext(searchResults, 'AI token optimization');
      expect(optimized.selectedResults).toBeGreaterThan(0);
      expect(optimized.optimizedResults).toHaveLength(optimized.selectedResults);
      expect(optimized.totalTokens).toBeGreaterThan(0);

      // 4. Check that optimization reduces tokens
      const originalTokens = searchResults.reduce((sum, result) => 
        sum + result.text.split(' ').length * 1.3, 0
      );
      expect(optimized.totalTokens).toBeLessThanOrEqual(originalTokens);

      // 5. Use the plugin for the same search
      const pluginResult = await plugin.memorySearch('AI token optimization', {
        maxResults: 5,
        minRelevance: 0.3
      });

      expect(pluginResult.context).toBeInstanceOf(Array);
      expect(pluginResult.stats.estimatedTokens).toBeGreaterThan(0);
      expect(pluginResult.stats.savingsPercent).toBeGreaterThanOrEqual(0);
    });

    test('should handle cache across multiple searches', async () => {
      const query = 'cache integration test';
      
      // First search (cache miss)
      const result1 = await plugin.memorySearch(query, { maxResults: 3 });
      const stats1 = await plugin.getStats();
      expect(stats1.performance.cacheMisses).toBe(1);

      // Second search (cache hit)
      const result2 = await plugin.memorySearch(query, { maxResults: 3 });
      const stats2 = await plugin.getStats();
      expect(stats2.performance.cacheHits).toBe(1);

      // Results should match (cached)
      expect(result1.context.length).toBe(result2.context.length);
      expect(result1.stats.estimatedTokens).toBe(result2.stats.estimatedTokens);

      // Third search with different params (cache miss)
      const result3 = await plugin.memorySearch(query, { maxResults: 5 });
      const stats3 = await plugin.getStats();
      expect(stats3.performance.cacheMisses).toBe(2);
    });
  });

  describe('Component Interaction', () => {
    test('should share configuration between components', async () => {
      // Configurer le plugin
      await plugin.updateConfig({
        maxTokens: 1200,
        cacheSize: 50,
        minRelevanceScore: 0.3
      });

      const pluginStats = await plugin.getStats();
      expect(pluginStats.settings.maxTokens).toBe(1200);
      expect(pluginStats.settings.cacheSize).toBe(50);
      expect(pluginStats.settings.minRelevanceScore).toBe(0.3);

      // Optimizer should use the same parameters
      // (In a real integration they would share config)
      const customOptimizer = new TokenOptimizer({
        maxTokens: 1200,
        minRelevanceScore: 0.3
      });
      await customOptimizer.initialize();

      expect(customOptimizer.maxTokens).toBe(1200);
      expect(customOptimizer.minRelevanceScore).toBe(0.3);
    });

    test('should handle errors across component boundaries', async () => {
      // Simulate a VectorMemory error
      const mockIndex = mockVectra.LocalIndex();
      mockIndex.query.mockRejectedValueOnce(new Error('Vector search failed'));

      // L'erreur devrait se propager au plugin
      await expect(plugin.memorySearch('test query', { maxResults: 5 }))
        .rejects.toThrow('Vector search failed');

      // Plugin should handle the error
      const stats = await plugin.getStats();
      expect(stats.performance.totalQueries).toBe(1); // query was counted
    });
  });

  describe('Performance Integration', () => {
    test('should measure performance across complete workflow', async () => {
      const startTime = Date.now();

      // Workflow complet
      await vectorMemory.addMemory('Performance test memory 1', { source: 'test' });
      await vectorMemory.addMemory('Performance test memory 2', { source: 'test' });
      
      const searchResults = await vectorMemory.searchMemories('performance test', 5);
      const optimized = optimizer.optimizeContext(searchResults, 'performance test');
      
      const pluginResult = await plugin.memorySearch('performance test', { maxResults: 5 });

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Check performance
      expect(totalTime).toBeLessThan(5000); // under 5 seconds
      
      expect(pluginResult.stats.responseTime).toBeLessThan(1000); // under 1s per search
      expect(optimized.totalTokens).toBeLessThan(1000); // under 1000 tokens
      
      const stats = await plugin.getStats();
      expect(stats.performance.averageResponseTime).toBeLessThan(500); // Moyenne < 500ms
    });

    test('should scale with multiple concurrent operations', async () => {
      const queries = [
        'query one',
        'query two',
        'query three',
        'query four',
        'query five'
      ];

      const startTime = Date.now();
      
      // Run searches in parallel
      const promises = queries.map(query =>
        plugin.memorySearch(query, { maxResults: 3 })
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All searches should succeed
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.context).toBeInstanceOf(Array);
        expect(result.stats.estimatedTokens).toBeGreaterThanOrEqual(0);
      });

      // Total time should be reasonable
      expect(totalTime).toBeLessThan(3000); // under 3s for 5 searches

      const stats = await plugin.getStats();
      expect(stats.performance.totalQueries).toBe(5);
    });
  });

  describe('Data Consistency', () => {
    test('should maintain data consistency across components', async () => {
      // Add data via VectorMemory
      const memoryText = 'Consistency test data for integration testing';
      const memoryId = await vectorMemory.addMemory(memoryText, {
        source: 'integration-test.md',
        timestamp: new Date().toISOString()
      });

      // Check via VectorMemory
      const vectorResults = await vectorMemory.searchMemories('consistency test', 3);
      expect(vectorResults.some(r => r.text.includes('Consistency test'))).toBe(true);

      // Check via Plugin (should see same data)
      const pluginResults = await plugin.memorySearch('consistency test', { maxResults: 3 });
      expect(pluginResults.context.some(c => c.includes('Consistency test'))).toBe(true);

      // Check statistics
      const vectorStats = await vectorMemory.getStats();
      const pluginStats = await plugin.getStats();

      expect(vectorStats.totalMemories).toBeGreaterThan(0);
      expect(pluginStats.memory.totalMemories).toBe(vectorStats.totalMemories);
    });

    test('should handle data updates consistently', async () => {
      // Initial data
      await vectorMemory.addMemory('Initial data', { source: 'test' });
      
      const initialResults = await plugin.memorySearch('initial data', { maxResults: 3 });
      expect(initialResults.context.length).toBeGreaterThan(0);

      // Clear data
      await vectorMemory.clearAll();
      
      // Data should be cleared
      const afterClearResults = await plugin.memorySearch('initial data', { maxResults: 3 });
      expect(afterClearResults.context.length).toBe(0);

      const stats = await vectorMemory.getStats();
      expect(stats.totalMemories).toBe(0);
    });
  });

  describe('Error Recovery', () => {
    test('should recover from component failures', async () => {
      // Simulate temporary VectorMemory failure
      const mockIndex = mockVectra.LocalIndex();
      let failCount = 0;
      
      mockIndex.query.mockImplementation(() => {
        failCount++;
        if (failCount === 1) {
          throw new Error('Temporary vector search failure');
        }
        return Promise.resolve([
          { item: { text: 'Recovered result', metadata: {} }, score: 0.9 }
        ]);
      });

      // First search should fail
      await expect(plugin.memorySearch('test', { maxResults: 3 }))
        .rejects.toThrow('Temporary vector search failure');

      // Second search should succeed (recovery)
      const result = await plugin.memorySearch('test', { maxResults: 3 });
      expect(result.context.length).toBe(1);
      expect(result.context[0]).toContain('Recovered result');
    });

    test('should maintain state after errors', async () => {
      const initialStats = await plugin.getStats();
      const initialQueryCount = initialStats.performance.totalQueries;

      // Failing search
      const mockIndex = mockVectra.LocalIndex();
      mockIndex.query.mockRejectedValueOnce(new Error('Search error'));

      await expect(plugin.memorySearch('failing query', { maxResults: 3 }))
        .rejects.toThrow('Search error');

      // State should be preserved
      const afterErrorStats = await plugin.getStats();
      expect(afterErrorStats.performance.totalQueries).toBe(initialQueryCount + 1);
      expect(afterErrorStats.plugin.initialized).toBe(true);

      // Recherche suivante devrait fonctionner
      mockIndex.query.mockResolvedValueOnce([
        { item: { text: 'Working after error', metadata: {} }, score: 0.9 }
      ]);

      const workingResult = await plugin.memorySearch('working query', { maxResults: 3 });
      expect(workingResult.context.length).toBe(1);
    });
  });
});