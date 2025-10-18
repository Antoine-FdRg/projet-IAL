import { connect, nkeyAuthenticator, type ConnectionOptions } from "nats";
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

function getDevConnectionOptions() {
  console.log("🔌 Connexion au serveur NATS de dev avec les paramètres suivants :");
  console.log(`   - NATS_SERVER: ${process.env.NATS_SERVER}`);
  return {
    servers: process.env.NATS_SERVER,
  } as ConnectionOptions;
}

async function main() {

  const nc = await connect(getConnectionOptions());
  const jsm = await nc.jetstreamManager();

  // Supprime le stream s’il existe déjà
  try { await jsm.streams.delete("MEASUREMENT"); } catch { }

  // Crée un stream JetStream
  await jsm.streams.add({
    name: "MEASUREMENT",
    subjects: ["MEASUREMENT.*"],
  });

  console.log("✅ Stream 'MEASUREMENT.*' créé !");
  await nc.close();
}

main().catch(console.error);
