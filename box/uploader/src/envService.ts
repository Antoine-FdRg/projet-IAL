import dotenv from "dotenv";

dotenv.config();

export class EnvService {

    static getMongoHost(): string {
        if (!process.env.MONGO_HOST) {
            throw new Error(`[${new Date().toISOString()}] - Veuillez définir la variable d'environnement MONGO_HOST`);
        }
        return process.env.MONGO_HOST;
    }

    static getMongoPort(): string {
        if (!process.env.MONGO_PORT) {
            throw new Error(`[${new Date().toISOString()}] - Veuillez définir la variable d'environnement MONGO_PORT`);
        }
        return process.env.MONGO_PORT;
    }

    static getMongoUsername(): string {
        if (!process.env.MONGO_USERNAME) {
            throw new Error(`[${new Date().toISOString()}] - Veuillez définir la variable d'environnement MONGO_USERNAME`);
        }
        return process.env.MONGO_USERNAME;
    }

    static getMongoPassword(): string {
        if (!process.env.MONGO_PASSWORD) {
            throw new Error(`[${new Date().toISOString()}] - Veuillez définir la variable d'environnement MONGO_PASSWORD`);
        }
        return process.env.MONGO_PASSWORD;
    }

    static getMongoDatabase(): string {
        if (!process.env.MONGO_DATABASE) {
            throw new Error(`[${new Date().toISOString()}] - Veuillez définir la variable d'environnement MONGO_DATABASE`);
        }
        return process.env.MONGO_DATABASE;
    }

    static getSaveServiceUrl(): string {
        if (!process.env.SAVE_SERVICE_URL) {
            throw new Error(`[${new Date().toISOString()}] - Veuillez définir la variable d'environnement SAVE_SERVICE_URL`);
        }
        return process.env.SAVE_SERVICE_URL;
    }

    static getBoxId() {
        if (!process.env.BOX_1_UUID || !process.env.BOX_2_UUID) {
            throw new Error(`[${new Date().toISOString()}] - Veuillez définir les variables d'environnement BOX_1_UUID et BOX_2_UUID`);
        }
        return Math.random() < 0.5 ? process.env.BOX_1_UUID : process.env.BOX_2_UUID;
    }
}
