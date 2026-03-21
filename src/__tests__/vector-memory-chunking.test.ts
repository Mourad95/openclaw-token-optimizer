import { describe, test, expect, jest } from '@jest/globals';

jest.mock('vectra', () => ({
  LocalIndex: jest.fn().mockImplementation(() => ({
    isIndexCreated: jest.fn().mockResolvedValue(true),
    createIndex: jest.fn().mockResolvedValue(undefined),
    insertItem: jest.fn().mockResolvedValue(undefined),
    queryItems: jest.fn().mockResolvedValue([]),
    deleteIndex: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@xenova/transformers', () => ({
  pipeline: jest.fn().mockResolvedValue(jest.fn()),
}));

import { VectorMemory } from '../vector-memory';

describe('VectorMemory.splitIntoChunks', () => {
  test('terminates on text shorter than overlap (regression: no infinite loop)', () => {
    const vm = new VectorMemory({ chunkSize: 500, overlap: 50 });
    const chunks = vm.splitIntoChunks('# Memory\n\nShort note.');
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.length).toBeLessThan(500);
  });

  test('handles long text with reasonable chunk count', () => {
    const vm = new VectorMemory({ chunkSize: 500, overlap: 50 });
    const long = `${'word '.repeat(2000)}end.`;
    const chunks = vm.splitIntoChunks(long);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.length).toBeLessThan(500);
  });
});
