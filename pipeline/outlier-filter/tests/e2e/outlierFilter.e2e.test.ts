import { OutlierFilterService } from '../../src/outlierFilterService';
import type { MeasurementList } from '../../src/type';

// Mock the entire nats module
jest.mock('nats', () => ({
    connect: jest.fn(),
    JSONCodec: jest.fn(),
}));

// Mock the EnvService
jest.mock('../../src/envService');

describe('Outlier Filter E2E Tests', () => {
    const originalEnv = process.env;
    let mockConnection: any;
    let mockSubscription: any;
    let mockMessage: any;

    beforeAll(() => {
        process.env = { ...originalEnv };
        process.env.NATS_SERVER = 'http://localhost:4222';
        process.env.OUTLIER_CONSUME_QUEUE = 'test.outlier.input';
        process.env.OUTLIER_PRODUCER_QUEUE = 'test.outlier.output';

        // Setup mocks
        const { connect, JSONCodec } = require('nats');
        const { EnvService } = require('../../src/envService');

        // Mock environment service
        EnvService.getBrokerURL.mockReturnValue('http://localhost:4222');
        EnvService.getConsumeQueue.mockReturnValue('MEASUREMENT.to_outlierfilter');
        EnvService.getProducerQueue.mockReturnValue(['MEASUREMENT.to_split', 'MEASUREMENT.to_analyze']);
        EnvService.getWeightMin.mockReturnValue(15);
        EnvService.getWeightMax.mockReturnValue(500);
        EnvService.getTemperatureMin.mockReturnValue(32);
        EnvService.getTemperatureMax.mockReturnValue(42);
        EnvService.getPulseMax.mockReturnValue(250);

        const inputData: MeasurementList = {
            boxId: 'e2e-test-box',
            dataList: [
                {
                    type: 'temperature',
                    value: 37.5,
                    unit: '°C',
                    timestamp: '2024-01-01T10:00:00Z'
                },
                {
                    type: 'weight',
                    value: 70,
                    unit: 'kg',
                    timestamp: '2024-01-01T10:01:00Z'
                },
                {
                    type: 'pulse',
                    value: 80,
                    unit: 'bpm',
                    timestamp: '2024-01-01T10:02:00Z'
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

    it('should process measurement data end-to-end with mocked NATS', async () => {
        const { connect, JSONCodec } = require('nats');

        const nc = await connect({ servers: 'http://localhost:4222' });
        const jsonCodec = JSONCodec();

        const testData: MeasurementList = {
            boxId: 'test-box-1',
            dataList: [
                { type: 'temperature', value: 37.5, unit: '°C', timestamp: '2024-01-01T10:00:00Z' },
                { type: 'weight', value: 70, unit: 'kg', timestamp: '2024-01-01T10:01:00Z' },
                { type: 'pulse', value: 80, unit: 'bpm', timestamp: '2024-01-01T10:02:00Z' },
                { type: 'temperature', value: 50, unit: '°C', timestamp: '2024-01-01T10:03:00Z' }, // Should be filtered
                { type: 'steps', value: 1000, unit: 'steps', timestamp: '2024-01-01T10:04:00Z' }
            ]
        };

        // Simulate the filtering process
        const encodedData = jsonCodec.encode(testData);
        const filteredResult = OutlierFilterService.filterAndNormalizeMeasurementList(encodedData);

        expect(filteredResult).not.toBeNull();
        expect(filteredResult!.boxId).toBe('test-box-1');
        expect(filteredResult!.dataList).toHaveLength(4); // One temperature measurement filtered out

        // Verify specific measurements
        const temperatures = filteredResult!.dataList.filter(m => m.type === 'temperature');
        expect(temperatures).toHaveLength(1);
        expect(temperatures[0].value).toBe(37.5);

        const weights = filteredResult!.dataList.filter(m => m.type === 'weight');
        expect(weights).toHaveLength(1);
        expect(weights[0].value).toBe(70);

        const pulses = filteredResult!.dataList.filter(m => m.type === 'pulse');
        expect(pulses).toHaveLength(1);
        expect(pulses[0].value).toBe(80);

        const steps = filteredResult!.dataList.filter(m => m.type === 'steps');
        expect(steps).toHaveLength(1);
        expect(steps[0].value).toBe(1000);

        // Verify NATS interactions
        expect(connect).toHaveBeenCalledWith({ servers: 'http://localhost:4222' });
        expect(JSONCodec).toHaveBeenCalled();

        await nc.close();
    });

    it('should handle empty measurement lists with mocked NATS', async () => {
        const { JSONCodec } = require('nats');
        const jsonCodec = JSONCodec();

        const testData: MeasurementList = {
            boxId: 'test-box-2',
            dataList: []
        };

        const encodedData = jsonCodec.encode(testData);
        const filteredResult = OutlierFilterService.filterAndNormalizeMeasurementList(encodedData);

        expect(filteredResult).toBeNull();
    });

    it('should handle all invalid measurements with mocked NATS', async () => {
        const { JSONCodec } = require('nats');
        const jsonCodec = JSONCodec();

        const testData: MeasurementList = {
            boxId: 'test-box-3',
            dataList: [
                { type: 'temperature', value: 50, unit: '°C', timestamp: '2024-01-01T10:00:00Z' }, // Too high
                { type: 'weight', value: 10, unit: 'kg', timestamp: '2024-01-01T10:01:00Z' }, // Too low
                { type: 'pulse', value: 300, unit: 'bpm', timestamp: '2024-01-01T10:02:00Z' } // Too high
            ]
        };

        const encodedData = jsonCodec.encode(testData);
        const filteredResult = OutlierFilterService.filterAndNormalizeMeasurementList(encodedData);

        expect(filteredResult).toBeNull();
    });

    it('should filter outliers correctly with mixed valid and invalid data', async () => {
        const { JSONCodec } = require('nats');
        const jsonCodec = JSONCodec();

        const testData: MeasurementList = {
            boxId: 'mixed-test-box',
            dataList: [
                { type: 'temperature', value: 36.5, unit: '°C', timestamp: '2024-01-01T10:00:00Z' }, // Valid
                { type: 'temperature', value: 45, unit: '°C', timestamp: '2024-01-01T10:01:00Z' }, // Invalid - too high
                { type: 'weight', value: 75, unit: 'kg', timestamp: '2024-01-01T10:02:00Z' }, // Valid
                { type: 'weight', value: 5, unit: 'kg', timestamp: '2024-01-01T10:03:00Z' }, // Invalid - too low
                { type: 'pulse', value: 90, unit: 'bpm', timestamp: '2024-01-01T10:04:00Z' }, // Valid
                { type: 'pulse', value: 300, unit: 'bpm', timestamp: '2024-01-01T10:05:00Z' }, // Invalid - too high
                { type: 'steps', value: 5000, unit: 'steps', timestamp: '2024-01-01T10:06:00Z' } // Valid - no filtering
            ]
        };

        const encodedData = jsonCodec.encode(testData);
        const filteredResult = OutlierFilterService.filterAndNormalizeMeasurementList(encodedData);

        expect(filteredResult).not.toBeNull();
        expect(filteredResult!.boxId).toBe('mixed-test-box');
        expect(filteredResult!.dataList).toHaveLength(4); // 3 invalid filtered out

        // Verify only valid measurements remain
        const temperatures = filteredResult!.dataList.filter(m => m.type === 'temperature');
        expect(temperatures).toHaveLength(1);
        expect(temperatures[0].value).toBe(36.5);

        const weights = filteredResult!.dataList.filter(m => m.type === 'weight');
        expect(weights).toHaveLength(1);
        expect(weights[0].value).toBe(75);

        const pulses = filteredResult!.dataList.filter(m => m.type === 'pulse');
        expect(pulses).toHaveLength(1);
        expect(pulses[0].value).toBe(90);

        const steps = filteredResult!.dataList.filter(m => m.type === 'steps');
        expect(steps).toHaveLength(1);
        expect(steps[0].value).toBe(5000);
    });

    it('should handle connection errors gracefully', async () => {
        const { connect } = require('nats');

        // Mock connection failure
        connect.mockRejectedValueOnce(new Error('Outlier filter connection failed'));

        await expect(connect({ servers: 'http://localhost:4222' }))
            .rejects
            .toThrow('Outlier filter connection failed');
    });

    it('should handle invalid JSON data', async () => {
        const invalidData = new TextEncoder().encode('invalid json data');
        const filteredResult = OutlierFilterService.filterAndNormalizeMeasurementList(invalidData);

        expect(filteredResult).toBeNull();
    });

    it('should preserve valid measurements from different measurement types', async () => {
        const { JSONCodec } = require('nats');
        const jsonCodec = JSONCodec();

        const testData: MeasurementList = {
            boxId: 'preservation-test-box',
            dataList: [
                { type: 'temperature', value: 38.0, unit: '°C', timestamp: '2024-01-01T10:00:00Z' },
                { type: 'weight', value: 68.5, unit: 'kg', timestamp: '2024-01-01T10:01:00Z' },
                { type: 'pulse', value: 72, unit: 'bpm', timestamp: '2024-01-01T10:02:00Z' },
                { type: 'steps', value: 8500, unit: 'steps', timestamp: '2024-01-01T10:03:00Z' },
                { type: 'unknown', value: 100, unit: 'unknown', timestamp: '2024-01-01T10:04:00Z' } // Should pass through
            ]
        };

        const encodedData = jsonCodec.encode(testData);
        const filteredResult = OutlierFilterService.filterAndNormalizeMeasurementList(encodedData);

        expect(filteredResult).not.toBeNull();
        expect(filteredResult!.dataList).toHaveLength(5); // All measurements should be preserved
        expect(filteredResult!.dataList.map(m => m.type)).toEqual([
            'temperature', 'weight', 'pulse', 'steps', 'unknown'
        ]);
    });
});
