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
 * Family analysis state
 */
export type FamilyState = 'great' | 'okay' | 'bad' | 'terrible';

/**
 * Family analysis result DTO
 */
export interface FamilyAnalyseResultDTO {
  state: FamilyState;
  message: string;
}

/**
 * Doctor analysis severity
 */
export type DoctorSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Doctor analysis result DTO
 */
export interface DoctorAnalyseResultDTO {
  severity: DoctorSeverity;
  reason: string | null;
}

/**
 * Box entity from database
 */
export interface Box {
  box_id: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
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
