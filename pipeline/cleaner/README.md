# Cleaner
Le Cleaner est le premier composant de la pipeline d'ingestion de données. Il écoute les messages sur la queue NATS `MEASUREMENT.to_clean` et filtre les messages mal formattés avant de les envoyer à la queue `MEASUREMENT.to_save`.

## Configuration
Le fichier `.env` permet de configurer les variables d'environnement suivantes :
- `NATS_SERVER` : L'URL du serveur NATS distant.
- `CLEANER_CONSUMER_QUEUE` : La queue NATS où les données à nettoyer sont consommées.
- `CLEANER_PRODUCER_QUEUE` : La queue NATS où les données nettoyées sont publiées.
### Production
Pour le lancement en mode production,  les variables d'environnement suivantes doivent être définies :
- `NATS_NKEY_SEED` : La seed NKey pour l'authentification au serveur NATS.
- `NATS_CA_FILE` : Le chemin vers le fichier de certificat CA pour la connexion TLS.

Le dossier `configuration/cert` doit inclure le certificat CA pour la connexion TLS au serveur NATS distant.

## Démarrage
### Dev
`start-pipeline.sh` démarre automatiquement le Cleaner avec les autres composants de la pipeline.
### Production
`start-pipeline-prod.sh` démarre automatiquement le Cleaner avec les autres composants de la pipeline de manière sécurisée avec TLS et authentification via NKey.

## Utilisation
### Schéma donnée entrant
Le message entrant a la structure suivante via la queue `MEASUREMENT.to_clean` :

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

### Schéma donnée sortant
Le message sortant a la structure suivante via la queue `MEASUREMENT.to_normalize` :

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