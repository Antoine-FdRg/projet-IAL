# Box Broker Client
Le client broker du boitier est configuré pour démarrer automatiquement toutes les 30 min grâce au script [scheduler.sh](./configuration/scheduler.sh) qui est lancé au démarrage du boitier (dans le [Dockerfile](./Dockerfile)). À chaque exécution, le script lit les données en base de données locales et les envoie au broker distant dans la queue `MEASUREMENT.to_clean`.

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

