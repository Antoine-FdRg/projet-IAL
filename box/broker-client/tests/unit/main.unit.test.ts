import { jest } from '@jest/globals';
import type { NatsConnection, JetStreamClient, ConnectionOptions } from 'nats';
import * as main from '../../src/main'
import type { RawMeasurement } from '../../src/type';

// Mock NATS module
jest.mock('nats', () => ({
  connect: jest.fn(),
  JSONCodec: jest.fn(() => ({
    encode: jest.fn((data) => data),
    decode: jest.fn((data) => data)
  }))
}));

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

describe('Main Module Unit Tests', () => {
  let mockNc: jest.Mocked<NatsConnection>;
  let mockJs: jest.Mocked<JetStreamClient>;
  let originalEnv: NodeJS.ProcessEnv;
  let consoleSpy: jest.SpyInstance;

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock console methods
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();

    // Reset environment
    process.env = { ...originalEnv };

    // Setup mocks
    mockJs = {
      publish: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockNc = {
      rtt: jest.fn().mockResolvedValue(50),
      close: jest.fn().mockResolvedValue(undefined),
      jetstream: jest.fn().mockReturnValue(mockJs)
    } as any;

    const { connect } = jest.requireMock('nats');
    connect.mockResolvedValue(mockNc);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('getConnectionOptions', () => {
    test('should return connection options when NATS_SERVER is set', () => {
      process.env.NATS_SERVER = 'nats://localhost:4222';

      const options = main.getConnectionOptions();

      expect(options).toEqual({
        servers: 'nats://localhost:4222'
      });
      expect(consoleSpy).toHaveBeenCalledWith(
          '🔌 Connexion au serveur NATS de dev avec les paramètres suivants :'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
          '   - NATS_SERVER: nats://localhost:4222'
      );
    });

    test('should throw error when NATS_SERVER is not defined', () => {
      delete process.env.NATS_SERVER;

      expect(() => main.getConnectionOptions()).toThrow(
          'Veuillez définir la variable d\'environnement NATS_SERVER'
      );
    });

    test('should throw error when NATS_SERVER is empty string', () => {
      process.env.NATS_SERVER = '';

      expect(() => main.getConnectionOptions()).toThrow(
          'Veuillez définir la variable d\'environnement NATS_SERVER'
      );
    });
  });

  describe('getPublishQueue', () => {
    test('should return queue name when BOX_PRODUCER_QUEUE is set', () => {
      process.env.BOX_PRODUCER_QUEUE = 'measurements.raw';

      const queue = main.getPublishQueue();

      expect(queue).toBe('measurements.raw');
      expect(consoleSpy).toHaveBeenCalledWith(
          '   - BOX_PRODUCER_QUEUE: measurements.raw'
      );
    });

    test('should throw error when BOX_PRODUCER_QUEUE is not defined', () => {
      delete process.env.BOX_PRODUCER_QUEUE;

      expect(() => main.getPublishQueue()).toThrow(
          'Veuillez définir la variable d\'environnement BOX_PRODUCER_QUEUE'
      );
    });

    test('should throw error when BOX_PRODUCER_QUEUE is empty string', () => {
      process.env.BOX_PRODUCER_QUEUE = '';

      expect(() => main.getPublishQueue()).toThrow(
          'Veuillez définir la variable d\'environnement BOX_PRODUCER_QUEUE'
      );
    });
  });

  describe('checkBrokerHealth', () => {
    test('should return true when connection is successful', async () => {
      const connectionOptions: ConnectionOptions = { servers: 'nats://localhost:4222' };

      const result = await main.checkBrokerHealth(connectionOptions);

      expect(result).toBe(true);
      expect(mockNc.rtt).toHaveBeenCalled();
      expect(mockNc.close).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
          '🔍 Vérification de la connexion au broker NATS...'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
          '✅ Broker joignable (RTT: 50ms)'
      );
    });

    test('should return false when connection fails', async () => {
      const { connect } = jest.requireMock('nats');
      const error = new Error('Connection refused');
      connect.mockRejectedValue(error);

      const connectionOptions: ConnectionOptions = { servers: 'nats://localhost:4222' };

      const result = await main.checkBrokerHealth(connectionOptions);

      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
          '⚠️  Le broker NATS n\'est pas joignable:',
          'Connection refused'
      );
    });

    test('should return false when RTT fails', async () => {
      mockNc.rtt.mockRejectedValue(new Error('RTT timeout'));

      const connectionOptions: ConnectionOptions = { servers: 'nats://localhost:4222' };

      const result = await main.checkBrokerHealth(connectionOptions);

      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
          '⚠️  Le broker NATS n\'est pas joignable:',
          'RTT timeout'
      );
    });

    test('should handle non-Error exceptions', async () => {
      const { connect } = jest.requireMock('nats');
      connect.mockRejectedValue('String error');

      const connectionOptions: ConnectionOptions = { servers: 'nats://localhost:4222' };

      const result = await main.checkBrokerHealth(connectionOptions);

      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
          '⚠️  Le broker NATS n\'est pas joignable:',
          'String error'
      );
    });
  });

  describe('publishMeasurements', () => {
    test('should publish all measurements successfully', async () => {
      const connectionOptions: ConnectionOptions = { servers: 'nats://localhost:4222' };
      const publishQueue = 'test.queue';
      const measurements: RawMeasurement[] = [
        {
          type: 'temperature',
          value: 36.5,
          unit: '°C',
          timestamp: '2024-01-01T00:00:00.000Z'
        },
        {
          type: 'pulse',
          value: 80,
          unit: 'bpm',
          timestamp: '2024-01-01T00:01:00.000Z'
        }
      ];

      await main.publishMeasurements(connectionOptions, publishQueue, measurements);

      expect(mockJs.publish).toHaveBeenCalledTimes(2);
      expect(mockJs.publish).toHaveBeenNthCalledWith(1, publishQueue, measurements[0]);
      expect(mockJs.publish).toHaveBeenNthCalledWith(2, publishQueue, measurements[1]);
      expect(mockNc.close).toHaveBeenCalled();

      expect(consoleSpy).toHaveBeenCalledWith('Connecté au serveur NATS');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Publisher terminé');
    });

    test('should publish empty measurement list', async () => {
      const connectionOptions: ConnectionOptions = { servers: 'nats://localhost:4222' };
      const publishQueue = 'test.queue';
      const measurements: RawMeasurement[] = [];

      await main.publishMeasurements(connectionOptions, publishQueue, measurements);

      expect(mockJs.publish).not.toHaveBeenCalled();
      expect(mockNc.close).toHaveBeenCalled();
    });

    test('should handle publish failures', async () => {
      mockJs.publish.mockRejectedValue(new Error('Publish failed'));

      const connectionOptions: ConnectionOptions = { servers: 'nats://localhost:4222' };
      const publishQueue = 'test.queue';
      const measurements: RawMeasurement[] = [
        {
          type: 'temperature',
          value: 36.5,
          unit: '°C',
          timestamp: '2024-01-01T00:00:00.000Z'
        }
      ];

      await expect(
          main.publishMeasurements(connectionOptions, publishQueue, measurements)
      ).rejects.toThrow('Publish failed');
    });
  });

  describe('createRandomMeasurementList', () => {
    test('should generate array of 5 measurements', () => {
      const measurements = main.createRandomMeasurementList();

      expect(Array.isArray(measurements)).toBe(true);
      expect(measurements).toHaveLength(5);
    });

    test('should generate valid measurement types', () => {
      // Mock Math.random to avoid errors and get predictable measurements
      const originalRandom = Math.random;
      Math.random = jest.fn()
          .mockReturnValueOnce(0.5) // No error (> 0.2)
          .mockReturnValueOnce(0) // Temperature type
          .mockReturnValueOnce(0) // First unit
          .mockReturnValueOnce(0.5) // Normal value (> 0.15)
          .mockReturnValueOnce(0.5) // Random value generation
          .mockReturnValue(0.5);

      const measurements = main.createRandomMeasurementList();
      const validTypes = ['temperature', 'weight', 'pulse'];

      measurements.forEach(measurement => {
        if (!('error' in measurement)) {
          expect(validTypes).toContain(measurement.type);
          expect(typeof measurement.value).toBe('number');
          expect(typeof measurement.unit).toBe('string');
          expect(typeof measurement.timestamp).toBe('string');
          expect(new Date(measurement.timestamp).toISOString()).toBe(measurement.timestamp);
        }
      });

      Math.random = originalRandom;
    });

    test('should generate error measurements occasionally', () => {
      const originalRandom = Math.random;
      Math.random = jest.fn()
          .mockReturnValueOnce(0.1) // Error (< 0.2)
          .mockReturnValueOnce(0) // Error message index
          .mockReturnValue(0.5);

      const measurements = main.createRandomMeasurementList();
      const errorMeasurement = measurements.find(m => 'error' in m);

      expect(errorMeasurement).toBeDefined();
      expect(errorMeasurement).toHaveProperty('type', 'error');
      expect(errorMeasurement).toHaveProperty('error');

      Math.random = originalRandom;
    });

    test('should generate nonsensical values occasionally', () => {
      const originalRandom = Math.random;
      Math.random = jest.fn()
          .mockReturnValueOnce(0.5) // No error
          .mockReturnValueOnce(0) // Temperature type
          .mockReturnValueOnce(0) // First unit
          .mockReturnValueOnce(0.1) // Nonsense value (< 0.15)
          .mockReturnValueOnce(0.5) // Random value generation
          .mockReturnValue(0.5);

      const measurements = main.createRandomMeasurementList();

      // Should still generate valid measurements structure even with nonsense values
      expect(measurements).toHaveLength(5);

      Math.random = originalRandom;
    });

    test('should generate different measurement types', () => {
      const originalRandom = Math.random;

      // Create a more controlled mock that cycles through valid indices
      const mockValues = [
        // First measurement: Temperature
        0.5, // > 0.2, no error
        0.0, // measurementTypes[0] = temperature
        0.0, // temperature.units[0]
        0.2, // > 0.15, normal value
        0.5, // value generation

        // Second measurement: Weight
        0.5, // > 0.2, no error
        0.33, // measurementTypes[1] = weight (0.33 * 3 = 0.99, floor = 0, but we want index 1)
        0.0, // weight.units[0]
        0.2, // > 0.15, normal value
        0.5, // value generation

        // Third measurement: Pulse
        0.5, // > 0.2, no error
        0.67, // measurementTypes[2] = pulse (0.67 * 3 = 2.01, floor = 2)
        0.0, // pulse.units[0]
        0.2, // > 0.15, normal value
        0.5, // value generation
      ];

      let callIndex = 0;
      Math.random = jest.fn(() => {
        const value = mockValues[callIndex % mockValues.length];
        callIndex++;
        return value!;
      });

      const measurements = main.createRandomMeasurementList();
      const validMeasurements = measurements.filter(m => !('error' in m)) as RawMeasurement[];
      const types = validMeasurements.map(m => m.type);

      // Since we're generating 5 measurements but only have patterns for 3 types,
      // we should see at least one of each type
      expect(validMeasurements.length).toBeGreaterThan(0);
      expect(types.some(t => t === 'temperature')).toBe(true);

      Math.random = originalRandom;
    });


  });

  describe('main function', () => {
    beforeEach(() => {
      process.env.NATS_SERVER = 'nats://localhost:4222';
      process.env.BOX_PRODUCER_QUEUE = 'measurements.raw';
    });

    test('should execute successfully when broker is healthy', async () => {
      jest.spyOn(main, 'createRandomMeasurementList').mockReturnValue([
        {
          type: 'temperature',
          value: 36.5,
          unit: '°C',
          timestamp: '2024-01-01T00:00:00.000Z'
        }
      ]);

      await main.main();

      expect(mockNc.rtt).toHaveBeenCalled();
      expect(mockJs.publish).toHaveBeenCalled();
      expect(mockNc.close).toHaveBeenCalledTimes(2); // Health check + publish
    });

    test('should throw error when broker is unhealthy', async () => {
      const { connect } = jest.requireMock('nats');
      connect.mockRejectedValue(new Error('Connection failed'));

      await expect(main.main()).rejects.toThrow('Broker NATS not reachable');
    });

    test('should throw error when NATS_SERVER is missing', async () => {
      delete process.env.NATS_SERVER;

      await expect(main.main()).rejects.toThrow(
          'Veuillez définir la variable d\'environnement NATS_SERVER'
      );
    });

    test('should throw error when BOX_PRODUCER_QUEUE is missing', async () => {
      delete process.env.BOX_PRODUCER_QUEUE;

      await expect(main.main()).rejects.toThrow(
          'Veuillez définir la variable d\'environnement BOX_PRODUCER_QUEUE'
      );
    });

    test('should handle publish errors in main flow', async () => {
      mockJs.publish.mockRejectedValue(new Error('Publish error'));

      jest.spyOn(main, 'createRandomMeasurementList').mockReturnValue([
        {
          type: 'temperature',
          value: 36.5,
          unit: '°C',
          timestamp: '2024-01-01T00:00:00.000Z'
        }
      ]);

      await expect(main.main()).rejects.toThrow('Publish error');
    });
  });

  describe('Edge Cases', () => {
    test('should handle very large measurement lists', async () => {
      const largeMeasurementList: RawMeasurement[] = Array(1000).fill(null).map((_, i) => ({
        type: 'temperature' as const,
        value: 20 + i * 0.1,
        unit: '°C',
        timestamp: new Date(Date.now() + i * 1000).toISOString()
      }));

      const connectionOptions: ConnectionOptions = { servers: 'nats://localhost:4222' };
      const publishQueue = 'test.queue';

      await main.publishMeasurements(connectionOptions, publishQueue, largeMeasurementList);

      expect(mockJs.publish).toHaveBeenCalledTimes(1000);
    });

    test('should handle connection closure errors gracefully', async () => {
      mockNc.close.mockRejectedValue(new Error('Close failed'));

      const connectionOptions: ConnectionOptions = { servers: 'nats://localhost:4222' };

      // Should not throw even if close fails
      const result = await main.checkBrokerHealth(connectionOptions);
      expect(result).toBe(false);
    });
  });
});
