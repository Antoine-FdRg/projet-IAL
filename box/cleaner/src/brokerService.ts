import { nkeyAuthenticator, type ConnectionOptions } from "nats";
import { EnvService } from "./envService.ts";

export class BrokerService {

  static getConnectionOptions(): ConnectionOptions {
    if (EnvService.getBrokerURL().startsWith("http://")) {
      return BrokerService.getDevConnectionOptions();
    }
    return BrokerService.getProdConnectionOptions();
  }

  static getProdConnectionOptions = () => {
    console.log(`[${new Date().toISOString()}] -🔌 Connexion au serveur NATS sécurisé avec les paramètres suivants :`);
    console.log(`[${new Date().toISOString()}]    - NATS_SERVER: ${EnvService.getBrokerURL()}`);
    console.log(`[${new Date().toISOString()}]    - NATS_SEED: ${EnvService.getNatsSeed()}`);
    console.log(`[${new Date().toISOString()}]    - NATS_CA_FILE: ${EnvService.getNatsCAFile()}`);
    const seed = new TextEncoder().encode(EnvService.getNatsSeed());
    return {
      servers: EnvService.getBrokerURL(),
      tls: {
        caFile: EnvService.getNatsCAFile(),
      },
      authenticator: nkeyAuthenticator(seed)
    } as ConnectionOptions;
  }

  static getDevConnectionOptions = () => {
    console.log(`[${new Date().toISOString()}] -🔌 Connexion au serveur NATS de dev avec les paramètres suivants :`);
    console.log(`[${new Date().toISOString()}]    - NATS_SERVER: ${EnvService.getBrokerURL()}`);
    return {
      servers: EnvService.getBrokerURL(),
    } as ConnectionOptions;
  }
}



