import type { MeasurementList, MeasurementRecord, SaveResponse } from '../types.js';
import { MeasurementRepository } from '../database/measurementRepository.js';

/**
 * Service for processing and saving measurements
 */
export class SaveService {
  /**
   * Validate and save measurements to the database
   * @param data - Measurement data from the box
   * @returns SaveResponse indicating success or failure
   */
  static async saveMeasurements(data: MeasurementList): Promise<SaveResponse> {
    try {
      // Validate data structure
      const validationError = this.validateMeasurementList(data);
      if (validationError) {
        console.error(`[${new Date().toISOString()}] - Validation error:`, validationError);
        return {
          success: false,
          message: validationError,
        };
      }

      // Convert to database records
      const records: MeasurementRecord[] = data.dataList.map((measurement) => ({
        box_id: data.boxId,
        measurement_type: measurement.type,
        value: measurement.value,
        unit: measurement.unit,
        timestamp: new Date(measurement.timestamp),
      }));

      // Insert into database
      const count = await MeasurementRepository.insertBatch(records);

      console.log(
        `[${new Date().toISOString()}] - Successfully saved ${count} measurements for box ${data.boxId}`
      );

      return {
        success: true,
      };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] - Error saving measurements:`, error);
      return {
        success: false,
        message: 'Failed to save measurements to database',
      };
    }
  }

  /**
   * Validate the measurement list structure
   */
  private static validateMeasurementList(data: MeasurementList): string | null {
    if (!data.boxId || typeof data.boxId !== 'string') {
      return 'Invalid or missing boxId';
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(data.boxId)) {
      return 'boxId must be a valid UUID';
    }

    if (!Array.isArray(data.dataList)) {
      return 'dataList must be an array';
    }

    if (data.dataList.length === 0) {
      return 'dataList cannot be empty';
    }

    // Validate each measurement
    for (let i = 0; i < data.dataList.length; i++) {
      const measurement = data.dataList[i];

      if (!measurement.type || !this.isValidMeasurementType(measurement.type)) {
        return `Invalid measurement type at index ${i}: ${measurement.type}`;
      }

      if (typeof measurement.value !== 'number' || isNaN(measurement.value)) {
        return `Invalid value at index ${i}: must be a number`;
      }

      if (!measurement.unit || typeof measurement.unit !== 'string') {
        return `Invalid or missing unit at index ${i}`;
      }

      if (!measurement.timestamp || !this.isValidTimestamp(measurement.timestamp)) {
        return `Invalid timestamp at index ${i}: ${measurement.timestamp}`;
      }
    }

    return null;
  }

  /**
   * Check if measurement type is valid
   */
  private static isValidMeasurementType(type: string): boolean {
    const validTypes = ['temperature', 'pulse', 'weight', 'steps'];
    return validTypes.includes(type);
  }

  /**
   * Check if timestamp is a valid ISO 8601 string
   */
  private static isValidTimestamp(timestamp: string): boolean {
    const date = new Date(timestamp);
    return !isNaN(date.getTime());
  }
}
