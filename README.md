# projet-IAL
## Démarrage
### Configuration
### Construire toutes les images docker
Dans un git bash ou wsl :
```bash
./start-all.sh
```
### Démarrer la pipeline complète
Dans un git bash ou wsl :
```bash
./start-pipeline.sh
```

### Démarrer la pipeline en mode production
Dans un git bash ou wsl :
```bash
./start-pipeline-prod.sh
```

## La pipeline
[Architecture de la pipeline](https://www.notion.so/Diagramme-composants-Data-Pipeline-280b70b82f6b80f48968cb4c271ec0b5)
### Données échangées
#### Boitier (box) -> Cleaner
Queue : MEASUREMENT.to_clean
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

#### Cleaner -> Outlier filter
Queue : MEASUREMENT.to_outlierfilter
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

#### Outlier filter -> Normalizer
Queue : MEASUREMENT.to_normalize
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

#### Normalizer -> Analyzer
Queue : MEASUREMENT.to_analyze
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
#### Normalizer -> Splitter
Queue : MEASUREMENT.to_split
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

#### Splitter -> Save Service
Queue : MEASUREMENT.to_save
```json
{
    "boxId" : string,
    "type" : string,
    "value" : number,
    "unit" : string,
    "timestamp": string,
}
```

#### Analyzer -> Save Service
Queue : MEASUREMENT.to_save
```json
{
    "boxId" : string,
    "type" : string,
    "fromTimestamp": string,
    "toTimestamp": string,
}
```



### Configuration
#### Configuration commune
Le fichier `.env.queues` à la racine du projet contient les noms des différentes queues utilisées dans la pipeline. Il permet de définir l'orchestration des différents nodes de la pipeline en fonction des queues configurées.
#### Configuration dev : `./start-pipeline.sh` 
La configuration de la pipeline en mode développement est simple. Le fichier `.env.docker` à la racine du projet contient les variables d'environnement définissant l'URL du broker NATS ainsi que l'intervalle de push des données depuis le boitier (box) vers le broker NATS.
#### Configuration prod : `./start-pipeline-prod.sh`
La configuration de la pipeline en mode production est plus complexe. Le fichier `.env.production` à la racine du projet contient, comme pour le mode dev les variables d'environnement définissant l'URL du broker NATS et l'intervalle de push des données depuis le boitier (box) vers le broker NATS. Mais en plus, il y a aussi les chemins vers les certificats TLS et les seeds des nkeys pour chaque service de la pipeline. 