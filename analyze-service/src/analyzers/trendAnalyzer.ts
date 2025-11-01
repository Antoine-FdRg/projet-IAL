import type { Measurement, AnomalyResult, SeverityLevel } from '../types.js';
import { TREND_CONFIG } from '../config/thresholds.js';
import { MeasurementRepository } from '../database/measurementRepository.js';

/**
 * Analyzer for trend anomalies
 * Detects sustained abnormal patterns over longer periods
 */
export class TrendAnalyzer {
  /**
   * Analyze a measurement for trend anomalies
   */
  static async analyze(measurement: Measurement): Promise<AnomalyResult> {
    const { measurement_type, value, box_id } = measurement;

    switch (measurement_type) {
      case 'temperature':
        return await this.analyzeTemperatureTrend(value, box_id);

      case 'pulse':
        return await this.analyzePulseTrend(value, box_id);

      case 'weight':
        return await this.analyzeWeightTrend(value, box_id);

      default:
        return { detected: false };
    }
  }

  /**
   * Analyze temperature trend (sustained increase)
   */
  private static async analyzeTemperatureTrend(
    currentValue: number,
    boxId: string
  ): Promise<AnomalyResult> {
    const config = TREND_CONFIG.temperature;

    const { first, last } = await MeasurementRepository.getFirstAndLast(
      boxId,
      'temperature',
      config.time_window_hours
    );

    if (!first || !last || first.id === last.id) {
      return { detected: false };
    }

    const increase = last.value - first.value;

    if (increase > config.max_increase) {
      return {
        detected: true,
        anomaly_type: 'TREND_ANOMALY',
        severity: this.calculateTrendSeverity(increase, config.max_increase),
        message: `Augmentation progressive de température : +${increase.toFixed(2)}°C sur ${config.time_window_hours} heures`,
        details: {
          current_value: currentValue,
          first_value: first.value,
          last_value: last.value,
          increase: increase,
          time_window_hours: config.time_window_hours,
          threshold: config.max_increase,
          first_timestamp: first.timestamp,
          last_timestamp: last.timestamp,
        },
      };
    }

    return { detected: false };
  }

  /**
   * Analyze pulse trend (sustained high values)
   */
  private static async analyzePulseTrend(
    currentValue: number,
    boxId: string
  ): Promise<AnomalyResult> {
    const config = TREND_CONFIG.pulse;

    // Count how many measurements are above the sustained threshold
    const countAbove = await MeasurementRepository.countAboveThreshold(
      boxId,
      'pulse',
      config.sustained_high,
      config.duration_hours
    );

    // Get total count to calculate percentage
    const stats = await MeasurementRepository.getStats(boxId, 'pulse', config.duration_hours);

    if (!stats || stats.count < 5) {
      // Not enough data
      return { detected: false };
    }

    const percentageAbove = (countAbove / stats.count) * 100;

    // If more than 80% of measurements are above threshold, it's sustained
    if (percentageAbove > 80 && countAbove >= 5) {
      return {
        detected: true,
        anomaly_type: 'TREND_ANOMALY',
        severity: this.calculateSustainedPulseSeverity(stats.avg, config.sustained_high),
        message: `Pouls élevé soutenu : ${stats.avg.toFixed(0)} bpm en moyenne sur ${config.duration_hours} heures (${countAbove}/${stats.count} mesures > ${config.sustained_high} bpm)`,
        details: {
          current_value: currentValue,
          avg_value: stats.avg,
          threshold: config.sustained_high,
          count_above: countAbove,
          total_count: stats.count,
          percentage_above: percentageAbove,
          time_window_hours: config.duration_hours,
        },
      };
    }

    return { detected: false };
  }

  /**
   * Analyze weight trend (significant change over period)
   */
  private static async analyzeWeightTrend(
    currentValue: number,
    boxId: string
  ): Promise<AnomalyResult> {
    const config = TREND_CONFIG.weight;

    const { first, last } = await MeasurementRepository.getFirstAndLast(
      boxId,
      'weight',
      config.time_window_days * 24 // Convert days to hours
    );

    if (!first || !last || first.id === last.id) {
      return { detected: false };
    }

    const change = last.value - first.value;

    if (Math.abs(change) > config.max_change) {
      const direction = change > 0 ? 'gain' : 'perte';
      return {
        detected: true,
        anomaly_type: 'TREND_ANOMALY',
        severity: this.calculateWeightTrendSeverity(Math.abs(change), config.max_change),
        message: `${direction.charAt(0).toUpperCase() + direction.slice(1)} de poids progressive : ${Math.abs(change).toFixed(2)} kg sur ${config.time_window_days} jours`,
        details: {
          current_value: currentValue,
          first_value: first.value,
          last_value: last.value,
          change: change,
          time_window_days: config.time_window_days,
          threshold: config.max_change,
          first_timestamp: first.timestamp,
          last_timestamp: last.timestamp,
        },
      };
    }

    return { detected: false };
  }

  /**
   * Calculate severity for trend increases
   */
  private static calculateTrendSeverity(increase: number, threshold: number): SeverityLevel {
    const ratio = increase / threshold;

    if (ratio >= 3.0) return 'CRITICAL';
    if (ratio >= 2.0) return 'HIGH';
    if (ratio >= 1.5) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Calculate severity for sustained high pulse
   */
  private static calculateSustainedPulseSeverity(
    avgValue: number,
    threshold: number
  ): SeverityLevel {
    const excess = avgValue - threshold;

    if (excess >= 40) return 'CRITICAL'; // Avg 160+ bpm
    if (excess >= 30) return 'HIGH'; // Avg 150+ bpm
    if (excess >= 20) return 'MEDIUM'; // Avg 140+ bpm
    return 'LOW';
  }

  /**
   * Calculate severity for weight trend
   */
  private static calculateWeightTrendSeverity(change: number, threshold: number): SeverityLevel {
    const ratio = change / threshold;

    if (ratio >= 3.0) return 'CRITICAL'; // 15+ kg change
    if (ratio >= 2.0) return 'HIGH'; // 10+ kg change
    if (ratio >= 1.5) return 'MEDIUM'; // 7.5+ kg change
    return 'LOW';
  }
}
