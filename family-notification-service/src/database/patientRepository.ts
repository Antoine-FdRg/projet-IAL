import userDbPool from './userDbConnection.js';
import type { Patient } from '../types.js';

/**
 * Repository for patient queries
 */
export class PatientRepository {
  /**
   * Get all patients that have at least one 'proche' (family member)
   * Returns patient info with station_token for analysis
   */
  static async getPatientsWithProches(): Promise<Patient[]> {
    const query = `
      SELECT DISTINCT
        p.nss,
        p.nom,
        p.prenom,
        p.station_token
      FROM patient p
      INNER JOIN rel_patient_externe rpe ON p.nss = rpe.id_patient
      WHERE rpe.type = 'proche'
        AND p.station_token IS NOT NULL
      ORDER BY p.nom, p.prenom
    `;

    try {
      const result = await userDbPool.query(query);
      console.log(`[${new Date().toISOString()}] - Found ${result.rows.length} patients with family members`);
      return result.rows as Patient[];
    } catch (error) {
      console.error(`[${new Date().toISOString()}] - Error fetching patients with proches:`, error);
      throw error;
    }
  }
}
