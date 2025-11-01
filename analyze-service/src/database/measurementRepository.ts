import pool from './connection.js';
import type { Measurement, MeasurementStats, MeasurementType } from '../types.js';

/**
 * Repository for measurement-related database queries
 */
export class MeasurementRepository {
  /**
   * Get a single measurement by ID
   */
  static async getById(id: number): Promise<Measurement | null> {
    const query = `
      SELECT id, box_id, measurement_type, value, unit, timestamp, created_at
      FROM measurements
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get recent measurements for a box and type
   */
  static async getRecent(
    boxId: string,
    measurementType: MeasurementType,
    limit: number = 100
  ): Promise<Measurement[]> {
    const query = `
      SELECT id, box_id, measurement_type, value, unit, timestamp, created_at
      FROM measurements
      WHERE box_id = $1 AND measurement_type = $2
      ORDER BY timestamp DESC
      LIMIT $3
    `;
    const result = await pool.query(query, [boxId, measurementType, limit]);
    return result.rows;
  }

  /**
   * Get measurements within a time window
   */
  static async getInTimeWindow(
    boxId: string,
    measurementType: MeasurementType,
    minutesAgo: number
  ): Promise<Measurement[]> {
    const query = `
      SELECT id, box_id, measurement_type, value, unit, timestamp, created_at
      FROM measurements
      WHERE box_id = $1
        AND measurement_type = $2
        AND timestamp >= NOW() - INTERVAL '${minutesAgo} minutes'
      ORDER BY timestamp DESC
    `;
    const result = await pool.query(query, [boxId, measurementType]);
    return result.rows;
  }

  /**
   * Get statistical analysis for a measurement type over a time period
   */
  static async getStats(
    boxId: string,
    measurementType: MeasurementType,
    hoursAgo: number = 24
  ): Promise<MeasurementStats | null> {
    const query = `
      WITH recent_measurements AS (
        SELECT value, timestamp
        FROM measurements
        WHERE box_id = $1
          AND measurement_type = $2
          AND timestamp >= NOW() - INTERVAL '${hoursAgo} hours'
        ORDER BY timestamp DESC
      )
      SELECT
        COUNT(*)::int as count,
        COALESCE(AVG(value), 0)::numeric(10,2) as avg,
        COALESCE(MIN(value), 0)::numeric(10,2) as min,
        COALESCE(MAX(value), 0)::numeric(10,2) as max,
        COALESCE(STDDEV(value), 0)::numeric(10,2) as stddev,
        ARRAY_AGG(value ORDER BY timestamp DESC) as recent_values
      FROM recent_measurements
    `;
    const result = await pool.query(query, [boxId, measurementType]);

    if (result.rows[0].count === 0) {
      return null;
    }

    return {
      count: result.rows[0].count,
      avg: parseFloat(result.rows[0].avg),
      min: parseFloat(result.rows[0].min),
      max: parseFloat(result.rows[0].max),
      stddev: parseFloat(result.rows[0].stddev),
      recent_values: result.rows[0].recent_values || [],
    };
  }

  /**
   * Get average value over a specific period (for weight baseline)
   */
  static async getAverageInPeriod(
    boxId: string,
    measurementType: MeasurementType,
    days: number
  ): Promise<number | null> {
    const query = `
      SELECT AVG(value)::numeric(10,2) as avg_value
      FROM measurements
      WHERE box_id = $1
        AND measurement_type = $2
        AND timestamp >= NOW() - INTERVAL '${days} days'
    `;
    const result = await pool.query(query, [boxId, measurementType]);

    if (!result.rows[0].avg_value) {
      return null;
    }

    return parseFloat(result.rows[0].avg_value);
  }

  /**
   * Count measurements above a threshold in a time window
   */
  static async countAboveThreshold(
    boxId: string,
    measurementType: MeasurementType,
    threshold: number,
    hours: number
  ): Promise<number> {
    const query = `
      SELECT COUNT(*)::int as count
      FROM measurements
      WHERE box_id = $1
        AND measurement_type = $2
        AND value > $3
        AND timestamp >= NOW() - INTERVAL '${hours} hours'
    `;
    const result = await pool.query(query, [boxId, measurementType, threshold]);
    return result.rows[0].count;
  }

  /**
   * Get first and last measurement in a time window (for trend analysis)
   */
  static async getFirstAndLast(
    boxId: string,
    measurementType: MeasurementType,
    hours: number
  ): Promise<{ first: Measurement | null; last: Measurement | null }> {
    const query = `
      WITH ordered_measurements AS (
        SELECT id, box_id, measurement_type, value, unit, timestamp, created_at,
               ROW_NUMBER() OVER (ORDER BY timestamp ASC) as rn_asc,
               ROW_NUMBER() OVER (ORDER BY timestamp DESC) as rn_desc
        FROM measurements
        WHERE box_id = $1
          AND measurement_type = $2
          AND timestamp >= NOW() - INTERVAL '${hours} hours'
      )
      SELECT
        json_build_object(
          'id', id, 'box_id', box_id, 'measurement_type', measurement_type,
          'value', value, 'unit', unit, 'timestamp', timestamp, 'created_at', created_at
        ) as measurement,
        rn_asc, rn_desc
      FROM ordered_measurements
      WHERE rn_asc = 1 OR rn_desc = 1
    `;
    const result = await pool.query(query, [boxId, measurementType]);

    if (result.rows.length === 0) {
      return { first: null, last: null };
    }

    const first = result.rows.find((r) => r.rn_asc === 1)?.measurement || null;
    const last = result.rows.find((r) => r.rn_desc === 1)?.measurement || null;

    return { first, last };
  }
}
