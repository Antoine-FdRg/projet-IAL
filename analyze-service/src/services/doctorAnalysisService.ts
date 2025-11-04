import type { DoctorAnalyseResultDTO, DoctorSeverity, Measurement, AnomalyResult } from '../types.js';
import { MeasurementRepository } from '../database/measurementRepository.js';
import { AbsoluteThresholdAnalyzer } from '../analyzers/absoluteThresholdAnalyzer.js';
import { VariationAnalyzer } from '../analyzers/variationAnalyzer.js';
import { TrendAnalyzer } from '../analyzers/trendAnalyzer.js';

/**
 * Service for doctor analysis (detailed view over 24 hours)
 */
export class DoctorAnalysisService {
  /**
   * Analyze measurements for doctors
   * Comprehensive analysis using all 3 analyzers over last 24 hours
   */
  static async analyze(boxId: string): Promise<DoctorAnalyseResultDTO> {
    const hours = 24;

    // Get all recent measurements (last 24h) for all types
    const measurementTypes = ['temperature', 'pulse', 'weight'] as const;

    const allMeasurements: Measurement[] = [];

    for (const type of measurementTypes) {
      const measurements = await MeasurementRepository.getInTimeWindow(
        boxId,
        type,
        hours * 60 // Convert to minutes
      );
      allMeasurements.push(...measurements);
    }

    if (allMeasurements.length === 0) {
      return {
        severity: 'LOW',
        reason: null,
      };
    }

    // Analyze each measurement with all 3 analyzers
    const anomalies: Array<{ measurement: Measurement; result: AnomalyResult }> = [];

    for (const measurement of allMeasurements) {
      const [threshold, variation, trend] = await Promise.all([
        AbsoluteThresholdAnalyzer.analyze(measurement),
        VariationAnalyzer.analyze(measurement),
        TrendAnalyzer.analyze(measurement),
      ]);

      // Collect detected anomalies
      if (threshold.detected) {
        anomalies.push({ measurement, result: threshold });
      }
      if (variation.detected) {
        anomalies.push({ measurement, result: variation });
      }
      if (trend.detected) {
        anomalies.push({ measurement, result: trend });
      }
    }

    // No anomalies detected
    if (anomalies.length === 0) {
      return {
        severity: 'LOW',
        reason: null,
      };
    }

    // Find the worst severity
    const worstAnomaly = this.findWorstAnomaly(anomalies);
    const severity = this.convertSeverity(worstAnomaly.result.severity!);
    const reason = this.generateReason(anomalies);

    return {
      severity,
      reason,
    };
  }

  /**
   * Find the anomaly with the highest severity
   */
  private static findWorstAnomaly(
    anomalies: Array<{ measurement: Measurement; result: AnomalyResult }>
  ): { measurement: Measurement; result: AnomalyResult } {
    const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

    return anomalies.reduce((worst, current) => {
      const worstLevel = severityOrder[worst.result.severity!];
      const currentLevel = severityOrder[current.result.severity!];
      return currentLevel > worstLevel ? current : worst;
    });
  }

  /**
   * Convert internal severity to doctor severity
   */
  private static convertSeverity(severity: string): DoctorSeverity {
    return severity as DoctorSeverity;
  }

  /**
   * Generate reason based on detected anomalies
   */
  private static generateReason(
    anomalies: Array<{ measurement: Measurement; result: AnomalyResult }>
  ): string {
    // Group anomalies by measurement type and anomaly type
    const grouped = this.groupAnomaliesByTypeAndCategory(anomalies);

    // Build detailed description for each measurement type
    const descriptions: string[] = [];

    for (const [measurementType, categories] of Object.entries(grouped)) {
      const typeLabel = this.getMeasurementTypeLabel(measurementType);
      const details: string[] = [];

      // Seuils absolus
      if (categories.thresholds.length > 0) {
        const worstThreshold = this.getWorstAnomaly(categories.thresholds);
        const msg = worstThreshold.result.message!;
        // Extract key info from message
        const extracted = this.extractKeyInfo(msg, measurementType);
        details.push(extracted);
      }

      // Variations brusques
      if (categories.variations.length > 0) {
        const worstVariation = this.getWorstAnomaly(categories.variations);
        const msg = worstVariation.result.message!;
        const extracted = this.extractKeyInfo(msg, measurementType);
        details.push(extracted);
      }

      // Tendances
      if (categories.trends.length > 0) {
        const worstTrend = this.getWorstAnomaly(categories.trends);
        const msg = worstTrend.result.message!;
        const extracted = this.extractKeyInfo(msg, measurementType);
        details.push(extracted);
      }

      if (details.length > 0) {
        descriptions.push(`${typeLabel}: ${details.join(', ')}`);
      }
    }

    return descriptions.join(' | ');
  }

