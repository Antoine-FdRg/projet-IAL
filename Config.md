# projet-IAL
## Analyse des risques
L'intégralité de l'analyse des risques est disponible dans le document [Analyse des risques](doc/RISQUES.md).

## Configuration
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


## SonarQube
Le projet utilise sonarqube (sonarcloud) pour l'analyse de la qualité du code dans le CI/CD : https://sonarcloud.io/organizations/antoine-fdrg/projects.
Les fichiers de configuration `sonar-project.properties` de chaque projet permettent de définir les paramètres d'analyse.
Pour créer le projet sur sonarcloud, il faut lancer la commande suivante dans le répertoire racine du projet concerné dans un git bash ou wsl :
```bash
export SONAR_TOKEN="token_a_prendre_sur_la_conversation_discord" && npx sonar-scan
```