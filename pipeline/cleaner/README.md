# Cleaner
Le Cleaner est le premier composant de la pipeline d'ingestion de données. Il écoute les messages sur la queue NATS `MEASUREMENT.to_clean` et filtre les messages mal formattés avant de les envoyer à la queue `MEASUREMENT.to_save`.

## Démarrage
### Dev
`start-pipeline.sh` démarre automatiquement le Cleaner avec les autres composants de la pipeline.
### Production
`start-pipeline-prod.sh` démarre automatiquement le Cleaner avec les autres composants de la pipeline de manière sécurisée avec TLS et authentification via NKey.

## Utilisation
### Schéma donnée entrant : `MEASUREMENT.to_clean`
Le message entrant a la structure suivante :

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

### Schéma donnée sortant : `MEASUREMENT.to_normalize`
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