  /**
   * Group anomalies by measurement type and category
   */
  private static groupAnomaliesByTypeAndCategory(
    anomalies: Array<{ measurement: Measurement; result: AnomalyResult }>
  ): Record<string, { thresholds: any[]; variations: any[]; trends: any[] }> {
    const grouped: Record<string, { thresholds: any[]; variations: any[]; trends: any[] }> = {};

    for (const anomaly of anomalies) {
      const type = anomaly.measurement.measurement_type;

      if (!grouped[type]) {
        grouped[type] = { thresholds: [], variations: [], trends: [] };
      }

      switch (anomaly.result.anomaly_type) {
        case 'ABSOLUTE_THRESHOLD':
          grouped[type].thresholds.push(anomaly);
          break;
        case 'SUDDEN_VARIATION':
          grouped[type].variations.push(anomaly);
          break;
        case 'TREND_ANOMALY':
          grouped[type].trends.push(anomaly);
          break;
      }
    }

    return grouped;
  }

  /**
   * Get worst anomaly from a list
   */
  private static getWorstAnomaly(
    anomalies: Array<{ measurement: Measurement; result: AnomalyResult }>
  ): { measurement: Measurement; result: AnomalyResult } {
    const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

    return anomalies.reduce((worst, current) => {
      const worstLevel = severityOrder[worst.result.severity!];
      const currentLevel = severityOrder[current.result.severity!];
      return currentLevel > worstLevel ? current : worst;
    });
  }

  /**
   * Extract key information from anomaly message
   */
  private static extractKeyInfo(message: string, measurementType: string): string {
    // Extract numeric values and time windows from the message
    const numberRegex = /(\d+\.?\d*)\s*(°C|bpm|kg|heures?|minutes?|jours?)/g;
    const matches = [...message.matchAll(numberRegex)];

    // Temperature
    if (measurementType === 'temperature') {
      if (message.includes('Augmentation progressive')) {
        const increase = matches.find(m => message.includes(`+${m[1]}`));
        const duration = matches.find(m => m[2].includes('heure'));
        if (increase && duration) {
          return `+${increase[1]}°C en ${duration[1]}h`;
        }
      } else if (message.includes('variation') || message.includes('Augmentation') || message.includes('Diminution')) {
        const delta = matches[0];
        const time = matches.find(m => m[2].includes('minute'));
        if (delta && time) {
          return `Δ ${delta[1]}°C en ${time[1]} min`;
        }
      } else {
        // Seuil absolu
        const temp = matches[0];
        if (message.includes('trop basse')) {
          return `${temp[1]}°C (hypothermie)`;
        } else if (message.includes('trop élevée')) {
          return `${temp[1]}°C (hyperthermie)`;
        }
      }
    }

    // Pulse
    if (measurementType === 'pulse') {
      if (message.includes('soutenu') || message.includes('Pouls élevé')) {
        const avg = matches.find(m => message.includes('moyenne'));
        const duration = matches.find(m => m[2].includes('heure'));
        if (avg && duration) {
          return `${avg[1]} bpm moyen sur ${duration[1]}h`;
        }
      } else if (message.includes('variation') || message.includes('Augmentation') || message.includes('Diminution')) {
        const delta = matches.find(m => !m[0].includes('bpm en'));
        const time = matches.find(m => m[2].includes('minute'));
        if (delta && time) {
          return `Δ ${delta[1]} bpm en ${time[1]} min`;
        }
      } else {
        // Seuil absolu
        const pulse = matches[0];
        if (message.includes('bradycardie')) {
          return `${pulse[1]} bpm (bradycardie)`;
        } else if (message.includes('tachycardie')) {
          return `${pulse[1]} bpm (tachycardie)`;
        }
      }
    }

    // Weight
    if (measurementType === 'weight') {
      if (message.includes('progressive')) {
        const change = matches.find(m => message.includes(m[1] + ' kg'));
        const duration = matches.find(m => m[2].includes('jour'));
        if (change && duration) {
          const direction = message.includes('Gain') ? '+' : '-';
          return `${direction}${change[1]} kg en ${duration[1]} jours`;
        }
      } else if (message.includes('rapide')) {
        const delta = matches.find(m => message.includes(m[1] + ' kg'));
        const time = matches.find(m => m[2].includes('heure'));
        if (delta && time) {
          const direction = message.includes('Gain') ? '+' : '-';
          return `${direction}${delta[1]} kg en ${time[1]}h`;
        }
      } else {
        // Seuil absolu (variation from average)
        const currentMatch = message.match(/(\d+\.?\d*)\s*kg\s*\(moyenne/);
        const ecartMatch = message.match(/écart:\s*(\d+\.?\d*)\s*kg/);
        const periodMatch = message.match(/moyenne sur\s*(\d+)j/);

        if (currentMatch && ecartMatch && periodMatch) {
          const current = parseFloat(currentMatch[1]);
          const ecart = parseFloat(ecartMatch[1]);
          const period = periodMatch[1];

          // Determine if it's gain or loss based on message
          const direction = message.includes('Gain') ? '+' : '-';
          return `${current} kg (${direction}${ecart} kg vs moy. ${period}j)`;
        }
      }
    }

    // Fallback: return simplified message
    return message.substring(0, 80) + (message.length > 80 ? '...' : '');
  }

  /**
   * Get French label for measurement type
   */
  private static getMeasurementTypeLabel(type: string): string {
    switch (type) {
      case 'temperature':
        return 'Température';
      case 'pulse':
        return 'Pouls';
      case 'weight':
        return 'Poids';
      default:
        return type;
    }
  }

}
