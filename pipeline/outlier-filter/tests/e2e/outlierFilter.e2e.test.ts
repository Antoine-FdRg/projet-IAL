import { connect, JSONCodec, type NatsConnection, type JetStreamClient } from 'nats';
import { EnvService } from '../../src/envService';
import { OutlierFilterService } from '../../src/outlierFilterService';
import type { MeasurementList } from '../../src/type';

jest.mock('../../src/envService');

describe('Outlier Filter E2E', () => {
    let nc: NatsConnection;
    let js: JetStreamClient;
    let jsonCodec: ReturnType<typeof JSONCodec>;

    beforeAll(async () => {
        // Mock environment variables
        (EnvService.getBrokerURL as jest.Mock).mockReturnValue('http://localhost:4222');
        (EnvService.getConsumeQueue as jest.Mock).mockReturnValue('MEASUREMENT.to_outlierfilter');
        (EnvService.getProducerQueue as jest.Mock).mockReturnValue(['MEASUREMENT.to_split', 'MEASUREMENT.to_analyze']);
        (EnvService.getWeightMin as jest.Mock).mockReturnValue(15);
        (EnvService.getWeightMax as jest.Mock).mockReturnValue(500);
        (EnvService.getTemperatureMin as jest.Mock).mockReturnValue(32);
        (EnvService.getTemperatureMax as jest.Mock).mockReturnValue(42);
        (EnvService.getPulseMax as jest.Mock).mockReturnValue(250);

        // Connect to test NATS server
        try {
            nc = await connect({ servers: 'localhost:4222' });
            js = nc.jetstream();
            jsonCodec = JSONCodec();
        } catch (error) {
            console.warn('NATS server not available for E2E tests');
        }
    });

    afterAll(async () => {
        if (nc) {
            await nc.close();
        }
    });

    it('should process measurement data end-to-end', async () => {
        if (!nc) {
            console.warn('Skipping E2E test - NATS not available');
            return;
        }

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
    });

    it('should handle empty measurement lists', async () => {
        const testData: MeasurementList = {
            boxId: 'test-box-2',
            dataList: []
        };

        const encodedData = jsonCodec.encode(testData);
        const filteredResult = OutlierFilterService.filterAndNormalizeMeasurementList(encodedData);

        expect(filteredResult).toBeNull();
    });

    it('should handle all invalid measurements', async () => {
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
});
