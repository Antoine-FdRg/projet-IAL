import dotenv from "dotenv";

dotenv.config();

export class EnvService {

    static verifyQueueEnvVars = () => {
        if (!process.env.OUTLIER_FILTER_PRODUCER_QUEUE) {
            throw new Error(`[${new Date().toISOString()}] - Veuillez définir la variable d'environnement OUTLIER_FILTER_PRODUCER_QUEUE`);
        }
        if (!process.env.OUTLIER_FILTER_CONSUME_QUEUE) {
            throw new Error(`[${new Date().toISOString()}] - Veuillez définir la variable d'environnement OUTLIER_FILTER_CONSUME_QUEUE`);
        }
        console.log(`[${new Date().toISOString()}] - ⚙️  Les messages seront lu depuis ${this.getConsumeQueue()} et publiés dans ${this.getProducerQueue()}`);
    }

    static getBrokerURL(): string {
        if (!process.env.NATS_SERVER) {
            throw new Error(`[${new Date().toISOString()}] - Veuillez définir la variable d'environnement NATS_SERVER`);
        }
        return process.env.NATS_SERVER;
    }

    static getNatsSeed(): string {
        if (!process.env.NATS_SEED) {
            throw new Error(`[${new Date().toISOString()}] - Veuillez définir la variable d'environnement NATS_SEED`);
        }
        return process.env.NATS_SEED;
    }

    static getNatsCAFile(): string {
        if (!process.env.NATS_CA_FILE) {
            throw new Error(`[${new Date().toISOString()}] - Veuillez définir la variable d'environnement NATS_CA_FILE`);
        }
        return process.env.NATS_CA_FILE;
    }

    static getConsumeQueue(): string {
        if (!process.env.OUTLIER_FILTER_CONSUME_QUEUE) {
            throw new Error(`[${new Date().toISOString()}] - Veuillez définir la variable d'environnement OUTLIER_FILTER_CONSUME_QUEUE`);
        }
        return process.env.OUTLIER_FILTER_CONSUME_QUEUE;
    }

    static getProducerQueue(): string[] {
        if (!process.env.OUTLIER_FILTER_PRODUCER_QUEUE) {
            throw new Error(`[${new Date().toISOString()}] - Veuillez définir la variable d'environnement OUTLIER_FILTER_PRODUCER_QUEUE`);
        }
        return process.env.OUTLIER_FILTER_PRODUCER_QUEUE.split(",");
    }

    static getPulseMax(): number {
        if (!process.env.POULS_MAX) {
            throw new Error(`[${new Date().toISOString()}] - Veuillez définir la variable d'environnement POULS_MAX`);
        }
        return Number(process.env.POULS_MAX);
    }

    static getTemperatureMax(): number {
        if (!process.env.TEMPERATURE_MAX) {
            throw new Error(`[${new Date().toISOString()}] - Veuillez définir la variable d'environnement TEMPERATURE_MAX`);
        }
        return Number(process.env.TEMPERATURE_MAX);
    }

    static getTemperatureMin(): number {
        if (!process.env.TEMPERATURE_MIN) {
            throw new Error(`[${new Date().toISOString()}] - Veuillez définir la variable d'environnement TEMPERATURE_MIN`);
        }
        return Number(process.env.TEMPERATURE_MIN);
    }

    static getWeightMin(): number {
        if (!process.env.POIDS_MIN) {
            throw new Error(`[${new Date().toISOString()}] - Veuillez définir la variable d'environnement POIDS_MIN`);
        }
        return Number(process.env.POIDS_MIN);
    }

    static getWeightMax(): number {
        if (!process.env.POIDS_MAX) {
            throw new Error(`[${new Date().toISOString()}] - Veuillez définir la variable d'environnement POIDS_MAX`);
        }
        return Number(process.env.POIDS_MAX);
    }
}
