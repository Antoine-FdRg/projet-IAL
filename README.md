# projet-IAL
## Configuration
### Configuration
Le fichier `.env.queues` à la racine du projet contient les noms des différentes queues utilisées dans la pipeline. Il permet de définir l'orchestration des différents nodes de la pipeline en fonction des queues configurées.
Le fichier `.env.docker` à la racine du projet contient les variables d'environnement suivnates :
- NATS_URL : L'URL du broker NATS
- BOX_PUSH_SCHEDULE_INTERVAL : L'intervalle de push des données depuis le boitier (box) vers le broker NATS en millisecondes.

## Démarrage
### 1. Construire toutes les images docker
Dans un git bash ou wsl :
```bash
./build-all.sh
```
Ce script construit tous les services de la pipeline NATS (`box/*`) ainsi que le `save-service`.

### 2. Démarrer les services cloud
Dans un git bash ou wsl :
```bash
./start-cloud.sh
```
Ce script démarre le projet docker compose `ial-cloud` et le network `cloud_network` permettant la communication entre l'ensemble des services cloud :
- le Save Service
- la Measurement DB
- la User DB
- l'Analyse Service
- le Family Notif Service

En lançant le docker compose de save-service, le réseau `internet_network` est créé pour permettre la communication entre l'uploader de la station et le save-service cloud. Il est donc essentiel de démarrer le cloud avant la station.

### 3. Démarrer les services de la station
**⚠️ Attention** : Il est impératif d'avoir démarré les services cloud avant de lancer la station pour que l'uploader puisse se connecter au save-service.

Dans un git bash ou wsl :
```bash
./start-station.sh
```
Ce script démarre le projet docker compose `ial-station` et le network `station_network` permettant la communication entre l'ensemble des services de la station :
- Le serveur BLE
- Le broker NATS
- le Cleaner
- le Normalizer
- l'Outlier filter
- la Buffer DB
- l'Uploader


### Arrêter tous les services
```bash
./stop-all.sh
```

## Mock Watch - Simulateur de montre connectée

Simulateur générant des données de test pour démontrer le fonctionnement de la pipeline (cleaner, normalizer, outlier-filter).

### Utilisation

```bash
cd devices/mock-watch
npm install
npm run dev
```

### Système de scénarios

Le mock-watch génère différents types de données selon une distribution cyclique prédéfinie :
- **70% Données normales** : Valeurs physiologiques réalistes (36-38°C, 68-72 kg, 60-90 bpm)
- **15% Normalisation** : Données en °F, lbs, bps nécessitant conversion
- **8% Outliers valides** : Valeurs extrêmes mais acceptables (32.5-41.5°C, 20-120 kg, 45-245 bpm)
- **3% Outliers rejetés** : Hors limites pour tester le filtre (<32°C, >500 kg, >250 bpm)
- **2% Données malformées** : Champs manquants/invalides pour tester le cleaner
- **2% Erreurs Bluetooth** : Messages d'erreur simulés

**Intervalles** : Pulse toutes les 5s, autres mesures toutes les 15s

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

#### Box Uploader -> Save Service (HTTP)
Le save-service est une API REST HTTP (pas NATS). Le boitier envoie ses mesures via HTTP POST.

Endpoint: `POST /measurements`
Headers: `Authorization: Bearer <token>`

```json
{
    "boxId": "box1",
    "dataList": [
        {
            "type": "string",
            "value": "number",
            "unit": "string",
            "timestamp": "string"
        }
    ]
}
```

## SonarQube
Le projet utilise sonarqube (sonarcloud) pour l'analyse de la qualité du code dans le CI/CD : https://sonarcloud.io/organizations/antoine-fdrg/projects.
Les fichiers de configuration `sonar-project.properties` de chaque projet permettent de définir les paramètres d'analyse.
Pour créer le projet sur sonarcloud, il faut lancer la commande suivante dans le répertoire racine du projet concerné dans un git bash ou wsl :
```bash
export SONAR_TOKEN="token_a_prendre_sur_la_conversation_discord" && npx sonar-scan
```

## Base de données
### TimescaleDB
Le projet utilise TimescaleDB (extension PostgreSQL optimisée pour les séries temporelles) pour stocker les mesures.

Configuration dans `databases/measurement-db`:
- Hypertables pour partitionnement automatique par timestamp
- Continuous aggregates pour statistiques pré-calculées
- Retention policy de 90 jours
- Deux tables : `boxes` (authentification) et `measurements` (données)

Démarrer uniquement la base de données :
```bash
cd databases/measurement-db && docker-compose up -d
```

Connexion à la base :
```bash
docker exec -it ial-measurement-db psql -U ial_user -d measurement_db
```

## Sécurité
### Authentification Save Service
Le save-service utilise des tokens Bearer pour authentifier les boitiers :
- Tokens stockés en SHA-256 dans la table `boxes`
- Header requis : `Authorization: Bearer <token>`
- Tokens de test : `box1-secret-token`, `box2-secret-token`

### TLS NATS 
TLS permet de chiffrer les échanges entre les clients et le broker NATS. Un certificat serveur est utilisé pour authentifier le broker auprès des clients.
#### Exemple de génération de certificats

- Créer une clé privée CA
``` shell
openssl genrsa -out ca.key 4096
``` 

- Créer un certificat CA auto-signé
``` shell
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 -out ca.pem -subj "/CN=MyNatsCA"
```

- Créer une clé serveur
``` shell
openssl genrsa -out server.key 2048
```

- CSR (demande de signature) selon le hostname du broker
```shell
openssl req -new -key server.key -out server.csr -subj "/CN=nats\-broker"
```

- Signer le certificat serveur avec la CA
```shell
openssl x509 -req -in server.csr -CA ca.pem -CAkey ca.key -CAcreateserial -out server.crt -days 365 -sha256
```

Le serveur requiert `server.crt` et `server.key` pour démarrer en TLS. Le client requiert `ca.pem` pour vérifier l'identité du broker lorsqu'il s'y connecte