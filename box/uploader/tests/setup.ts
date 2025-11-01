import { jest } from '@jest/globals';

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

// Set test environment variables
process.env.MONGO_HOST = 'localhost';
process.env.MONGO_PORT = '27017';
process.env.MONGO_USERNAME = 'test_user';
process.env.MONGO_PASSWORD = 'test_password';
process.env.MONGO_DATABASE = 'test_db';
process.env.SAVE_SERVICE_URL = 'http://localhost:3000';
process.env.BOX_UUID = 'test-box-1-uuid';

// Mock fetch globally
// @ts-ignore
global.fetch = jest.fn();

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
