import { MongoClient, Db, Collection } from 'mongodb';
import type { RawMeasurement } from './type';
import {EnvService} from "./envService";

export class DatabaseService {
    private static client: MongoClient | null = null;
    private static db: Db | null = null;
    private static collection: Collection | null = null;

    private static getConnectionString(): string {
        const host = EnvService.getMongoHost();
        const port = EnvService.getMongoPort();
        const username = EnvService.getMongoUsername();
        const password = EnvService.getMongoPassword();
        const database = EnvService.getMongoDatabase();

        console.log(host, port, username, password);
        console.log(`mongodb://${username}:${password}@${host}:${port}/${database}`);

        return `mongodb://${username}:${password}@${host}:${port}/${database}`;
    }

    public static async connect(): Promise<void> {
        try {
            console.log("[${new Date().toISOString()}] - Tentative de connexion à MongoDB...");
            const connectionString = this.getConnectionString();
            this.client = new MongoClient(connectionString);
            await this.client.connect();

            const dbName = EnvService.getMongoDatabase();
            this.db = this.client.db(dbName);
            this.collection = this.db.collection('messages');

            console.log(`[${new Date().toISOString()}] - Connecté à MongoDB`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] - Erreur de connexion à MongoDB:`, error);
            throw error;
        }
    }

    public static async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
            this.collection = null;
            console.log(`[${new Date().toISOString()}] - Déconnecté de MongoDB`);
        }
    }

    public static async saveFilteredMeasurement(measurement: RawMeasurement): Promise<void> {
        if (!this.collection) {
            throw new Error('Base de données non connectée. Appelez connect() d\'abord.');
        }

        try {
            const document = {
                ...measurement,
                receivedAt: new Date(),
                messageId: `${measurement.type}-${measurement.timestamp}-${Date.now()}`,
                expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Expire après 30 jours
                source: 'outlier-filter'
            };

            await this.collection.insertOne(document);
            console.log(`[${new Date().toISOString()}] - Mesure sauvegardée en base: ${document.messageId}`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] - Erreur lors de la sauvegarde:`, error);
            throw error;
        }
    }

    public static isConnected(): boolean {
        return this.client !== null && this.db !== null && this.collection !== null;
    }
}
