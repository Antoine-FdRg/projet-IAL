import { SaveServiceClient } from '../../src/saveServiceClient';
import type { RawMeasurement } from '../../src/type';

// Mock fetch
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('SaveServiceClient', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('sendCompressedMeasurements', () => {
    it('should return true when no measurements to send', async () => {
      const result = await SaveServiceClient.sendCompressedMeasurements([]);
      expect(result).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should send measurements successfully and return true', async () => {
      const measurements: RawMeasurement[] = [
        { type: 'temperature', value: 21.5, unit: '°C', timestamp: '2023-01-01T10:00:00Z' },
        { type: 'pulse', value: 75, unit: 'bpm', timestamp: '2023-01-01T10:00:00Z' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK'
      } as Response);

      const result = await SaveServiceClient.sendCompressedMeasurements(measurements);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0]!;
      expect(url).toBe('http://localhost:3000/measurements');
      expect(options?.method).toBe('POST');
      expect(options?.headers?.['Content-Type']).toBe('application/json');
      expect(options?.headers?.['Authorization']).toMatch(/^Bearer test-box-[12]-uuid$/);

      const body = JSON.parse(options?.body as string);
      expect(body.dataList).toEqual(measurements);
      expect(body.boxId).toMatch(/^test-box-[12]-uuid$/);
    });

    it('should return false when save service returns error status', async () => {
      const measurements: RawMeasurement[] = [
        { type: 'temperature', value: 21.5, unit: '°C', timestamp: '2023-01-01T10:00:00Z' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      const result = await SaveServiceClient.sendCompressedMeasurements(measurements);

      expect(result).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should return false when network error occurs', async () => {
      const measurements: RawMeasurement[] = [
        { type: 'temperature', value: 21.5, unit: '°C', timestamp: '2023-01-01T10:00:00Z' }
      ];

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await SaveServiceClient.sendCompressedMeasurements(measurements);

      expect(result).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should use correct request format', async () => {
      const measurements: RawMeasurement[] = [
        { type: 'weight', value: 75.5, unit: 'kg', timestamp: '2023-01-01T10:00:00Z' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK'
      } as Response);

      await SaveServiceClient.sendCompressedMeasurements(measurements);

      const [url, options] = mockFetch.mock.calls[0]!;
      expect(url).toBe('http://localhost:3000/measurements');
      expect(options?.method).toBe('POST');
      expect(options?.headers).toEqual({
        'Authorization': expect.stringMatching(/^Bearer test-box-[12]-uuid$/),
        'Content-Type': 'application/json',
      });

      const body = JSON.parse(options?.body as string);
      expect(body).toEqual({
        boxId: expect.stringMatching(/^test-box-[12]-uuid$/),
        dataList: measurements,
      });
    });

    it('should handle different HTTP error codes', async () => {
      const measurements: RawMeasurement[] = [
        { type: 'steps', value: 1000, unit: 'steps', timestamp: '2023-01-01T10:00:00Z' }
      ];

      const errorCodes = [400, 401, 403, 404, 500, 502, 503];

      for (const errorCode of errorCodes) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: errorCode,
          statusText: `Error ${errorCode}`
        } as Response);

        const result = await SaveServiceClient.sendCompressedMeasurements(measurements);
        expect(result).toBe(false);
      }

      expect(mockFetch).toHaveBeenCalledTimes(errorCodes.length);
    });
  });
});
