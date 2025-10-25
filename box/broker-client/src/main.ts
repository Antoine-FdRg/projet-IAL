import { connect, JSONCodec, type ConnectionOptions } from "nats";
import dotenv from "dotenv";
import type { MeasurementList } from "./type.js";
dotenv.config();
const getConnectionOptions: () => ConnectionOptions = () => {

  if (!process.env.NATS_SERVER) {
    throw new Error("Veuillez définir la variable d'environnement NATS_SERVER");
  }
  console.log("🔌 Connexion au serveur NATS de dev avec les paramètres suivants :");
  console.log(`   - NATS_SERVER: ${process.env.NATS_SERVER}`);
  return {
    servers: process.env.NATS_SERVER,
  } as ConnectionOptions;
};

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
  const codec = JSONCodec();
  console.log("Connecté au serveur NATS");

  const msg: MeasurementList | any = createRandomMeasurementList();
  await js.publish(publishQueue, codec.encode(msg));
  console.log(`📤 Envoyé : ${msg}`);

  await nc.close();
  console.log("✅ Publisher terminé");
}


const createRandomMeasurementList = (): MeasurementList => {
  const boxId = `box-${Math.floor(Math.random() * 1000)}`;
  const dataList = [];

  const measurementTypes = [
    { type: 'temperature', units: ['°C', '°F'], valueRange: { min: -10, max: 50 }, nonsenseRange: { min: -273, max: 1000 } },
    { type: 'weight', units: ['lbs', 'kg'], valueRange: { min: 0, max: 200 }, nonsenseRange: { min: -50, max: 5000 } },
    { type: 'pulse', units: ['bps', 'bpm'], valueRange: { min: 60, max: 120 }, nonsenseRange: { min: 0, max: 1000 } }
  ];

  for (let i = 1; i <= 5; i++) {
    // Simuler occasionnellement des erreurs Bluetooth
    if (Math.random() < 0.2) {
      const errorMessages = [
        "Bluetooth connection lost",
        "Device timeout",
        "Low signal strength",
        "Authentication failed",
        "Service discovery failed"
      ];
      const errorMeasurement = {
        type: `error`,
        error: errorMessages[Math.floor(Math.random() * errorMessages.length)]
      } as any;
      dataList.push(errorMeasurement);
    } else {
      const measurementConfig = measurementTypes[Math.floor(Math.random() * measurementTypes.length)]!;
      const unit = measurementConfig.units[Math.floor(Math.random() * measurementConfig.units.length)]!;

      // 15% chance of generating nonsensical values
      const isNonsenseValue = Math.random() < 0.15;
      const range = isNonsenseValue ? measurementConfig.nonsenseRange : measurementConfig.valueRange;
      const { min, max } = range;

      const measurement = {
        type: measurementConfig.type,
        value: Math.round((Math.random() * (max - min) + min) * 100) / 100,
        unit: unit,
        timestamp: new Date().toISOString(),
      };
      dataList.push(measurement);
    }
  }

  return { boxId, dataList };
};


main().catch(console.error);
