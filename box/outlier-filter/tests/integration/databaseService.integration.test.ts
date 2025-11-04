import { DatabaseService } from '../../src/databaseService';
import { OutlierFilterService } from '../../src/outlierFilterService';
import type { RawMeasurement } from '../../src/type';
import { MongoClient } from 'mongodb';
import { EnvService } from '../../src/envService';

// Mock MongoDB and EnvService
jest.mock('mongodb');
jest.mock('../../src/envService');

const MockedMongoClient = MongoClient as jest.MockedClass<typeof MongoClient>;

describe('Integration Tests - DatabaseService + OutlierFilterService', () => {
  let mockClient: any;
  let mockDb: any;
  let mockCollection: any;

  beforeEach(() => {
    // Setup EnvService mocks
    (EnvService.getWeightMin as jest.Mock).mockReturnValue(15);
    (EnvService.getWeightMax as jest.Mock).mockReturnValue(500);
    (EnvService.getTemperatureMin as jest.Mock).mockReturnValue(32);
    (EnvService.getTemperatureMax as jest.Mock).mockReturnValue(42);
    (EnvService.getPulseMax as jest.Mock).mockReturnValue(250);
    (EnvService.getPulseMin as jest.Mock).mockReturnValue(0);
    (EnvService.getStepsMin as jest.Mock).mockReturnValue(0);
    (EnvService.getMongoHost as jest.Mock).mockReturnValue('localhost');
    (EnvService.getMongoPort as jest.Mock).mockReturnValue('27017');
    (EnvService.getMongoUsername as jest.Mock).mockReturnValue('test_user');
    (EnvService.getMongoPassword as jest.Mock).mockReturnValue('test_password');
    (EnvService.getMongoDatabase as jest.Mock).mockReturnValue('test_db');

    mockCollection = {
      insertOne: jest.fn(),
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
  });

  afterEach(async () => {
    await DatabaseService.disconnect();
    jest.clearAllMocks();
  });

  describe('Filter and Save Workflow', () => {
    it('should filter valid measurement and save to database', async () => {
      // Connect to database
      mockClient.connect.mockResolvedValueOnce(undefined);
      await DatabaseService.connect();

      // Create valid temperature measurement
      const validMeasurement: RawMeasurement = {
        type: 'temperature',
        value: 37.5,
        unit: '°C',
        timestamp: '2024-01-01T10:00:00Z'
      };

      const data = new TextEncoder().encode(JSON.stringify(validMeasurement));

      // Filter the measurement
      const filtered = OutlierFilterService.filterAndNormalizeMeasurement(data);

      expect(filtered).not.toBeNull();
      expect(filtered).toEqual(validMeasurement);

      // Save to database
      mockCollection.insertOne.mockResolvedValueOnce({});
      await DatabaseService.saveFilteredMeasurement(filtered!);

      expect(mockCollection.insertOne).toHaveBeenCalledTimes(1);
      const savedDoc = mockCollection.insertOne.mock.calls[0][0];
      expect(savedDoc).toMatchObject({
        type: 'temperature',
        value: 37.5,
        unit: '°C',
        timestamp: '2024-01-01T10:00:00Z',
        source: 'outlier-filter'
      });
    });

    it('should reject outlier and not save to database', async () => {
      mockClient.connect.mockResolvedValueOnce(undefined);
      await DatabaseService.connect();

      // Create invalid temperature measurement (outlier)
      const outlierMeasurement: RawMeasurement = {
        type: 'temperature',
        value: 50, // Too high
        unit: '°C',
        timestamp: '2024-01-01T10:00:00Z'
      };

      const data = new TextEncoder().encode(JSON.stringify(outlierMeasurement));

      // Filter the measurement - should be rejected
      const filtered = OutlierFilterService.filterAndNormalizeMeasurement(data);

      expect(filtered).toBeNull();
      expect(mockCollection.insertOne).not.toHaveBeenCalled();
    });

    it('should process multiple measurements and save only valid ones', async () => {
      mockClient.connect.mockResolvedValueOnce(undefined);
      await DatabaseService.connect();

      const measurements: RawMeasurement[] = [
        { type: 'temperature', value: 37, unit: '°C', timestamp: '2024-01-01T10:00:00Z' }, // Valid
        { type: 'pulse', value: 300, unit: 'bpm', timestamp: '2024-01-01T10:05:00Z' }, // Invalid - too high
        { type: 'weight', value: 70, unit: 'kg', timestamp: '2024-01-01T10:10:00Z' }, // Valid
        { type: 'steps', value: 5000, unit: 'steps', timestamp: '2024-01-01T10:15:00Z' } // Valid
      ];

      let validCount = 0;

      for (const measurement of measurements) {
        const data = new TextEncoder().encode(JSON.stringify(measurement));
        const filtered = OutlierFilterService.filterAndNormalizeMeasurement(data);

        if (filtered) {
          mockCollection.insertOne.mockResolvedValueOnce({});
          await DatabaseService.saveFilteredMeasurement(filtered);
          validCount++;
        }
      }

      expect(validCount).toBe(3); // 3 valid measurements
      expect(mockCollection.insertOne).toHaveBeenCalledTimes(3);
    });

    it('should handle invalid JSON data gracefully', async () => {
      mockClient.connect.mockResolvedValueOnce(undefined);
      await DatabaseService.connect();

      const invalidData = new TextEncoder().encode('not valid json');

      const filtered = OutlierFilterService.filterAndNormalizeMeasurement(invalidData);

      expect(filtered).toBeNull();
      expect(mockCollection.insertOne).not.toHaveBeenCalled();
    });

    it('should validate and save pulse measurements within range', async () => {
      mockClient.connect.mockResolvedValueOnce(undefined);
      await DatabaseService.connect();

      const validPulse: RawMeasurement = {
        type: 'pulse',
        value: 80,
        unit: 'bpm',
        timestamp: '2024-01-01T10:00:00Z'
      };

      const data = new TextEncoder().encode(JSON.stringify(validPulse));
      const filtered = OutlierFilterService.filterAndNormalizeMeasurement(data);

      expect(filtered).not.toBeNull();

      mockCollection.insertOne.mockResolvedValueOnce({});
      await DatabaseService.saveFilteredMeasurement(filtered!);

      const savedDoc = mockCollection.insertOne.mock.calls[0][0];
      expect(savedDoc.type).toBe('pulse');
      expect(savedDoc.value).toBe(80);
    });

    it('should validate and save weight measurements within range', async () => {
      mockClient.connect.mockResolvedValueOnce(undefined);
      await DatabaseService.connect();

      const validWeight: RawMeasurement = {
        type: 'weight',
        value: 75.5,
        unit: 'kg',
        timestamp: '2024-01-01T10:00:00Z'
      };

      const data = new TextEncoder().encode(JSON.stringify(validWeight));
      const filtered = OutlierFilterService.filterAndNormalizeMeasurement(data);

      expect(filtered).not.toBeNull();

      mockCollection.insertOne.mockResolvedValueOnce({});
      await DatabaseService.saveFilteredMeasurement(filtered!);

      const savedDoc = mockCollection.insertOne.mock.calls[0][0];
      expect(savedDoc.type).toBe('weight');
      expect(savedDoc.value).toBe(75.5);
    });

    it('should reject weight below minimum threshold', async () => {
      const lowWeight: RawMeasurement = {
        type: 'weight',
        value: 10, // Below minimum (15)
        unit: 'kg',
        timestamp: '2024-01-01T10:00:00Z'
      };

      const data = new TextEncoder().encode(JSON.stringify(lowWeight));
      const filtered = OutlierFilterService.filterAndNormalizeMeasurement(data);

      expect(filtered).toBeNull();
    });

    it('should reject weight above maximum threshold', async () => {
      const highWeight: RawMeasurement = {
        type: 'weight',
        value: 600, // Above maximum (500)
        unit: 'kg',
        timestamp: '2024-01-01T10:00:00Z'
      };

      const data = new TextEncoder().encode(JSON.stringify(highWeight));
      const filtered = OutlierFilterService.filterAndNormalizeMeasurement(data);

      expect(filtered).toBeNull();
    });

    it('should handle database errors during save', async () => {
      mockClient.connect.mockResolvedValueOnce(undefined);
      await DatabaseService.connect();

      const validMeasurement: RawMeasurement = {
        type: 'temperature',
        value: 37,
        unit: '°C',
        timestamp: '2024-01-01T10:00:00Z'
      };

      const data = new TextEncoder().encode(JSON.stringify(validMeasurement));
      const filtered = OutlierFilterService.filterAndNormalizeMeasurement(data);

      expect(filtered).not.toBeNull();

      // Simulate database error
      mockCollection.insertOne.mockRejectedValueOnce(new Error('Database error'));

      await expect(DatabaseService.saveFilteredMeasurement(filtered!))
        .rejects.toThrow('Database error');
    });
  });
});

