import type {RawMeasurement, MeasurementList} from "./type.js";
import dotenv from "dotenv";

dotenv.config();

export class OutlierFilterService {
    static filterAndNormalizeMeasurementList(data: Uint8Array<ArrayBufferLike>): MeasurementList | null {
        return filterOutliers(data);
    }
}

const filterOutliers = (data: Uint8Array<ArrayBufferLike>): MeasurementList | null => {
    try {
        const jsonString = new TextDecoder().decode(data);
        const rawData = JSON.parse(jsonString) as MeasurementList;

        console.log('Raw data received for outlier filtering:', rawData);

        if (!rawData.boxId || !Array.isArray(rawData.dataList)) {
            console.error("Invalid data structure: missing boxId or dataList");
            return null;
        }

        const filteredDataList: RawMeasurement[] = rawData.dataList
            .filter((measurement: RawMeasurement) => {
                if (!measurement) return false;

                if (measurement.type === 'weight') {
                    if (measurement.value < 15 || measurement.value > 500) {
                        console.warn(`Weight outlier filtered: ${measurement.value} ${measurement.unit}`);
                        return false;
                    }
                } else if (measurement.type === 'temperature') {
                    if (measurement.value > 60) {
                        console.warn(`Temperature outlier filtered: ${measurement.value} ${measurement.unit}`);
                        return false;
                    }
                } else if (measurement.type === 'pulse') {
                    if (measurement.value < 0 || measurement.value > 250) {
                        console.warn(`Heart rate outlier filtered: ${measurement.value} ${measurement.unit}`);
                        return false;
                    }
                }

                return true;
            });

        if (filteredDataList.length === 0) {
            console.error("No valid measurements after outlier filtering");
            return null;
        }

        return {
            boxId: rawData.boxId,
            dataList: filteredDataList
        };
    } catch (error) {
        console.error("Error parsing measurement data:", error);
        return null;
    }
};
