import pool from './connection.js';
import type { Box } from '../types.js';

/**
 * Repository for box-related database operations
 */
export class BoxRepository {
  /**
   * Find a box by its box_id (UUID)
   */
  static async findByBoxId(boxId: string): Promise<Box | null> {
    const query = 'SELECT * FROM boxes WHERE box_id = $1';
    const result = await pool.query(query, [boxId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as Box;
  }

  /**
   * Verify that a box exists with the given UUID token
   * @param token - The bearer token (UUID)
   * @returns true if box exists with this UUID
   */
  static async verifyToken(token: string): Promise<boolean> {
    try {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(token)) {
        console.warn(`[${new Date().toISOString()}] - Invalid UUID format: ${token}`);
        return false;
      }

      const box = await this.findByBoxId(token);

      if (!box) {
        console.warn(`[${new Date().toISOString()}] - Box not found: ${token}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] - Error verifying token:`, error);
      return false;
    }
  }

  /**
   * Check if a box exists (without token verification)
   */
  static async exists(boxId: string): Promise<boolean> {
    const box = await this.findByBoxId(boxId);
    return box !== null;
  }
}
