import { SaveService } from '../src/services/saveService';
import type { MeasurementList } from '../src/types';

// Mock the repository
jest.mock('../src/database/measurementRepository', () => ({
  MeasurementRepository: {
    insertBatch: jest.fn().mockResolvedValue(3),
  },
}));

describe('SaveService', () => {
  describe('saveMeasurements', () => {
    it('should save valid measurements successfully', async () => {
      const validData: MeasurementList = {
        boxId: '550e8400-e29b-41d4-a716-446655440001',
        dataList: [
          {
            type: 'temperature',
            value: 37.2,
            unit: '°C',
            timestamp: '2025-01-15T10:30:00.000Z',
          },
          {
            type: 'weight',
            value: 75.5,
            unit: 'kg',
            timestamp: '2025-01-15T10:30:05.000Z',
          },
          {
            type: 'pulse',
            value: 72,
            unit: 'bpm',
            timestamp: '2025-01-15T10:30:10.000Z',
          },
        ],
      };

      const result = await SaveService.saveMeasurements(validData);

      expect(result.success).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should reject data with missing boxId', async () => {
      const invalidData: any = {
        dataList: [
          {
            type: 'temperature',
            value: 37.2,
            unit: '°C',
            timestamp: '2025-01-15T10:30:00.000Z',
          },
        ],
      };

      const result = await SaveService.saveMeasurements(invalidData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('boxId');
    });

    it('should reject data with invalid boxId format', async () => {
      const invalidData: MeasurementList = {
        boxId: 'not-a-uuid',
        dataList: [
          {
            type: 'temperature',
            value: 37.2,
            unit: '°C',
            timestamp: '2025-01-15T10:30:00.000Z',
          },
        ],
      };

      const result = await SaveService.saveMeasurements(invalidData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('UUID');
    });

    it('should reject data with empty dataList', async () => {
      const invalidData: MeasurementList = {
        boxId: '550e8400-e29b-41d4-a716-446655440001',
        dataList: [],
      };

      const result = await SaveService.saveMeasurements(invalidData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('empty');
    });

    it('should reject data with invalid measurement type', async () => {
      const invalidData: any = {
        boxId: '550e8400-e29b-41d4-a716-446655440001',
        dataList: [
          {
            type: 'invalid_type',
            value: 37.2,
            unit: '°C',
            timestamp: '2025-01-15T10:30:00.000Z',
          },
        ],
      };

      const result = await SaveService.saveMeasurements(invalidData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('type');
    });

    it('should reject data with non-numeric value', async () => {
      const invalidData: any = {
        boxId: '550e8400-e29b-41d4-a716-446655440001',
        dataList: [
          {
            type: 'temperature',
            value: 'not a number',
            unit: '°C',
            timestamp: '2025-01-15T10:30:00.000Z',
          },
        ],
      };

      const result = await SaveService.saveMeasurements(invalidData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('value');
    });

    it('should reject data with missing unit', async () => {
      const invalidData: any = {
        boxId: '550e8400-e29b-41d4-a716-446655440001',
        dataList: [
          {
            type: 'temperature',
            value: 37.2,
            timestamp: '2025-01-15T10:30:00.000Z',
          },
        ],
      };

      const result = await SaveService.saveMeasurements(invalidData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('unit');
    });

    it('should reject data with invalid timestamp', async () => {
      const invalidData: any = {
        boxId: '550e8400-e29b-41d4-a716-446655440001',
        dataList: [
          {
            type: 'temperature',
            value: 37.2,
            unit: '°C',
            timestamp: 'invalid-date',
          },
        ],
      };

      const result = await SaveService.saveMeasurements(invalidData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('timestamp');
    });

    it('should accept all valid measurement types', async () => {
      const validTypes: MeasurementList = {
        boxId: '550e8400-e29b-41d4-a716-446655440001',
        dataList: [
          {
            type: 'temperature',
            value: 37.2,
            unit: '°C',
            timestamp: '2025-01-15T10:30:00.000Z',
          },
          {
            type: 'weight',
            value: 75.5,
            unit: 'kg',
            timestamp: '2025-01-15T10:30:00.000Z',
          },
          {
            type: 'pulse',
            value: 72,
            unit: 'bpm',
            timestamp: '2025-01-15T10:30:00.000Z',
          },
          {
            type: 'steps',
            value: 5000,
            unit: 'steps',
            timestamp: '2025-01-15T10:30:00.000Z',
          },
        ],
      };

      const result = await SaveService.saveMeasurements(validTypes);

      expect(result.success).toBe(true);
    });
  });
});
