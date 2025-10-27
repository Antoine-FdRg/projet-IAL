import type { RawMeasurement } from "./type";
import dotenv from "dotenv";

dotenv.config();

export class CleanService {
  static cleanMeasurement(data: Uint8Array<ArrayBufferLike>): RawMeasurement | null {
    return cleanMeasurement(data);
  }
}

/**
 * Validation de la structure de l'objet décodé
 * {
 *    "type" : MeasurementType
 *    "value" : number,
 *    "unit" : string,
 *    "timestamp": string
 * }
 * @param obj
 */
const isValidMeasurementStructure = (obj: any): obj is { boxId: string; dataList: any[] } => {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.type === 'string' &&
    typeof obj.value === 'number' &&
    typeof obj.unit === 'string' &&
    typeof obj.timestamp === 'string';
};

const cleanSingleMeasurement = (measurement: any): RawMeasurement | null => {
  try {
    if (!measurement || typeof measurement !== 'object') {
      return null;
    }
    const { type, value, unit, timestamp } = measurement;
    if (typeof type !== 'string' || type.trim() === '') {
      return null;
    }
    if (typeof value !== 'number' || isNaN(value)) {
      return null;
    }
    if (typeof unit !== 'string') {
      return null;
    }
    if (typeof timestamp !== 'string' || timestamp.trim() === '') {
      return null;
    }

    return { type, value, unit, timestamp } as RawMeasurement;
  } catch (error) {
    console.error(`❌ Erreur lors du nettoyage de la mesure:`, error);
    return null;
  }
};

const cleanMeasurement = (data: Uint8Array<ArrayBufferLike>): RawMeasurement | null => {
  try {
    const decoder = new TextDecoder();
    const decodedString = decoder.decode(data);

    if (!decodedString.trim()) {
      return null;
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(decodedString);
    } catch (parseError) {
      return null;
    }

    if (!isValidMeasurementStructure(parsedData)) {
      return null;
    }

    const cleanMeasurements: RawMeasurement | null = cleanSingleMeasurement(parsedData);
    if (!cleanMeasurements) {
        return null;
    }

    return cleanMeasurements;
  } catch (error) {
    return null;
  }
}