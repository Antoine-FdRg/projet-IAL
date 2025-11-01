import type { FamilyAnalysisResult } from '../types.js';

/**
 * HTTP client for analyze-service
 */
export class AnalyzeClient {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = process.env.ANALYZE_SERVICE_URL || 'http://analyze-service:3001';
    this.timeout = parseInt(process.env.ANALYZE_SERVICE_TIMEOUT || '10000'); // 10s default
  }

  /**
   * Get family analysis for a patient's station
   */
  async getFamilyAnalysis(stationToken: string): Promise<FamilyAnalysisResult> {
    const url = `${this.baseUrl}/analyse/${stationToken}/family`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as FamilyAnalysisResult;
      return data;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${this.timeout}ms`);
        }
        throw new Error(`Failed to fetch analysis: ${error.message}`);
      }
      throw error;
    }
  }
}
