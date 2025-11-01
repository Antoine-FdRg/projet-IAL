import type { Measurement, Alert, AnomalyResult, MeasurementStats } from '../types.js';
import { AbsoluteThresholdAnalyzer } from '../analyzers/absoluteThresholdAnalyzer.js';
import { VariationAnalyzer } from '../analyzers/variationAnalyzer.js';
import { TrendAnalyzer } from '../analyzers/trendAnalyzer.js';
import { AlertService } from './alertService.js';
import { MeasurementRepository } from '../database/measurementRepository.js';

/**
 * Main service for orchestrating anomaly analysis
 * Runs all analyzers and generates alerts
 */
export class AnalysisService {
  /**
   * Analyze a measurement for all types of anomalies
   */
  static async analyzeMeasurement(measurement: Measurement): Promise<void> {
    AlertService.logAnalysisStart(
      measurement.box_id,
      measurement.measurement_type,
      measurement.value,
      measurement.unit
    );

    // Run all analyzers in parallel
    const [thresholdResult, variationResult, trendResult] = await Promise.all([
      AbsoluteThresholdAnalyzer.analyze(measurement),
      VariationAnalyzer.analyze(measurement),
      TrendAnalyzer.analyze(measurement),
    ]);

    // Collect all detected anomalies
    const anomalies: AnomalyResult[] = [thresholdResult, variationResult, trendResult].filter(
      (result) => result.detected
    );

    if (anomalies.length === 0) {
      // No anomalies detected
      AlertService.logNormalMeasurement(
        measurement.box_id,
        measurement.measurement_type,
        measurement.value,
        measurement.unit
      );
      return;
    }

    // Generate and display alerts for each anomaly
    // If multiple anomalies, prioritize by severity
    const sortedAnomalies = anomalies.sort((a, b) => {
      const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return severityOrder[b.severity!] - severityOrder[a.severity!];
    });

    for (const anomaly of sortedAnomalies) {
      const alert = await this.createAlert(measurement, anomaly);
      AlertService.displayAlert(alert);
    }
  }

  /**
   * Create an alert from measurement and anomaly result
   */
  private static async createAlert(
    measurement: Measurement,
    anomaly: AnomalyResult
  ): Promise<Alert> {
    // Get recent stats for context
    const stats = await MeasurementRepository.getStats(
      measurement.box_id,
      measurement.measurement_type,
      1 // Last 1 hour
    );

    const context = this.buildContext(stats, anomaly);

    return {
      timestamp: new Date(),
      box_id: measurement.box_id,
      measurement_type: measurement.measurement_type,
      current_value: measurement.value,
      unit: measurement.unit,
      anomaly_type: anomaly.anomaly_type!,
      severity: anomaly.severity!,
      message: anomaly.message!,
      context,
      recommendation: AlertService.generateRecommendation(
        anomaly.severity!,
        measurement.measurement_type
      ),
    };
  }

  /**
   * Build context object for alert
   */
  private static buildContext(
    stats: MeasurementStats | null,
    anomaly: AnomalyResult
  ): { [key: string]: any } {
    const context: { [key: string]: any } = {};

    // Add stats context
    if (stats) {
      context.avg_1h = stats.avg;
    }

    // Add anomaly-specific details
    if (anomaly.details) {
      for (const [key, value] of Object.entries(anomaly.details)) {
        if (key !== 'current_value') {
          // Don't duplicate current_value
          context[key] = value;
        }
      }
    }

    // Format variation if present
    if (anomaly.details?.variation !== undefined) {
      const variation = anomaly.details.variation;
      context.variation = `${variation > 0 ? '+' : ''}${variation.toFixed(2)}`;
    }

    // Format trend if it's a trend anomaly
    if (anomaly.anomaly_type === 'TREND_ANOMALY') {
      if (anomaly.details?.increase !== undefined) {
        context.trend = `↗️ +${anomaly.details.increase.toFixed(2)}`;
      } else if (anomaly.details?.change !== undefined) {
        const change = anomaly.details.change;
        context.trend = `${change > 0 ? '↗️ +' : '↘️ '}${Math.abs(change).toFixed(2)}`;
      }
    }

    return context;
  }

  /**
   * Test connection and print startup info
   */
  static async initialize(): Promise<void> {
    console.log(`[${new Date().toISOString()}] - 🚀 Analyse Service Starting...`);
    console.log(
      `[${new Date().toISOString()}] - 📊 Anomaly detection with multi-scale analysis enabled`
    );
    console.log(
      `[${new Date().toISOString()}] - 🔍 Analyzers: Absolute Thresholds, Variations, Trends`
    );
  }
}
