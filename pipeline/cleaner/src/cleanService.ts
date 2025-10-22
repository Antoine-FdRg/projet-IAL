import type { RawMeasurement, MeasurementList } from "./type.js";
import dotenv from "dotenv";

dotenv.config();

export class CleanService {
  static cleanMeasurementList(data: Uint8Array<ArrayBufferLike>): MeasurementList | null {
    return cleanMeasurementList(data);
  }
}

const isValidMeasurementListStructure = (obj: any): obj is { boxId: string; dataList: any[] } => {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.boxId === 'string' &&
    obj.boxId.trim() !== '' &&
    Array.isArray(obj.dataList);
};

const cleanSingleMeasurement = (measurement: any, index: number): RawMeasurement | null => {
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
    console.error(`❌ Erreur lors du nettoyage de la mesure ${index}:`, error);
    return null;
  }
};

const cleanMeasurementList = (data: Uint8Array<ArrayBufferLike>): MeasurementList | null => {
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

    if (!isValidMeasurementListStructure(parsedData)) {
      return null;
    }

    const { boxId, dataList } = parsedData;
    const cleanedMeasurements: RawMeasurement[] = [];
    let errorCount = 0;


    for (let i = 0; i < dataList.length; i++) {
      const cleanedMeasurement = cleanSingleMeasurement(dataList[i], i);
      if (cleanedMeasurement) {
        cleanedMeasurements.push(cleanedMeasurement);
      } else {
        errorCount++;
      }
    }

    if (cleanedMeasurements.length === 0) {
      return null;
    }

    if (errorCount > 0) {
    }

    return { boxId, dataList: cleanedMeasurements };

  } catch (error) {
    return null;
  }
}