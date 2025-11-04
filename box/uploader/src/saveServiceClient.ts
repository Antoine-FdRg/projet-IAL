import { EnvService } from './envService';
import {MeasurementListDTO, RawMeasurement} from "./type";

export class SaveServiceClient {
    /**
     * Send compressed measurements to the save service
     */
    public static async sendCompressedMeasurements(measurements: RawMeasurement[]): Promise<boolean> {
        if (measurements.length === 0) {
            console.log(`[${new Date().toISOString()}] - Aucune mesure comprimée à envoyer`);
            return true;
        }

        const saveServiceUrl = EnvService.getSaveServiceUrl();

        try {
            console.log(`[${new Date().toISOString()}] - Envoi de ${measurements.length} mesures comprimées au save service...`);
            const boxId = EnvService.getBoxId();
            const response = await fetch(`${saveServiceUrl}/measurements`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${boxId}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    boxId: boxId,
                    dataList: measurements,
                } as MeasurementListDTO)
            });

            if (response.ok) {
                console.log(`[${new Date().toISOString()}] - Mesures envoyées avec succès au save service`);
                return true;
            } else {
                console.error(`[${new Date().toISOString()}] - Erreur lors de l'envoi au save service: ${response.status} ${response.statusText}`);
                return false;
            }
        } catch (error) {
            console.error(`[${new Date().toISOString()}] - Erreur de connexion au save service:`, error);
            return false;
        }
    }
}
