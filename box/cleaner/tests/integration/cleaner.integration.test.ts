import { CleanService } from '../../src/cleanService';
import { EnvService } from '../../src/envService';
import { BrokerService } from '../../src/brokerService';

describe('Cleaner Pipeline Integration Tests', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
        process.env.CLEANER_PRODUCER_QUEUE = 'test.producer';
        process.env.CLEANER_CONSUME_QUEUE = 'test.consumer';
        process.env.NATS_SERVER = 'http://localhost:4222';
        process.env.NATS_SEED = 'test-seed';
        process.env.NATS_CA_FILE = '/path/to/ca.crt';
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('Service Integration', () => {
        it('should integrate EnvService and BrokerService for dev environment', () => {
            process.env.NATS_SERVER = 'http://localhost:4222';

            const connectionOptions = BrokerService.getConnectionOptions();

            expect(connectionOptions.servers).toBe('http://localhost:4222');
            expect(connectionOptions.tls).toBeUndefined();
        });

        it('should process complete data flow through CleanService', () => {
            const inputData = [
                    { type: 'temperature', value: 22.5, unit: '°C', timestamp: '2023-01-01T10:00:00Z' },
                    { type: 'invalid', value: 'bad', unit: 'unknown', timestamp: '' },
                    { type: 'pulse', value: 75, unit: 'bpm', timestamp: '2023-01-01T10:01:00Z' },
                    { type: 'weight', value: 68.2, unit: 'kg', timestamp: '2023-01-01T10:02:00Z' }
                ];

            let encodedData = new TextEncoder().encode(JSON.stringify(inputData[0]));
            let result = CleanService.cleanMeasurement(encodedData);

            expect(result).not.toBeNull();
            expect(result!.type).toBe('temperature');
            expect(result!.value).toBe(22.5);
            expect(result!.unit).toBe('°C');
            expect(result!.timestamp).toBe('2023-01-01T10:00:00Z');

            encodedData = new TextEncoder().encode(JSON.stringify(inputData[1]));
            result = CleanService.cleanMeasurement(encodedData);
            expect(result).toBeNull();

            encodedData = new TextEncoder().encode(JSON.stringify(inputData[2]));
            result = CleanService.cleanMeasurement(encodedData);
            expect(result).not.toBeNull();
            expect(result!.type).toBe('pulse');
            expect(result!.value).toBe(75);
            expect(result!.unit).toBe('bpm');
            expect(result!.timestamp).toBe('2023-01-01T10:01:00Z');

            encodedData = new TextEncoder().encode(JSON.stringify(inputData[3]));
            result = CleanService.cleanMeasurement(encodedData);
            expect(result).not.toBeNull();
            expect(result!.type).toBe('weight');
            expect(result!.value).toBe(68.2);
            expect(result!.unit).toBe('kg');
            expect(result!.timestamp).toBe('2023-01-01T10:02:00Z');
        });

        it('should handle environment configuration validation', () => {
            expect(() => EnvService.verifyQueueEnvVars()).not.toThrow();
            expect(EnvService.getConsumeQueue()).toBe('test.consumer');
            expect(EnvService.getProducerQueue()).toBe('test.producer');
        });
    });
});
