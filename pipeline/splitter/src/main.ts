import { connect, consumerOpts, JSONCodec } from "nats";
import type { Measurement, MeasurementList } from "./type.js";
import { SplitService } from "./splitService.ts";
import { BrokerService } from "./brokerService.ts";
import { EnvService } from "./envService.ts";
import { json } from "stream/consumers";


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
  
  const jsonCodecMeasurementArray = JSONCodec<Measurement[]>();
  const jsonCodecMeasurementList = JSONCodec<MeasurementList>();
  
  for await (const message of subscribe) {
    const measurementList = jsonCodecMeasurementList.decode(message.data);
    const splittedList: Measurement[] = SplitService.splitMeasurementList(measurementList);
    const producerQueue = EnvService.getProducerQueue();
    await js.publish(producerQueue, jsonCodecMeasurementArray.encode(splittedList));
    console.log(`[${new Date().toISOString()}] - Traitement de ${splittedList.length} mesures du boitier ${measurementList.boxId}`);
    message.ack();
  }

  await nc.close();
}

main().catch(console.error);
