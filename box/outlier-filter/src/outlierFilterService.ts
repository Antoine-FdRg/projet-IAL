import type {RawMeasurement} from "./type";
import dotenv from "dotenv";
import {EnvService} from "./envService";

dotenv.config();

export class OutlierFilterService {

    static filterAndNormalizeMeasurement(data: Uint8Array<ArrayBufferLike>): RawMeasurement | null {
        return this.filterOutlierMeasurement(data);
    }

    private static filterOutlierMeasurement(data: Uint8Array<ArrayBufferLike>): RawMeasurement | null {
        try {
            const jsonString = new TextDecoder().decode(data);
            const rawData = JSON.parse(jsonString) as RawMeasurement;

            // if parsed data is null or undefined or empty JSON
            if (!rawData || Object.keys(rawData).length === 0) {
                console.error(`[${new Date().toISOString()}] - Parsed data is null or undefined`);
                return null;
            }

            if (this.isValidMeasurement(rawData)) {
                return rawData;
            }

            return null;
        } catch (error) {
            console.error(`[${new Date().toISOString()}] - Error parsing measurement data:`, error);
            return null;
        }
    }

    private static isValidMeasurement(measurement: RawMeasurement): boolean {
        switch (measurement.type) {
            case 'weight':
                return this.isValidWeight(measurement.value);
            case 'temperature':
                return this.isValidTemperature(measurement.value);
            case 'pulse':
                return this.isValidPulse(measurement.value);
            case 'steps':
                return this.isValidSteps(measurement.value);
            default:
                return true;
        }
    }

    private static isValidWeight(value: number): boolean {
        const min = EnvService.getWeightMin();
        const max = EnvService.getWeightMax();

        return !(value < min || value > max);
    }

    private static isValidTemperature(value: number): boolean {
        const max = EnvService.getTemperatureMax();
        const min = EnvService.getTemperatureMin();

        return !(value < min || value > max);
    }

    private static isValidPulse(value: number): boolean {
        const max = EnvService.getPulseMax();
        const min = EnvService.getPulseMin();

        return !(value < min || value > max);
    }

    private static isValidSteps(value: number): boolean {
        const min = EnvService.getStepsMin();

        return value >= min;
    }
}