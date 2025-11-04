import { NormalizerService } from '../../src/normalizerService';
import { EnvService } from '../../src/envService';
import { BrokerService } from '../../src/brokerService';
import type { RawMeasurement } from '../../src/type';

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
            const inputData: RawMeasurement[] = [
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
                ];

            let uint8Array = new TextEncoder().encode(JSON.stringify(inputData[0]));
            let result = NormalizerService.normalizeMeasurement(uint8Array);

            expect(result).not.toBeNull();
            expect(result!.type).toBe('temperature');
            expect(result!.value).toBeCloseTo(37, 2); // 98.6°F to °C
            expect(result!.unit).toBe('°C');
            expect(result!.timestamp).toBe('2023-01-01T10:00:00.000Z');

            uint8Array = new TextEncoder().encode(JSON.stringify(inputData[1]));
            result = NormalizerService.normalizeMeasurement(uint8Array);

            expect(result).not.toBeNull();
            expect(result!.type).toBe('weight');
            expect(result!.value).toBeCloseTo(74.98, 2); // 165.3 lbs to kg
            expect(result!.unit).toBe('kg');
            expect(result!.timestamp).toBe('2023-01-01T10:01:00.000Z');

            uint8Array = new TextEncoder().encode(JSON.stringify(inputData[2]));
            result = NormalizerService.normalizeMeasurement(uint8Array);

            expect(result).not.toBeNull();
            expect(result!.type).toBe('pulse');
            expect(result!.value).toBeCloseTo(69.6, 2); // 1.16 bps to bpm
            expect(result!.unit).toBe('bpm');
            expect(result!.timestamp).toBe('2023-01-01T10:02:00.000Z');

            uint8Array = new TextEncoder().encode(JSON.stringify(inputData[3]));
            result = NormalizerService.normalizeMeasurement(uint8Array);

            expect(result).not.toBeNull();
            expect(result!.type).toBe('steps');
            expect(result!.value).toBe(8500); // No conversion
            expect(result!.unit).toBe('steps');
            expect(result!.timestamp).toBe('2023-01-01T10:03:00.000Z');
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
            const malformedData = new TextEncoder().encode('{}');
            const result = NormalizerService.normalizeMeasurement(malformedData);
            expect(result).toBeNull();
        });

        it('should handle mixed valid and invalid measurements', () => {
            const inputData: RawMeasurement[] = [
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
                ];

            let uint8Array = new TextEncoder().encode(JSON.stringify(inputData[0]));
            let result = NormalizerService.normalizeMeasurement(uint8Array);
            expect(result).not.toBeNull();
            expect(result!.type).toBe('temperature');
            expect(result!.value).toBeCloseTo(20, 2);
            expect(result!.unit).toBe('°C');
            expect(result!.timestamp).toBe('2023-01-01T10:00:00.000Z');
            uint8Array = new TextEncoder().encode(JSON.stringify(inputData[1]));
            result = NormalizerService.normalizeMeasurement(uint8Array);
            expect(result).toBeNull();
            uint8Array = new TextEncoder().encode(JSON.stringify(inputData[2]));
            result = NormalizerService.normalizeMeasurement(uint8Array);
            expect(result).not.toBeNull();
            expect(result!.type).toBe('weight');
            expect(result!.value).toBeCloseTo(70, 2);
            expect(result!.unit).toBe('kg');
            expect(result!.timestamp).toBe('2023-01-01T10:02:00.000Z');
        });
    });
});
