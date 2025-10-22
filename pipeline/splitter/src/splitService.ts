import type { RawMeasurement, MeasurementList, Measurement } from "./type.ts";
import dotenv from "dotenv";

dotenv.config();

export class SplitService {
  static splitMeasurementList(measurementList: MeasurementList): Measurement[] {
    return measurementList.dataList.map((rawMeasurement) => {
      return {
        boxId: measurementList.boxId,
        ...rawMeasurement,
      };
    });
  }
}
