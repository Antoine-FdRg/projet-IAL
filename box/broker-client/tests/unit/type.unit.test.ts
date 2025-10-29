import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { RawMeasurement } from '../../src/type.js';

describe('Type Definitions Tests', () => {
  describe('RawMeasurement Type', () => {
    it('should accept valid temperature measurement', () => {
      const measurement: RawMeasurement = {
        type: 'temperature',
        value: 25.5,
        unit: '°C',
        timestamp: '2023-01-01T12:00:00.000Z'
      };

      expect(measurement.type).toBe('temperature');
      expect(measurement.value).toBe(25.5);
      expect(measurement.unit).toBe('°C');
      expect(measurement.timestamp).toBe('2023-01-01T12:00:00.000Z');
    });

    it('should accept valid pulse measurement', () => {
      const measurement: RawMeasurement = {
        type: 'pulse',
        value: 80,
        unit: 'bpm',
        timestamp: '2023-01-01T12:00:00.000Z'
      };

      expect(measurement.type).toBe('pulse');
      expect(measurement.value).toBe(80);
      expect(measurement.unit).toBe('bpm');
    });

    it('should accept valid weight measurement', () => {
      const measurement: RawMeasurement = {
        type: 'weight',
        value: 70.5,
        unit: 'kg',
        timestamp: '2023-01-01T12:00:00.000Z'
      };

      expect(measurement.type).toBe('weight');
      expect(measurement.value).toBe(70.5);
      expect(measurement.unit).toBe('kg');
    });

    it('should accept valid steps measurement', () => {
      const measurement: RawMeasurement = {
        type: 'steps',
        value: 10000,
        unit: 'count',
        timestamp: '2023-01-01T12:00:00.000Z'
      };

      expect(measurement.type).toBe('steps');
      expect(measurement.value).toBe(10000);
      expect(measurement.unit).toBe('count');
    });
  });

  describe('Timestamp Validation', () => {
    it('should validate ISO timestamp format', () => {
      const timestamp = new Date().toISOString();
      const measurement: RawMeasurement = {
        type: 'temperature',
        value: 25,
        unit: '°C',
        timestamp: timestamp
      };

      // Should be able to parse back to date
      const parsedDate = new Date(measurement.timestamp);
      expect(parsedDate.toISOString()).toBe(timestamp);
    });

    it('should handle various timestamp formats', () => {
      const timestamps = [
        '2023-01-01T00:00:00.000Z',
        '2023-12-31T23:59:59.999Z',
        new Date(Date.now()).toISOString()
      ];

      timestamps.forEach(timestamp => {
        const measurement: RawMeasurement = {
          type: 'temperature',
          value: 25,
          unit: '°C',
          timestamp: timestamp
        };

        expect(() => new Date(measurement.timestamp)).not.toThrow();
        expect(new Date(measurement.timestamp).toISOString()).toBe(timestamp);
      });
    });
  });

  describe('Value Range Validation', () => {
    it('should handle various numeric values', () => {
      const values = [0, -10.5, 100, 36.6, 999.99];

      values.forEach(value => {
        const measurement: RawMeasurement = {
          type: 'temperature',
          value: value,
          unit: '°C',
          timestamp: new Date().toISOString()
        };

        expect(measurement.value).toBe(value);
        expect(typeof measurement.value).toBe('number');
      });
    });

    it('should handle edge case values', () => {
      const edgeCases = [
        { value: Number.MAX_SAFE_INTEGER, description: 'maximum safe integer' },
        { value: Number.MIN_SAFE_INTEGER, description: 'minimum safe integer' },
        { value: 0.0001, description: 'very small positive number' },
        { value: -0.0001, description: 'very small negative number' }
      ];

      edgeCases.forEach(({ value, description }) => {
        const measurement: RawMeasurement = {
          type: 'temperature',
          value: value,
          unit: '°C',
          timestamp: new Date().toISOString()
        };

        expect(measurement.value).toBe(value);
        expect(typeof measurement.value).toBe('number');
      });
    });
  });

  describe('Unit Validation', () => {
    it('should handle various unit formats', () => {
      const units = ['°C', '°F', 'kg', 'lbs', 'bpm', 'bps', 'count', 'steps', '%'];

      units.forEach(unit => {
        const measurement: RawMeasurement = {
          type: 'temperature',
          value: 25,
          unit: unit,
          timestamp: new Date().toISOString()
        };

        expect(measurement.unit).toBe(unit);
        expect(typeof measurement.unit).toBe('string');
        expect(measurement.unit.length).toBeGreaterThan(0);
      });
    });
  });
});