import type { Alert, SeverityLevel } from '../types.js';

/**
 * Service for managing and displaying alerts
 */
export class AlertService {
  /**
   * Display an alert in the console with formatted output
   */
  static displayAlert(alert: Alert): void {
    const icon = this.getSeverityIcon(alert.severity);
    const color = this.getSeverityColor(alert.severity);
    const timestamp = alert.timestamp.toISOString();

    console.log('\n' + '='.repeat(80));
    console.log(
      `${icon} [ALERTE ${alert.severity}] ${timestamp}`
    );
    console.log('='.repeat(80));
    console.log(`Box ID       : ${alert.box_id}`);
    console.log(`Type         : ${this.formatAnomalyType(alert.anomaly_type)}`);
    console.log(`Mesure       : ${alert.measurement_type} = ${alert.current_value} ${alert.unit}`);
    console.log(`Message      : ${alert.message}`);

    // Display context if available
    if (Object.keys(alert.context).length > 0) {
      console.log('\nContexte :');
      for (const [key, value] of Object.entries(alert.context)) {
        if (value !== undefined && value !== null) {
          console.log(`  - ${this.formatContextKey(key)}: ${this.formatContextValue(value)}`);
        }
      }
    }

    console.log(`\nRecommandation : ${alert.recommendation}`);
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Generate recommendation based on severity and anomaly type
   */
  static generateRecommendation(severity: SeverityLevel, measurementType: string): string {
    switch (severity) {
      case 'CRITICAL':
        return '🚨 URGENCE MÉDICALE - Contacter immédiatement le patient et envisager une intervention d\'urgence';

      case 'HIGH':
        return '⚠️  INTERVENTION URGENTE - Planifier une visite infirmière dans les prochaines heures';

      case 'MEDIUM':
        return '⚡ ATTENTION REQUISE - Surveillance rapprochée et visite infirmière dans les 24-48h si persistance';

      case 'LOW':
        return '👁️  SURVEILLANCE - Continuer à surveiller, contacter le patient pour vérifier son état';

      default:
        return 'Surveillance recommandée';
    }
  }

  /**
   * Get emoji icon for severity level
   */
  private static getSeverityIcon(severity: SeverityLevel): string {
    switch (severity) {
      case 'CRITICAL':
        return '🚨';
      case 'HIGH':
        return '⚠️';
      case 'MEDIUM':
        return '⚡';
      case 'LOW':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  }

  /**
   * Get color code for severity (ANSI)
   */
  private static getSeverityColor(severity: SeverityLevel): string {
    switch (severity) {
      case 'CRITICAL':
        return '\x1b[91m'; // Bright Red
      case 'HIGH':
        return '\x1b[31m'; // Red
      case 'MEDIUM':
        return '\x1b[33m'; // Yellow
      case 'LOW':
        return '\x1b[93m'; // Bright Yellow
      default:
        return '\x1b[0m'; // Reset
    }
  }

  /**
   * Format anomaly type for display
   */
  private static formatAnomalyType(type: string): string {
    switch (type) {
      case 'ABSOLUTE_THRESHOLD':
        return 'Dépassement de seuil absolu';
      case 'SUDDEN_VARIATION':
        return 'Variation brusque';
      case 'TREND_ANOMALY':
        return 'Tendance anormale';
      default:
        return type;
    }
  }

  /**
   * Format context key for display
   */
  private static formatContextKey(key: string): string {
    const keyMap: { [key: string]: string } = {
      avg_1h: 'Moyenne sur 1h',
      avg_value: 'Valeur moyenne',
      variation: 'Variation',
      trend: 'Tendance',
      previous_value: 'Valeur précédente',
      first_value: 'Première valeur',
      last_value: 'Dernière valeur',
      time_window_minutes: 'Fenêtre temporelle',
      time_window_hours: 'Fenêtre temporelle',
      time_window_days: 'Fenêtre temporelle',
      count_above: 'Mesures au-dessus du seuil',
      total_count: 'Total de mesures',
      percentage_above: 'Pourcentage au-dessus',
      threshold: 'Seuil',
      increase: 'Augmentation',
      change: 'Changement',
      avg_weight: 'Poids moyen',
      avg_period_days: 'Période moyenne',
    };

    return keyMap[key] || key;
  }

  /**
   * Format context value for display
   */
  private static formatContextValue(value: any): string {
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return String(value);
  }

  /**
   * Log normal measurement (no anomaly detected)
   */
  static logNormalMeasurement(
    boxId: string,
    measurementType: string,
    value: number,
    unit: string
  ): void {
    console.log(
      `[${new Date().toISOString()}] ✅ Mesure normale - Box: ${boxId} | ${measurementType}: ${value} ${unit}`
    );
  }

  /**
   * Log analysis start
   */
  static logAnalysisStart(
    boxId: string,
    measurementType: string,
    value: number,
    unit: string
  ): void {
    console.log(
      `[${new Date().toISOString()}] 🔍 Analyse - Box: ${boxId} | ${measurementType}: ${value} ${unit}`
    );
  }
}
