import {NormalizerService} from '../../src/normalizerService';
import type {RawMeasurement} from '../../src/type';

describe('NormalizerService Unit Tests', () => {
    describe('normalizeMeasurementList', () => {
        it('should normalize valid measurement list', () => {
            const inputData: RawMeasurement[] = [
                {
                    type: 'temperature',
                    value: 68,
                    unit: '°F',
                    timestamp: '2023-01-01T10:00:00.000Z'
                },
                {
                    type: 'weight',
                    value: 150,
                    unit: 'lbs',
                    timestamp: '2023-01-01T10:01:00.000Z'
                }
            ];

            let uint8Array = new TextEncoder().encode(JSON.stringify(inputData[0]));
            let result: RawMeasurement | null = NormalizerService.normalizeMeasurement(uint8Array);

            expect(result).not.toBeNull();
            expect(result!.type).toBe('temperature');
            // Temperature conversion: (68-32)*5/9 = 20°C
            expect(result!.value).toBeCloseTo(20, 2);
            expect(result!.unit).toBe('°C');
            expect(result!.timestamp).toBe('2023-01-01T10:00:00.000Z');

            uint8Array = new TextEncoder().encode(JSON.stringify(inputData[1]));
            result = NormalizerService.normalizeMeasurement(uint8Array);

            expect(result).not.toBeNull();
            expect(result!.type).toBe('weight');
            // Weight conversion: 150 * 0.45359237 = 68.04 kg
            expect(result!.value).toBeCloseTo(68.04, 2);
            expect(result!.unit).toBe('kg');
            expect(result!.timestamp).toBe('2023-01-01T10:01:00.000Z');
        });

        it('should handle invalid JSON', () => {
            const invalidJson = new TextEncoder().encode('invalid json');
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {
            });

            const result = NormalizerService.normalizeMeasurement(invalidJson);

            expect(result).toBeNull();
            expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
            expect(consoleErrorSpy.mock.calls[0][0]).toMatch(/Error parsing measurement data/);
            expect(consoleErrorSpy.mock.calls[0][1]).toBeInstanceOf(SyntaxError);

            consoleErrorSpy.mockRestore();
        });

        it('should filter out invalid measurements', () => {
            const inputData: RawMeasurement[] = [
                {
                    type: 'temperature',
                    value: 68,
                    unit: '°F',
                    timestamp: '2023-01-01T10:00:00.000Z'
                },
                {
                    type: 'temperature',
                    value: 70,
                    unit: '',
                    timestamp: '2023-01-01T10:01:00.000Z'
                } as RawMeasurement
            ];

            let uint8Array = new TextEncoder().encode(JSON.stringify(inputData[0]));
            let result: RawMeasurement | null = NormalizerService.normalizeMeasurement(uint8Array);
            expect(result).not.toBeNull();
            expect(result!.type).toBe('temperature');
            expect(result!.value).toBeCloseTo(20, 2); // (68-32)*5/9 = 20°C
            expect(result!.unit).toBe('°C');
            expect(result!.timestamp).toBe('2023-01-01T10:00:00.000Z');
            uint8Array = new TextEncoder().encode(JSON.stringify(inputData[1]));
            result = NormalizerService.normalizeMeasurement(uint8Array);
            expect(result).toBeNull();
        });

        it('should return null when no valid measurements remain', () => {
            const inputData: RawMeasurement = {
                type: 'temperature',
                value: 70,
                unit: '',
                timestamp: '2023-01-01T10:01:00.000Z'
            } as RawMeasurement;
            const uint8Array = new TextEncoder().encode(JSON.stringify(inputData));
            const result: RawMeasurement | null = NormalizerService.normalizeMeasurement(uint8Array);
            expect(result).toBeNull();
        });

        it('should normalize bps to bpm', () => {
            const inputData: RawMeasurement = {
                type: 'pulse',
                value: 1.2,
                unit: 'bps',
                timestamp: '2023-01-01T10:00:00.000Z'
            };
            const uint8Array = new TextEncoder().encode(JSON.stringify(inputData));
            const result: RawMeasurement | null = NormalizerService.normalizeMeasurement(uint8Array);
            expect(result).not.toBeNull();
            expect(result!.type).toBe(inputData.type);
            expect(result!.value).toBeCloseTo(72, 2); // 1.2 * 60 = 72
            expect(result!.unit).toBe('bpm');
            expect(result!.timestamp).toBe(inputData.timestamp);
        });

        it('should handle units that do not need conversion', () => {
            const inputData: RawMeasurement = {
                type: 'steps',
                value: 10000,
                unit: 'steps',
                timestamp: '2023-01-01T10:00:00.000Z'
            };

            const uint8Array = new TextEncoder().encode(JSON.stringify(inputData));
            const result: RawMeasurement | null = NormalizerService.normalizeMeasurement(uint8Array);

            expect(result).not.toBeNull();
            expect(result!.type).toBe(inputData.type);
            expect(result!.value).toBe(inputData.value);
            expect(result!.unit).toBe(inputData.unit);
            expect(result!.timestamp).toBe(inputData.timestamp);
        });

        it('should handle invalid timestamp', () => {
            const inputData: RawMeasurement = {
                type: 'temperature',
                value: 68,
                unit: '°F',
                timestamp: 'invalid-timestamp'
            };

            const uint8Array = new TextEncoder().encode(JSON.stringify(inputData));
            const result: RawMeasurement | null = NormalizerService.normalizeMeasurement(uint8Array);

            expect(result).toBeNull();
        });

        it('should round values to 2 decimal places', () => {
            const inputData: RawMeasurement = {
                type: 'weight',
                value: 100.123456,
                unit: 'lbs',
                timestamp: '2023-01-01T10:00:00.000Z'
            };

            const uint8Array = new TextEncoder().encode(JSON.stringify(inputData));
            const result: RawMeasurement | null = NormalizerService.normalizeMeasurement(uint8Array);

            expect(result).not.toBeNull();
            expect(result!.type).toBe(inputData.type);
            // 100.123456 * 0.45359237 = 45.408... should be rounded to 45.4
            expect(result!.value).toBeCloseTo(45.42, 2);
            expect(result!.unit).toBe('kg');
            expect(result!.timestamp).toBe(inputData.timestamp);
        });
    });
});
