import { jest } from '@jest/globals';

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// Mock process.env for tests
process.env.OPENCLAW_TOKEN_OPTIMIZER_VERBOSE = 'false';
process.env.OPENCLAW_TOKEN_OPTIMIZER_DEBUG = 'false';
process.env.OPENCLAW_MEMORY_DIR = './test-memory';

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  
  // Reset environment variables
  process.env.OPENCLAW_TOKEN_OPTIMIZER_VERBOSE = 'false';
  process.env.OPENCLAW_TOKEN_OPTIMIZER_DEBUG = 'false';
  process.env.OPENCLAW_MEMORY_DIR = './test-memory';
});

// Cleanup after all tests
afterAll(() => {
  jest.restoreAllMocks();
});