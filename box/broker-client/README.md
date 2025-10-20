# Box Broker Client
Le client broker du boitier est configuré pour démarrer automatiquement toutes les 30 min grâce au script [scheduler.sh](./configuration/scheduler.sh) qui est lancé au démarrage du boitier (dans le [Dockerfile](./Dockerfile)). À chaque exécution, le script lit les données en base de données locales et les envoie au broker distant dans la queue `MEASUREMENT.to_clean`.

## Configuration
Le fichier `.env` permet de configurer les variables d'environnement suivantes :
- `NATS_SERVER` : L'URL du serveur NATS distant.
- `BOX_PRODUCER_QUEUE` : La queue NATS où les données du boitier seront publiées.
- `BOX_PUSH_SCHEDULE_INTERVAL` : L'intervalle en secondes entre chaque envoi

Le dossier configuration inclut le fichier `scheduler.sh` permet de lancer régulièrement le push des données et le dossier configuration/cert le certificat CA pour la connexion TLS au serveur NATS distant. 

### Production
Pour la production, les variables d'environnement suivantes doivent être définies :
- `NATS_NKEY_SEED` : La seed NKey pour l'authentification au serveur NATS.
- `NATS_CA_FILE` : Le chemin vers le fichier de certificat CA pour la connexion TLS.

Le dossier `configuration/cert` doit inclure le certificat CA pour la connexion TLS au serveur NATS distant.

## Démarrage

### Dev
`start-pipeline.sh` démarre automatiquement le broker-client du boitier avec les autres composants de la pipeline.

### Production
`start-pipeline-prod.sh` démarre automatiquement le broker-client du boitier avec les autres composants de la pipeline de manière sécurisée avec TLS et authentification via NKey.

## Utilisation

### Schéma donnée sortant : `MEASUREMENT.to_clean`
Le message sortant a la structure suivante :

```json
{
    "boxId": string,
    "dataList": [
        {
            "type" : string
            "value" : number,
            "unit" : string,
            "timestamp": string
        },
        ...
    ]
}
``` 

