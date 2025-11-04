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
    mockCollection = {
      find: jest.fn(),
      deleteMany: jest.fn(),
      insertMany: jest.fn(),
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

  describe('getAllMeasurementsCollection', () => {
    beforeEach(async () => {
      mockClient.connect.mockResolvedValueOnce(undefined);
      await DatabaseService.connect();
    });

    it('should return measurements from database', async () => {
      const mockDocuments = [
        { _id: 'id1', type: 'temperature', value: 21.5, unit: '°C', timestamp: '2023-01-01T10:00:00Z' },
        { _id: 'id2', type: 'pulse', value: 75, unit: 'bpm', timestamp: '2023-01-01T11:00:00Z' }
      ];

      mockCollection.find.mockReturnValueOnce({
        toArray: jest.fn().mockResolvedValueOnce(mockDocuments)
      } as any);

      const result = await DatabaseService.getAllMeasurementsCollection();

      expect(mockCollection.find).toHaveBeenCalledWith({});
      expect(result).toEqual([
        { type: 'temperature', value: 21.5, unit: '°C', timestamp: '2023-01-01T10:00:00Z' },
        { type: 'pulse', value: 75, unit: 'bpm', timestamp: '2023-01-01T11:00:00Z' }
      ]);
    });

    it('should return empty array when no measurements found', async () => {
      mockCollection.find.mockReturnValueOnce({
        toArray: jest.fn().mockResolvedValueOnce([])
      } as any);

      const result = await DatabaseService.getAllMeasurementsCollection();

      expect(result).toEqual([]);
    });

    it('should throw error when not connected', async () => {
      await DatabaseService.disconnect();

      await expect(DatabaseService.getAllMeasurementsCollection())
        .rejects.toThrow('Database not connected. Call connect() first.');
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database query failed');
      mockCollection.find.mockReturnValueOnce({
        toArray: jest.fn().mockRejectedValueOnce(dbError)
      } as any);

      await expect(DatabaseService.getAllMeasurementsCollection())
        .rejects.toThrow('Database query failed');
    });
  });

  describe('removeAllMeasurementsCollection', () => {
    beforeEach(async () => {
      mockClient.connect.mockResolvedValueOnce(undefined);
      await DatabaseService.connect();
    });

    it('should remove all measurements successfully', async () => {
      mockCollection.deleteMany.mockResolvedValueOnce({ deletedCount: 5 } as any);

      await DatabaseService.removeAllMeasurementsCollection();

      expect(mockCollection.deleteMany).toHaveBeenCalledWith({});
    });

    it('should handle case when no measurements to delete', async () => {
      mockCollection.deleteMany.mockResolvedValueOnce({ deletedCount: 0 } as any);

      await DatabaseService.removeAllMeasurementsCollection();

      expect(mockCollection.deleteMany).toHaveBeenCalledWith({});
    });

    it('should throw error when not connected', async () => {
      await DatabaseService.disconnect();

      await expect(DatabaseService.removeAllMeasurementsCollection())
        .rejects.toThrow('Database not connected. Call connect() first.');
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Delete operation failed');
      mockCollection.deleteMany.mockRejectedValueOnce(dbError);

      await expect(DatabaseService.removeAllMeasurementsCollection())
        .rejects.toThrow('Delete operation failed');
    });
  });

  describe('saveCompressedMeasurements', () => {
    beforeEach(async () => {
      mockClient.connect.mockResolvedValueOnce(undefined);
      await DatabaseService.connect();
    });

    it('should save compressed measurements successfully', async () => {
      const measurements: RawMeasurement[] = [
        { type: 'temperature', value: 21.5, unit: '°C', timestamp: '2023-01-01T10:00:00Z' },
        { type: 'pulse', value: 75, unit: 'bpm', timestamp: '2023-01-01T11:00:00Z' }
      ];

      mockCollection.insertMany.mockResolvedValueOnce({} as any);

      await DatabaseService.saveCompressedMeasurements(measurements);

      expect(mockCollection.insertMany).toHaveBeenCalledTimes(1);
      const calledWith = mockCollection.insertMany.mock.calls[0][0];

      expect(calledWith).toHaveLength(2);
      expect(calledWith[0]).toMatchObject({
        type: 'temperature',
        value: 21.5,
        unit: '°C',
        timestamp: '2023-01-01T10:00:00Z',
        source: 'uploader-compressed'
      });
      expect(calledWith[0]).toHaveProperty('messageId');
      expect(calledWith[0]).toHaveProperty('receivedAt');
      expect(calledWith[0]).toHaveProperty('expireAt');

      expect(calledWith[1]).toMatchObject({
        type: 'pulse',
        value: 75,
        unit: 'bpm',
        timestamp: '2023-01-01T11:00:00Z',
        source: 'uploader-compressed'
      });
      expect(calledWith[1]).toHaveProperty('messageId');
      expect(calledWith[1]).toHaveProperty('receivedAt');
      expect(calledWith[1]).toHaveProperty('expireAt');
    });

    it('should handle empty measurements array', async () => {
      await DatabaseService.saveCompressedMeasurements([]);

      expect(mockCollection.insertMany).not.toHaveBeenCalled();
    });

    it('should throw error when not connected', async () => {
      await DatabaseService.disconnect();

      const measurements: RawMeasurement[] = [
        { type: 'temperature', value: 21.5, unit: '°C', timestamp: '2023-01-01T10:00:00Z' }
      ];

      await expect(DatabaseService.saveCompressedMeasurements(measurements))
        .rejects.toThrow('Database not connected. Call connect() first.');
    });

    it('should handle database errors', async () => {
      const measurements: RawMeasurement[] = [
        { type: 'temperature', value: 21.5, unit: '°C', timestamp: '2023-01-01T10:00:00Z' }
      ];

      const dbError = new Error('Insert operation failed');
      mockCollection.insertMany.mockRejectedValueOnce(dbError);

      await expect(DatabaseService.saveCompressedMeasurements(measurements))
        .rejects.toThrow('Insert operation failed');
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
