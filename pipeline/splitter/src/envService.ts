
import dotenv from "dotenv";
dotenv.config();

export class EnvService {

  static verifyQueueEnvVars = () => {
    if (!process.env.SPLITTER_PRODUCER_QUEUE) {
      throw new Error("Veuillez définir la variable d'environnement SPLITTER_PRODUCER_QUEUE");
    }
    if (!process.env.SPLITTER_CONSUME_QUEUE) {
      throw new Error("Veuillez définir la variable d'environnement SPLITTER_CONSUME_QUEUE");
    }
    console.log(`⚙️  Les messages seront lu depuis ${this.getConsumeQueue()} et publiés dans ${this.getProducerQueue()}`);
  }

  static getBrokerURL(): string {
    if (!process.env.NATS_SERVER) {
      throw new Error("Veuillez définir la variable d'environnement NATS_SERVER");
    }
    return process.env.NATS_SERVER;
  }

  static getNatsSeed(): string {
    if (!process.env.NATS_SEED) {
      throw new Error("Veuillez définir la variable d'environnement NATS_SEED");
    }
    return process.env.NATS_SEED;
  }

  static getNatsCAFile(): string {
    if (!process.env.NATS_CA_FILE) {
      throw new Error("Veuillez définir la variable d'environnement NATS_CA_FILE");
    }
    return process.env.NATS_CA_FILE;
  }

  static getConsumeQueue(): string {
    if (!process.env.SPLITTER_CONSUME_QUEUE) {
      throw new Error("Veuillez définir la variable d'environnement SPLITTER_CONSUME_QUEUE");
    }
    return process.env.SPLITTER_CONSUME_QUEUE;
  }

  static getProducerQueue(): string {
    if (!process.env.SPLITTER_PRODUCER_QUEUE) {
      throw new Error("Veuillez définir la variable d'environnement SPLITTER_PRODUCER_QUEUE");
    }
    return process.env.SPLITTER_PRODUCER_QUEUE;
  }


}