export type RawMeasurement = {
    type: 'temperature' | 'pulse' | 'weight' | 'steps';
    value: number;
    unit: string;
    timestamp: string;
};