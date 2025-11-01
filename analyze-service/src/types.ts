/**
 * Types for analyze-service
 */

export type MeasurementType = 'temperature' | 'pulse' | 'weight' | 'steps';

export type AnomalyType =
  | 'ABSOLUTE_THRESHOLD'    // Seuil absolu dépassé
  | 'SUDDEN_VARIATION'      // Variation brusque
  | 'TREND_ANOMALY';        // Tendance anormale sur durée

export type SeverityLevel =
  | 'LOW'       // Surveillance recommandée
  | 'MEDIUM'    // Attention requise
  | 'HIGH'      // Intervention recommandée
  | 'CRITICAL'; // Urgence médicale

/**
 * Measurement from database
 */
export interface Measurement {
  id: number;
  box_id: string;
  measurement_type: MeasurementType;
  value: number;
  unit: string;
  timestamp: Date;
  created_at: Date;
}

/**
 * PostgreSQL NOTIFY payload
 */
export interface MeasurementNotification {
  id: number;
  box_id: string;
  measurement_type: MeasurementType;
  value: number;
  unit: string;
  timestamp: string;
}

/**
 * Historical statistics for a measurement type
 */
export interface MeasurementStats {
  count: number;
  avg: number;
  min: number;
  max: number;
  stddev: number;
  recent_values: number[]; // Last N values for trend analysis
}

/**
 * Anomaly detection result
 */
export interface AnomalyResult {
  detected: boolean;
  anomaly_type?: AnomalyType;
  severity?: SeverityLevel;
  message?: string;
  details?: {
    current_value: number;
    threshold?: number;
    variation?: number;
    context?: MeasurementStats;
    [key: string]: any;
  };
}

/**
 * Alert to be displayed/sent
 */
export interface Alert {
  timestamp: Date;
  box_id: string;
  measurement_type: MeasurementType;
  current_value: number;
  unit: string;
  anomaly_type: AnomalyType;
  severity: SeverityLevel;
  message: string;
  context: {
    avg_1h?: number;
    variation?: string;
    trend?: string;
    [key: string]: any;
  };
  recommendation: string;
}

/**
 * Threshold configuration for absolute threshold analyzer
 */
export interface ThresholdConfig {
  temperature: {
    min: number;
    max: number;
    unit: string;
  };
  pulse: {
    min: number;
    max: number;
    unit: string;
  };
  weight: {
    max_deviation_from_avg: number; // kg
    avg_period_days: number;
    unit: string;
  };
}

/**
 * Variation configuration for variation analyzer
 */
export interface VariationConfig {
  temperature: {
    max_delta: number;      // °C
    time_window_minutes: number;
  };
  pulse: {
    max_delta: number;      // bpm
    time_window_minutes: number;
  };
  weight: {
    max_delta: number;      // kg
    time_window_hours: number;
  };
}

/**
 * Trend configuration for trend analyzer
 */
export interface TrendConfig {
  temperature: {
    max_increase: number;   // °C
    time_window_hours: number;
  };
  pulse: {
    sustained_high: number; // bpm
    duration_hours: number;
  };
  weight: {
    max_change: number;     // kg
    time_window_days: number;
  };
}
