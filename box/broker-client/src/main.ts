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
  if (!process.env.NATS_SEED || !process.env.NATS_CA_FILE) {
    throw new Error("Veuillez définir les variables d'environnement NATS_SEED et NATS_CA_FILE");
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
  if (!process.env.NATS_PUBLISH_QUEUE) {
    throw new Error("Veuillez définir la variable d'environnement NATS_PUBLISH_QUEUE");
  }
  console.log(`   - NATS_PUBLISH_QUEUE: ${process.env.NATS_PUBLISH_QUEUE}`);
  return process.env.NATS_PUBLISH_QUEUE;
}

async function main() {
  const nc = await connect(getConnectionOptions());
  const publishQueue = getPublishQueue();
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
