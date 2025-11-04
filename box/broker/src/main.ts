import { connect, type ConnectionOptions } from "nats";
import dotenv from "dotenv";
dotenv.config();

const getConnectionOptions: () => ConnectionOptions = () => {

  if (!process.env.NATS_SERVER) {
    throw new Error("Veuillez définir les variables d'environnement NATS_SERVER");
  }
  console.log("🔌 Connexion au serveur NATS de dev avec les paramètres suivants :");
  console.log(`   - NATS_SERVER: ${process.env.NATS_SERVER}`);
  return {
    servers: process.env.NATS_SERVER,
  } as ConnectionOptions;
};

async function main() {

  const nc = await connect(getConnectionOptions());
  const jsm = await nc.jetstreamManager();

  // Supprime le stream s’il existe déjà
  try { await jsm.streams.delete("MEASUREMENT"); } catch { }

  // Crée un stream JetStream
  await jsm.streams.add({
    name: "MEASUREMENT",
    subjects: ["MEASUREMENT.to_clean",
      "MEASUREMENT.to_normalize",
      "MEASUREMENT.to_outlierfilter",
      "MEASUREMENT.to_analyze",
      "MEASUREMENT.to_split",
      "MEASUREMENT.to_save"
    ],
  });

  console.log("✅ Stream 'MEASUREMENT.*' créé !");
  await nc.close();
}

main().catch(console.error);
