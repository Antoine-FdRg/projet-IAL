// tests/integration/normalizer.integration.test.ts
import { NormalizerService } from '../../src/normalizerService';
import { EnvService } from '../../src/envService';
import { BrokerService } from '../../src/brokerService';
import type { MeasurementList } from '../../src/type';

describe('Normalizer Integration Tests', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = {
            ...originalEnv,
            NATS_SERVER: 'http://localhost:4222',
            NORMALIZER_PRODUCER_QUEUE: 'test.producer',
            NORMALIZER_CONSUME_QUEUE: 'test.consumer'
        };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('End-to-end normalization flow', () => {
        it('should process complete measurement list with various units', () => {
            const inputData: MeasurementList = {
                boxId: 'integration-test-box',
                dataList: [
                    {
                        type: 'temperature',
                        value: 98.6,
                        unit: '°F',
                        timestamp: '2023-01-01T10:00:00.000Z'
                    },
                    {
                        type: 'weight',
                        value: 165.3,
                        unit: 'lbs',
                        timestamp: '2023-01-01T10:01:00.000Z'
                    },
                    {
                        type: 'pulse',
                        value: 1.16,
                        unit: 'bps',
                        timestamp: '2023-01-01T10:02:00.000Z'
                    },
                    {
                        type: 'steps',
                        value: 8500,
                        unit: 'steps',
                        timestamp: '2023-01-01T10:03:00.000Z'
                    }
                ]
            };

            const uint8Array = new TextEncoder().encode(JSON.stringify(inputData));
            const result = NormalizerService.normalizeMeasurementList(uint8Array);

            expect(result).not.toBeNull();
            expect(result!.boxId).toBe('integration-test-box');
            expect(result!.dataList).toHaveLength(4);

            // Verify all conversions
            expect(result!.dataList[0].value).toBe(37); // 98.6°F to °C
            expect(result!.dataList[0].unit).toBe('°C');

            expect(result!.dataList[1].value).toBe(74.98); // 165.3 lbs to kg
            expect(result!.dataList[1].unit).toBe('kg');

            expect(result!.dataList[2].value).toBe(69.6); // 1.16 bps to bpm
            expect(result!.dataList[2].unit).toBe('bpm');

            expect(result!.dataList[3].value).toBe(8500); // steps unchanged
            expect(result!.dataList[3].unit).toBe('steps');
        });

        it('should work with environment service configuration', () => {
            expect(() => EnvService.verifyQueueEnvVars()).not.toThrow();
            expect(EnvService.getConsumeQueue()).toBe('test.consumer');
            expect(EnvService.getProducerQueue()).toBe('test.producer');
            expect(EnvService.getBrokerURL()).toBe('http://localhost:4222');
        });

        it('should configure broker service correctly', () => {
            const connectionOptions = BrokerService.getConnectionOptions();
            expect(connectionOptions.servers).toBe('http://localhost:4222');
        });
    });

    describe('Error handling integration', () => {
        it('should handle malformed data gracefully', () => {
            const malformedData = new TextEncoder().encode('{"boxId": "test", "invalid": true}');
            const result = NormalizerService.normalizeMeasurementList(malformedData);

            expect(result).toBeNull();
        });

        it('should handle mixed valid and invalid measurements', () => {
            const inputData = {
                boxId: 'mixed-test-box',
                dataList: [
                    {
                        type: 'temperature',
                        value: 20,
                        unit: '°C',
                        timestamp: '2023-01-01T10:00:00.000Z'
                    },
                    {
                        type: 'temperature',
                        value: 25,
                        unit: '',
                        timestamp: '2023-01-01T10:01:00.000Z'
                    },
                    {
                        type: 'weight',
                        value: 70,
                        unit: 'kg',
                        timestamp: '2023-01-01T10:02:00.000Z'
                    }
                ]
            };

            const uint8Array = new TextEncoder().encode(JSON.stringify(inputData));
            const result = NormalizerService.normalizeMeasurementList(uint8Array);

            expect(result).not.toBeNull();
            expect(result!.dataList).toHaveLength(2); // Only valid measurements
        });
    });
});
