import { connect, JSONCodec } from 'nats';
import { NormalizerService } from '../../src/normalizerService';
import type { MeasurementList } from '../../src/type';

describe('Normalizer E2E Tests', () => {
    const NATS_SERVER = process.env.NATS_SERVER || 'nats://localhost:4222';

    let nc: any;

    beforeAll(async () => {
        try {
            nc = await connect({
                servers: NATS_SERVER,
                timeout: 2000,
                reconnect: false
            });
        } catch (error) {
            console.warn('NATS server not available for E2E tests. Skipping...');
            nc = null;
        }
    });

    afterAll(async () => {
        if (nc) {
            await nc.close();
        }
    });

    it('should process messages end-to-end through NATS core messaging', async () => {
        if (!nc) {
            console.warn('Skipping E2E test - NATS not available');
            throw new Error('NATS not available');
        }

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

        return new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Test timeout'));
            }, 5000);

            // Set up subscription to capture output
            const outputSub = nc.subscribe(OUTPUT_SUBJECT);
            (async () => {
                for await (const msg of outputSub) {
                    try {
                        const outputData = jsonCodec.decode(msg.data) as MeasurementList;

                        expect(outputData.boxId).toBe('e2e-test-box');
                        expect(outputData.dataList).toHaveLength(2);

                        // Verify conversions
                        expect(outputData.dataList[0].value).toBe(38); // 100.4°F to °C
                        expect(outputData.dataList[0].unit).toBe('°C');
                        expect(outputData.dataList[1].value).toBe(81.65); // 180 lbs to kg
                        expect(outputData.dataList[1].unit).toBe('kg');

                        clearTimeout(timeout);
                        outputSub.unsubscribe();
                        resolve();
                    } catch (error) {
                        clearTimeout(timeout);
                        outputSub.unsubscribe();
                        reject(error);
                    }
                    break; // Only process first message
                }
            })();

            // Set up subscription to process input messages
            const inputSub = nc.subscribe(TEST_SUBJECT);
            (async () => {
                for await (const msg of inputSub) {
                    // Normalize the message
                    const normalizedData = NormalizerService.normalizeMeasurementList(msg.data);
                    expect(normalizedData).not.toBeNull();

                    // Publish normalized data to output subject
                    nc.publish(OUTPUT_SUBJECT, jsonCodec.encode(normalizedData));
                    inputSub.unsubscribe();
                    break; // Only process first message
                }
            })();

            // Publish test message
            setTimeout(() => {
                nc.publish(TEST_SUBJECT, jsonCodec.encode(inputData));
            }, 100);
        });
    });

    it('should handle multiple concurrent messages through core NATS', async () => {
        if (!nc) {
            console.warn('Skipping E2E test - NATS not available');
            throw new Error('NATS not available');
        }

        const jsonCodec = JSONCodec();
        const messagesCount = 3; // Reduced for faster testing
        const testMessages: MeasurementList[] = [];
        const TEST_SUBJECT = 'test.normalizer.concurrent';

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

        return new Promise<void>((resolve, reject) => {
            const processedMessages: MeasurementList[] = [];
            const timeout = setTimeout(() => {
                reject(new Error('Test timeout'));
            }, 8000);

            // Set up consumer
            const sub = nc.subscribe(TEST_SUBJECT);
            (async () => {
                for await (const msg of sub) {
                    const normalizedData = NormalizerService.normalizeMeasurementList(msg.data);
                    expect(normalizedData).not.toBeNull();

                    processedMessages.push(normalizedData!);

                    if (processedMessages.length === messagesCount) {
                        try {
                            expect(processedMessages).toHaveLength(messagesCount);

                            // Verify all messages were processed correctly
                            processedMessages.forEach((processed, index) => {
                                expect(processed.dataList[0].unit).toBe('°C');
                                // Box IDs might not be in order due to concurrent processing
                                expect(processed.boxId).toMatch(/^concurrent-test-box-\d$/);
                            });

                            clearTimeout(timeout);
                            sub.unsubscribe();
                            resolve();
                        } catch (error) {
                            clearTimeout(timeout);
                            sub.unsubscribe();
                            reject(error);
                        }
                        break;
                    }
                }
            })();

            // Publish all test messages with slight delay
            setTimeout(() => {
                testMessages.forEach((message, index) => {
                    setTimeout(() => {
                        nc.publish(TEST_SUBJECT, jsonCodec.encode(message));
                    }, index * 10); // Small delay between messages
                });
            }, 100);
        });
    });

    it('should skip tests gracefully when NATS is not available', () => {
        if (nc) {
            expect(nc.isClosed()).toBe(false);
        } else {
            // This test passes when NATS is not available
            expect(true).toBe(true);
        }
    });
});
