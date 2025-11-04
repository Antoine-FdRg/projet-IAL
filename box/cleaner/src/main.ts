import { connect, consumerOpts, JSONCodec } from "nats";
import type {RawMeasurement} from "./type.js";
import { CleanService } from "./cleanService";
import { BrokerService } from "./brokerService";
import { EnvService } from "./envService";


async function main() {

  const nc = await connect(BrokerService.getConnectionOptions());
  EnvService.verifyQueueEnvVars();
  const js = nc.jetstream();

  const consumeQueue = EnvService.getConsumeQueue();
  const opts = consumerOpts();
  opts.durable(`${consumeQueue.replace(".", "-")}-consumer`);
  opts.manualAck();
  opts.ackExplicit();
  opts.deliverTo(`${consumeQueue.replace(".", "-")}-workers`);


  const subscribe = await js.subscribe(consumeQueue, opts);

  for await (const message of subscribe) {
    const cleanMeasurement: RawMeasurement | null = CleanService.cleanMeasurement(message.data);
    if (!cleanMeasurement) {
      console.error(`[${new Date().toISOString()}] -  Un message a été ignoré suite à un échec de nettoyage des données.`);
      message.ack();
      continue;
    }
    const producerQueue = EnvService.getProducerQueue();
    const jsonCodec = JSONCodec();
    await js.publish(producerQueue, jsonCodec.encode(cleanMeasurement));
    console.log(`[${new Date().toISOString()}] - Traitement et envoi de la mesure nettoyée : ${JSON.stringify(cleanMeasurement)}`);
    message.ack();
  }

  await nc.close();
}

main().catch(console.error);
