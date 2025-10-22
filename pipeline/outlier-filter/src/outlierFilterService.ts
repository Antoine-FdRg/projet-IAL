import type {RawMeasurement, MeasurementList} from "./type.js";
import dotenv from "dotenv";
import {EnvService} from "./envService.js";

dotenv.config();

export class OutlierFilterService {

    static filterAndNormalizeMeasurementList(data: Uint8Array<ArrayBufferLike>): MeasurementList | null {
        return this.filterOutlierMeasurements(data);
    }

    private static filterOutlierMeasurements(data: Uint8Array<ArrayBufferLike>): MeasurementList | null {
        try {
            const jsonString = new TextDecoder().decode(data);
            const rawData = JSON.parse(jsonString) as MeasurementList;

            if (!rawData.boxId || !Array.isArray(rawData.dataList)) {
                console.error(`[${new Date().toISOString()}] - Invalid data structure: missing boxId or dataList`);
                return null;
            }

            const filteredDataList: RawMeasurement[] = rawData.dataList
                .filter((measurement: RawMeasurement) => {
                    if (!measurement) return false;
                    return this.isValidMeasurement(measurement);
                });

            if (filteredDataList.length === 0) {
                console.error(`[${new Date().toISOString()}] - No valid measurements after outlier filtering`);
                return null;
            }

            return {
                boxId: rawData.boxId,
                dataList: filteredDataList
            };
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
            default:
                return true;
        }
    }

    private static isValidWeight(value: number): boolean {
        const min = EnvService.getWeightMin();
        const max = EnvService.getWeightMax();

        if (value < min || value > max) {
            return false;
        }
        return true;
    }

    private static isValidTemperature(value: number): boolean {
        const max = EnvService.getTemperatureMax();
        const min = EnvService.getTemperatureMin();

        if (value > max) {
            return false;
        } else if (value < min) {
            return false;
        }
        return true;
    }

    private static isValidPulse(value: number): boolean {
        const max = EnvService.getPulseMax();

        if (value < 0 || value > max) {
            return false;
        }
        return true;
    }
}