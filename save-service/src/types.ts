/**
 * Types for save-service
 */

export type MeasurementType = 'temperature' | 'pulse' | 'weight' | 'steps';

/**
 * Single measurement from the box
 */
export interface RawMeasurement {
  type: MeasurementType;
  value: number;
  unit: string;
  timestamp: string;
}

/**
 * Request body from the box uploader service
 */
export interface MeasurementList {
  boxId: string;
  dataList: RawMeasurement[];
}

/**
 * Response sent back to the box
 */
export interface SaveResponse {
  success: boolean;
  message?: string;
}

/**
 * Box entity from database
 */
export interface Box {
  box_id: string; // UUID serving as both identifier and authentication token
  description?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Measurement entity for database insertion
 */
export interface MeasurementRecord {
  box_id: string;
  measurement_type: MeasurementType;
  value: number;
  unit: string;
  timestamp: Date;
}
