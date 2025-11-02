import type { ThresholdConfig, VariationConfig, TrendConfig } from '../types.js';

/**
 * Configuration for absolute threshold detection
 * These are the baseline values that should never be exceeded
 */
export const THRESHOLD_CONFIG: ThresholdConfig = {
  temperature: {
    min: 35.0,      // °C - Below this is hypothermia risk
    max: 38.0,      // °C - Above this is fever/hyperthermia
    unit: '°C',
  },
  pulse: {
    min: 50,        // bpm - Below this is bradycardia
    max: 160,       // bpm - Above this is tachycardia (at rest)
    unit: 'bpm',
  },
  weight: {
    max_deviation_from_avg: 10,  // kg - More than 10kg deviation from recent average
    avg_period_days: 7,           // Calculate average over last 7 days
    unit: 'kg',
  },
};

/**
 * Configuration for sudden variation detection
 * These detect rapid changes in short time windows
 */
export const VARIATION_CONFIG: VariationConfig = {
  temperature: {
    max_delta: 1.5,           // °C change
    time_window_minutes: 30,  // Within 30 minutes
  },
  pulse: {
    max_delta: 30,            // bpm change
    time_window_minutes: 10,  // Within 10 minutes
  },
  weight: {
    max_delta: 3,             // kg change
    time_window_hours: 24,    // Within 24 hours
  },
};

/**
 * Configuration for trend detection
 * These detect sustained abnormal patterns over longer periods
 */
export const TREND_CONFIG: TrendConfig = {
  temperature: {
    max_increase: 1.0,        // °C increase
    time_window_hours: 4,     // Over 4 hours continuously
  },
  pulse: {
    sustained_high: 120,      // bpm threshold
    duration_hours: 2,        // Sustained for 2+ hours
  },
  weight: {
    max_change: 5,            // kg loss or gain
    time_window_days: 7,      // Over 7 days
  },
};

/**
 * Severity mapping based on how much a threshold is exceeded
 */
export const SEVERITY_MULTIPLIERS = {
  LOW: 1.0,       // Just at threshold
  MEDIUM: 1.2,    // 20% over threshold
  HIGH: 1.5,      // 50% over threshold
  CRITICAL: 2.0,  // 100% or more over threshold
};
