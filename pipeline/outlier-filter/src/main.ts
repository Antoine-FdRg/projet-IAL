import {connect, consumerOpts, JSONCodec} from "nats";
import type {MeasurementList} from "./type";
import {OutlierFilterService} from "./outlierFilterService";
import {BrokerService} from "./brokerService";
import {EnvService} from "./envService";


async function main() {
    const nc = await connect(BrokerService.getConnectionOptions());
    EnvService.verifyQueueEnvVars();
    const js = nc.jetstream();
    const consumeQueue = EnvService.getConsumeQueue();
    const opts = consumerOpts();
    opts.durable(`${consumeQueue.replace(".", "-")}-consumer`); // unique pour chaque sujet
    opts.manualAck();
    opts.ackExplicit();
    opts.deliverTo(`${consumeQueue.replace(".", "-")}-workers`);
    const subscribe = await js.subscribe(consumeQueue, opts);
    for await (const message of subscribe) {
        const filteredList: MeasurementList | null = OutlierFilterService.filterAndNormalizeMeasurementList(message.data);
        if (!filteredList) {
            console.error(`[${new Date().toISOString()}] -  Un message a été ignoré suite à un échec de nettoyage des données.`);
            message.ack();
            continue;
        }
        const producerQueue = EnvService.getProducerQueue();
        const jsonCodec = JSONCodec();
        for (const queue of producerQueue) {
            await js.publish(queue, jsonCodec.encode(filteredList));
        }
        console.log(`[${new Date().toISOString()}] - Traitement d'une liste de ${filteredList.dataList.length} mesures du boitier ${filteredList.boxId}`);
        message.ack();
    }

    await nc.close();
}

main().catch(console.error);
