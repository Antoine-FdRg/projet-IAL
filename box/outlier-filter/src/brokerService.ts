import { type ConnectionOptions } from "nats";
import { EnvService } from "./envService";

export class BrokerService {

    static getConnectionOptions(): ConnectionOptions {
        console.log(`[${new Date().toISOString()}] -🔌 Connexion au serveur NATS de dev avec les paramètres suivants :`);
        console.log(`[${new Date().toISOString()}]    - NATS_SERVER: ${EnvService.getBrokerURL()}`);
        return {
            servers: EnvService.getBrokerURL(),
        } as ConnectionOptions;
    }

}



