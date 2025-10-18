# Splitter
Le Splitter est le premier composant de la pipeline d'ingestion de données. Il écoute les messages sur la queue NATS `MEASUREMENTS.to_split` et les divise en messages plus petits avant de les envoyer à la queue `MEASUREMENTS.to_clean`.

## Démarrage
### Dev
`start-pipeline.sh` démarre automatiquement le Splitter avec les autres composants de la pipeline.
### Production
`start-pipeline-prod.sh` démarre automatiquement le Splitter avec les autres composants de la pipeline de manière sécurisée avec TLS et authentification via NKey.

## Utilisation
### Schéma donnée entrant : `MEASUREMENTS.to_split`
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

### Schéma donnée sortant : `MEASUREMENTS.to_clean`
Le message sortant a la structure suivante :

```json
{
    "boxId": string,
    "type" : string,
    "value" : number,
    "unit" : string,
    "timestamp": string
}
```