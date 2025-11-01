import {EnvService} from "../../src/envService";

describe('EnvService', () => {
    beforeEach(() => {
        process.env = {
            ...process.env,
            NATS_SERVER: 'nats://localhost:4222',
            NATS_SEED: 'seed123',
            NATS_CA_FILE: '/path/to/ca',
            OUTLIER_FILTER_CONSUME_QUEUE: 'queue.consume',
            POULS_MAX: '250',
            POULS_MIN: '0',
            TEMPERATURE_MIN: '32',
            TEMPERATURE_MAX: '42',
            POIDS_MIN: '15',
            POIDS_MAX: '500',
            STEPS_MIN: '0',
            MONGO_HOST: 'localhost',
            MONGO_PORT: '27017',
            MONGO_USERNAME: 'test_user',
            MONGO_PASSWORD: 'test_password',
            MONGO_DATABASE: 'test_db'
        };
    });

    test('should return broker URL', () => {
        expect(EnvService.getBrokerURL()).toBe('nats://localhost:4222');
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
        expect(EnvService.getPulseMax()).toBe(250);
    });

    test('should return pouls min', () => {
        expect(EnvService.getPulseMin()).toBe(0);
    });

    test('should return temperature min', () => {
        expect(EnvService.getTemperatureMin()).toBe(32);
    });

    test('should return temperature max', () => {
        expect(EnvService.getTemperatureMax()).toBe(42);
    });

    test('should return poids min', () => {
        expect(EnvService.getWeightMin()).toBe(15);
    });

    test('should return poids max', () => {
        expect(EnvService.getWeightMax()).toBe(500);
    });

    test('should return steps min', () => {
        expect(EnvService.getStepsMin()).toBe(0);
    });

    test('should throw error if missing NATS_SEED', () => {
        delete process.env.NATS_SEED;
        expect(() => EnvService.getNatsSeed()).toThrow();
    });

    test('should throw error if missing NATS_CA_FILE', () => {
        delete process.env.NATS_CA_FILE;
        expect(() => EnvService.getNatsCAFile()).toThrow();
    });

    test('should throw error if missing OUTLIER_FILTER_CONSUME_QUEUE', () => {
        delete process.env.OUTLIER_FILTER_CONSUME_QUEUE;
        expect(() => EnvService.getConsumeQueue()).toThrow();
    });

    test('should throw error if missing POULS_MAX', () => {
        delete process.env.POULS_MAX;
        expect(() => EnvService.getPulseMax()).toThrow();
    });

    test('should throw error if missing POULS_MIN', () => {
        delete process.env.POULS_MIN;
        expect(() => EnvService.getPulseMin()).toThrow();
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

    test('should throw error if missing STEPS_MIN', () => {
        delete process.env.STEPS_MIN;
        expect(() => EnvService.getStepsMin()).toThrow();
    });

    test('should verify queue environment variables without throwing', () => {
        expect(() => EnvService.verifyQueueEnvVars()).not.toThrow();
    });

    test('should throw error when verifying queue env vars if missing OUTLIER_FILTER_CONSUME_QUEUE', () => {
        delete process.env.OUTLIER_FILTER_CONSUME_QUEUE;
        expect(() => EnvService.verifyQueueEnvVars()).toThrow();
    });

    // MongoDB environment variable tests
    test('should return MongoDB host', () => {
        expect(EnvService.getMongoHost()).toBe('localhost');
    });

    test('should throw error if missing MONGO_HOST', () => {
        delete process.env.MONGO_HOST;
        expect(() => EnvService.getMongoHost()).toThrow();
    });

    test('should return MongoDB port', () => {
        expect(EnvService.getMongoPort()).toBe('27017');
    });

    test('should throw error if missing MONGO_PORT', () => {
        delete process.env.MONGO_PORT;
        expect(() => EnvService.getMongoPort()).toThrow();
    });

    test('should return MongoDB username', () => {
        expect(EnvService.getMongoUsername()).toBe('test_user');
    });

    test('should throw error if missing MONGO_USERNAME', () => {
        delete process.env.MONGO_USERNAME;
        expect(() => EnvService.getMongoUsername()).toThrow();
    });

    test('should return MongoDB password', () => {
        expect(EnvService.getMongoPassword()).toBe('test_password');
    });

    test('should throw error if missing MONGO_PASSWORD', () => {
        delete process.env.MONGO_PASSWORD;
        expect(() => EnvService.getMongoPassword()).toThrow();
    });

    test('should return MongoDB database', () => {
        expect(EnvService.getMongoDatabase()).toBe('test_db');
    });

    test('should throw error if missing MONGO_DATABASE', () => {
        delete process.env.MONGO_DATABASE;
        expect(() => EnvService.getMongoDatabase()).toThrow();
    });

});
