import { EnvService } from '../../src/envService';

describe('EnvService Unit Tests', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('verifyQueueEnvVars', () => {
        it('should not throw when all required queue env vars are set', () => {
            process.env.NORMALIZER_PRODUCER_QUEUE = 'producer.queue';
            process.env.NORMALIZER_CONSUME_QUEUE = 'consume.queue';

            expect(() => EnvService.verifyQueueEnvVars()).not.toThrow();
        });

        it('should throw error when NORMALIZER_PRODUCER_QUEUE is missing', () => {
            delete process.env.NORMALIZER_PRODUCER_QUEUE;
            process.env.NORMALIZER_CONSUME_QUEUE = 'consume.queue';

            expect(() => EnvService.verifyQueueEnvVars()).toThrow(
                'Veuillez définir la variable d\'environnement NORMALIZER_PRODUCER_QUEUE'
            );
        });

        it('should throw error when NORMALIZER_CONSUME_QUEUE is missing', () => {
            process.env.NORMALIZER_PRODUCER_QUEUE = 'producer.queue';
            delete process.env.NORMALIZER_CONSUME_QUEUE;

            expect(() => EnvService.verifyQueueEnvVars()).toThrow(
                'Veuillez définir la variable d\'environnement NORMALIZER_CONSUME_QUEUE'
            );
        });
    });

    describe('getBrokerURL', () => {
        it('should return NATS_SERVER when set', () => {
            process.env.NATS_SERVER = 'nats://localhost:4222';

            expect(EnvService.getBrokerURL()).toBe('nats://localhost:4222');
        });

        it('should throw error when NATS_SERVER is missing', () => {
            delete process.env.NATS_SERVER;

            expect(() => EnvService.getBrokerURL()).toThrow(
                'Veuillez définir la variable d\'environnement NATS_SERVER'
            );
        });
    });

    describe('getNatsSeed', () => {
        it('should return NATS_SEED when set', () => {
            process.env.NATS_SEED = 'test-seed';

            expect(EnvService.getNatsSeed()).toBe('test-seed');
        });

        it('should throw error when NATS_SEED is missing', () => {
            delete process.env.NATS_SEED;

            expect(() => EnvService.getNatsSeed()).toThrow(
                'Veuillez définir la variable d\'environnement NATS_SEED'
            );
        });
    });

    describe('getNatsCAFile', () => {
        it('should return NATS_CA_FILE when set', () => {
            process.env.NATS_CA_FILE = '/path/to/ca.crt';

            expect(EnvService.getNatsCAFile()).toBe('/path/to/ca.crt');
        });

        it('should throw error when NATS_CA_FILE is missing', () => {
            delete process.env.NATS_CA_FILE;

            expect(() => EnvService.getNatsCAFile()).toThrow(
                'Veuillez définir la variable d\'environnement NATS_CA_FILE'
            );
        });
    });

    describe('getConsumeQueue', () => {
        it('should return NORMALIZER_CONSUME_QUEUE when set', () => {
            process.env.NORMALIZER_CONSUME_QUEUE = 'test.consume';

            expect(EnvService.getConsumeQueue()).toBe('test.consume');
        });

        it('should throw error when NORMALIZER_CONSUME_QUEUE is missing', () => {
            delete process.env.NORMALIZER_CONSUME_QUEUE;

            expect(() => EnvService.getConsumeQueue()).toThrow(
                'Veuillez définir la variable d\'environnement NORMALIZER_CONSUME_QUEUE'
            );
        });
    });

    describe('getProducerQueue', () => {
        it('should return NORMALIZER_PRODUCER_QUEUE when set', () => {
            process.env.NORMALIZER_PRODUCER_QUEUE = 'test.producer';

            expect(EnvService.getProducerQueue()).toBe('test.producer');
        });

        it('should throw error when NORMALIZER_PRODUCER_QUEUE is missing', () => {
            delete process.env.NORMALIZER_PRODUCER_QUEUE;

            expect(() => EnvService.getProducerQueue()).toThrow(
                'Veuillez définir la variable d\'environnement NORMALIZER_PRODUCER_QUEUE'
            );
        });
    });
});
