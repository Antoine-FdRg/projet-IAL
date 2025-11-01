import { CompressionService } from '../../src/compressionService';
import type { RawMeasurement } from '../../src/type';

describe('CompressionService', () => {
  describe('compressMeasurements', () => {
    it('should return empty array when no measurements provided', () => {
      const result = CompressionService.compressMeasurements([]);
      expect(result).toEqual([]);
    });

    it('should compress single measurement type correctly', () => {
      const measurements: RawMeasurement[] = [
        { type: 'temperature', value: 20.5, unit: '°C', timestamp: '2023-01-01T10:00:00Z' },
        { type: 'temperature', value: 21.5, unit: '°C', timestamp: '2023-01-01T11:00:00Z' },
        { type: 'temperature', value: 22.0, unit: '°C', timestamp: '2023-01-01T12:00:00Z' }
      ];

      const result = CompressionService.compressMeasurements(measurements);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'temperature',
        value: 21.33, // (20.5 + 21.5 + 22.0) / 3 = 21.33
        unit: '°C',
        timestamp: '2023-01-01T10:00:00.000Z' // earliest timestamp
      });
    });

    it('should compress multiple measurement types correctly', () => {
      const measurements: RawMeasurement[] = [
        { type: 'temperature', value: 20.0, unit: '°C', timestamp: '2023-01-01T10:00:00Z' },
        { type: 'temperature', value: 22.0, unit: '°C', timestamp: '2023-01-01T11:00:00Z' },
        { type: 'pulse', value: 70, unit: 'bpm', timestamp: '2023-01-01T10:30:00Z' },
        { type: 'pulse', value: 80, unit: 'bpm', timestamp: '2023-01-01T11:30:00Z' },
        { type: 'weight', value: 75.5, unit: 'kg', timestamp: '2023-01-01T09:00:00Z' }
      ];

      const result = CompressionService.compressMeasurements(measurements);

      expect(result).toHaveLength(3);

      const temperatureResult = result.find(r => r.type === 'temperature');
      expect(temperatureResult).toEqual({
        type: 'temperature',
        value: 21.0, // (20.0 + 22.0) / 2
        unit: '°C',
        timestamp: '2023-01-01T10:00:00.000Z'
      });

      const pulseResult = result.find(r => r.type === 'pulse');
      expect(pulseResult).toEqual({
        type: 'pulse',
        value: 75.0, // (70 + 80) / 2
        unit: 'bpm',
        timestamp: '2023-01-01T10:30:00.000Z'
      });

      const weightResult = result.find(r => r.type === 'weight');
      expect(weightResult).toEqual({
        type: 'weight',
        value: 75.5,
        unit: 'kg',
        timestamp: '2023-01-01T09:00:00.000Z'
      });
    });

    it('should round average values to 2 decimal places', () => {
      const measurements: RawMeasurement[] = [
        { type: 'temperature', value: 20.333, unit: '°C', timestamp: '2023-01-01T10:00:00Z' },
        { type: 'temperature', value: 21.666, unit: '°C', timestamp: '2023-01-01T11:00:00Z' },
        { type: 'temperature', value: 22.111, unit: '°C', timestamp: '2023-01-01T12:00:00Z' }
      ];

      const result = CompressionService.compressMeasurements(measurements);

      expect(result[0]?.value).toBe(21.37); // (20.333 + 21.666 + 22.111) / 3 = 21.37
    });

    it('should use earliest timestamp for each type group', () => {
      const measurements: RawMeasurement[] = [
        { type: 'temperature', value: 20.0, unit: '°C', timestamp: '2023-01-01T12:00:00Z' },
        { type: 'temperature', value: 21.0, unit: '°C', timestamp: '2023-01-01T10:00:00Z' }, // earliest
        { type: 'temperature', value: 22.0, unit: '°C', timestamp: '2023-01-01T11:00:00Z' }
      ];

      const result = CompressionService.compressMeasurements(measurements);

      expect(result[0]?.timestamp).toBe('2023-01-01T10:00:00.000Z');
    });

    it('should handle single measurement correctly', () => {
      const measurements: RawMeasurement[] = [
        { type: 'temperature', value: 20.5, unit: '°C', timestamp: '2023-01-01T10:00:00Z' }
      ];

      const result = CompressionService.compressMeasurements(measurements);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'temperature',
        value: 20.5,
        unit: '°C',
        timestamp: '2023-01-01T10:00:00.000Z'
      });
    });

    it('should handle all measurement types', () => {
      const measurements: RawMeasurement[] = [
        { type: 'temperature', value: 20.0, unit: '°C', timestamp: '2023-01-01T10:00:00Z' },
        { type: 'pulse', value: 70, unit: 'bpm', timestamp: '2023-01-01T10:00:00Z' },
        { type: 'weight', value: 75.5, unit: 'kg', timestamp: '2023-01-01T10:00:00Z' },
        { type: 'steps', value: 1000, unit: 'steps', timestamp: '2023-01-01T10:00:00Z' }
      ];

      const result = CompressionService.compressMeasurements(measurements);

      expect(result).toHaveLength(4);
      expect(result.map(r => r.type)).toEqual(
        expect.arrayContaining(['temperature', 'pulse', 'weight', 'steps'])
      );
    });
  });
});
