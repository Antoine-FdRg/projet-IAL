import { DatabaseService } from '../../src/databaseService';
import { CompressionService } from '../../src/compressionService';
import { SaveServiceClient } from '../../src/saveServiceClient';
import type { RawMeasurement } from '../../src/type';
import { MongoClient } from 'mongodb';

// Mock MongoDB and fetch
jest.mock('mongodb');
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
const MockedMongoClient = MongoClient as jest.MockedClass<typeof MongoClient>;

describe('Integration Tests - Services Working Together', () => {
  let mockClient: any;
  let mockDb: any;
  let mockCollection: any;

  beforeEach(() => {
    mockCollection = {
      find: jest.fn(),
      deleteMany: jest.fn(),
      insertMany: jest.fn(),
    };

    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection),
    };

    mockClient = {
      connect: jest.fn(),
      close: jest.fn(),
      db: jest.fn().mockReturnValue(mockDb),
    };

    MockedMongoClient.mockImplementation(() => mockClient);
    mockFetch.mockClear();
  });

  afterEach(async () => {
    await DatabaseService.disconnect();
    jest.clearAllMocks();
  });

  describe('Database + Compression Integration', () => {
    it('should retrieve measurements from database and compress them', async () => {
      // Setup database connection
      mockClient.connect.mockResolvedValueOnce(undefined);
      await DatabaseService.connect();

      // Mock database return data
      const mockDbData = [
        { _id: 'id1', type: 'temperature', value: 20.0, unit: '°C', timestamp: '2023-01-01T10:00:00Z' },
        { _id: 'id2', type: 'temperature', value: 22.0, unit: '°C', timestamp: '2023-01-01T11:00:00Z' },
        { _id: 'id3', type: 'pulse', value: 70, unit: 'bpm', timestamp: '2023-01-01T10:30:00Z' },
        { _id: 'id4', type: 'pulse', value: 80, unit: 'bpm', timestamp: '2023-01-01T11:30:00Z' }
      ];

      mockCollection.find.mockReturnValueOnce({
        toArray: jest.fn().mockResolvedValueOnce(mockDbData)
      });

      // Get measurements from database
      const rawMeasurements = await DatabaseService.getAllMeasurementsCollection();
      expect(rawMeasurements).toHaveLength(4);

      // Compress the measurements
      const compressedMeasurements = CompressionService.compressMeasurements(rawMeasurements);

      expect(compressedMeasurements).toHaveLength(2);

      const tempMeasurement = compressedMeasurements.find(m => m.type === 'temperature');
      expect(tempMeasurement).toEqual({
        type: 'temperature',
        value: 21.0, // (20 + 22) / 2
        unit: '°C',
        timestamp: '2023-01-01T10:00:00.000Z'
      });

      const pulseMeasurement = compressedMeasurements.find(m => m.type === 'pulse');
      expect(pulseMeasurement).toEqual({
        type: 'pulse',
        value: 75.0, // (70 + 80) / 2
        unit: 'bpm',
        timestamp: '2023-01-01T10:30:00.000Z'
      });
    });

    it('should save compressed measurements back to database', async () => {
      mockClient.connect.mockResolvedValueOnce(undefined);
      await DatabaseService.connect();

      const compressedMeasurements: RawMeasurement[] = [
        { type: 'temperature', value: 21.0, unit: 'C', timestamp: '2023-01-01T10:00:00Z' },
        { type: 'pulse', value: 75.0, unit: 'bpm', timestamp: '2023-01-01T10:30:00Z' }
      ];

      mockCollection.insertMany.mockResolvedValueOnce({});

      await DatabaseService.saveCompressedMeasurements(compressedMeasurements);

      expect(mockCollection.insertMany).toHaveBeenCalledTimes(1);
      const calledWith = mockCollection.insertMany.mock.calls[0][0];

      expect(calledWith).toHaveLength(2);
      expect(calledWith[0]).toMatchObject({
        type: 'temperature',
        value: 21.0,
        unit: 'C',
        timestamp: '2023-01-01T10:00:00Z',
        source: 'uploader-compressed'
      });
      expect(calledWith[0]).toHaveProperty('messageId');
      expect(calledWith[0]).toHaveProperty('receivedAt');
      expect(calledWith[0]).toHaveProperty('expireAt');

      expect(calledWith[1]).toMatchObject({
        type: 'pulse',
        value: 75.0,
        unit: 'bpm',
        timestamp: '2023-01-01T10:30:00Z',
        source: 'uploader-compressed'
      });
      expect(calledWith[1]).toHaveProperty('messageId');
      expect(calledWith[1]).toHaveProperty('receivedAt');
      expect(calledWith[1]).toHaveProperty('expireAt');
    });
  });

  describe('Compression + SaveService Integration', () => {
    it('should compress measurements and send them to save service successfully', async () => {
      const rawMeasurements: RawMeasurement[] = [
        { type: 'temperature', value: 20.0, unit: '°C', timestamp: '2023-01-01T10:00:00Z' },
        { type: 'temperature', value: 22.0, unit: '°C', timestamp: '2023-01-01T11:00:00Z' },
        { type: 'weight', value: 75.5, unit: 'kg', timestamp: '2023-01-01T09:00:00Z' }
      ];

      // Compress measurements
      const compressedMeasurements = CompressionService.compressMeasurements(rawMeasurements);
      expect(compressedMeasurements).toHaveLength(2);

      // Mock successful save service response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK'
      } as Response);

      // Send compressed measurements
      const success = await SaveServiceClient.sendCompressedMeasurements(compressedMeasurements);

      expect(success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/measurements',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('"dataList"')
        })
      );

      // Verify the payload structure
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs![1]!.body as string);
      expect(body.dataList).toEqual(compressedMeasurements);
    });

    it('should handle save service failure gracefully', async () => {
      const rawMeasurements: RawMeasurement[] = [
        { type: 'pulse', value: 75, unit: 'bpm', timestamp: '2023-01-01T10:00:00Z' }
      ];

      const compressedMeasurements = CompressionService.compressMeasurements(rawMeasurements);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      const success = await SaveServiceClient.sendCompressedMeasurements(compressedMeasurements);

      expect(success).toBe(false);
    });
  });

  describe('Database + SaveService Integration', () => {
    it('should handle complete data flow: read, send, and cleanup', async () => {
      // Setup database connection
      mockClient.connect.mockResolvedValueOnce(undefined);
      await DatabaseService.connect();

      // Mock database data
      const mockDbData = [
        { _id: 'id1', type: 'steps', value: 1000, unit: 'steps', timestamp: '2023-01-01T10:00:00Z' }
      ];

      mockCollection.find.mockReturnValueOnce({
        toArray: jest.fn().mockResolvedValueOnce(mockDbData)
      });

      // Get measurements
      const rawMeasurements = await DatabaseService.getAllMeasurementsCollection();

      // Mock successful save service response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK'
      } as Response);

      // Send to save service
      const success = await SaveServiceClient.sendCompressedMeasurements(rawMeasurements);
      expect(success).toBe(true);

      // Clean up database
      mockCollection.deleteMany.mockResolvedValueOnce({ deletedCount: 1 });
      await DatabaseService.removeAllMeasurementsCollection();

      expect(mockCollection.deleteMany).toHaveBeenCalledWith({});
    });

    it('should save compressed data when save service fails', async () => {
      mockClient.connect.mockResolvedValueOnce(undefined);
      await DatabaseService.connect();

      const compressedMeasurements: RawMeasurement[] = [
        { type: 'temperature', value: 21.0, unit: 'C', timestamp: '2023-01-01T10:00:00Z' }
      ];

      // Mock save service failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      } as Response);

      const success = await SaveServiceClient.sendCompressedMeasurements(compressedMeasurements);
      expect(success).toBe(false);

      // Should save compressed measurements to database
      mockCollection.deleteMany.mockResolvedValueOnce({ deletedCount: 0 });
      mockCollection.insertMany.mockResolvedValueOnce({});

      await DatabaseService.removeAllMeasurementsCollection();
      await DatabaseService.saveCompressedMeasurements(compressedMeasurements);

      expect(mockCollection.insertMany).toHaveBeenCalledTimes(1);
      const calledWith = mockCollection.insertMany.mock.calls[0][0];

      expect(calledWith).toHaveLength(1);
      expect(calledWith[0]).toMatchObject({
        type: 'temperature',
        value: 21.0,
        unit: 'C',
        timestamp: '2023-01-01T10:00:00Z',
        source: 'uploader-compressed'
      });
      expect(calledWith[0]).toHaveProperty('messageId');
      expect(calledWith[0]).toHaveProperty('receivedAt');
      expect(calledWith[0]).toHaveProperty('expireAt');
    });
  });

  describe('Full Service Chain Integration', () => {
    it('should process complete workflow: retrieve -> compress -> send -> cleanup', async () => {
      // Setup
      mockClient.connect.mockResolvedValueOnce(undefined);
      await DatabaseService.connect();

      // Mock multiple measurements of different types
      const mockDbData = [
        { _id: 'id1', type: 'temperature', value: 19.5, unit: '°C', timestamp: '2023-01-01T09:00:00Z' },
        { _id: 'id2', type: 'temperature', value: 20.5, unit: '°C', timestamp: '2023-01-01T10:00:00Z' },
        { _id: 'id3', type: 'temperature', value: 21.5, unit: '°C', timestamp: '2023-01-01T11:00:00Z' },
        { _id: 'id4', type: 'pulse', value: 68, unit: 'bpm', timestamp: '2023-01-01T09:30:00Z' },
        { _id: 'id5', type: 'pulse', value: 72, unit: 'bpm', timestamp: '2023-01-01T10:30:00Z' },
        { _id: 'id6', type: 'weight', value: 75.2, unit: 'kg', timestamp: '2023-01-01T08:00:00Z' },
        { _id: 'id7', type: 'steps', value: 500, unit: 'steps', timestamp: '2023-01-01T09:00:00Z' },
        { _id: 'id8', type: 'steps', value: 1500, unit: 'steps', timestamp: '2023-01-01T12:00:00Z' }
      ];

      mockCollection.find.mockReturnValueOnce({
        toArray: jest.fn().mockResolvedValueOnce(mockDbData)
      });

      // Step 1: Retrieve raw measurements
      const rawMeasurements = await DatabaseService.getAllMeasurementsCollection();
      expect(rawMeasurements).toHaveLength(8);

      // Step 2: Compress measurements
      const compressedMeasurements = CompressionService.compressMeasurements(rawMeasurements);
      expect(compressedMeasurements).toHaveLength(4); // 4 different types

      // Verify compression results
      const tempCompressed = compressedMeasurements.find(m => m.type === 'temperature');
      expect(tempCompressed?.value).toBe(20.5); // (19.5 + 20.5 + 21.5) / 3

      const pulseCompressed = compressedMeasurements.find(m => m.type === 'pulse');
      expect(pulseCompressed?.value).toBe(70); // (68 + 72) / 2

      const stepsCompressed = compressedMeasurements.find(m => m.type === 'steps');
      expect(stepsCompressed?.value).toBe(2000); // Sum: 500 + 1500 (steps are summed, not averaged)

      // Step 3: Send to save service
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK'
      } as Response);

      const success = await SaveServiceClient.sendCompressedMeasurements(compressedMeasurements);
      expect(success).toBe(true);

      // Step 4: Cleanup database
      mockCollection.deleteMany.mockResolvedValueOnce({ deletedCount: 8 });
      await DatabaseService.removeAllMeasurementsCollection();

      expect(mockCollection.deleteMany).toHaveBeenCalledWith({});
    });
  });
});
