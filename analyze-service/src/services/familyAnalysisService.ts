import type { FamilyAnalyseResultDTO, FamilyState, MeasurementType } from '../types.js';
import { MeasurementRepository } from '../database/measurementRepository.js';

/**
 * Service for family analysis (simplified view over 7 days)
 */
export class FamilyAnalysisService {
  /**
   * Analyze measurements for family members
   * Simple analysis over the last 7 days
   */
  static async analyze(boxId: string): Promise<FamilyAnalyseResultDTO> {
    const measurementTypes: MeasurementType[] = ['temperature', 'pulse', 'weight'];
    const period = 7; // days

    // Get statistics for all measurement types
    const statsPromises = measurementTypes.map((type) =>
      MeasurementRepository.getStats(boxId, type, period * 24)
    );

    const [tempStats, pulseStats, weightStats] = await Promise.all(statsPromises);

    // Analyze each metric
    const tempScore = this.analyzeTemperature(tempStats?.avg);
    const pulseScore = this.analyzePulse(pulseStats?.avg);
    const weightScore = this.analyzeWeight(weightStats);

    // Combine scores to determine overall state
    const scores = [tempScore, pulseScore, weightScore].filter((s) => s !== null);
    const worstScore = Math.max(...scores);

    const state = this.getStateFromScore(worstScore);
    const message = this.generateMessage(state, tempScore, pulseScore, weightScore);

    return { state, message };
  }

  /**
   * Analyze temperature average
   * Returns score: 0 = great, 1 = okay, 2 = bad, 3 = terrible
   */
  private static analyzeTemperature(avg: number | undefined): number {
    if (avg === undefined) return 0; // No data

    if (avg < 34.0 || avg > 39.0) return 3; // terrible
    if (avg < 35.0 || avg > 38.0) return 2; // bad
    if (avg < 36.0 || avg > 37.5) return 1; // okay
    return 0; // great (36-37.5°C)
  }

  /**
   * Analyze pulse average
   * Returns score: 0 = great, 1 = okay, 2 = bad, 3 = terrible
   */
  private static analyzePulse(avg: number | undefined): number {
    if (avg === undefined) return 0; // No data

    if (avg < 45 || avg > 140) return 3; // terrible
    if (avg < 50 || avg > 120) return 2; // bad
    if (avg < 60 || avg > 100) return 1; // okay
    return 0; // great (60-100 bpm)
  }

  /**
   * Analyze weight variation
   * Returns score: 0 = great, 1 = okay, 2 = bad, 3 = terrible
   */
  private static analyzeWeight(stats: any): number {
    if (!stats || stats.count < 5) return 0; // Not enough data

    const variation = stats.max - stats.min;

    if (variation > 10) return 3; // terrible (>10kg variation)
    if (variation > 5) return 2; // bad (5-10kg)
    if (variation > 2) return 1; // okay (2-5kg)
    return 0; // great (<2kg)
  }

  /**
   * Convert numeric score to family state
   */
  private static getStateFromScore(score: number): FamilyState {
    if (score >= 3) return 'terrible';
    if (score >= 2) return 'bad';
    if (score >= 1) return 'okay';
    return 'great';
  }

  /**
   * Generate a human-readable message based on the analysis
   */
  private static generateMessage(
    state: FamilyState,
    tempScore: number,
    pulseScore: number,
    weightScore: number
  ): string {
    const issues: string[] = [];

    if (tempScore >= 2) issues.push('température anormale');
    else if (tempScore === 1) issues.push('température légèrement élevée');

    if (pulseScore >= 2) issues.push('rythme cardiaque préoccupant');
    else if (pulseScore === 1) issues.push('rythme cardiaque un peu élevé');

    if (weightScore >= 2) issues.push('variation de poids importante');
    else if (weightScore === 1) issues.push('légère variation de poids');

    switch (state) {
      case 'great':
        return 'Tout va bien ! Les paramètres vitaux sont normaux sur les 7 derniers jours.';

      case 'okay':
        if (issues.length > 0) {
          return `Globalement stable, mais attention à la ${issues.join(' et ')}.`;
        }
        return 'Situation stable avec quelques variations mineures.';

      case 'bad':
        if (issues.length > 0) {
          return `Surveillance recommandée : ${issues.join(', ')} détecté${issues.length > 1 ? 's' : ''}.`;
        }
        return 'Plusieurs indicateurs sont hors des valeurs normales. Surveillance recommandée.';

      case 'terrible':
        if (issues.length > 0) {
          return `⚠️ Situation préoccupante : ${issues.join(', ')}. Contactez rapidement un professionnel de santé.`;
        }
        return '⚠️ Plusieurs paramètres vitaux sont très anormaux. Contactez rapidement un professionnel de santé.';

      default:
        return 'Analyse indisponible.';
    }
  }
}
