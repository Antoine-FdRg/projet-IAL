import pool from './connection.js';
import type { Box } from '../types.js';

/**
 * Repository for box-related database operations
 */
export class BoxRepository {
  /**
   * Check if a box exists by ID
   */
  static async exists(boxId: string): Promise<boolean> {
    const query = `SELECT 1 FROM boxes WHERE box_id = $1`;
    const result = await pool.query(query, [boxId]);
    return result.rows.length > 0;
  }

  /**
   * Get a box by ID
   */
  static async getById(boxId: string): Promise<Box | null> {
    const query = `
      SELECT box_id, description, created_at, updated_at
      FROM boxes
      WHERE box_id = $1
    `;
    const result = await pool.query(query, [boxId]);
    return result.rows[0] || null;
  }
}
