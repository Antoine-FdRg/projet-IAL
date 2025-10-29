export type RawMeasurement = {
    type: 'temperature' | 'pulse' | 'weight' | 'steps';
    value: number;
    unit: string;
    timestamp: string;
};

export type MeasurementListDTO = {
    boxId: string;
    dataList: RawMeasurement[];
}