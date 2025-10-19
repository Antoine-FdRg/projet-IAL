import { connect, nkeyAuthenticator, StringCodec, type ConnectionOptions } from "nats";
import dotenv from "dotenv";
dotenv.config();
const getConnectionOptions: () => ConnectionOptions = () => {

  if (!process.env.NATS_SERVER) {
    throw new Error("Veuillez définir la variable d'environnement NATS_SERVER");
  }

  if (process.env.NATS_SERVER?.startsWith("http://")) {
    return getDevConnectionOptions();
  }
  return getProdConnectionOptions();
};

const getProdConnectionOptions = () => {
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

const getDevConnectionOptions = () => {
  console.log("🔌 Connexion au serveur NATS de dev avec les paramètres suivants :");
  console.log(`   - NATS_SERVER: ${process.env.NATS_SERVER}`);
  return {
    servers: process.env.NATS_SERVER,
  } as ConnectionOptions;
}

const getPublishQueue = () => {
  if (!process.env.BOX_PRODUCER_QUEUE) {
    throw new Error("Veuillez définir la variable d'environnement BOX_PRODUCER_QUEUE");
  }
  console.log(`   - BOX_PRODUCER_QUEUE: ${process.env.BOX_PRODUCER_QUEUE}`);
  return process.env.BOX_PRODUCER_QUEUE;
}

const checkBrokerHealth = async (connectionOptions: ConnectionOptions): Promise<boolean> => {
  try {
    console.log("🔍 Vérification de la connexion au broker NATS...");
    const nc = await connect(connectionOptions);

    // Test simple de ping pour vérifier que le broker répond
    const rtt = await nc.rtt();
    console.log(`✅ Broker joignable (RTT: ${rtt}ms)`);

    await nc.close();
    return true;
  } catch (error) {
    console.warn("⚠️  Le broker NATS n'est pas joignable:", error instanceof Error ? error.message : error);
    return false;
  }
};

async function main() {
  const connectionOptions = getConnectionOptions();
  const publishQueue = getPublishQueue();

  // Vérification de la santé du broker
  const isBrokerHealthy = await checkBrokerHealth(connectionOptions);
  if (!isBrokerHealthy) {
    console.warn("⚠️  Impossible de joindre le broker NATS. Arrêt du programme.");
    process.exit(1);
  }

  const nc = await connect(connectionOptions);
  const js = nc.jetstream();
  const sc = StringCodec();
  console.log("Connecté au serveur NATS");

  for (let i = 1; i <= 5; i++) {
    const msg = `Mesure #${i}`;
    await js.publish(publishQueue, sc.encode(msg));
    console.log(`📤 Envoyé : ${msg}`);

  }

  await nc.close();
  console.log("✅ Publisher terminé");
}

main().catch(console.error);
