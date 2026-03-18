import { jest } from '@jest/globals';

// Mock for vectra
export const mockVectra = {
  LocalIndex: jest.fn().mockImplementation(() => ({
    isIndexCreated: jest.fn().mockResolvedValue(true),
    createIndex: jest.fn().mockResolvedValue(undefined),
    insertItem: jest.fn().mockResolvedValue('mock-id'),
    query: jest.fn().mockResolvedValue([
      { 
        item: { 
          text: 'Test memory 1', 
          metadata: { source: 'test' },
          id: 'memory_1'
        },
        score: 0.95
      },
      { 
        item: { 
          text: 'Test memory 2', 
          metadata: { source: 'test' },
          id: 'memory_2'
        },
        score: 0.85
      }
    ]),
    deleteIndex: jest.fn().mockResolvedValue(undefined),
    listItems: jest.fn().mockResolvedValue([])
  }))
};

// Mock for Xenova/transformers
export const mockTransformers = {
  pipeline: jest.fn().mockResolvedValue({
    mockEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3])
  })
};

// Mock for chalk
export const mockChalk = {
  green: jest.fn((text) => text),
  red: jest.fn((text) => text),
  yellow: jest.fn((text) => text),
  cyan: jest.fn((text) => text),
  gray: jest.fn((text) => text)
};

// Mock for ora
export const mockOra = jest.fn().mockImplementation(() => ({
  start: jest.fn().mockReturnThis(),
  succeed: jest.fn().mockReturnThis(),
  fail: jest.fn().mockReturnThis(),
  stop: jest.fn().mockReturnThis(),
  text: ''
}));

// Mock for fs
export const mockFs = {
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn().mockReturnValue(['test1.md', 'test2.md']),
  readFileSync: jest.fn().mockReturnValue('# Test Memory\n\nContent for testing.'),
  writeFileSync: jest.fn(),
  statSync: jest.fn().mockReturnValue({ isFile: () => true })
};

// Mock for path
export const mockPath = {
  join: jest.fn((...args) => args.join('/')),
  dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/')),
  basename: jest.fn((path) => path.split('/').pop() || ''),
  extname: jest.fn((path) => path.includes('.') ? '.' + path.split('.').pop() : '')
};

// Mock logger
export const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};