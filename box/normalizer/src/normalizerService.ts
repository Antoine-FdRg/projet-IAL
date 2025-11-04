import type { RawMeasurement } from "./type";
import dotenv from "dotenv";

dotenv.config();

export class NormalizerService {
    static normalizeMeasurement(data: Uint8Array<ArrayBufferLike>): RawMeasurement | null {
        return normalizeMeasurement(data);
    }
}

const normalizeMeasurement = (data: Uint8Array<ArrayBufferLike>): RawMeasurement | null => {
    try {
        const jsonString = new TextDecoder().decode(data);
        const rawData: RawMeasurement = JSON.parse(jsonString) as RawMeasurement;

        if (!rawData) {
            console.error(`[${new Date().toISOString()}] - Parsed data is null or undefined`);
            return null;
        }

        // Normalize each measurement
        const normalizedData: RawMeasurement | null = normalizeMeasurementLogic(rawData);

        if (!normalizedData) {
            console.error(`[${new Date().toISOString()}] - Normalization failed for the measurement data`);
            return null;
        }

        return normalizedData;
    } catch (error) {
        console.error(`[${new Date().toISOString()}] - Error parsing measurement data:`, error);
        return null;
    }
};

const normalizeMeasurementLogic = (measurement: RawMeasurement): RawMeasurement | null => {
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
                console.log(`[${new Date().toISOString()}] - Normalized lbs to kg`);
                break;
            case '°F':
            case 'F':
                // https://www.thoughtco.com/fahrenheit-to-celsius-formula-609230
                normalizedValue = ((measurement.value - 32) * 5) / 9; // °F to °C
                normalizedUnit = '°C';
                console.log(`[${new Date().toISOString()}] - Normalized °F to °C`);
                break;
            case 'bps':
                normalizedValue = measurement.value * 60; // bps to bpm
                normalizedUnit = 'bpm';
                console.log(`[${new Date().toISOString()}] - Normalized bps to bpm`);
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
