/**
 * Une mesure non annotée avec l'id bu boitier
 */
export type RawMeasurement = {
  type: string;
  value: number;
  unit: string;
  timestamp: string;
};
/**
 * Liste de mesures brutes associées à un boitier
 */
export type MeasurementList = {
  boxId: string;
  dataList: RawMeasurement[];
};

/**
 * Une mesure annotée avec l'id du boitier
 */
export type Measurement = {
  boxId: string;
  type: string;
  value: number;
  unit: string;
  timestamp: string;
};