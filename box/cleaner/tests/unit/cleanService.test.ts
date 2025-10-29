import {CleanService} from '../../src/cleanService';
import type {RawMeasurement} from '../../src/type';

describe('CleanService Unit Tests', () => {
    describe('cleanMeasurementList', () => {
        it('should clean valid measurement list data', () => {
            const validData = {type: 'temperature', value: 25.5, unit: '°C', timestamp: '2023-01-01T00:00:00Z'};
            const encodedData = new TextEncoder().encode(JSON.stringify(validData));

            const result: RawMeasurement | null = CleanService.cleanMeasurement(encodedData);

            expect(result).not.toBeNull();
            expect(result!.type).toBe('temperature');
            expect(result!.value).toBe(25.5);
            expect(result!.unit).toBe('°C');
            expect(result!.timestamp).toBe('2023-01-01T00:00:00Z');
        });

        it('should return null for invalid JSON', () => {
            const invalidData = new TextEncoder().encode('invalid json');

            const result = CleanService.cleanMeasurement(invalidData);

            expect(result).toBeNull();
        });

        it('should return null for empty data', () => {
            const emptyData = new TextEncoder().encode('');

            const result = CleanService.cleanMeasurement(emptyData);

            expect(result).toBeNull();
        });

        it('should filter out invalid measurements and keep valid ones', () => {
            const mixedData = [
                {type: 'temperature', value: 25.5, unit: '°C', timestamp: '2023-01-01T00:00:00Z'},
                {type: '', value: 72, unit: 'bpm', timestamp: '2023-01-01T00:01:00Z'}, // Invalid: empty type
                {type: 'pulse', value: 'invalid', unit: 'bpm', timestamp: '2023-01-01T00:02:00Z'}, // Invalid: non-numeric value
                {type: 'weight', value: 70.5, unit: 'kg', timestamp: '2023-01-01T00:03:00Z'}
            ];

            let encodedData = new TextEncoder().encode(JSON.stringify(mixedData[0]));
            let result: RawMeasurement | null = CleanService.cleanMeasurement(encodedData);
            expect(result).not.toBeNull();
            expect(result!.type).toBe('temperature');
            expect(result!.value).toBe(25.5);
            expect(result!.unit).toBe('°C');
            expect(result!.timestamp).toBe('2023-01-01T00:00:00Z');

            encodedData = new TextEncoder().encode(JSON.stringify(mixedData[3]));
            result = CleanService.cleanMeasurement(encodedData);
            expect(result).not.toBeNull();
            expect(result!.type).toBe('weight');
            expect(result!.value).toBe(70.5);
            expect(result!.unit).toBe('kg');
            expect(result!.timestamp).toBe('2023-01-01T00:03:00Z');
        });

        it('should return null when all measurements are invalid', () => {
            const invalidMeasurements = [
                {type: '', value: 25.5, unit: '°C', timestamp: '2023-01-01T00:00:00Z'},
                {type: 'pulse', value: 'invalid', unit: 'bpm', timestamp: '2023-01-01T00:01:00Z'}
            ];
            let encodedData = new TextEncoder().encode(JSON.stringify(invalidMeasurements[0]));
            let result = CleanService.cleanMeasurement(encodedData);
            expect(result).toBeNull();
            encodedData = new TextEncoder().encode(JSON.stringify(invalidMeasurements[1]));
            result = CleanService.cleanMeasurement(encodedData);
            expect(result).toBeNull();
        });

        it('should handle measurements with NaN values', () => {
            const dataWithNaN = [
                {type: 'temperature', value: NaN, unit: '°C', timestamp: '2023-01-01T00:00:00Z'},
                {type: 'pulse', value: 72, unit: 'bpm', timestamp: '2023-01-01T00:01:00Z'}
            ];
            let encodedData = new TextEncoder().encode(JSON.stringify(dataWithNaN[0]));
            let result: RawMeasurement | null = CleanService.cleanMeasurement(encodedData);
            expect(result).toBeNull();

            encodedData = new TextEncoder().encode(JSON.stringify(dataWithNaN[1]));
            result = CleanService.cleanMeasurement(encodedData);
            expect(result).not.toBeNull();
            expect(result!.type).toBe('pulse');
            expect(result!.value).toBe(72);
            expect(result!.unit).toBe('bpm');
            expect(result!.timestamp).toBe('2023-01-01T00:01:00Z');
        });
    });
});
