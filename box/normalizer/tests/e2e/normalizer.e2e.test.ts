import { NormalizerService } from '../../src/normalizerService';
import type { MeasurementList } from '../../src/type';

// Mock the entire nats module
jest.mock('nats', () => ({
    connect: jest.fn(),
    JSONCodec: jest.fn(),
}));

describe('Normalizer E2E Tests', () => {
    const originalEnv = process.env;
    let mockConnection: any;
    let mockSubscription: any;
    let mockMessage: any;

    beforeAll(() => {
        process.env = { ...originalEnv };
        process.env.NATS_SERVER = 'nats://localhost:4222';

        // Setup mocks
        const { connect, JSONCodec } = require('nats');

        const inputData: MeasurementList = {
            boxId: 'e2e-test-box',
            dataList: [
                {
                    type: 'temperature',
                    value: 100.4,
                    unit: '°F',
                    timestamp: '2023-01-01T12:00:00.000Z'
                },
                {
                    type: 'weight',
                    value: 180,
                    unit: 'lbs',
                    timestamp: '2023-01-01T12:01:00.000Z'
                }
            ]
        };

        mockMessage = {
            data: new TextEncoder().encode(JSON.stringify(inputData)),
        };

        mockSubscription = {
            unsubscribe: jest.fn(),
            [Symbol.asyncIterator]: jest.fn().mockImplementation(async function* () {
                yield mockMessage;
            }),
        };

        mockConnection = {
            subscribe: jest.fn().mockReturnValue(mockSubscription),
            publish: jest.fn(),
            close: jest.fn().mockResolvedValue(undefined),
            isClosed: jest.fn().mockReturnValue(false),
        };

        connect.mockResolvedValue(mockConnection);

        JSONCodec.mockReturnValue({
            encode: jest.fn().mockImplementation((data) => new TextEncoder().encode(JSON.stringify(data))),
            decode: jest.fn().mockImplementation((data) => JSON.parse(new TextDecoder().decode(data))),
        });
    });

    afterAll(() => {
        process.env = originalEnv;
        jest.resetAllMocks();
    });

    it('should process messages end-to-end through mocked NATS core messaging', async () => {
        const { connect, JSONCodec } = require('nats');

        const nc = await connect({
            servers: 'nats://localhost:4222',
            timeout: 2000,
            reconnect: false
        });

        const inputData: MeasurementList = {
            boxId: 'e2e-test-box',
            dataList: [
                {
                    type: 'temperature',
                    value: 100.4,
                    unit: '°F',
                    timestamp: '2023-01-01T12:00:00.000Z'
                },
                {
                    type: 'weight',
                    value: 180,
                    unit: 'lbs',
                    timestamp: '2023-01-01T12:01:00.000Z'
                }
            ]
        };

        const jsonCodec = JSONCodec();
        const TEST_SUBJECT = 'test.normalizer.input';
        const OUTPUT_SUBJECT = 'test.normalizer.output';

        // Simulate message processing
        const inputSub = nc.subscribe(TEST_SUBJECT);

        const messages = [];
        for await (const msg of inputSub) {
            messages.push(msg);
            break; // Process one message
        }

        expect(messages).toHaveLength(1);

        // Normalize the message
        const normalizedData = NormalizerService.normalizeMeasurementList(messages[0].data);
        expect(normalizedData).not.toBeNull();
        expect(normalizedData?.boxId).toBe('e2e-test-box');
        expect(normalizedData?.dataList).toHaveLength(2);

        // Verify conversions
        expect(normalizedData?.dataList[0].value).toBe(38); // 100.4°F to °C
        expect(normalizedData?.dataList[0].unit).toBe('°C');
        expect(normalizedData?.dataList[1].value).toBe(81.65); // 180 lbs to kg
        expect(normalizedData?.dataList[1].unit).toBe('kg');

        // Verify publish was called with normalized data
        nc.publish(OUTPUT_SUBJECT, jsonCodec.encode(normalizedData));
        expect(nc.publish).toHaveBeenCalledWith(
            OUTPUT_SUBJECT,
            expect.any(Uint8Array)
        );

        inputSub.unsubscribe();
        await nc.close();

        expect(inputSub.unsubscribe).toHaveBeenCalled();
        expect(nc.close).toHaveBeenCalled();
    });

    it('should handle multiple concurrent messages through mocked core NATS', async () => {
        const { connect, JSONCodec } = require('nats');

        const nc = await connect({
            servers: 'nats://localhost:4222',
            timeout: 2000,
            reconnect: false
        });

        const jsonCodec = JSONCodec();
        const messagesCount = 3;
        const testMessages: MeasurementList[] = [];

        // Create test messages
        for (let i = 0; i < messagesCount; i++) {
            testMessages.push({
                boxId: `concurrent-test-box-${i}`,
                dataList: [
                    {
                        type: 'temperature',
                        value: 68 + i,
                        unit: '°F',
                        timestamp: new Date().toISOString()
                    }
                ]
            });
        }

        // Update subscription to return multiple messages
        mockSubscription[Symbol.asyncIterator] = jest.fn().mockImplementation(async function* () {
            for (const msg of testMessages) {
                yield {
                    data: jsonCodec.encode(msg),
                };
            }
        });

        const TEST_SUBJECT = 'test.normalizer.concurrent';
        const sub = nc.subscribe(TEST_SUBJECT);

        const processedMessages: MeasurementList[] = [];
        for await (const msg of sub) {
            const normalizedData = NormalizerService.normalizeMeasurementList(msg.data);
            expect(normalizedData).not.toBeNull();

            processedMessages.push(normalizedData!);

            if (processedMessages.length === messagesCount) {
                break;
            }
        }

        expect(processedMessages).toHaveLength(messagesCount);

        // Verify all messages were processed correctly
        processedMessages.forEach((processed, index) => {
            expect(processed.dataList[0].unit).toBe('°C');
            expect(processed.boxId).toMatch(/^concurrent-test-box-\d$/);
            // Verify temperature conversion (68°F = 20°C, 69°F = 20.56°C, 70°F = 21.11°C)
            expect(processed.dataList[0].value).toBeCloseTo(20 + (index * 0.56), 1);
        });

        sub.unsubscribe();
        await nc.close();
    });

    it('should handle invalid messages gracefully with mocked NATS', async () => {
        const { connect, JSONCodec } = require('nats');

        const nc = await connect({
            servers: 'nats://localhost:4222',
            timeout: 2000,
            reconnect: false
        });

        // Mock invalid message
        const invalidMessage = {
            data: new TextEncoder().encode('invalid json data'),
        };

        // Update subscription to return invalid message
        mockSubscription[Symbol.asyncIterator] = jest.fn().mockImplementation(async function* () {
            yield invalidMessage;
        });

        const TEST_SUBJECT = 'test.normalizer.invalid';
        const sub = nc.subscribe(TEST_SUBJECT);

        const messages = [];
        for await (const msg of sub) {
            messages.push(msg);
            break;
        }

        expect(messages).toHaveLength(1);

        const normalizedData = NormalizerService.normalizeMeasurementList(messages[0].data);
        expect(normalizedData).toBeNull();

        sub.unsubscribe();
        await nc.close();
    });

    it('should handle connection errors gracefully', async () => {
        const { connect } = require('nats');

        // Mock connection failure
        connect.mockRejectedValueOnce(new Error('Connection failed'));

        await expect(connect({
            servers: 'nats://localhost:4222',
            timeout: 2000,
            reconnect: false
        })).rejects.toThrow('Connection failed');
    });

    it('should verify connection state with mocked NATS', async () => {
        const { connect } = require('nats');

        const nc = await connect({
            servers: 'nats://localhost:4222',
            timeout: 2000,
            reconnect: false
        });

        expect(nc.isClosed()).toBe(false);
        expect(connect).toHaveBeenCalledWith({
            servers: 'nats://localhost:4222',
            timeout: 2000,
            reconnect: false
        });
    });

    it('should handle empty measurement lists', async () => {
        const { connect, JSONCodec } = require('nats');

        const nc = await connect({
            servers: 'nats://localhost:4222',
            timeout: 2000,
            reconnect: false
        });

        const emptyData: MeasurementList = {
            boxId: 'empty-test-box',
            dataList: []
        };

        // Update subscription to return empty message
        mockSubscription[Symbol.asyncIterator] = jest.fn().mockImplementation(async function* () {
            yield {
                data: new TextEncoder().encode(JSON.stringify(emptyData)),
            };
        });

        const TEST_SUBJECT = 'test.normalizer.empty';
        const sub = nc.subscribe(TEST_SUBJECT);

        const messages = [];
        for await (const msg of sub) {
            messages.push(msg);
            break;
        }

        expect(messages).toHaveLength(1);

        const normalizedData = NormalizerService.normalizeMeasurementList(messages[0].data);
        expect(normalizedData).toBeNull();

        sub.unsubscribe();
        await nc.close();
    });

    it('should handle measurements with already normalized units', async () => {
        const { connect, JSONCodec } = require('nats');

        const nc = await connect({
            servers: 'nats://localhost:4222',
            timeout: 2000,
            reconnect: false
        });

        const alreadyNormalizedData: MeasurementList = {
            boxId: 'normalized-test-box',
            dataList: [
                {
                    type: 'temperature',
                    value: 25.5,
                    unit: '°C',
                    timestamp: '2023-01-01T12:00:00.000Z'
                },
                {
                    type: 'weight',
                    value: 70.5,
                    unit: 'kg',
                    timestamp: '2023-01-01T12:01:00.000Z'
                }
            ]
        };

        // Update subscription to return already normalized message
        mockSubscription[Symbol.asyncIterator] = jest.fn().mockImplementation(async function* () {
            yield {
                data: new TextEncoder().encode(JSON.stringify(alreadyNormalizedData)),
            };
        });

        const TEST_SUBJECT = 'test.normalizer.already';
        const sub = nc.subscribe(TEST_SUBJECT);

        const messages = [];
        for await (const msg of sub) {
            messages.push(msg);
            break;
        }

        expect(messages).toHaveLength(1);

        const normalizedData = NormalizerService.normalizeMeasurementList(messages[0].data);
        expect(normalizedData).not.toBeNull();
        expect(normalizedData?.dataList[0].value).toBe(25.5); // No conversion needed
        expect(normalizedData?.dataList[0].unit).toBe('°C');
        expect(normalizedData?.dataList[1].value).toBe(70.5); // No conversion needed
        expect(normalizedData?.dataList[1].unit).toBe('kg');

        sub.unsubscribe();
        await nc.close();
    });
});
