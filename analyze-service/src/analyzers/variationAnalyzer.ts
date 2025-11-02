import type { Measurement, AnomalyResult, SeverityLevel } from '../types.js';
import { VARIATION_CONFIG } from '../config/thresholds.js';
import { MeasurementRepository } from '../database/measurementRepository.js';

/**
 * Analyzer for sudden variations
 * Detects rapid changes in measurements over short time windows
 */
export class VariationAnalyzer {
  /**
   * Analyze a measurement for sudden variations
   */
  static async analyze(measurement: Measurement): Promise<AnomalyResult> {
    const { measurement_type, value, box_id } = measurement;

    switch (measurement_type) {
      case 'temperature':
        return await this.analyzeTemperatureVariation(value, box_id);

      case 'pulse':
        return await this.analyzePulseVariation(value, box_id);

      case 'weight':
        return await this.analyzeWeightVariation(value, box_id);

      default:
        return { detected: false };
    }
  }

  /**
   * Analyze temperature variation
   */
  private static async analyzeTemperatureVariation(
    currentValue: number,
    boxId: string
  ): Promise<AnomalyResult> {
    const config = VARIATION_CONFIG.temperature;

    const measurements = await MeasurementRepository.getInTimeWindow(
      boxId,
      'temperature',
      config.time_window_minutes
    );

    if (measurements.length < 2) {
      return { detected: false };
    }

    // Get oldest measurement in window
    const oldestValue = measurements[measurements.length - 1].value;
    const delta = currentValue - oldestValue;

    if (Math.abs(delta) > config.max_delta) {
      const direction = delta > 0 ? 'augmentation' : 'diminution';
      return {
        detected: true,
        anomaly_type: 'SUDDEN_VARIATION',
        severity: this.calculateVariationSeverity(Math.abs(delta), config.max_delta),
        message: `${direction.charAt(0).toUpperCase() + direction.slice(1)} rapide de température : ${Math.abs(delta).toFixed(2)}°C en ${config.time_window_minutes} minutes`,
        details: {
          current_value: currentValue,
          previous_value: oldestValue,
          variation: delta,
          time_window_minutes: config.time_window_minutes,
          threshold: config.max_delta,
        },
      };
    }

    return { detected: false };
  }

  /**
   * Analyze pulse variation
   */
  private static async analyzePulseVariation(
    currentValue: number,
    boxId: string
  ): Promise<AnomalyResult> {
    const config = VARIATION_CONFIG.pulse;

    const measurements = await MeasurementRepository.getInTimeWindow(
      boxId,
      'pulse',
      config.time_window_minutes
    );

    if (measurements.length < 2) {
      return { detected: false };
    }

    // Get oldest measurement in window
    const oldestValue = measurements[measurements.length - 1].value;
    const delta = currentValue - oldestValue;

    if (Math.abs(delta) > config.max_delta) {
      const direction = delta > 0 ? 'augmentation' : 'diminution';
      return {
        detected: true,
        anomaly_type: 'SUDDEN_VARIATION',
        severity: this.calculateVariationSeverity(Math.abs(delta), config.max_delta),
        message: `${direction.charAt(0).toUpperCase() + direction.slice(1)} rapide du pouls : ${Math.abs(delta).toFixed(0)} bpm en ${config.time_window_minutes} minutes`,
        details: {
          current_value: currentValue,
          previous_value: oldestValue,
          variation: delta,
          time_window_minutes: config.time_window_minutes,
          threshold: config.max_delta,
        },
      };
    }

    return { detected: false };
  }

  /**
   * Analyze weight variation
   */
  private static async analyzeWeightVariation(
    currentValue: number,
    boxId: string
  ): Promise<AnomalyResult> {
    const config = VARIATION_CONFIG.weight;

    const measurements = await MeasurementRepository.getInTimeWindow(
      boxId,
      'weight',
      config.time_window_hours * 60 // Convert hours to minutes
    );

    if (measurements.length < 2) {
      return { detected: false };
    }

    // Get oldest measurement in window
    const oldestValue = measurements[measurements.length - 1].value;
    const delta = currentValue - oldestValue;

    if (Math.abs(delta) > config.max_delta) {
      const direction = delta > 0 ? 'gain' : 'perte';
      return {
        detected: true,
        anomaly_type: 'SUDDEN_VARIATION',
        severity: this.calculateVariationSeverity(Math.abs(delta), config.max_delta),
        message: `${direction.charAt(0).toUpperCase() + direction.slice(1)} rapide de poids : ${Math.abs(delta).toFixed(2)} kg en ${config.time_window_hours} heures`,
        details: {
          current_value: currentValue,
          previous_value: oldestValue,
          variation: delta,
          time_window_hours: config.time_window_hours,
          threshold: config.max_delta,
        },
      };
    }

    return { detected: false };
  }

  /**
   * Calculate severity based on variation magnitude
   */
  private static calculateVariationSeverity(variation: number, threshold: number): SeverityLevel {
    const ratio = variation / threshold;

    if (ratio >= 3.0) return 'CRITICAL';
    if (ratio >= 2.0) return 'HIGH';
    if (ratio >= 1.5) return 'MEDIUM';
    return 'LOW';
  }
}
