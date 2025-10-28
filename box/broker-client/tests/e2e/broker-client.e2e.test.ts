import { jest } from '@jest/globals';
import type { NatsConnection, JetStreamClient, ConnectionOptions } from 'nats';
import * as brokerClient from '../../src/main';
import type {RawMeasurement} from "../../src/type.js";

// Mock NATS module
jest.mock('nats', () => ({
    connect: jest.fn(),
    JSONCodec: jest.fn(() => ({
        encode: jest.fn((data: any) => JSON.stringify(data)),
        decode: jest.fn((data: any) => JSON.parse(data))
    }))
}));

describe('Broker Client E2E Tests', () => {
    let mockNc: jest.Mocked<NatsConnection>;
    let mockJs: jest.Mocked<JetStreamClient>;
    let originalEnv: NodeJS.ProcessEnv;

    beforeAll(() => {
        originalEnv = { ...process.env };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup environment variables
        process.env.NATS_SERVER = 'nats://localhost:4222';
        process.env.BOX_PRODUCER_QUEUE = 'measurements.raw';

        // Create mock NATS connection
        mockJs = {
            // @ts-ignore
            publish: jest.fn().mockResolvedValue(undefined)
        } as any;

        mockNc = {
            // @ts-ignore
            rtt: jest.fn().mockResolvedValue(50),
            // @ts-ignore
            close: jest.fn().mockResolvedValue(undefined),
            jetstream: jest.fn().mockReturnValue(mockJs)
        } as any;

        const { connect } = jest.requireMock('nats');
        connect.mockResolvedValue(mockNc);
    });

    describe('Configuration Management', () => {
        test('should get connection options from environment', () => {
            const options = brokerClient.getConnectionOptions();

            expect(options).toEqual({
                servers: 'nats://localhost:4222'
            });
        });

        test('should throw error when NATS_SERVER is not defined', () => {
            delete process.env.NATS_SERVER;

            expect(() => brokerClient.getConnectionOptions()).toThrow(
                'Veuillez définir la variable d\'environnement NATS_SERVER'
            );
        });

        test('should get publish queue from environment', () => {
            const queue = brokerClient.getPublishQueue();

            expect(queue).toBe('measurements.raw');
        });

        test('should throw error when BOX_PRODUCER_QUEUE is not defined', () => {
            delete process.env.BOX_PRODUCER_QUEUE;

            expect(() => brokerClient.getPublishQueue()).toThrow(
                'Veuillez définir la variable d\'environnement BOX_PRODUCER_QUEUE'
            );
        });
    });

    describe('Broker Health Check', () => {
        test('should return true when broker is healthy', async () => {
            const connectionOptions: ConnectionOptions = { servers: 'nats://localhost:4222' };

            const isHealthy = await brokerClient.checkBrokerHealth(connectionOptions);

            expect(isHealthy).toBe(true);
            expect(mockNc.rtt).toHaveBeenCalled();
            expect(mockNc.close).toHaveBeenCalled();
        });

        test('should return false when broker connection fails', async () => {
            const { connect } = jest.requireMock('nats');
            connect.mockRejectedValue(new Error('Connection failed'));

            const connectionOptions: ConnectionOptions = { servers: 'nats://localhost:4222' };

            const isHealthy = await brokerClient.checkBrokerHealth(connectionOptions);

            expect(isHealthy).toBe(false);
        });

        test('should handle RTT timeout gracefully', async () => {
            mockNc.rtt.mockRejectedValue(new Error('RTT timeout'));

            const connectionOptions: ConnectionOptions = { servers: 'nats://localhost:4222' };

            const isHealthy = await brokerClient.checkBrokerHealth(connectionOptions);

            expect(isHealthy).toBe(false);
        });
    });

    describe('Message Publishing', () => {
        test('should publish measurements successfully', async () => {
            const connectionOptions: ConnectionOptions = { servers: 'nats://localhost:4222' };
            const publishQueue = 'test.queue';
            const measurements: RawMeasurement[] = [
                {
                    type: 'temperature' as const,
                    value: 36.5,
                    unit: '°C',
                    timestamp: '2024-01-01T00:00:00.000Z'
                }
            ];

            await brokerClient.publishMeasurements(connectionOptions, publishQueue, measurements);

            expect(mockJs.publish).toHaveBeenCalledTimes(1);
            expect(mockJs.publish).toHaveBeenCalledWith(
                publishQueue,
                JSON.stringify(measurements[0])
            );
            expect(mockNc.close).toHaveBeenCalled();
        });

        test('should publish multiple measurements in sequence', async () => {
            const connectionOptions: ConnectionOptions = { servers: 'nats://localhost:4222' };
            const publishQueue = 'test.queue';
            const measurements = [
                {
                    type: 'temperature' as const,
                    value: 36.5,
                    unit: '°C',
                    timestamp: '2024-01-01T00:00:00.000Z'
                },
                {
                    type: 'pulse' as const,
                    value: 80,
                    unit: 'bpm',
                    timestamp: '2024-01-01T00:01:00.000Z'
                }
            ];

            await brokerClient.publishMeasurements(connectionOptions, publishQueue, measurements);

            expect(mockJs.publish).toHaveBeenCalledTimes(2);
            measurements.forEach((measurement, index) => {
                expect(mockJs.publish).toHaveBeenNthCalledWith(
                    index + 1,
                    publishQueue,
                    JSON.stringify(measurement)
                );
            });
        });

        test('should handle publish errors gracefully', async () => {
            mockJs.publish.mockRejectedValue(new Error('Publish failed'));

            const connectionOptions: ConnectionOptions = { servers: 'nats://localhost:4222' };
            const publishQueue = 'test.queue';
            const measurements = [
                {
                    type: 'temperature' as const,
                    value: 36.5,
                    unit: '°C',
                    timestamp: '2024-01-01T00:00:00.000Z'
                }
            ];

            await expect(
                brokerClient.publishMeasurements(connectionOptions, publishQueue, measurements)
            ).rejects.toThrow('Publish failed');
        });
    });

    describe('Random Measurement Generation', () => {
        test('should generate list of measurements', () => {
            const measurements = brokerClient.createRandomMeasurementList();

            expect(Array.isArray(measurements)).toBe(true);
            expect(measurements.length).toBe(5);
        });

        test('should generate valid measurement types', () => {
            const measurements = brokerClient.createRandomMeasurementList();
            const validTypes = ['temperature', 'weight', 'pulse'];

            measurements.forEach(measurement => {
                if (!('error' in measurement)) {
                    expect(validTypes).toContain(measurement.type);
                    expect(typeof measurement.value).toBe('number');
                    expect(typeof measurement.unit).toBe('string');
                    expect(typeof measurement.timestamp).toBe('string');
                }
            });
        });

        test('should occasionally generate error measurements', () => {
            // Mock Math.random to force error generation
            const originalRandom = Math.random;
            // @ts-ignore
            Math.random = jest.fn()
                .mockReturnValueOnce(0.1) // First call - generate error
                .mockReturnValueOnce(0.5) // Subsequent calls for normal flow
                .mockReturnValue(0.5);

            const measurements = brokerClient.createRandomMeasurementList();

            const hasError = measurements.some(m => 'error' in m);
            expect(hasError).toBe(true);

            Math.random = originalRandom;
        });
    });

    describe('Complete E2E Flow', () => {
        test('should execute main function successfully', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

            await brokerClient.main();

            expect(mockNc.rtt).toHaveBeenCalled();
            expect(mockJs.publish).toHaveBeenCalled();
            expect(mockNc.close).toHaveBeenCalledTimes(2); // Once for health check, once for publishing

            consoleSpy.mockRestore();
        });

        test('should throw error when broker is unhealthy', async () => {
            const { connect } = jest.requireMock('nats');
            connect.mockRejectedValue(new Error('Connection failed'));

            await expect(brokerClient.main()).rejects.toThrow('Broker NATS not reachable');
        });

        test('should handle missing environment variables in main', async () => {
            delete process.env.NATS_SERVER;

            await expect(brokerClient.main()).rejects.toThrow(
                'Veuillez définir la variable d\'environnement NATS_SERVER'
            );
        });
    });

    describe('Error Handling', () => {
        test('should handle connection cleanup on errors', async () => {
            mockJs.publish.mockRejectedValue(new Error('Network error'));

            const connectionOptions: ConnectionOptions = { servers: 'nats://localhost:4222' };
            const measurements = brokerClient.createRandomMeasurementList();

            await expect(
                brokerClient.publishMeasurements(connectionOptions, 'test.queue', measurements)
            ).rejects.toThrow();

            // Connection should still be established even if publish fails
            expect(mockNc.jetstream).toHaveBeenCalled();
        });
    });
});
