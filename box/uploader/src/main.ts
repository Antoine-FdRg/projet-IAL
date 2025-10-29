import { DatabaseService } from "./databaseService";
import { CompressionService } from "./compressionService";
import { SaveServiceClient } from "./saveServiceClient";

export async function executeUploadWorkflow(): Promise<void> {
    console.log(`[${new Date().toISOString()}] - Démarrage du workflow d'upload`);

    try {
        // 1. Lecture des mesures de la BDD Buffer
        console.log(`[${new Date().toISOString()}] - Lecture des mesures de la BDD Buffer...`);
        const rawMeasurements = await DatabaseService.getAllMeasurementsCollection();

        if (rawMeasurements.length === 0) {
            console.log(`[${new Date().toISOString()}] - Aucune mesure trouvée dans la BDD Buffer`);
            return;
        }

        console.log(`[${new Date().toISOString()}] - ${rawMeasurements.length} mesures trouvées`);

        // 2. Compression/moyennage des mesures
        console.log(`[${new Date().toISOString()}] - Compression/moyennage des mesures...`);
        const compressedMeasurements = CompressionService.compressMeasurements(rawMeasurements);

        // 3. Envoi des données au save Service
        console.log(`[${new Date().toISOString()}] - Envoi des données au save Service...`);
        const uploadSuccess = await SaveServiceClient.sendCompressedMeasurements(compressedMeasurements);

        // 4. Vérification du succès de l'upload
        if (uploadSuccess) {
            // Succès: Purge de la BDD Buffer
            console.log(`[${new Date().toISOString()}] - Upload réussi - Purge de la BDD Buffer`);
            await DatabaseService.removeAllMeasurementsCollection();
        } else {
            // Échec: Sauvegarde des mesures comprimées et purge
            console.log(`[${new Date().toISOString()}] - Échec de l'upload - Sauvegarde des mesures comprimées et purge`);
            await DatabaseService.removeAllMeasurementsCollection();
            await DatabaseService.saveCompressedMeasurements(compressedMeasurements);
        }

        console.log(`[${new Date().toISOString()}] - Workflow d'upload terminé`);

    } catch (error) {
        console.error(`[${new Date().toISOString()}] - Erreur dans le workflow d'upload:`, error);
        throw error;
    }
}

async function main() {
    try {
        await DatabaseService.connect();
    } catch (error) {
        console.error(`[${new Date().toISOString()}] - Échec de connexion à MongoDB. Arrêt du service.`);
        process.exit(1);
    }

    await executeUploadWorkflow();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log(`[${new Date().toISOString()}] - Arrêt en cours...`);
        await DatabaseService.disconnect();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log(`[${new Date().toISOString()}] - Arrêt demandé...`);
        await DatabaseService.disconnect();
        process.exit(0);
    });
}

main().catch(async (error) => {
    console.error(error);
    await DatabaseService.disconnect();
});
