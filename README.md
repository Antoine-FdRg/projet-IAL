# projet-IAL
## Configuration
### Configuration générale
Le fichier `.env.queues` à la racine du projet contient les noms des différentes queues utilisées dans la pipeline. Il permet de définir l'orchestration des différents nodes de la pipeline en fonction des queues configurées.
### Configuration dev
Le fichier `.env.docker` à la racine du projet contient les variables d'environnement suivnates :
- NATS_URL : L'URL du broker NATS
- BOX_PUSH_SCHEDULE_INTERVAL : L'intervalle de push des données depuis le boitier (box) vers le broker NATS en millisecondes.
### Configuration prod 
Le fichier `.env.production` à la racine du projet contient les variables d'environnement suivnates : 
- NATS_URL : L'URL du broker NATS
- BOX_PUSH_SCHEDULE_INTERVAL : L'intervalle de push des données depuis le boitier (box) vers le broker NATS en millisecondes.
- NATS_CA_FILE : Le chemin vers le certificat CA pour la connexion TLS au broker NATS.
- NKEY_SEED_* : La seed de la NKey pour chaque service de la pipeline.
## Démarrage
### Construire toutes les images docker
Dans un git bash ou wsl :
```bash
./build-all.sh
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

## SonarQube
Le projet utilise sonarqube (sonarcloud) pour l'analyse de la qualité du code dans le CI/CD : https://sonarcloud.io/organizations/antoine-fdrg/projects.
Les fichiers de configuration `sonar-project.properties` de chaque projet permettent de définir les paramètres d'analyse.
Pour créer le projet sur sonarcloud, il faut lancer la commande suivante dans le répertoire racine du projet concerné dans un git bash ou wsl :
```bash
export SONAR_TOKEN="token_a_prendre_sur_la_conversation_discord" && npx sonar-scan
```