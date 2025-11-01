import { DatabaseService } from '../../src/databaseService';
import type { RawMeasurement } from '../../src/type';
import { MongoClient, Db, Collection } from 'mongodb';

// Mock MongoDB
jest.mock('mongodb', () => ({
  MongoClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    close: jest.fn(),
    db: jest.fn()
  }))
}));

const MockedMongoClient = MongoClient as jest.MockedClass<typeof MongoClient>;

describe('DatabaseService', () => {
  let mockClient: jest.Mocked<MongoClient>;
  let mockDb: jest.Mocked<Db>;
  let mockCollection: jest.Mocked<Collection>;

  beforeEach(() => {
    // Setup environment variables
    process.env.MONGO_HOST = 'localhost';
    process.env.MONGO_PORT = '27017';
    process.env.MONGO_USERNAME = 'test_user';
    process.env.MONGO_PASSWORD = 'test_password';
    process.env.MONGO_DATABASE = 'test_db';

    mockCollection = {
      insertOne: jest.fn(),
    } as any;

    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection),
    } as any;

    mockClient = {
      connect: jest.fn(),
      close: jest.fn(),
      db: jest.fn().mockReturnValue(mockDb),
    } as any;

    MockedMongoClient.mockImplementation(() => mockClient);
  });

  afterEach(async () => {
    // Reset the service state
    await DatabaseService.disconnect();
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect to MongoDB successfully', async () => {
      mockClient.connect.mockResolvedValueOnce(undefined);

      await DatabaseService.connect();

      expect(MockedMongoClient).toHaveBeenCalledWith(
        'mongodb://test_user:test_password@localhost:27017/test_db'
      );
      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockClient.db).toHaveBeenCalledWith('test_db');
      expect(mockDb.collection).toHaveBeenCalledWith('messages');
      expect(DatabaseService.isConnected()).toBe(true);
    });

    it('should throw error when connection fails', async () => {
      const connectionError = new Error('Connection failed');
      mockClient.connect.mockRejectedValueOnce(connectionError);

      await expect(DatabaseService.connect()).rejects.toThrow('Connection failed');
      expect(DatabaseService.isConnected()).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should disconnect from MongoDB when connected', async () => {
      // First connect
      mockClient.connect.mockResolvedValueOnce(undefined);
      await DatabaseService.connect();

      // Then disconnect
      mockClient.close.mockResolvedValueOnce(undefined);
      await DatabaseService.disconnect();

      expect(mockClient.close).toHaveBeenCalled();
      expect(DatabaseService.isConnected()).toBe(false);
    });

    it('should handle disconnect when not connected', async () => {
      await DatabaseService.disconnect();
      expect(mockClient.close).not.toHaveBeenCalled();
    });
  });

  describe('saveFilteredMeasurement', () => {
    beforeEach(async () => {
      mockClient.connect.mockResolvedValueOnce(undefined);
      await DatabaseService.connect();
    });

    it('should save a filtered measurement successfully', async () => {
      const measurement: RawMeasurement = {
        type: 'temperature',
        value: 37.5,
        unit: '°C',
        timestamp: '2024-01-01T10:00:00Z'
      };

      mockCollection.insertOne.mockResolvedValueOnce({} as any);

      await DatabaseService.saveFilteredMeasurement(measurement);

      expect(mockCollection.insertOne).toHaveBeenCalledTimes(1);
      const calledWith = mockCollection.insertOne.mock.calls[0][0];

      expect(calledWith).toMatchObject({
        type: 'temperature',
        value: 37.5,
        unit: '°C',
        timestamp: '2024-01-01T10:00:00Z',
        source: 'outlier-filter'
      });
      expect(calledWith).toHaveProperty('receivedAt');
      expect(calledWith).toHaveProperty('messageId');
      expect(calledWith).toHaveProperty('expireAt');
      expect(calledWith.receivedAt).toBeInstanceOf(Date);
      expect(calledWith.expireAt).toBeInstanceOf(Date);
    });

    it('should save pulse measurement with correct metadata', async () => {
      const measurement: RawMeasurement = {
        type: 'pulse',
        value: 75,
        unit: 'bpm',
        timestamp: '2024-01-01T11:00:00Z'
      };

      mockCollection.insertOne.mockResolvedValueOnce({} as any);

      await DatabaseService.saveFilteredMeasurement(measurement);

      const calledWith = mockCollection.insertOne.mock.calls[0][0];

      expect(calledWith).toMatchObject({
        type: 'pulse',
        value: 75,
        unit: 'bpm',
        timestamp: '2024-01-01T11:00:00Z',
        source: 'outlier-filter'
      });
      expect(calledWith.messageId).toContain('pulse-2024-01-01T11:00:00Z-');
    });

    it('should save weight measurement with correct metadata', async () => {
      const measurement: RawMeasurement = {
        type: 'weight',
        value: 70.5,
        unit: 'kg',
        timestamp: '2024-01-01T09:00:00Z'
      };

      mockCollection.insertOne.mockResolvedValueOnce({} as any);

      await DatabaseService.saveFilteredMeasurement(measurement);

      const calledWith = mockCollection.insertOne.mock.calls[0][0];

      expect(calledWith).toMatchObject({
        type: 'weight',
        value: 70.5,
        unit: 'kg',
        timestamp: '2024-01-01T09:00:00Z',
        source: 'outlier-filter'
      });
    });

    it('should save steps measurement with correct metadata', async () => {
      const measurement: RawMeasurement = {
        type: 'steps',
        value: 10000,
        unit: 'steps',
        timestamp: '2024-01-01T12:00:00Z'
      };

      mockCollection.insertOne.mockResolvedValueOnce({} as any);

      await DatabaseService.saveFilteredMeasurement(measurement);

      const calledWith = mockCollection.insertOne.mock.calls[0][0];

      expect(calledWith).toMatchObject({
        type: 'steps',
        value: 10000,
        unit: 'steps',
        timestamp: '2024-01-01T12:00:00Z',
        source: 'outlier-filter'
      });
    });

    it('should throw error when not connected', async () => {
      await DatabaseService.disconnect();

      const measurement: RawMeasurement = {
        type: 'temperature',
        value: 37.5,
        unit: '°C',
        timestamp: '2024-01-01T10:00:00Z'
      };

      await expect(DatabaseService.saveFilteredMeasurement(measurement))
        .rejects.toThrow('Base de données non connectée. Appelez connect() d\'abord.');
    });

    it('should handle database insertion errors', async () => {
      const measurement: RawMeasurement = {
        type: 'temperature',
        value: 37.5,
        unit: '°C',
        timestamp: '2024-01-01T10:00:00Z'
      };

      const dbError = new Error('Insert operation failed');
      mockCollection.insertOne.mockRejectedValueOnce(dbError);

      await expect(DatabaseService.saveFilteredMeasurement(measurement))
        .rejects.toThrow('Insert operation failed');
    });

    it('should set expireAt to 30 days from now', async () => {
      const measurement: RawMeasurement = {
        type: 'temperature',
        value: 37.5,
        unit: '°C',
        timestamp: '2024-01-01T10:00:00Z'
      };

      const now = Date.now();
      mockCollection.insertOne.mockResolvedValueOnce({} as any);

      await DatabaseService.saveFilteredMeasurement(measurement);

      const calledWith = mockCollection.insertOne.mock.calls[0][0];
      const expectedExpireTime = now + 30 * 24 * 60 * 60 * 1000;
      const actualExpireTime = calledWith.expireAt.getTime();

      // Allow 1 second difference for test execution time
      expect(Math.abs(actualExpireTime - expectedExpireTime)).toBeLessThan(1000);
    });
  });

  describe('isConnected', () => {
    it('should return false when not connected', () => {
      expect(DatabaseService.isConnected()).toBe(false);
    });

    it('should return true when connected', async () => {
      mockClient.connect.mockResolvedValueOnce(undefined);
      await DatabaseService.connect();

      expect(DatabaseService.isConnected()).toBe(true);
    });

    it('should return false after disconnect', async () => {
      mockClient.connect.mockResolvedValueOnce(undefined);
      await DatabaseService.connect();

      mockClient.close.mockResolvedValueOnce(undefined);
      await DatabaseService.disconnect();

      expect(DatabaseService.isConnected()).toBe(false);
    });
  });
});

