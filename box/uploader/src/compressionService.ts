import type { RawMeasurement } from './type';

export class CompressionService {
    /**
     * Compress/average measurements by type
     * Groups measurements by type and computes the average value for each type
     */
    public static compressMeasurements(measurements: RawMeasurement[]): RawMeasurement[] {
        if (measurements.length === 0) {
            console.log(`[${new Date().toISOString()}] - Aucune mesure à comprimer`);
            return [];
        }

        // Group measurements by type
        const groupedByType = this.groupMeasurementsByType(measurements);

        const compressedMeasurements: RawMeasurement[] = [];

        for (const [type, typeMeasurements] of Object.entries(groupedByType)) {
            if (typeMeasurements.length === 0) continue;

            const compressed = this.compressTypeGroup(type as RawMeasurement['type'], typeMeasurements);
            compressedMeasurements.push(compressed);
        }

        console.log(`[${new Date().toISOString()}] - ${measurements.length} mesures comprimées en ${compressedMeasurements.length} groupes`);
        return compressedMeasurements;
    }

    private static groupMeasurementsByType(measurements: RawMeasurement[]): Record<string, RawMeasurement[]> {
        return measurements.reduce((groups, measurement) => {
            const type = measurement.type;
            if (!groups[type]) {
                groups[type] = [];
            }
            groups[type].push(measurement);
            return groups;
        }, {} as Record<string, RawMeasurement[]>);
    }

    private static compressTypeGroup(type: RawMeasurement['type'], measurements: RawMeasurement[]): RawMeasurement {
        if (measurements.length === 0) {
            throw new Error(`No measurements provided for type ${type}`);
        }

        const values = measurements.map(m => m.value);
        const timestamps = measurements.map(m => new Date(m.timestamp).getTime()).sort((a, b) => a - b);

        const sum = values.reduce((acc, val) => acc + val, 0);
        const averageValue = sum / values.length;

        return {
            type,
            value: Math.round(averageValue * 100) / 100,
            unit: measurements[0]!.unit,
            timestamp: new Date(timestamps[0]!).toISOString(),
        };
    }
}
