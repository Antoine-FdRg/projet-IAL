import { connect, StringCodec, consumerOpts, nkeyAuthenticator, type ConnectionOptions } from "nats";
import dotenv from "dotenv";
dotenv.config();
const getConnectionOptions: () => ConnectionOptions = () => {

  if (!process.env.NATS_SERVER) {
    throw new Error("Veuillez définir les variables d'environnement NATS_SERVER");
  }

  if (process.env.NATS_SERVER?.startsWith("http://")) {
    return getDevConnectionOptions();
  }
  return getProdConnectionOptions();
};

function getProdConnectionOptions() {
  if (!process.env.NATS_SEED) {
    throw new Error("Veuillez définir la variable d'environnement NATS_SEED");
  }
  if (!process.env.NATS_CA_FILE) {
    throw new Error("Veuillez définir la variable d'environnement NATS_CA_FILE");
  }
  console.log("🔌 Connexion au serveur NATS sécurisé avec les paramètres suivants :");
  console.log(`   - NATS_SERVER: ${process.env.NATS_SERVER}`);
  console.log(`   - NATS_SEED: ${process.env.NATS_SEED}`);
  console.log(`   - NATS_CA_FILE: ${process.env.NATS_CA_FILE}`);
  const seed = new TextEncoder().encode(process.env.NATS_SEED);
  return {
    servers: process.env.NATS_SERVER,
    tls: {
      caFile: process.env.NATS_CA_FILE,
    },
    authenticator: nkeyAuthenticator(seed)
  } as ConnectionOptions;
}

function getDevConnectionOptions() {
  console.log("🔌 Connexion au serveur NATS de dev avec les paramètres suivants :");
  console.log(`   - NATS_SERVER: ${process.env.NATS_SERVER}`);
  return {
    servers: process.env.NATS_SERVER,
  } as ConnectionOptions;
}

const getConsumeQueue = () => {
  if (!process.env.NATS_CONSUME_QUEUE) {
    throw new Error("Veuillez définir la variable d'environnement NATS_CONSUME_QUEUE");
  }
  console.log(`   - NATS_CONSUME_QUEUE: ${process.env.NATS_CONSUME_QUEUE}`);
  return process.env.NATS_CONSUME_QUEUE;
}

const getProducerQueue = () => {
  if (!process.env.CLEANER_PRODUCER_QUEUE) {
    throw new Error("Veuillez définir la variable d'environnement CLEANER_PRODUCER_QUEUE");
  }
  console.log(`   - CLEANER_PRODUCER_QUEUE: ${process.env.CLEANER_PRODUCER_QUEUE}`);
  return process.env.CLEANER_PRODUCER_QUEUE;
}

async function main() {

  const nc = await connect(getConnectionOptions());
  const consumeQueue = getConsumeQueue();
  const js = nc.jetstream();
  const sc = StringCodec();

  const opts = consumerOpts();
  opts.durable("MEASUREMENT-consumer");
  opts.manualAck();
  opts.ackExplicit();
  opts.deliverTo("MEASUREMENT-workers");

  const sub = await js.subscribe(consumeQueue, opts);
  console.log("👂 En attente de messages...");

  for await (const m of sub) {
    console.log(`📥 Reçu : ${sc.decode(m.data)}`);
    m.ack();
  }

  await nc.close();
}

main().catch(console.error);
