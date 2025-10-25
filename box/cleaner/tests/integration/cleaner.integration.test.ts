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
            const inputData = {
                boxId: 'integration-box-123',
                dataList: [
                    { type: 'temperature', value: 22.5, unit: '°C', timestamp: '2023-01-01T10:00:00Z' },
                    { type: 'invalid', value: 'bad', unit: 'unknown', timestamp: '' },
                    { type: 'pulse', value: 75, unit: 'bpm', timestamp: '2023-01-01T10:01:00Z' },
                    { type: 'weight', value: 68.2, unit: 'kg', timestamp: '2023-01-01T10:02:00Z' }
                ]
            };

            const encodedData = new TextEncoder().encode(JSON.stringify(inputData));
            const result = CleanService.cleanMeasurementList(encodedData);

            expect(result).not.toBeNull();
            expect(result?.boxId).toBe('integration-box-123');
            expect(result?.dataList).toHaveLength(3);

            const types = result?.dataList.map(m => m.type);
            expect(types).toContain('temperature');
            expect(types).toContain('pulse');
            expect(types).toContain('weight');
            expect(types).not.toContain('invalid');
        });

        it('should handle environment configuration validation', () => {
            expect(() => EnvService.verifyQueueEnvVars()).not.toThrow();
            expect(EnvService.getConsumeQueue()).toBe('test.consumer');
            expect(EnvService.getProducerQueue()).toBe('test.producer');
        });
    });
});
