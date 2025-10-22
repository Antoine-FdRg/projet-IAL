import type {RawMeasurement, MeasurementList} from "./type.js";
import dotenv from "dotenv";

dotenv.config();

export class NormalizerService {
    static normalizeMeasurementList(data: Uint8Array<ArrayBufferLike>): MeasurementList | null {
        return normalizeMeasurementList(data);
    }
}

const normalizeMeasurementList = (data: Uint8Array<ArrayBufferLike>): MeasurementList | null => {
    try {
        const jsonString = new TextDecoder().decode(data);
        const rawData = JSON.parse(jsonString) as MeasurementList;
        if (!rawData.boxId || !Array.isArray(rawData.dataList)) {
            console.error(`[${new Date().toISOString()}] - Invalid data structure: missing boxId or dataList`);
            return null;
        }

        // Normalize each measurement
        const normalizedDataList: RawMeasurement[] = rawData.dataList
            .map(normalizeMeasurement)
            .filter(measurement => measurement !== null) as RawMeasurement[];

        if (normalizedDataList.length === 0) {
            console.error(`[${new Date().toISOString()}] - No valid measurements after normalization`);
            return null;
        }

        return {
            boxId: rawData.boxId,
            dataList: normalizedDataList
        };
    } catch (error) {
        console.error(`[${new Date().toISOString()}] - Error parsing measurement data:`, error);
        return null;
    }
};

const normalizeMeasurement = (measurement: RawMeasurement): RawMeasurement | null => {
    try {
        // Validate required fields
        if (!measurement.type || !measurement.unit || !measurement.timestamp) {
            console.error(`[${new Date().toISOString()}] - Invalid measurement: missing required fields`);
            return null;
        }

        // Validate timestamp format
        const timestamp = new Date(measurement.timestamp);
        if (isNaN(timestamp.getTime())) {
            console.error(`[${new Date().toISOString()}] - Invalid timestamp format`);
            return null;
        }

        let normalizedValue = measurement.value;
        let normalizedUnit = measurement.unit;

        switch (measurement.unit.toLowerCase()) {
            case 'lbs':
                normalizedValue = measurement.value * 0.45359237; // lbs to kg
                normalizedUnit = 'kg';
                break;
            case '°f':
            case 'f':
                // https://www.thoughtco.com/fahrenheit-to-celsius-formula-609230
                normalizedValue = ((measurement.value - 32) * 5) / 9; // °F to °C
                normalizedUnit = '°C';
                break;
            case 'bps':
                normalizedValue = measurement.value * 60; // bps to bpm
                normalizedUnit = 'bpm';
                break;
            default:
                break;
        }

        // Round to 2 decimal places for consistency
        normalizedValue = Math.round(normalizedValue * 100) / 100;

        return {
            type: measurement.type,
            value: normalizedValue,
            unit: normalizedUnit,
            timestamp: timestamp.toISOString()
        };
    } catch (error) {
        console.error(`[${new Date().toISOString()}] - Error normalizing measurement:`, error);
        return null;
    }
};
