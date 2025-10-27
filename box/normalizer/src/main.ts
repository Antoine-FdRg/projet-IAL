import {connect, consumerOpts, JSONCodec} from "nats";
import type {RawMeasurement} from "./type";
import {NormalizerService} from "./normalizerService";
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
        const normalizeMeasurement: RawMeasurement | null = NormalizerService.normalizeMeasurement(message.data);
        if (!normalizeMeasurement) {
            console.error(`[${new Date().toISOString()}] -  Un message a été ignoré suite à un échec de nettoyage des données.`);
            message.ack();
            continue;
        }
        const producerQueue = EnvService.getProducerQueue();
        const jsonCodec = JSONCodec();
        await js.publish(producerQueue, jsonCodec.encode(normalizeMeasurement));
        console.log(`[${new Date().toISOString()}] - Traitement et envoi de la mesure normalisée : ${JSON.stringify(normalizeMeasurement)}`);
        message.ack();
    }

    await nc.close();
}

main().catch(console.error);
