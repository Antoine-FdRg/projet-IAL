import {EnvService} from "../../src/envService";

describe('EnvService', () => {
    beforeEach(() => {
        process.env = {
            ...process.env,
            NATS_SERVER: 'nats://localhost:4222',
            NATS_SEED: 'seed123',
            NATS_CA_FILE: '/path/to/ca',
            OUTLIER_FILTER_PRODUCER_QUEUE: 'queue1,queue2',
            OUTLIER_FILTER_CONSUME_QUEUE: 'queue.consume',
            POULS_MAX: '200',
            TEMPERATURE_MIN: '10',
            TEMPERATURE_MAX: '40',
            POIDS_MIN: '20',
            POIDS_MAX: '200',
        };
    });

    test('should return broker URL', () => {
        expect(EnvService.getBrokerURL()).toBe('nats://localhost:4222');
    });

    test('should return producer queue as array', () => {
        expect(EnvService.getProducerQueue()).toEqual(['queue1', 'queue2']);
    });

    test('should throw error if missing NATS_SERVER', () => {
        delete process.env.NATS_SERVER;
        expect(() => EnvService.getBrokerURL()).toThrow();
    });

    test('should return NATS seed', () => {
        expect(EnvService.getNatsSeed()).toBe('seed123');
    });

    test('should return NATS CA file', () => {
        expect(EnvService.getNatsCAFile()).toBe('/path/to/ca');
    });

    test('should return consume queue', () => {
        expect(EnvService.getConsumeQueue()).toBe('queue.consume');
    });

    test('should return pouls max', () => {
        expect(EnvService.getPulseMax()).toBe(200);
    });

    test('should return temperature min', () => {
        expect(EnvService.getTemperatureMin()).toBe(10);
    });

    test('should return temperature max', () => {
        expect(EnvService.getTemperatureMax()).toBe(40);
    });

    test('should return poids min', () => {
        expect(EnvService.getWeightMin()).toBe(20);
    });

    test('should return poids max', () => {
        expect(EnvService.getWeightMax()).toBe(200);
    });

    test('should throw error if missing NATS_SEED', () => {
        delete process.env.NATS_SEED;
        expect(() => EnvService.getNatsSeed()).toThrow();
    });

    test('should throw error if missing NATS_CA_FILE', () => {
        delete process.env.NATS_CA_FILE;
        expect(() => EnvService.getNatsCAFile()).toThrow();
    });

    test('should throw error if missing OUTLIER_FILTER_PRODUCER_QUEUE', () => {
        delete process.env.OUTLIER_FILTER_PRODUCER_QUEUE;
        expect(() => EnvService.getProducerQueue()).toThrow();
    });

    test('should throw error if missing OUTLIER_FILTER_CONSUME_QUEUE', () => {
        delete process.env.OUTLIER_FILTER_CONSUME_QUEUE;
        expect(() => EnvService.getConsumeQueue()).toThrow();
    });

    test('should throw error if missing POULS_MAX', () => {
        delete process.env.POULS_MAX;
        expect(() => EnvService.getPulseMax()).toThrow();
    });

    test('should throw error if missing TEMPERATURE_MIN', () => {
        delete process.env.TEMPERATURE_MIN;
        expect(() => EnvService.getTemperatureMin()).toThrow();
    });

    test('should throw error if missing TEMPERATURE_MAX', () => {
        delete process.env.TEMPERATURE_MAX;
        expect(() => EnvService.getTemperatureMax()).toThrow();
    });

    test('should throw error if missing POIDS_MIN', () => {
        delete process.env.POIDS_MIN;
        expect(() => EnvService.getWeightMin()).toThrow();
    });

    test('should throw error if missing POIDS_MAX', () => {
        delete process.env.POIDS_MAX;
        expect(() => EnvService.getWeightMax()).toThrow();
    });

    test('should verify queue environment variables without throwing', () => {
        expect(() => EnvService.verifyQueueEnvVars()).not.toThrow();
    });

    test('should throw error when verifying queue env vars if missing OUTLIER_FILTER_PRODUCER_QUEUE', () => {
        delete process.env.OUTLIER_FILTER_PRODUCER_QUEUE;
        expect(() => EnvService.verifyQueueEnvVars()).toThrow();
    });

    test('should throw error when verifying queue env vars if missing OUTLIER_FILTER_CONSUME_QUEUE', () => {
        delete process.env.OUTLIER_FILTER_CONSUME_QUEUE;
        expect(() => EnvService.verifyQueueEnvVars()).toThrow();
    });

});
