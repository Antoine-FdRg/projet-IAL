import { NormalizerService } from '../../src/normalizerService';
import type { MeasurementList, RawMeasurement } from '../../src/type';

describe('NormalizerService Unit Tests', () => {
    describe('normalizeMeasurementList', () => {
        it('should normalize valid measurement list', () => {
            const inputData: MeasurementList = {
                boxId: 'box123',
                dataList: [
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
                ]
            };

            const uint8Array = new TextEncoder().encode(JSON.stringify(inputData));
            const result = NormalizerService.normalizeMeasurementList(uint8Array);

            expect(result).not.toBeNull();
            expect(result!.boxId).toBe('box123');
            expect(result!.dataList).toHaveLength(2);

            // Temperature conversion: (68-32)*5/9 = 20°C
            expect(result!.dataList[0].value).toBe(20);
            expect(result!.dataList[0].unit).toBe('°C');

            // Weight conversion: 150 * 0.45359237 = 68.04 kg
            expect(result!.dataList[1].value).toBe(68.04);
            expect(result!.dataList[1].unit).toBe('kg');
        });

        it('should handle invalid JSON', () => {
            const invalidJson = new TextEncoder().encode('invalid json');
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            const result = NormalizerService.normalizeMeasurementList(invalidJson);

            expect(result).toBeNull();
            expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
            expect(consoleErrorSpy.mock.calls[0][0]).toMatch(/Error parsing measurement data/);
            expect(consoleErrorSpy.mock.calls[0][1]).toBeInstanceOf(SyntaxError);

            consoleErrorSpy.mockRestore();
        });

        it('should handle missing boxId', () => {
            const inputData = {
                dataList: [
                    {
                        type: 'temperature',
                        value: 68,
                        unit: '°F',
                        timestamp: '2023-01-01T10:00:00.000Z'
                    }
                ]
            };

            const uint8Array = new TextEncoder().encode(JSON.stringify(inputData));
            const result = NormalizerService.normalizeMeasurementList(uint8Array);

            expect(result).toBeNull();
        });

        it('should handle missing dataList', () => {
            const inputData = {
                boxId: 'box123'
            };

            const uint8Array = new TextEncoder().encode(JSON.stringify(inputData));
            const result = NormalizerService.normalizeMeasurementList(uint8Array);

            expect(result).toBeNull();
        });

        it('should filter out invalid measurements', () => {
            const inputData: MeasurementList = {
                boxId: 'box123',
                dataList: [
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
                ]
            };

            const uint8Array = new TextEncoder().encode(JSON.stringify(inputData));
            const result = NormalizerService.normalizeMeasurementList(uint8Array);

            expect(result).not.toBeNull();
            expect(result!.dataList).toHaveLength(1);
        });

        it('should return null when no valid measurements remain', () => {
            const inputData: MeasurementList = {
                boxId: 'box123',
                dataList: [
                    {
                        type: 'temperature',
                        value: 70,
                        unit: '',
                        timestamp: '2023-01-01T10:01:00.000Z'
                    } as RawMeasurement
                ]
            };

            const uint8Array = new TextEncoder().encode(JSON.stringify(inputData));
            const result = NormalizerService.normalizeMeasurementList(uint8Array);

            expect(result).toBeNull();
        });

        it('should normalize bps to bpm', () => {
            const inputData: MeasurementList = {
                boxId: 'box123',
                dataList: [
                    {
                        type: 'pulse',
                        value: 1.2,
                        unit: 'bps',
                        timestamp: '2023-01-01T10:00:00.000Z'
                    }
                ]
            };

            const uint8Array = new TextEncoder().encode(JSON.stringify(inputData));
            const result = NormalizerService.normalizeMeasurementList(uint8Array);

            expect(result).not.toBeNull();
            expect(result!.dataList[0].value).toBe(72); // 1.2 * 60 = 72
            expect(result!.dataList[0].unit).toBe('bpm');
        });

        it('should handle units that do not need conversion', () => {
            const inputData: MeasurementList = {
                boxId: 'box123',
                dataList: [
                    {
                        type: 'steps',
                        value: 10000,
                        unit: 'steps',
                        timestamp: '2023-01-01T10:00:00.000Z'
                    }
                ]
            };

            const uint8Array = new TextEncoder().encode(JSON.stringify(inputData));
            const result = NormalizerService.normalizeMeasurementList(uint8Array);

            expect(result).not.toBeNull();
            expect(result!.dataList[0].value).toBe(10000);
            expect(result!.dataList[0].unit).toBe('steps');
        });

        it('should handle invalid timestamp', () => {
            const inputData: MeasurementList = {
                boxId: 'box123',
                dataList: [
                    {
                        type: 'temperature',
                        value: 68,
                        unit: '°F',
                        timestamp: 'invalid-timestamp'
                    }
                ]
            };

            const uint8Array = new TextEncoder().encode(JSON.stringify(inputData));
            const result = NormalizerService.normalizeMeasurementList(uint8Array);

            expect(result).toBeNull();
        });

        it('should round values to 2 decimal places', () => {
            const inputData: MeasurementList = {
                boxId: 'box123',
                dataList: [
                    {
                        type: 'weight',
                        value: 100.123456,
                        unit: 'lbs',
                        timestamp: '2023-01-01T10:00:00.000Z'
                    }
                ]
            };

            const uint8Array = new TextEncoder().encode(JSON.stringify(inputData));
            const result = NormalizerService.normalizeMeasurementList(uint8Array);

            expect(result).not.toBeNull();
            // 100.123456 * 0.45359237 = 45.408... should be rounded to 45.4
            expect(result!.dataList[0].value).toBe(45.42);
        });
    });
});
