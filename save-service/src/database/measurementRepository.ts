import pool from './connection.js';
import type { MeasurementRecord } from '../types.js';

/**
 * Repository for measurement-related database operations
 */
export class MeasurementRepository {
  /**
   * Insert multiple measurements in a single transaction
   * @param measurements - Array of measurements to insert
   * @returns Number of measurements inserted
   */
  static async insertBatch(measurements: MeasurementRecord[]): Promise<number> {
    if (measurements.length === 0) {
      return 0;
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Build the multi-row INSERT query
      const values: any[] = [];
      const placeholders: string[] = [];

      measurements.forEach((m, index) => {
        const baseIndex = index * 5;
        placeholders.push(
          `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5})`
        );
        values.push(
          m.box_id,
          m.measurement_type,
          m.value,
          m.unit,
          m.timestamp
        );
      });

      const query = `
        INSERT INTO measurements (box_id, measurement_type, value, unit, timestamp)
        VALUES ${placeholders.join(', ')}
      `;

      await client.query(query, values);
      await client.query('COMMIT');

      console.log(`[${new Date().toISOString()}] - Inserted ${measurements.length} measurements for box ${measurements[0].box_id}`);
      return measurements.length;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`[${new Date().toISOString()}] - Error inserting measurements:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Insert a single measurement
   */
  static async insert(measurement: MeasurementRecord): Promise<void> {
    await this.insertBatch([measurement]);
  }

  /**
   * Get recent measurements for a box
   */
  static async getRecent(boxId: string, limit: number = 100): Promise<any[]> {
    const query = `
      SELECT * FROM measurements
      WHERE box_id = $1
      ORDER BY timestamp DESC
      LIMIT $2
    `;
    const result = await pool.query(query, [boxId, limit]);
    return result.rows;
  }
}
