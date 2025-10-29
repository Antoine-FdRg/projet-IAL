import { DatabaseService } from '../../src/databaseService';
import { CompressionService } from '../../src/compressionService';
import { SaveServiceClient } from '../../src/saveServiceClient';
import type { RawMeasurement } from '../../src/type';
import {executeUploadWorkflow} from "../../src/main";

// Mock all external dependencies
jest.mock('mongodb');
jest.mock('../../src/databaseService');
jest.mock('../../src/compressionService');
jest.mock('../../src/saveServiceClient');

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
const MockedDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;
const MockedCompressionService = CompressionService as jest.Mocked<typeof CompressionService>;
const MockedSaveServiceClient = SaveServiceClient as jest.Mocked<typeof SaveServiceClient>;

describe('E2E Tests - Complete Upload Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('Complete Upload Workflow Scenarios', () => {
    it('should execute complete successful workflow', async () => {
      // Setup mock data
      const mockRawMeasurements: RawMeasurement[] = [
        { type: 'temperature', value: 20.0, unit: '°C', timestamp: '2023-01-01T10:00:00Z' },
        { type: 'temperature', value: 22.0, unit: '°C', timestamp: '2023-01-01T11:00:00Z' },
        { type: 'pulse', value: 70, unit: 'bpm', timestamp: '2023-01-01T10:30:00Z' },
        { type: 'pulse', value: 80, unit: 'bpm', timestamp: '2023-01-01T11:30:00Z' }
      ];

      const mockCompressedMeasurements: RawMeasurement[] = [
        { type: 'temperature', value: 21.0, unit: '°C', timestamp: '2023-01-01T10:00:00Z' },
        { type: 'pulse', value: 75.0, unit: 'bpm', timestamp: '2023-01-01T10:30:00Z' }
      ];

      // Mock service responses
      MockedDatabaseService.getAllMeasurementsCollection.mockResolvedValueOnce(mockRawMeasurements);
      MockedCompressionService.compressMeasurements.mockReturnValueOnce(mockCompressedMeasurements);
      MockedSaveServiceClient.sendCompressedMeasurements.mockResolvedValueOnce(true);
      MockedDatabaseService.removeAllMeasurementsCollection.mockResolvedValueOnce();

      // Execute workflow
      await executeUploadWorkflow();

      // Verify the complete flow
      expect(MockedDatabaseService.getAllMeasurementsCollection).toHaveBeenCalledTimes(1);
      expect(MockedCompressionService.compressMeasurements).toHaveBeenCalledWith(mockRawMeasurements);
      expect(MockedSaveServiceClient.sendCompressedMeasurements).toHaveBeenCalledWith(mockCompressedMeasurements);
      expect(MockedDatabaseService.removeAllMeasurementsCollection).toHaveBeenCalledTimes(1);
      expect(MockedDatabaseService.saveCompressedMeasurements).not.toHaveBeenCalled();
    });

    it('should handle workflow when no measurements are found', async () => {
      // Mock empty measurements
      MockedDatabaseService.getAllMeasurementsCollection.mockResolvedValueOnce([]);

      // Execute workflow
      await executeUploadWorkflow();

      // Verify early return
      expect(MockedDatabaseService.getAllMeasurementsCollection).toHaveBeenCalledTimes(1);
      expect(MockedCompressionService.compressMeasurements).not.toHaveBeenCalled();
      expect(MockedSaveServiceClient.sendCompressedMeasurements).not.toHaveBeenCalled();
      expect(MockedDatabaseService.removeAllMeasurementsCollection).not.toHaveBeenCalled();
      expect(MockedDatabaseService.saveCompressedMeasurements).not.toHaveBeenCalled();
    });

    it('should handle save service failure scenario', async () => {
      const mockRawMeasurements: RawMeasurement[] = [
        { type: 'weight', value: 75.5, unit: 'kg', timestamp: '2023-01-01T09:00:00Z' }
      ];

      const mockCompressedMeasurements: RawMeasurement[] = [
        { type: 'weight', value: 75.5, unit: 'kg', timestamp: '2023-01-01T09:00:00Z' }
      ];

      // Mock service responses - save service fails
      MockedDatabaseService.getAllMeasurementsCollection.mockResolvedValueOnce(mockRawMeasurements);
      MockedCompressionService.compressMeasurements.mockReturnValueOnce(mockCompressedMeasurements);
      MockedSaveServiceClient.sendCompressedMeasurements.mockResolvedValueOnce(false);
      MockedDatabaseService.removeAllMeasurementsCollection.mockResolvedValueOnce();
      MockedDatabaseService.saveCompressedMeasurements.mockResolvedValueOnce();

      // Execute workflow
      await executeUploadWorkflow();

      // Verify failure handling
      expect(MockedDatabaseService.getAllMeasurementsCollection).toHaveBeenCalledTimes(1);
      expect(MockedCompressionService.compressMeasurements).toHaveBeenCalledWith(mockRawMeasurements);
      expect(MockedSaveServiceClient.sendCompressedMeasurements).toHaveBeenCalledWith(mockCompressedMeasurements);
      expect(MockedDatabaseService.removeAllMeasurementsCollection).toHaveBeenCalledTimes(1);
      expect(MockedDatabaseService.saveCompressedMeasurements).toHaveBeenCalledWith(mockCompressedMeasurements);
    });

    it('should handle database connection failure', async () => {
      // Mock database connection failure
      const dbError = new Error('Database connection failed');
      MockedDatabaseService.getAllMeasurementsCollection.mockRejectedValueOnce(dbError);

      // Execute workflow and expect error
      await expect(executeUploadWorkflow()).rejects.toThrow('Database connection failed');

      // Verify error handling
      expect(MockedDatabaseService.getAllMeasurementsCollection).toHaveBeenCalledTimes(1);
      expect(MockedCompressionService.compressMeasurements).not.toHaveBeenCalled();
      expect(MockedSaveServiceClient.sendCompressedMeasurements).not.toHaveBeenCalled();
    });

    it('should handle compression service error', async () => {
      const mockRawMeasurements: RawMeasurement[] = [
        { type: 'steps', value: 1000, unit: 'steps', timestamp: '2023-01-01T12:00:00Z' }
      ];

      // Mock compression failure
      MockedDatabaseService.getAllMeasurementsCollection.mockResolvedValueOnce(mockRawMeasurements);
      MockedCompressionService.compressMeasurements.mockImplementationOnce(() => {
        throw new Error('Compression failed');
      });

      // Execute workflow and expect error
      await expect(executeUploadWorkflow()).rejects.toThrow('Compression failed');

      // Verify error handling
      expect(MockedDatabaseService.getAllMeasurementsCollection).toHaveBeenCalledTimes(1);
      expect(MockedCompressionService.compressMeasurements).toHaveBeenCalledWith(mockRawMeasurements);
      expect(MockedSaveServiceClient.sendCompressedMeasurements).not.toHaveBeenCalled();
    });

    it('should handle cleanup failure after successful upload', async () => {
      const mockRawMeasurements: RawMeasurement[] = [
        { type: 'temperature', value: 21.0, unit: '°C', timestamp: '2023-01-01T10:00:00Z' }
      ];

      const mockCompressedMeasurements: RawMeasurement[] = [
        { type: 'temperature', value: 21.0, unit: '°C', timestamp: '2023-01-01T10:00:00Z' }
      ];

      // Mock successful upload but cleanup failure
      MockedDatabaseService.getAllMeasurementsCollection.mockResolvedValueOnce(mockRawMeasurements);
      MockedCompressionService.compressMeasurements.mockReturnValueOnce(mockCompressedMeasurements);
      MockedSaveServiceClient.sendCompressedMeasurements.mockResolvedValueOnce(true);
      MockedDatabaseService.removeAllMeasurementsCollection.mockRejectedValueOnce(new Error('Cleanup failed'));

      // Execute workflow and expect error
      await expect(executeUploadWorkflow()).rejects.toThrow('Cleanup failed');

      // Verify partial execution
      expect(MockedDatabaseService.getAllMeasurementsCollection).toHaveBeenCalledTimes(1);
      expect(MockedCompressionService.compressMeasurements).toHaveBeenCalledWith(mockRawMeasurements);
      expect(MockedSaveServiceClient.sendCompressedMeasurements).toHaveBeenCalledWith(mockCompressedMeasurements);
      expect(MockedDatabaseService.removeAllMeasurementsCollection).toHaveBeenCalledTimes(1);
    });

    it('should handle large dataset processing', async () => {
      // Create large dataset with multiple types
      const mockRawMeasurements: RawMeasurement[] = [];
      for (let i = 0; i < 100; i++) {
        mockRawMeasurements.push(
          { type: 'temperature', value: 20 + Math.random() * 10, unit: '°C', timestamp: `2023-01-01T${String(i % 24).padStart(2, '0')}:00:00Z` },
          { type: 'pulse', value: 60 + Math.random() * 40, unit: 'bpm', timestamp: `2023-01-01T${String(i % 24).padStart(2, '0')}:15:00Z` },
          { type: 'weight', value: 70 + Math.random() * 20, unit: 'kg', timestamp: `2023-01-01T${String(i % 24).padStart(2, '0')}:30:00Z` },
          { type: 'steps', value: Math.floor(Math.random() * 2000), unit: 'steps', timestamp: `2023-01-01T${String(i % 24).padStart(2, '0')}:45:00Z` }
        );
      }

      const mockCompressedMeasurements: RawMeasurement[] = [
        { type: 'temperature', value: 25.0, unit: '°C', timestamp: '2023-01-01T00:00:00Z' },
        { type: 'pulse', value: 75.0, unit: 'bpm', timestamp: '2023-01-01T00:15:00Z' },
        { type: 'weight', value: 80.0, unit: 'kg', timestamp: '2023-01-01T00:30:00Z' },
        { type: 'steps', value: 1000, unit: 'steps', timestamp: '2023-01-01T00:45:00Z' }
      ];

      // Mock service responses
      MockedDatabaseService.getAllMeasurementsCollection.mockResolvedValueOnce(mockRawMeasurements);
      MockedCompressionService.compressMeasurements.mockReturnValueOnce(mockCompressedMeasurements);
      MockedSaveServiceClient.sendCompressedMeasurements.mockResolvedValueOnce(true);
      MockedDatabaseService.removeAllMeasurementsCollection.mockResolvedValueOnce();

      // Execute workflow
      await executeUploadWorkflow();

      // Verify handling of large dataset
      expect(MockedDatabaseService.getAllMeasurementsCollection).toHaveBeenCalledTimes(1);
      expect(MockedCompressionService.compressMeasurements).toHaveBeenCalledWith(mockRawMeasurements);
      expect(MockedSaveServiceClient.sendCompressedMeasurements).toHaveBeenCalledWith(mockCompressedMeasurements);
      expect(MockedDatabaseService.removeAllMeasurementsCollection).toHaveBeenCalledTimes(1);
    });

    it('should maintain proper execution order', async () => {
      const mockRawMeasurements: RawMeasurement[] = [
        { type: 'temperature', value: 21.0, unit: '°C', timestamp: '2023-01-01T10:00:00Z' }
      ];

      const mockCompressedMeasurements: RawMeasurement[] = [
        { type: 'temperature', value: 21.0, unit: '°C', timestamp: '2023-01-01T10:00:00Z' }
      ];

      let executionOrder: string[] = [];

      // Mock services to track execution order
      MockedDatabaseService.getAllMeasurementsCollection.mockImplementationOnce(async () => {
        executionOrder.push('getAllMeasurements');
        return mockRawMeasurements;
      });

      MockedCompressionService.compressMeasurements.mockImplementationOnce((measurements) => {
        executionOrder.push('compressMeasurements');
        return mockCompressedMeasurements;
      });

      MockedSaveServiceClient.sendCompressedMeasurements.mockImplementationOnce(async () => {
        executionOrder.push('sendCompressedMeasurements');
        return true;
      });

      MockedDatabaseService.removeAllMeasurementsCollection.mockImplementationOnce(async () => {
        executionOrder.push('removeAllMeasurements');
      });

      // Execute workflow
      await executeUploadWorkflow();

      // Verify execution order
      expect(executionOrder).toEqual([
        'getAllMeasurements',
        'compressMeasurements',
        'sendCompressedMeasurements',
        'removeAllMeasurements'
      ]);
    });
  });
});
