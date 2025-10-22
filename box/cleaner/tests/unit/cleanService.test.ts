import { CleanService } from '../../src/cleanService';
import type { MeasurementList, RawMeasurement } from '../../src/type';

describe('CleanService Unit Tests', () => {
    describe('cleanMeasurementList', () => {
        it('should clean valid measurement list data', () => {
            const validData = {
                boxId: 'box-123',
                dataList: [
                    { type: 'temperature', value: 25.5, unit: '°C', timestamp: '2023-01-01T00:00:00Z' },
                    { type: 'pulse', value: 72, unit: 'bpm', timestamp: '2023-01-01T00:01:00Z' }
                ]
            };
            const encodedData = new TextEncoder().encode(JSON.stringify(validData));

            const result = CleanService.cleanMeasurementList(encodedData);

            expect(result).not.toBeNull();
            expect(result?.boxId).toBe('box-123');
            expect(result?.dataList).toHaveLength(2);
            expect(result?.dataList[0].type).toBe('temperature');
            expect(result?.dataList[0].value).toBe(25.5);
        });

        it('should return null for invalid JSON', () => {
            const invalidData = new TextEncoder().encode('invalid json');

            const result = CleanService.cleanMeasurementList(invalidData);

            expect(result).toBeNull();
        });

        it('should return null for empty data', () => {
            const emptyData = new TextEncoder().encode('');

            const result = CleanService.cleanMeasurementList(emptyData);

            expect(result).toBeNull();
        });

        it('should return null when boxId is missing', () => {
            const dataWithoutBoxId = {
                dataList: [
                    { type: 'temperature', value: 25.5, unit: '°C', timestamp: '2023-01-01T00:00:00Z' }
                ]
            };
            const encodedData = new TextEncoder().encode(JSON.stringify(dataWithoutBoxId));

            const result = CleanService.cleanMeasurementList(encodedData);

            expect(result).toBeNull();
        });

        it('should return null when dataList is missing', () => {
            const dataWithoutDataList = { boxId: 'box-123' };
            const encodedData = new TextEncoder().encode(JSON.stringify(dataWithoutDataList));

            const result = CleanService.cleanMeasurementList(encodedData);

            expect(result).toBeNull();
        });

        it('should filter out invalid measurements and keep valid ones', () => {
            const mixedData = {
                boxId: 'box-123',
                dataList: [
                    { type: 'temperature', value: 25.5, unit: '°C', timestamp: '2023-01-01T00:00:00Z' },
                    { type: '', value: 72, unit: 'bpm', timestamp: '2023-01-01T00:01:00Z' }, // invalid type
                    { type: 'pulse', value: 'invalid', unit: 'bpm', timestamp: '2023-01-01T00:02:00Z' }, // invalid value
                    { type: 'weight', value: 70.5, unit: 'kg', timestamp: '2023-01-01T00:03:00Z' }
                ]
            };
            const encodedData = new TextEncoder().encode(JSON.stringify(mixedData));

            const result = CleanService.cleanMeasurementList(encodedData);

            expect(result).not.toBeNull();
            expect(result?.dataList).toHaveLength(2);
            expect(result?.dataList[0].type).toBe('temperature');
            expect(result?.dataList[1].type).toBe('weight');
        });

        it('should return null when all measurements are invalid', () => {
            const invalidMeasurements = {
                boxId: 'box-123',
                dataList: [
                    { type: '', value: 25.5, unit: '°C', timestamp: '2023-01-01T00:00:00Z' },
                    { type: 'pulse', value: 'invalid', unit: 'bpm', timestamp: '2023-01-01T00:01:00Z' }
                ]
            };
            const encodedData = new TextEncoder().encode(JSON.stringify(invalidMeasurements));

            const result = CleanService.cleanMeasurementList(encodedData);

            expect(result).toBeNull();
        });

        it('should handle measurements with NaN values', () => {
            const dataWithNaN = {
                boxId: 'box-123',
                dataList: [
                    { type: 'temperature', value: NaN, unit: '°C', timestamp: '2023-01-01T00:00:00Z' },
                    { type: 'pulse', value: 72, unit: 'bpm', timestamp: '2023-01-01T00:01:00Z' }
                ]
            };
            const encodedData = new TextEncoder().encode(JSON.stringify(dataWithNaN));

            const result = CleanService.cleanMeasurementList(encodedData);

            expect(result).not.toBeNull();
            expect(result?.dataList).toHaveLength(1);
            expect(result?.dataList[0].type).toBe('pulse');
        });
    });
});
