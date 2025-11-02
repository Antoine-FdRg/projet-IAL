# projet-IAL
## Analyse des risques
L'intégralité de l'analyse des risques est disponible dans le document [Analyse des risques](doc/RISQUES.md).

## Architecture
Le projet est organisé en trois niveaux d'infrastructure :
- **Cloud** : Services cloud pour le stockage persistant (bases de données et API)
- **Station** : Station de collecte avec pipeline NATS et services de traitement
- **Device** : Dispositifs IoT (montres connectées simulées)

## Configuration
Le projet utilise trois fichiers de configuration d'environnement à la racine :

### `.env.cloud`
Contient la configuration des services cloud :
- **Measurement DB** : Base de données TimescaleDB pour les mesures
  - `MEASUREMENT_DB_POSTGRES_DB_NAME`, `MEASUREMENT_DB_POSTGRES_USER`, `MEASUREMENT_DB_POSTGRES_PASSWORD`
  - `MEASUREMENT_DB_POSTGRES_PORT`, `MEASUREMENT_DB_POSTGRES_EXTERNAL_PORT`
- **User DB** : Base de données PostgreSQL pour les utilisateurs
  - `USER_DB_POSTGRES_DB_NAME`, `USER_DB_POSTGRES_USER`, `USER_DB_POSTGRES_PASSWORD`
- **Save Service** : Configuration de l'API HTTP
  - `SAVE_SERVICE_PORT`, `SAVE_SERVICE_NODE_ENV`, `SAVE_SERVICE_DB_POOL_MIN`, `SAVE_SERVICE_DB_POOL_MAX`

### `.env.station`
Contient la configuration de la station de collecte :
- **Broker NATS** : `NATS_SERVER` - URL du broker NATS
- **Intervalles de traitement** : 
  - `BOX_PUSH_SCHEDULE_INTERVAL` - Intervalle de push des données (en secondes)
  - `UPLOADER_SCHEDULE_INTERVAL` - Intervalle d'upload vers le cloud (en secondes)
- **Filtres outlier** : Limites min/max pour les mesures (pouls, température, poids, steps)
- **Queues NATS** : Configuration de l'orchestration des services de la pipeline
  - `BOX_PRODUCER_QUEUE`, `CLEANER_PRODUCER_QUEUE`, `NORMALIZER_PRODUCER_QUEUE`, etc.
- **Configuration box** : `BOX_UUID` - Identifiant unique de la station
- **GATT Server** : `GATT_SERVER_PORT` - Port du serveur GATT Bluetooth

### `.env.device`
Contient la configuration des dispositifs IoT :
- **Mock Watch** : Configuration de la montre connectée simulée
  - `ENDPOINT_URL` - URL du serveur GATT
  - `PULSE_INTERVAL_MS` - Intervalle de génération des mesures
  - `SEND_INTERVAL_MS` - Intervalle d'envoi des mesures
  - `INIT_WEIGHT_KG`, `SOURCE_ID`, `DEVICE_TYPE`

## Démarrage

### 1. Construire toutes les images Docker
Dans un git bash ou wsl :
```bash
./build-all.sh
```
Ce script construit tous les services :
- Pipeline NATS (`box/*`) : broker, broker-client, cleaner, normalizer, outlier-filter, uploader, gatt-server
- Save-service (API HTTP)
- Mock-watch (dispositif simulé)

### Démarrer l'ensemble du système
Dans un git bash ou wsl :
```bash
./start-all.sh
```
Ce script démarre automatiquement dans l'ordre :
1. Les services cloud (via `./start-cloud.sh`)
2. La station de collecte (via `./start-station.sh`)
3. Les dispositifs IoT (via `./start-device.sh`)

### Démarrer les composants individuellement

#### Démarrer uniquement le cloud
```bash
./start-cloud.sh
```
Démarre :
- Base de données utilisateurs (PostgreSQL)
- Base de données de mesures (TimescaleDB)
- Save-service (API HTTP sur le port 3000)

#### Démarrer uniquement la station
```bash
./start-station.sh
```
Démarre :
- Buffer DB (MongoDB pour le cache local)
- Broker NATS
- Pipeline de traitement : cleaner, outlier-filter, normalizer, uploader
- GATT Server (pour recevoir les données Bluetooth)

#### Démarrer uniquement un dispositif
```bash
./start-device.sh
```
Démarre :
- Mock-watch (montre connectée simulée)

### Arrêter tous les services
```bash
./stop-all.sh
```
Arrête tous les services cloud, station et dispositifs, et supprime les volumes Docker.

## Tests

### Exécuter tous les tests
Dans un git bash ou wsl :
```bash
./run-all-tests.sh
```
Ce script exécute tous les tests unitaires des différents services en parallèle.

## SonarQube
Le projet utilise SonarQube (SonarCloud) pour l'analyse de la qualité du code dans le CI/CD : https://sonarcloud.io/organizations/antoine-fdrg/projects.

Les fichiers de configuration `sonar-project.properties` de chaque projet permettent de définir les paramètres d'analyse.

Pour créer le projet sur SonarCloud, il faut lancer la commande suivante dans le répertoire racine du projet concerné dans un git bash ou wsl :
```bash
export SONAR_TOKEN="token_a_prendre_sur_la_conversation_discord" && npx sonar-scan
```