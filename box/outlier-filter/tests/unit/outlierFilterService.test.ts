import {OutlierFilterService} from '../../src/outlierFilterService';
import {EnvService} from '../../src/envService';
import type {RawMeasurement} from '../../src/type';

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
            const result = OutlierFilterService.filterAndNormalizeMeasurement(invalidData);
            expect(result).toBeNull();
        });

        it('should return null for missing dataList', () => {
            const invalidData = new TextEncoder().encode(JSON.stringify({}));
            const result = OutlierFilterService.filterAndNormalizeMeasurement(invalidData);
            expect(result).toBeNull();
        });

        it('should filter out invalid measurements', () => {
            const measurements: RawMeasurement[] = [
                {type: 'weight', value: 600, unit: 'kg', timestamp: '2024-01-01T10:00:00Z'}, // Invalid
                {type: 'temperature', value: 37, unit: '°C', timestamp: '2024-01-01T10:00:00Z'}, // Valid
                {type: 'pulse', value: 300, unit: 'bpm', timestamp: '2024-01-01T10:00:00Z'} // Invalid
            ]

            for (const measurement of measurements) {
                const data = new TextEncoder().encode(JSON.stringify(measurement));
                const result = OutlierFilterService.filterAndNormalizeMeasurement(data);
                if (
                    (measurement.type === 'temperature' && (measurement.value < EnvService.getTemperatureMin() || measurement.value > EnvService.getTemperatureMax())) ||
                    (measurement.type === 'weight' && (measurement.value < EnvService.getWeightMin() || measurement.value > EnvService.getWeightMax())) ||
                    (measurement.type === 'pulse' && (measurement.value < EnvService.getPulseMin() || measurement.value > EnvService.getPulseMax())) ||
                    (measurement.type === 'steps' && (measurement.value < EnvService.getStepsMin()))
                ) {
                    expect(result).toBeNull();
                } else {
                    expect(result).not.toBeNull();
                    expect(result!.type).toBe(measurement.type);
                    expect(result!.value).toBe(measurement.value);
                    expect(result!.unit).toBe(measurement.unit);
                    expect(result!.timestamp).toBe(measurement.timestamp);
                }
            }
        });

        it('should return null if no valid measurements remain', () => {
            const measurements: RawMeasurement[] = [
                {type: 'weight', value: 600, unit: 'kg', timestamp: '2024-01-01T10:00:00Z'}, // Invalid
                {type: 'pulse', value: 300, unit: 'bpm', timestamp: '2024-01-01T10:00:00Z'} // Invalid
            ];

            for (const measurement of measurements) {
                const data = new TextEncoder().encode(JSON.stringify(measurement));
                const result = OutlierFilterService.filterAndNormalizeMeasurement(data);
                expect(result).toBeNull();
            }
        });
    });

    describe('measurement validation', () => {
        it('should validate weight measurements correctly', () => {
            const validWeight: RawMeasurement = {
                type: 'weight',
                value: 70, // valid weight
                unit: 'kg',
                timestamp: '2024-01-01T10:00:00Z'
            };
            const invalidWeightLow: RawMeasurement = {
                type: 'weight',
                value: 10, // too low
                unit: 'kg',
                timestamp: '2024-01-01T10:00:00Z'
            };
            const invalidWeightHigh: RawMeasurement = {
                type: 'weight',
                value: 600, // too high
                unit: 'kg',
                timestamp: '2024-01-01T10:00:00Z'
            };

            const measurements: RawMeasurement[] = [validWeight, invalidWeightLow, invalidWeightHigh];

            for (const measurement of measurements) {
                const data = new TextEncoder().encode(JSON.stringify(measurement));
                const result = OutlierFilterService.filterAndNormalizeMeasurement(data);
                if (
                    measurement.value < EnvService.getWeightMin() ||
                    measurement.value > EnvService.getWeightMax()
                ) {
                    expect(result).toBeNull();
                } else {
                    expect(result).not.toBeNull();
                    expect(result!.type).toBe(measurement.type);
                    expect(result!.value).toBe(measurement.value);
                    expect(result!.unit).toBe(measurement.unit);
                    expect(result!.timestamp).toBe(measurement.timestamp);
                }
            }
        });

        it('should validate temperature measurements correctly', () => {
            const validTemp: RawMeasurement = {
                type: 'temperature',
                value: 37,
                unit: '°C',
                timestamp: '2024-01-01T10:00:00Z'
            };
            const invalidTempLow: RawMeasurement = {
                type: 'temperature',
                value: 30,
                unit: '°C',
                timestamp: '2024-01-01T10:00:00Z'
            };
            const invalidTempHigh: RawMeasurement = {
                type: 'temperature',
                value: 45,
                unit: '°C',
                timestamp: '2024-01-01T10:00:00Z'
            };

            const measurements: RawMeasurement[] = [validTemp, invalidTempLow, invalidTempHigh];

            for (const measurement of measurements) {
                const data = new TextEncoder().encode(JSON.stringify(measurement));
                const result = OutlierFilterService.filterAndNormalizeMeasurement(data);
                if (
                    measurement.value < EnvService.getTemperatureMin() ||
                    measurement.value > EnvService.getTemperatureMax()
                ) {
                    expect(result).toBeNull();
                } else {
                    expect(result).not.toBeNull();
                }
            }
        });

        it('should validate pulse measurements correctly', () => {
            const validPulse: RawMeasurement = {
                type: 'pulse',
                value: 80,
                unit: 'bpm',
                timestamp: '2024-01-01T10:00:00Z'
            };
            const invalidPulseLow: RawMeasurement = {
                type: 'pulse',
                value: -10,
                unit: 'bpm',
                timestamp: '2024-01-01T10:00:00Z'
            };
            const invalidPulseHigh: RawMeasurement = {
                type: 'pulse',
                value: 300,
                unit: 'bpm',
                timestamp: '2024-01-01T10:00:00Z'
            };

            const measurements: RawMeasurement[] = [validPulse, invalidPulseLow, invalidPulseHigh];

            for (const measurement of measurements) {
                const data = new TextEncoder().encode(JSON.stringify(measurement));
                const result = OutlierFilterService.filterAndNormalizeMeasurement(data);
                if (
                    measurement.value < EnvService.getPulseMin() ||
                    measurement.value > EnvService.getPulseMax()
                ) {
                    expect(result).toBeNull();
                } else {
                    expect(result).not.toBeNull();
                }
            }
        });

        it('should accept steps measurements without validation', () => {
            const stepsMeasurement: RawMeasurement = {
                type: 'steps',
                value: 10000,
                unit: 'steps',
                timestamp: '2024-01-01T10:00:00Z'
            };

            const data = new TextEncoder().encode(JSON.stringify(stepsMeasurement));
            const result = OutlierFilterService.filterAndNormalizeMeasurement(data);

            expect(result).not.toBeNull();
            expect(result!.type).toBe(stepsMeasurement.type);
            expect(result!.value).toBe(stepsMeasurement.value);
            expect(result!.unit).toBe(stepsMeasurement.unit);
            expect(result!.timestamp).toBe(stepsMeasurement.timestamp);
        });
    });
});
