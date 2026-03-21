import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { VectorMemory } from '../vector-memory';
import { mockVectra, mockTransformers } from './mocks';

// Mock dependencies
jest.mock('vectra', () => mockVectra);
jest.mock('@xenova/transformers', () => mockTransformers);

describe('VectorMemory', () => {
  let vectorMemory: VectorMemory;
  let mockIndex: any;

  beforeEach(() => {
    mockIndex = {
      isIndexCreated: jest.fn().mockResolvedValue(false),
      createIndex: jest.fn().mockResolvedValue(undefined),
      insertItem: jest.fn().mockResolvedValue('mock-memory-id'),
      query: jest.fn().mockResolvedValue([
        { 
          item: { 
            text: 'Test memory content 1',
            metadata: { 
              source: 'test.md',
              timestamp: '2024-01-01T00:00:00Z',
              type: 'memory'
            }
          },
          score: 0.95
        },
        { 
          item: { 
            text: 'Test memory content 2',
            metadata: { 
              source: 'test2.md',
              timestamp: '2024-01-02T00:00:00Z',
              type: 'note'
            }
          },
          score: 0.85
        }
      ]),
      deleteIndex: jest.fn().mockResolvedValue(undefined),
      listItems: jest.fn().mockResolvedValue([
        { id: 'id1', item: { text: 'Memory 1', metadata: {} } },
        { id: 'id2', item: { text: 'Memory 2', metadata: {} } }
      ])
    };

    mockVectra.LocalIndex.mockImplementation(() => mockIndex);
    vectorMemory = new VectorMemory();
  });

  describe('Initialization', () => {
    test('should initialize vector index', async () => {
      await vectorMemory.initialize();
      
      expect(mockIndex.isIndexCreated).toHaveBeenCalled();
      expect(mockIndex.createIndex).toHaveBeenCalled();
    });

    test('should use existing index if already created', async () => {
      mockIndex.isIndexCreated.mockResolvedValue(true);
      
      await vectorMemory.initialize();
      
      expect(mockIndex.isIndexCreated).toHaveBeenCalled();
      expect(mockIndex.createIndex).not.toHaveBeenCalled();
    });

    test('should initialize with custom directory', async () => {
      const customMemory = new VectorMemory({ memoryDir: '/custom/path' });
      await customMemory.initialize();
      
      // Custom path should be used
      expect(mockVectra.LocalIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          folder: expect.stringContaining('/custom/path')
        })
      );
    });
  });

  describe('Memory Operations', () => {
    beforeEach(async () => {
      await vectorMemory.initialize();
    });

    test('should add memory with metadata', async () => {
      const memoryId = await vectorMemory.addMemory(
        'This is a test memory content for vector search.',
        {
          source: 'test-file.md',
          type: 'note',
          timestamp: '2024-01-01T12:00:00Z',
          customField: 'customValue'
        }
      );

      expect(memoryId).toBe('mock-memory-id');
      expect(mockIndex.insertItem).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'This is a test memory content for vector search.',
          metadata: expect.objectContaining({
            source: 'test-file.md',
            type: 'note',
            timestamp: '2024-01-01T12:00:00Z',
            customField: 'customValue'
          })
        })
      );
    });

    test('should search memories with relevance scoring', async () => {
      const results = await vectorMemory.searchMemories('test query', 5);

      expect(results).toHaveLength(2);
      expect(results[0].text).toBe('Test memory content 1');
      expect(results[0].score).toBe(0.95);
      expect(results[0].metadata.source).toBe('test.md');
      
      expect(results[1].text).toBe('Test memory content 2');
      expect(results[1].score).toBe(0.85);
      expect(results[1].metadata.type).toBe('note');
    });

    test('should respect maxResults parameter', async () => {
      const results = await vectorMemory.searchMemories('test query', 1);

      expect(results).toHaveLength(1);
      expect(mockIndex.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ maxResults: 1 })
      );
    });

    test('should filter by minScore', async () => {
      // Simulate results with different scores
      mockIndex.query.mockResolvedValueOnce([
        { item: { text: 'High score', metadata: {} }, score: 0.9 },
        { item: { text: 'Medium score', metadata: {} }, score: 0.6 },
        { item: { text: 'Low score', metadata: {} }, score: 0.3 }
      ]);

      const results = await vectorMemory.searchMemories('test query', 10, 0.5);

      expect(results).toHaveLength(2); // Seulement scores >= 0.5
      expect(results[0].score).toBe(0.9);
      expect(results[1].score).toBe(0.6);
    });
  });

  describe('Memory Management', () => {
    test('should list all memories', async () => {
      await vectorMemory.initialize();
      const memories = await vectorMemory.listMemories();

      expect(memories).toHaveLength(2);
      expect(memories[0].text).toBe('Memory 1');
      expect(memories[1].text).toBe('Memory 2');
    });

    test('should get memory statistics', async () => {
      await vectorMemory.initialize();
      const stats = await vectorMemory.getStats();

      expect(stats).toHaveProperty('totalMemories', 2);
      expect(stats).toHaveProperty('indexSize');
      expect(stats).toHaveProperty('lastUpdated');
      expect(stats.totalMemories).toBe(2);
    });

    test('should clear all memories', async () => {
      await vectorMemory.initialize();
      const result = await vectorMemory.clearAll();

      expect(result.success).toBe(true);
      expect(result.clearedCount).toBe(2);
      expect(mockIndex.deleteIndex).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle search errors gracefully', async () => {
      mockIndex.query.mockRejectedValueOnce(new Error('Search failed'));
      
      await vectorMemory.initialize();
      
      await expect(vectorMemory.searchMemories('test query', 5))
        .rejects.toThrow('Search failed');
    });

    test('should handle empty search results', async () => {
      mockIndex.query.mockResolvedValueOnce([]);
      
      await vectorMemory.initialize();
      const results = await vectorMemory.searchMemories('nonexistent query', 5);

      expect(results).toHaveLength(0);
    });

    test('should validate input parameters', async () => {
      await vectorMemory.initialize();
      
      // Query vide
      await expect(vectorMemory.searchMemories('', 5))
        .rejects.toThrow('Query cannot be empty');
      
      // maxResults invalide
      await expect(vectorMemory.searchMemories('test', 0))
        .rejects.toThrow('maxResults must be greater than 0');
      
      await expect(vectorMemory.searchMemories('test', -1))
        .rejects.toThrow('maxResults must be greater than 0');
    });
  });

  describe('Embedding Model', () => {
    test('should generate embeddings for text', async () => {
      await vectorMemory.initialize();
      
      // Embedding comes from the mock
      expect(mockTransformers.pipeline).toHaveBeenCalledWith(
        'feature-extraction',
        expect.any(String)
      );
    });

    test('should cache embeddings for performance', async () => {
      await vectorMemory.initialize();
      
      // Two searches with the same query
      await vectorMemory.searchMemories('same query', 3);
      await vectorMemory.searchMemories('same query', 3);

      // Pipeline should run once (cache)
      expect(mockTransformers.pipeline).toHaveBeenCalledTimes(1);
    });
  });
});