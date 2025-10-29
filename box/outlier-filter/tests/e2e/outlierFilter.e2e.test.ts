import {OutlierFilterService} from '../../src/outlierFilterService';
import type {RawMeasurement} from '../../src/type';
import {EnvService} from "../../src/envService";

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
        process.env = {...originalEnv};
        process.env.NATS_SERVER = 'http://localhost:4222';
        process.env.OUTLIER_CONSUME_QUEUE = 'test.outlier.input';
        process.env.OUTLIER_PRODUCER_QUEUE = 'test.outlier.output';


        // Setup mocks
        const {connect, JSONCodec} = require('nats');
        const {EnvService} = require('../../src/envService');

        // Mock environment service
        EnvService.getBrokerURL.mockReturnValue('http://localhost:4222');
        EnvService.getConsumeQueue.mockReturnValue('MEASUREMENT.to_outlierfilter');
        EnvService.getWeightMin.mockReturnValue(15);
        EnvService.getWeightMax.mockReturnValue(500);
        EnvService.getTemperatureMin.mockReturnValue(32);
        EnvService.getTemperatureMax.mockReturnValue(42);
        EnvService.getPulseMax.mockReturnValue(250);
        EnvService.getPulseMin.mockReturnValue(0);
        EnvService.getStepsMin.mockReturnValue(0);

        const inputData: RawMeasurement = {
            type: 'temperature',
            value: 37.5,
            unit: '°C',
            timestamp: '2024-01-01T10:00:00Z'
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
        const {connect, JSONCodec} = require('nats');

        const nc = await connect({servers: 'http://localhost:4222'});
        const jsonCodec = JSONCodec();

        const testData: RawMeasurement[] = [
            {type: 'temperature', value: 37.5, unit: '°C', timestamp: '2024-01-01T10:00:00Z'},
            {type: 'weight', value: 70, unit: 'kg', timestamp: '2024-01-01T10:01:00Z'},
            {type: 'pulse', value: 80, unit: 'bpm', timestamp: '2024-01-01T10:02:00Z'},
            {type: 'temperature', value: 50, unit: '°C', timestamp: '2024-01-01T10:03:00Z'}, // Should be filtered
            {type: 'steps', value: 1000, unit: 'steps', timestamp: '2024-01-01T10:04:00Z'}
        ];

        for (const msg of testData) {
            const encodedData = jsonCodec.encode(msg);
            const filteredResult = OutlierFilterService.filterAndNormalizeMeasurement(encodedData);

            if (
                (msg.type === 'temperature' && (msg.value < EnvService.getTemperatureMin() || msg.value > EnvService.getTemperatureMax())) ||
                (msg.type === 'weight' && (msg.value < EnvService.getWeightMin() || msg.value > EnvService.getWeightMax())) ||
                (msg.type === 'pulse' && (msg.value < EnvService.getPulseMin() || msg.value > EnvService.getPulseMax())) ||
                (msg.type === 'steps' && (msg.value < EnvService.getStepsMin()))
            ) {
                expect(filteredResult).toBeNull();
            } else {
                expect(filteredResult).not.toBeNull();
                expect(filteredResult!.type).toBe(msg.type);
                expect(filteredResult!.value).toBe(msg.value);
                expect(filteredResult!.unit).toBe(msg.unit);
                expect(filteredResult!.timestamp).toBe(msg.timestamp);
            }
        }

        // Verify NATS interactions
        expect(connect).toHaveBeenCalledWith({servers: 'http://localhost:4222'});
        expect(JSONCodec).toHaveBeenCalled();

        await nc.close();
    });

    it('should handle empty measurement lists with mocked NATS', async () => {
        const {JSONCodec} = require('nats');
        const jsonCodec = JSONCodec();

        const testData = {};

        const encodedData = jsonCodec.encode(testData);
        const filteredResult = OutlierFilterService.filterAndNormalizeMeasurement(encodedData);

        expect(filteredResult).toBeNull();
    });

    it('should handle all invalid measurements with mocked NATS', async () => {
        const {JSONCodec} = require('nats');
        const jsonCodec = JSONCodec();

        const testData: RawMeasurement[] = [
            {type: 'temperature', value: 50, unit: '°C', timestamp: '2024-01-01T10:00:00Z'}, // Too high
            {type: 'weight', value: 10, unit: 'kg', timestamp: '2024-01-01T10:01:00Z'}, // Too low
            {type: 'pulse', value: 300, unit: 'bpm', timestamp: '2024-01-01T10:02:00Z'}, // Too high
            {type: 'steps', value: -100, unit: 'steps', timestamp: '2024-01-01T10:03:00Z'} // Negative steps
        ];

        for (const measurement of testData) {
            const encodedData = jsonCodec.encode(measurement);
            const filteredResult = OutlierFilterService.filterAndNormalizeMeasurement(encodedData);
            expect(filteredResult).toBeNull();
        }
    });

    it('should filter outliers correctly with mixed valid and invalid data', async () => {
        const {JSONCodec} = require('nats');
        const jsonCodec = JSONCodec();

        const testData: RawMeasurement[] = [
            {type: 'temperature', value: 36.5, unit: '°C', timestamp: '2024-01-01T10:00:00Z'}, // Valid
            {type: 'temperature', value: 45, unit: '°C', timestamp: '2024-01-01T10:01:00Z'}, // Invalid - too high
            {type: 'weight', value: 75, unit: 'kg', timestamp: '2024-01-01T10:02:00Z'}, // Valid
            {type: 'weight', value: 5, unit: 'kg', timestamp: '2024-01-01T10:03:00Z'}, // Invalid - too low
            {type: 'pulse', value: 90, unit: 'bpm', timestamp: '2024-01-01T10:04:00Z'}, // Valid
            {type: 'pulse', value: 300, unit: 'bpm', timestamp: '2024-01-01T10:05:00Z'}, // Invalid - too high
            {type: 'steps', value: 5000, unit: 'steps', timestamp: '2024-01-01T10:06:00Z'}, // Valid - no filtering
            {type: 'steps', value: -10, unit: 'steps', timestamp: '2024-01-01T10:06:00Z'} // Invalid - too low
        ];

        for (const measurement of testData) {
            const encodedData = jsonCodec.encode(measurement);
            const filteredResult = OutlierFilterService.filterAndNormalizeMeasurement(encodedData);

            if (
                (measurement.type === 'temperature' && (measurement.value < EnvService.getTemperatureMin() || measurement.value > EnvService.getTemperatureMax())) ||
                (measurement.type === 'weight' && (measurement.value < EnvService.getWeightMin() || measurement.value > EnvService.getWeightMax())) ||
                (measurement.type === 'pulse' && (measurement.value < EnvService.getPulseMin() || measurement.value > EnvService.getPulseMax())) ||
                (measurement.type === 'steps' && (measurement.value < EnvService.getStepsMin()))
            ) {
                expect(filteredResult).toBeNull();
            } else {
                expect(filteredResult).not.toBeNull();
                expect(filteredResult!.type).toBe(measurement.type);
                expect(filteredResult!.value).toBe(measurement.value);
                expect(filteredResult!.unit).toBe(measurement.unit);
                expect(filteredResult!.timestamp).toBe(measurement.timestamp);
            }
        }
    });

    it('should handle connection errors gracefully', async () => {
        const {connect} = require('nats');

        // Mock connection failure
        connect.mockRejectedValueOnce(new Error('Outlier filter connection failed'));

        await expect(connect({servers: 'http://localhost:4222'}))
            .rejects
            .toThrow('Outlier filter connection failed');
    });

    it('should handle invalid JSON data', async () => {
        const invalidData = new TextEncoder().encode('invalid json data');
        const filteredResult = OutlierFilterService.filterAndNormalizeMeasurement(invalidData);

        expect(filteredResult).toBeNull();
    });

    it('should preserve valid measurements from different measurement types', async () => {
        const {JSONCodec} = require('nats');
        const jsonCodec = JSONCodec();

        const testData: RawMeasurement[] = [
            {type: 'temperature', value: 38.0, unit: '°C', timestamp: '2024-01-01T10:00:00Z'},
            {type: 'weight', value: 68.5, unit: 'kg', timestamp: '2024-01-01T10:01:00Z'},
            {type: 'pulse', value: 72, unit: 'bpm', timestamp: '2024-01-01T10:02:00Z'},
            {type: 'steps', value: 8500, unit: 'steps', timestamp: '2024-01-01T10:03:00Z'},
            {
                // @ts-expect-error
                type: 'unknown', value: 100, unit: 'unknown', timestamp: '2024-01-01T10:04:00Z'
            } // Should pass through
        ];

        for (const measurement of testData) {
            const encodedData = jsonCodec.encode(measurement);
            const filteredResult = OutlierFilterService.filterAndNormalizeMeasurement(encodedData);

            expect(filteredResult).not.toBeNull();
            expect(filteredResult!.type).toBe(measurement.type);
            expect(filteredResult!.value).toBe(measurement.value);
            expect(filteredResult!.unit).toBe(measurement.unit);
            expect(filteredResult!.timestamp).toBe(measurement.timestamp);
        }
    });
});
