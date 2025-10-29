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

        return `mongodb://${username}:${password}@${host}:${port}/${database}`;
    }

    public static async connect(): Promise<void> {
        try {
            console.log(`[${new Date().toISOString()}] - Tentative de connexion à MongoDB...`);
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

    /**
     * Request the database collection containing all measurements
     */
    public static async getAllMeasurementsCollection(): Promise<RawMeasurement[]> {
        if (!this.isConnected()) {
            throw new Error('Database not connected. Call connect() first.');
        }

        try {
            const measurements = await this.collection!.find({}).toArray();
            // Transform MongoDB documents to RawMeasurement objects, filtering out MongoDB's _id field
            return measurements.map(doc => ({
                type: doc.type,
                value: doc.value,
                unit: doc.unit,
                timestamp: doc.timestamp
            })) as RawMeasurement[];
        } catch (error) {
            console.error(`[${new Date().toISOString()}] - Erreur lors de la récupération des mesures:`, error);
            throw error;
        }
    }

    /**
     * Remove all measurements from the database collection
     */
    public static async removeAllMeasurementsCollection(): Promise<void> {
        if (!this.isConnected()) {
            throw new Error('Database not connected. Call connect() first.');
        }

        try {
            const result = await this.collection!.deleteMany({});
            console.log(`[${new Date().toISOString()}] - ${result.deletedCount} mesures supprimées de la base de données`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] - Erreur lors de la suppression des mesures:`, error);
            throw error;
        }
    }

    /**
     * Save compressed measurements to the database buffer
     */
    public static async saveCompressedMeasurements(compressedMeasurements: RawMeasurement[]): Promise<void> {
        if (!this.isConnected()) {
            throw new Error('Database not connected. Call connect() first.');
        }

        try {
            if (compressedMeasurements.length > 0) {
                await this.collection!.insertMany(compressedMeasurements);
                console.log(`[${new Date().toISOString()}] - ${compressedMeasurements.length} mesures comprimées sauvegardées en BDD Buffer`);
            }
        } catch (error) {
            console.error(`[${new Date().toISOString()}] - Erreur lors de la sauvegarde des mesures comprimées:`, error);
            throw error;
        }
    }

    public static isConnected(): boolean {
        return this.client !== null && this.db !== null && this.collection !== null;
    }
}
