import { OutlierFilterService } from '../../src/outlierFilterService';
import { EnvService } from '../../src/envService';
import type { MeasurementList, RawMeasurement } from '../../src/type';

jest.mock('../../src/envService');

describe('OutlierFilterService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (EnvService.getWeightMin as jest.Mock).mockReturnValue(15);
        (EnvService.getWeightMax as jest.Mock).mockReturnValue(500);
        (EnvService.getTemperatureMin as jest.Mock).mockReturnValue(32);
        (EnvService.getTemperatureMax as jest.Mock).mockReturnValue(42);
        (EnvService.getPulseMax as jest.Mock).mockReturnValue(250);
        (EnvService.getPulseMin as jest.Mock).mockReturnValue(0);
        (EnvService.getStepsMin as jest.Mock).mockReturnValue(0);
    });

    describe('filterAndNormalizeMeasurementList', () => {
        it('should return null for invalid JSON', () => {
            const invalidData = new TextEncoder().encode('invalid json');
            const result = OutlierFilterService.filterAndNormalizeMeasurementList(invalidData);
            expect(result).toBeNull();
        });

        it('should return null for missing boxId', () => {
            const invalidData = new TextEncoder().encode(JSON.stringify({ dataList: [] }));
            const result = OutlierFilterService.filterAndNormalizeMeasurementList(invalidData);
            expect(result).toBeNull();
        });

        it('should return null for missing dataList', () => {
            const invalidData = new TextEncoder().encode(JSON.stringify({ boxId: 'box1' }));
            const result = OutlierFilterService.filterAndNormalizeMeasurementList(invalidData);
            expect(result).toBeNull();
        });

        it('should filter out invalid measurements', () => {
            const measurements: MeasurementList = {
                boxId: 'box1',
                dataList: [
                    { type: 'weight', value: 600, unit: 'kg', timestamp: '2024-01-01T10:00:00Z' }, // Invalid
                    { type: 'temperature', value: 37, unit: '°C', timestamp: '2024-01-01T10:00:00Z' }, // Valid
                    { type: 'pulse', value: 300, unit: 'bpm', timestamp: '2024-01-01T10:00:00Z' } // Invalid
                ]
            };

            const data = new TextEncoder().encode(JSON.stringify(measurements));
            const result = OutlierFilterService.filterAndNormalizeMeasurementList(data);

            expect(result).not.toBeNull();
            expect(result!.dataList).toHaveLength(1);
            expect(result!.dataList[0].type).toBe('temperature');
        });

        it('should return null if no valid measurements remain', () => {
            const measurements: MeasurementList = {
                boxId: 'box1',
                dataList: [
                    { type: 'weight', value: 600, unit: 'kg', timestamp: '2024-01-01T10:00:00Z' }, // Invalid
                    { type: 'pulse', value: 300, unit: 'bpm', timestamp: '2024-01-01T10:00:00Z' } // Invalid
                ]
            };

            const data = new TextEncoder().encode(JSON.stringify(measurements));
            const result = OutlierFilterService.filterAndNormalizeMeasurementList(data);

            expect(result).toBeNull();
        });
    });

    describe('measurement validation', () => {
        it('should validate weight measurements correctly', () => {
            const validWeight: RawMeasurement = { type: 'weight', value: 70, unit: 'kg', timestamp: '2024-01-01T10:00:00Z' };
            const invalidWeightLow: RawMeasurement = { type: 'weight', value: 10, unit: 'kg', timestamp: '2024-01-01T10:00:00Z' };
            const invalidWeightHigh: RawMeasurement = { type: 'weight', value: 600, unit: 'kg', timestamp: '2024-01-01T10:00:00Z' };

            const measurements = {
                boxId: 'box1',
                dataList: [validWeight, invalidWeightLow, invalidWeightHigh]
            };

            const data = new TextEncoder().encode(JSON.stringify(measurements));
            const result = OutlierFilterService.filterAndNormalizeMeasurementList(data);

            expect(result!.dataList).toHaveLength(1);
            expect(result!.dataList[0].value).toBe(70);
        });

        it('should validate temperature measurements correctly', () => {
            const validTemp: RawMeasurement = { type: 'temperature', value: 37, unit: '°C', timestamp: '2024-01-01T10:00:00Z' };
            const invalidTempLow: RawMeasurement = { type: 'temperature', value: 30, unit: '°C', timestamp: '2024-01-01T10:00:00Z' };
            const invalidTempHigh: RawMeasurement = { type: 'temperature', value: 45, unit: '°C', timestamp: '2024-01-01T10:00:00Z' };

            const measurements = {
                boxId: 'box1',
                dataList: [validTemp, invalidTempLow, invalidTempHigh]
            };

            const data = new TextEncoder().encode(JSON.stringify(measurements));
            const result = OutlierFilterService.filterAndNormalizeMeasurementList(data);

            expect(result!.dataList).toHaveLength(1);
            expect(result!.dataList[0].value).toBe(37);
        });

        it('should validate pulse measurements correctly', () => {
            const validPulse: RawMeasurement = { type: 'pulse', value: 80, unit: 'bpm', timestamp: '2024-01-01T10:00:00Z' };
            const invalidPulseLow: RawMeasurement = { type: 'pulse', value: -10, unit: 'bpm', timestamp: '2024-01-01T10:00:00Z' };
            const invalidPulseHigh: RawMeasurement = { type: 'pulse', value: 300, unit: 'bpm', timestamp: '2024-01-01T10:00:00Z' };

            const measurements = {
                boxId: 'box1',
                dataList: [validPulse, invalidPulseLow, invalidPulseHigh]
            };

            const data = new TextEncoder().encode(JSON.stringify(measurements));
            const result = OutlierFilterService.filterAndNormalizeMeasurementList(data);

            expect(result!.dataList).toHaveLength(1);
            expect(result!.dataList[0].value).toBe(80);
        });

        it('should accept steps measurements without validation', () => {
            const stepsMeasurement: RawMeasurement = { type: 'steps', value: 10000, unit: 'steps', timestamp: '2024-01-01T10:00:00Z' };

            const measurements = {
                boxId: 'box1',
                dataList: [stepsMeasurement]
            };

            const data = new TextEncoder().encode(JSON.stringify(measurements));
            const result = OutlierFilterService.filterAndNormalizeMeasurementList(data);

            expect(result!.dataList).toHaveLength(1);
            expect(result!.dataList[0].value).toBe(10000);
        });
    });
});
