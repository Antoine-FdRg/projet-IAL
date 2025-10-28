import { jest, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { connect, type NatsConnection, type JetStreamManager, type ConnectionOptions } from 'nats';
import {
  getConnectionOptions,
  getPublishQueue,
  checkBrokerHealth,
  createRandomMeasurementList,
  publishMeasurements,
  main
} from '../../src/main.js';
import type { RawMeasurement } from '../../src/type.js';

describe('Broker Client Integration Tests', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let connection: NatsConnection | null = null;
  let jsm: JetStreamManager | null = null;
  const testStreamName = 'TEST_MEASUREMENTS';
  const testSubject = 'test.measurements';

  beforeAll(async () => {
    originalEnv = { ...process.env };
    
    // Set up test environment
    process.env.NATS_SERVER = 'nats://localhost:4222';
    process.env.BOX_PRODUCER_QUEUE = testSubject;

    // Try to connect to NATS server for integration tests
    try {
      const connectionOptions = getConnectionOptions();
      connection = await connect(connectionOptions);
      jsm = await connection.jetstreamManager();

      // Create a test stream if it doesn't exist
      try {
        await jsm.streams.add({
          name: testStreamName,
          subjects: [testSubject],
          max_msgs: 1000,
          max_age: 24 * 60 * 60 * 1000000000, // 24 hours in nanoseconds
        });
      } catch (error: any) {
        // Stream might already exist, which is fine
        if (!error.message?.includes('stream name already in use')) {
          throw error;
        }
      }
    } catch (error) {
      console.warn('NATS server not available for integration tests:', error);
      console.warn('Skipping integration tests. To run them, ensure NATS server is running on localhost:4222');
    }
  });

  afterAll(async () => {
    process.env = originalEnv;
    
    if (connection && jsm) {
      try {
        // Clean up test stream
        await jsm.streams.delete(testStreamName);
      } catch (error) {
        // Ignore cleanup errors
      }
      await connection.close();
    }
  });

  beforeEach(() => {
    // Skip tests if no connection available
    if (!connection) {
      console.warn('Skipping integration test - NATS server not available');
    }
  });

  describe('NATS Connection Integration', () => {
    it('should successfully connect to NATS server', async () => {
      if (!connection) {
        console.warn('Skipping test - NATS server not available');
        return;
      }

      const connectionOptions = getConnectionOptions();
      const isHealthy = await checkBrokerHealth(connectionOptions);
      
      expect(isHealthy).toBe(true);
    });

    it('should fail gracefully when connecting to invalid server', async () => {
      const invalidOptions: ConnectionOptions = {
        servers: 'nats://invalid-server:4222'
      };
      
      const isHealthy = await checkBrokerHealth(invalidOptions);
      
      expect(isHealthy).toBe(false);
    });
  });

  describe('Message Publishing Integration', () => {
    it('should publish measurement list to NATS JetStream', async () => {
      if (!connection) {
        console.warn('Skipping test - NATS server not available');
        return;
      }

      const connectionOptions = getConnectionOptions();
      const publishQueue = getPublishQueue();
      
      const testMeasurementList: RawMeasurement[] = [
          {
            type: 'temperature',
            value: 23.5,
            unit: '°C',
            timestamp: new Date().toISOString()
          },
          {
            type: 'pulse',
            value: 75,
            unit: 'bpm',
            timestamp: new Date().toISOString()
          }
        ];

      // Publish measurements
      await expect(
        publishMeasurements(connectionOptions, publishQueue, testMeasurementList)
      ).resolves.not.toThrow();

      // Verify messages were published by consuming them
      const js = connection.jetstream();
      const consumer = await js.consumers.get(testStreamName);
      
      let messageCount = 0;
      const messages: any[] = [];
      
      // Consume messages with timeout
      const consumePromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for messages'));
        }, 5000);

        const consumeMessages = async () => {
          try {
            const iter = await consumer.consume({ max_messages: testMeasurementList.length });
            for await (const msg of iter) {
              const data = JSON.parse(msg.data.toString());
              messages.push(data);
              messageCount++;
              msg.ack();
              
              if (messageCount >= testMeasurementList.length) {
                clearTimeout(timeout);
                resolve();
                break;
              }
            }
          } catch (error) {
            clearTimeout(timeout);
            reject(error);
          }
        };

        consumeMessages();
      });

      await consumePromise;

      expect(messageCount).toBe(testMeasurementList.length);
      expect(messages).toHaveLength(testMeasurementList.length);
      
      // Verify message content
      messages.forEach((message, index) => {
        const expectedMeasurement = testMeasurementList[index];
        expect(message.type).toBe(expectedMeasurement?.type);
        expect(message.value).toBe(expectedMeasurement?.value);
        expect(message.unit).toBe(expectedMeasurement?.unit);
        expect(message.timestamp).toBe(expectedMeasurement?.timestamp);
      });
    });

    it('should handle empty measurement list', async () => {
      if (!connection) {
        console.warn('Skipping test - NATS server not available');
        return;
      }

      const connectionOptions = getConnectionOptions();
      const publishQueue = getPublishQueue();
      
      const emptyMeasurementList = []

      await expect(
        publishMeasurements(connectionOptions, publishQueue, emptyMeasurementList)
      ).resolves.not.toThrow();
    });

    it('should handle random measurement generation and publishing', async () => {
      if (!connection) {
        console.warn('Skipping test - NATS server not available');
        return;
      }

      const connectionOptions = getConnectionOptions();
      const publishQueue = getPublishQueue();
      
      // Generate random measurements
      const randomMeasurementList: RawMeasurement[] = createRandomMeasurementList();
      
      expect(randomMeasurementList).toHaveLength(5);

      // Publish the random measurements
      await expect(
        publishMeasurements(connectionOptions, publishQueue, randomMeasurementList)
      ).resolves.not.toThrow();
    });
  });

  describe('Environment Configuration Integration', () => {
    it('should work with default test environment variables', () => {
      expect(() => getConnectionOptions()).not.toThrow();
      expect(() => getPublishQueue()).not.toThrow();
      
      const options = getConnectionOptions();
      const queue = getPublishQueue();
      
      expect(options.servers).toBe('nats://localhost:4222');
      expect(queue).toBe(testSubject);
    });

    it('should handle different NATS server configurations', async () => {
      const testConfigs = [
        'nats://localhost:4222',
        'nats://127.0.0.1:4222',
        'nats://localhost:4222,nats://localhost:4223' // Multiple servers
      ];

      for (const serverConfig of testConfigs) {
        process.env.NATS_SERVER = serverConfig;
        
        const options = getConnectionOptions();
        expect(options.servers).toBe(serverConfig);
      }
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle connection failures gracefully', async () => {
      const invalidOptions: ConnectionOptions = {
        servers: 'nats://nonexistent-server:9999'
      };
      const publishQueue = 'test.queue';
      const measurementList: RawMeasurement[] = [
          {
          type: 'temperature',
          value: 20,
          unit: '°C',
          timestamp: new Date().toISOString()
        }
      ];

      await expect(
        publishMeasurements(invalidOptions, publishQueue, measurementList)
      ).rejects.toThrow();
    });

    it('should handle invalid queue names', async () => {
      if (!connection) {
        console.warn('Skipping test - NATS server not available');
        return;
      }

      const connectionOptions = getConnectionOptions();
      const invalidQueue = ''; // Empty queue name
      const measurementList: RawMeasurement[] = [
          {
          type: 'temperature',
          value: 20,
          unit: '°C',
          timestamp: new Date().toISOString()
        }
      ];

      await expect(
        publishMeasurements(connectionOptions, invalidQueue, measurementList)
      ).rejects.toThrow();
    });
  });
});