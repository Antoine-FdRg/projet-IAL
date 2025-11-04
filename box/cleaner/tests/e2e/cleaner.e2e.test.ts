import {CleanService} from '../../src/cleanService';
import {BrokerService} from '../../src/brokerService';
import {EnvService} from '../../src/envService';

// Mock the entire nats module
jest.mock('nats', () => ({
    connect: jest.fn(),
    consumerOpts: jest.fn(),
    JSONCodec: jest.fn(),
}));

describe('Cleaner Pipeline E2E Tests', () => {
    const originalEnv = process.env;
    let mockConnection: any;
    let mockJetstream: any;
    let mockSubscription: any;
    let mockMessage: any;

    beforeAll(() => {
        process.env = {...originalEnv};
        process.env.NATS_SERVER = 'http://localhost:4222';
        process.env.CLEANER_CONSUME_QUEUE = 'test.e2e.input';
        process.env.CLEANER_PRODUCER_QUEUE = 'test.e2e.output';

        // Setup mocks
        const {connect, consumerOpts, JSONCodec} = require('nats');

        mockMessage = {
            data: new TextEncoder().encode(JSON.stringify({
                type: 'temperature',
                value: 23.5,
                unit: '°C',
                timestamp: '2023-01-01T12:00:00Z'
            })),
            ack: jest.fn(),
        };

        mockSubscription = {
            unsubscribe: jest.fn(),
            [Symbol.asyncIterator]: jest.fn().mockImplementation(async function* () {
                yield mockMessage;
            }),
        };

        mockJetstream = {
            publish: jest.fn().mockResolvedValue(undefined),
            subscribe: jest.fn().mockResolvedValue(mockSubscription),
        };

        mockConnection = {
            jetstream: jest.fn().mockReturnValue(mockJetstream),
            close: jest.fn().mockResolvedValue(undefined),
            getServer: jest.fn().mockReturnValue('localhost:4222'),
        };

        connect.mockResolvedValue(mockConnection);
        consumerOpts.mockImplementation(() => ({
            durable: jest.fn(),
            manualAck: jest.fn(),
            ackExplicit: jest.fn(),
            deliverTo: jest.fn(),
        }));
        JSONCodec.mockReturnValue({
            encode: jest.fn().mockImplementation((data) => new TextEncoder().encode(JSON.stringify(data))),
            decode: jest.fn().mockImplementation((data) => JSON.parse(new TextDecoder().decode(data))),
        });
    });

    afterAll(() => {
        process.env = originalEnv;
        jest.resetAllMocks();
    });

    describe('Complete Pipeline Flow', () => {
        it('should process messages end-to-end with mocked NATS', async () => {
            const {connect, JSONCodec} = require('nats');

            const nc = await connect({servers: 'http://localhost:4222'});
            const js = nc.jetstream();
            const jsonCodec = JSONCodec();

            const inputData = {type: 'temperature', value: 23.5, unit: '°C', timestamp: '2023-01-01T12:00:00Z'};
            const consumeQueue = EnvService.getConsumeQueue();
            const producerQueue = EnvService.getProducerQueue();

            // Publish test message
            await js.publish(producerQueue, jsonCodec.encode(JSON.stringify(inputData)));

            // Verify publish was called
            expect(js.publish).toHaveBeenCalledWith(producerQueue, expect.any(Uint8Array));

            // Simulate message processing
            const subscribe = await js.subscribe(consumeQueue);

            const messages = [];
            for await (const message of subscribe) {
                messages.push(message);
                break; // Process one message
            }

            const cleanedData = CleanService.cleanMeasurement(messages[0].data);
            expect(cleanedData).not.toBeNull();
            expect(cleanedData!.type).toBe('temperature');
            expect(cleanedData!.value).toBe(23.5);
            expect(cleanedData!.unit).toBe('°C');
            expect(cleanedData!.timestamp).toBe('2023-01-01T12:00:00Z');

            messages[0].ack();
            await subscribe.unsubscribe();
            await nc.close();

            // Verify cleanup calls
            expect(messages[0].ack).toHaveBeenCalled();
            expect(subscribe.unsubscribe).toHaveBeenCalled();
            expect(nc.close).toHaveBeenCalled();
        });

        it('should handle invalid messages gracefully with mocked NATS', async () => {
            const {connect} = require('nats');

            const nc = await connect({servers: 'http://localhost:4222'});
            const js = nc.jetstream();

            // Mock invalid message
            const invalidMessage = {
                data: new TextEncoder().encode('invalid json data'),
                ack: jest.fn(),
            };

            // Update subscription to return invalid message
            mockSubscription[Symbol.asyncIterator] = jest.fn().mockImplementation(async function* () {
                yield invalidMessage;
            });

            const consumeQueue = EnvService.getConsumeQueue();

            // Publish invalid message
            await js.publish(consumeQueue, new TextEncoder().encode('invalid json data'));

            const subscribe = await js.subscribe(consumeQueue);

            const messages = [];
            for await (const message of subscribe) {
                messages.push(message);
                break;
            }

            expect(messages).toHaveLength(1);

            const cleanedData = CleanService.cleanMeasurement(messages[0].data);
            expect(cleanedData).toBeNull();

            messages[0].ack();
            await subscribe.unsubscribe();
            await nc.close();
        });

        it('should verify connection options work with mocked NATS', async () => {
            const {connect} = require('nats');

            const connectionOptions = BrokerService.getConnectionOptions();
            const nc = await connect(connectionOptions);

            expect(connectionOptions.servers).toBe('http://localhost:4222');
            expect(nc.getServer()).toContain('localhost:4222');
            expect(connect).toHaveBeenCalledWith(connectionOptions);
        });

        it('should handle connection errors gracefully', async () => {
            const {connect} = require('nats');

            // Mock connection failure
            connect.mockRejectedValueOnce(new Error('Connection failed'));

            await expect(connect({servers: 'http://localhost:4222'}))
                .rejects
                .toThrow('Connection failed');
        });

        it('should process multiple messages in batch', async () => {
            const {connect, JSONCodec} = require('nats');

            const nc = await connect({servers: 'http://localhost:4222'});
            const js = nc.jetstream();
            const jsonCodec = JSONCodec();

            const messages = [
                {
                    type: 'temperature', value: 20, unit: '°C', timestamp: '2023-01-01T10:00:00Z'
                },
                {
                    type: 'pulse', value: 75, unit: 'bpm', timestamp: '2023-01-01T10:01:00Z'
                }
            ];

            // Update subscription to return multiple messages
            mockSubscription[Symbol.asyncIterator] = jest.fn().mockImplementation(async function* () {
                for (const msg of messages) {
                    yield {
                        data: jsonCodec.encode(msg),
                        ack: jest.fn(),
                    };
                }
            });

            const consumeQueue = EnvService.getConsumeQueue();
            const subscribe = await js.subscribe(consumeQueue);

            const processedMessages = [];
            for await (const message of subscribe) {
                const cleanedData = CleanService.cleanMeasurement(message.data);
                if (cleanedData) {
                    processedMessages.push(cleanedData);
                }
                message.ack();
                if (processedMessages.length >= 2) break;
            }

            expect(processedMessages).toHaveLength(2);
            expect(processedMessages[0].type).toBe('temperature');
            expect(processedMessages[0].value).toBe(20);
            expect(processedMessages[1].type).toBe('pulse');
            expect(processedMessages[1].value).toBe(75);

            expect(processedMessages[1].type).toBe('pulse');
            expect(processedMessages[1].value).toBe(75);
            expect(processedMessages[1].unit).toBe('bpm');
            expect(processedMessages[1].timestamp).toBe('2023-01-01T10:01:00Z');
        });
    });
});
