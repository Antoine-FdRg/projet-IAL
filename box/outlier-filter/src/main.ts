import {connect, consumerOpts} from "nats";
import {OutlierFilterService} from "./outlierFilterService";
import {BrokerService} from "./brokerService";
import {EnvService} from "./envService";
import {DatabaseService} from "./databaseService";
import type {RawMeasurement} from "./type";


async function main() {
    const nc = await connect(BrokerService.getConnectionOptions());

    // Connect to MongoDB
    try {
        await DatabaseService.connect();
    } catch (error) {
        console.error(`[${new Date().toISOString()}] - Échec de connexion à MongoDB. Arrêt du service.`);
        await nc.close();
        process.exit(1);
    }

    EnvService.verifyQueueEnvVars();
    const js = nc.jetstream();
    const consumeQueue = EnvService.getConsumeQueue();
    const opts = consumerOpts();
    opts.durable(`${consumeQueue.replace(".", "-")}-consumer`); // unique pour chaque sujet
    opts.manualAck();
    opts.ackExplicit();
    opts.deliverTo(`${consumeQueue.replace(".", "-")}-workers`);
    const subscribe = await js.subscribe(consumeQueue, opts);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log(`[${new Date().toISOString()}] - Arrêt en cours...`);
        await DatabaseService.disconnect();
        await nc.close();
        process.exit(0);
    });

    for await (const message of subscribe) {
        const filteredList: RawMeasurement | null = OutlierFilterService.filterAndNormalizeMeasurement(message.data);
        if (!filteredList) {
            console.error(`[${new Date().toISOString()}] -  Un message a été ignoré suite à un échec de nettoyage des données.`);
            message.ack();
            continue;
        }

        try {
            // Save to MongoDB
            await DatabaseService.saveFilteredMeasurement(filteredList);
            console.log(`[${new Date().toISOString()}] - Traitement et sauvegarde de la mesure après filtrage des outliers : ${JSON.stringify(filteredList)}`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] - Erreur lors de la sauvegarde en base:`, error);
        }

        message.ack();
    }

    await DatabaseService.disconnect();
    await nc.close();
}

main().catch(async (error) => {
    console.error(error);
    await DatabaseService.disconnect();
});
