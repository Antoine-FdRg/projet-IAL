import type { Measurement, AnomalyResult, SeverityLevel } from '../types.js';
import { THRESHOLD_CONFIG } from '../config/thresholds.js';
import { MeasurementRepository } from '../database/measurementRepository.js';

/**
 * Analyzer for absolute threshold violations
 * Checks if measurements exceed predefined safe ranges
 */
export class AbsoluteThresholdAnalyzer {
  /**
   * Analyze a measurement for absolute threshold violations
   */
  static async analyze(measurement: Measurement): Promise<AnomalyResult> {
    const { measurement_type, value, box_id } = measurement;

    switch (measurement_type) {
      case 'temperature':
        return this.analyzeTemperature(value);

      case 'pulse':
        return this.analyzePulse(value);

      case 'weight':
        return await this.analyzeWeight(value, box_id);

      default:
        return { detected: false };
    }
  }

  /**
   * Analyze temperature threshold
   */
  private static analyzeTemperature(value: number): AnomalyResult {
    const config = THRESHOLD_CONFIG.temperature;

    if (value < config.min) {
      const deviation = config.min - value;
      return {
        detected: true,
        anomaly_type: 'ABSOLUTE_THRESHOLD',
        severity: this.calculateSeverity(deviation, config.min * 0.1),
        message: `Température trop basse : ${value}°C (seuil min: ${config.min}°C)`,
        details: {
          current_value: value,
          threshold: config.min,
          deviation: -deviation,
        },
      };
    }

    if (value > config.max) {
      const deviation = value - config.max;
      return {
        detected: true,
        anomaly_type: 'ABSOLUTE_THRESHOLD',
        severity: this.calculateSeverity(deviation, config.max * 0.1),
        message: `Température trop élevée : ${value}°C (seuil max: ${config.max}°C)`,
        details: {
          current_value: value,
          threshold: config.max,
          deviation: deviation,
        },
      };
    }

    return { detected: false };
  }

  /**
   * Analyze pulse threshold
   */
  private static analyzePulse(value: number): AnomalyResult {
    const config = THRESHOLD_CONFIG.pulse;

    if (value < config.min) {
      const deviation = config.min - value;
      return {
        detected: true,
        anomaly_type: 'ABSOLUTE_THRESHOLD',
        severity: this.calculateSeverity(deviation, config.min * 0.2),
        message: `Pouls trop bas (bradycardie) : ${value} bpm (seuil min: ${config.min} bpm)`,
        details: {
          current_value: value,
          threshold: config.min,
          deviation: -deviation,
        },
      };
    }

    if (value > config.max) {
      const deviation = value - config.max;
      return {
        detected: true,
        anomaly_type: 'ABSOLUTE_THRESHOLD',
        severity: this.calculateSeverity(deviation, config.max * 0.2),
        message: `Pouls trop élevé (tachycardie) : ${value} bpm (seuil max: ${config.max} bpm)`,
        details: {
          current_value: value,
          threshold: config.max,
          deviation: deviation,
        },
      };
    }

    return { detected: false };
  }

  /**
   * Analyze weight threshold (based on recent average)
   */
  private static async analyzeWeight(value: number, boxId: string): Promise<AnomalyResult> {
    const config = THRESHOLD_CONFIG.weight;

    // Get average weight over the configured period
    const avgWeight = await MeasurementRepository.getAverageInPeriod(
      boxId,
      'weight',
      config.avg_period_days
    );

    // If no historical data, we can't analyze
    if (!avgWeight) {
      return { detected: false };
    }

    const deviation = Math.abs(value - avgWeight);

    if (deviation > config.max_deviation_from_avg) {
      const direction = value > avgWeight ? 'gain' : 'perte';
      return {
        detected: true,
        anomaly_type: 'ABSOLUTE_THRESHOLD',
        severity: this.calculateSeverity(
          deviation - config.max_deviation_from_avg,
          config.max_deviation_from_avg
        ),
        message: `${direction.charAt(0).toUpperCase() + direction.slice(1)} de poids anormale : ${value} kg (moyenne sur ${config.avg_period_days}j: ${avgWeight.toFixed(2)} kg, écart: ${deviation.toFixed(2)} kg)`,
        details: {
          current_value: value,
          threshold: config.max_deviation_from_avg,
          deviation: value - avgWeight,
          avg_weight: avgWeight,
          avg_period_days: config.avg_period_days,
        },
      };
    }

    return { detected: false };
  }

  /**
   * Calculate severity based on how much threshold is exceeded
   */
  private static calculateSeverity(deviation: number, baseThreshold: number): SeverityLevel {
    const ratio = Math.abs(deviation) / baseThreshold;

    if (ratio >= 2.0) return 'CRITICAL';
    if (ratio >= 1.5) return 'HIGH';
    if (ratio >= 1.2) return 'MEDIUM';
    return 'LOW';
  }
}
