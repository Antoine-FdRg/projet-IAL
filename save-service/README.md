# Save Service

Service HTTP Express pour sauvegarder les mesures de santé des boitiers IoT dans une base de données TimescaleDB.

## Description

Le save-service expose une API REST qui permet aux boitiers IoT (via leur uploader service) d'envoyer leurs mesures collectées. Le service :
- Authentifie chaque boitier via un Bearer token
- Valide les données reçues
- Sauvegarde les mesures dans TimescaleDB
- Retourne le statut de l'opération

Ce service est indépendant de la pipeline NATS et fonctionne en mode pull (le boitier pousse les données via HTTP).

## Architecture

```
Box Uploader Service
        |
        | HTTP POST
        | Authorization: Bearer <token>
        v
  Save Service (Express)
        |
        | Authenticate & Validate
        |
        v
  TimescaleDB
```

## Configuration

### Variables d'environnement

Créer un fichier `.env` depuis `.env.example` :

```bash
cp .env.example .env
```

Variables disponibles :

| Variable | Description | Défaut |
|----------|-------------|--------|
| PORT | Port d'écoute du serveur HTTP | 3000 |
| NODE_ENV | Environnement (development/production) | development |
| DB_HOST | Hôte de la base de données | measurement-db |
| DB_PORT | Port PostgreSQL | 5432 |
| DB_NAME | Nom de la base | measurement_db |
| DB_USER | Utilisateur PostgreSQL | ial_user |
| DB_PASSWORD | Mot de passe | ial_password |
| DB_POOL_MIN | Taille minimale du pool de connexions | 2 |
| DB_POOL_MAX | Taille maximale du pool de connexions | 10 |

## Démarrage

### Avec Docker (recommandé)

```bash
# Construire l'image
./build.sh

# Démarrer le service
docker-compose up -d

# Voir les logs
docker-compose logs -f save-service
```

### En local (développement)

```bash
# Installer les dépendances
npm install

# Démarrer en mode développement (avec rechargement auto)
npm run dev

# Ou démarrer normalement
npm start
```

## API

### POST /measurements

Sauvegarde une liste de mesures pour un boitier.

#### Request

**Headers:**
```
Authorization: Bearer <UUID>
Content-Type: application/json
```

**Body:**
```json
{
  "boxId": "550e8400-e29b-41d4-a716-446655440001",
  "dataList": [
    {
      "type": "temperature",
      "value": 37.2,
      "unit": "°C",
      "timestamp": "2025-01-15T10:30:00.000Z"
    },
    {
      "type": "weight",
      "value": 75.5,
      "unit": "kg",
      "timestamp": "2025-01-15T10:30:05.000Z"
    },
    {
      "type": "pulse",
      "value": 72,
      "unit": "bpm",
      "timestamp": "2025-01-15T10:30:10.000Z"
    }
  ]
}
```

#### Response

**Success (200):**
```json
{
  "success": true
}
```

**Validation Error (400):**
```json
{
  "success": false,
  "message": "Invalid or missing boxId"
}
```

**Authentication Error (401):**
```json
{
  "success": false,
  "message": "Missing or invalid Authorization header. Expected: Bearer <UUID>"
}
```

**Authorization Error (403):**
```json
{
  "success": false,
  "message": "Invalid token or box does not exist"
}
```

**Server Error (500):**
```json
{
  "success": false,
  "message": "Internal server error"
}
```

### GET /health

Health check endpoint pour vérifier que le service est opérationnel.

#### Response (200)
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

## Format des données

### Types de mesures supportés

- `temperature` : Température corporelle (°C)
- `weight` : Poids (kg)
- `pulse` : Fréquence cardiaque (bpm)
- `steps` : Nombre de pas

### Validation

Le service valide automatiquement :
- Présence et format UUID du `boxId`
- Structure du tableau `dataList`
- Type de mesure valide
- Valeur numérique valide
- Unité présente
- Timestamp au format ISO 8601


## Sécurité
Il faut mettre en place HTTPS en production pour sécuriser les échanges entre le boitier et le save-service.

### Exemple de génération de certificats pour mettre en place HTTPS

- Créer une clé privée CA

```shell
openssl genrsa -out ca.key 4096
```

- Créer un certificat CA auto-signé

```shell
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 -out ca.pem -subj "/CN=MyNatsCA"
```

- Créer une clé serveur

```shell
openssl genrsa -out server.key 2048
```

- CSR (demande de signature) selon le hostname du serveur

```shell
openssl req -new -key server.key -out server.csr -subj "/CN=domaine.exemple.com"
```

- Signer le certificat serveur avec la CA

```shell
openssl x509 -req -in server.csr -CA ca.pem -CAkey ca.key -CAcreateserial -out server.crt -days 365 -sha256
```

Le serveur requiert `server.crt` et `server.key` pour démarrer en TLS. Le client requiert `ca.pem` pour vérifier l'identité du broker lorsqu'il s'y connecte

### Authentification

#### Tokens des boitiers

Chaque boitier est identifié par un UUID qui sert à la fois d'identifiant et de token d'authentification.

Pour tester, utiliser les UUIDs de développement :
- Box 1 : `550e8400-e29b-41d4-a716-446655440001`
- Box 2 : `550e8400-e29b-41d4-a716-446655440002`

#### Exemple de requête avec curl

```bash
curl -X POST http://localhost:3000/measurements \
  -H "Authorization: Bearer 550e8400-e29b-41d4-a716-446655440001" \
  -H "Content-Type: application/json" \
  -d '{
    "boxId": "550e8400-e29b-41d4-a716-446655440001",
    "dataList": [
      {
        "type": "temperature",
        "value": 37.2,
        "unit": "°C",
        "timestamp": "2025-01-15T10:30:00.000Z"
      }
    ]
  }'
```

#### Ajouter un nouveau boitier

Voir la documentation de la base de données : `databases/measurement-db/README.md`

## Tests

```bash
# Exécuter les tests
npm test

# Mode watch
npm run test:watch

# Avec couverture
npm run test:coverage
```

## Structure du code

```
src/
├── main.ts                    # Point d'entrée Express
├── types.ts                   # Types TypeScript
├── database/
│   ├── connection.ts          # Pool PostgreSQL
│   ├── boxRepository.ts       # Gestion des boitiers
│   └── measurementRepository.ts # Insertion des mesures
├── middleware/
│   └── authMiddleware.ts      # Authentification Bearer
└── services/
    └── saveService.ts         # Logique de validation et sauvegarde
```

## Intégration avec le boitier

Le boitier doit implémenter un uploader service qui :
1. Collecte les mesures des 30 dernières minutes
2. Formate les données selon le schéma requis
3. Envoie une requête POST à `/measurements` avec son token
4. Gère les erreurs de réseau et réessaie si nécessaire

## Monitoring

### Logs

Les logs incluent :
- Timestamp ISO 8601
- Niveau de log (info, warn, error)
- Action effectuée
- Données contextuelles (boxId, nombre de mesures, etc.)

Exemple :
```
[2025-01-15T10:30:00.000Z] - Database connected successfully
[2025-01-15T10:30:15.000Z] - Successfully saved 3 measurements for box 550e8400-e29b-41d4-a716-446655440001
[2025-01-15T10:30:20.000Z] - Box not found: 550e8400-e29b-41d4-a716-446655440099
```

### Health check

Le endpoint `/health` peut être utilisé par Docker, Kubernetes ou tout système de monitoring pour vérifier l'état du service.

## Sécurité

- **HTTPS recommandé** en production
- Authentification via UUID (impossible à deviner)
- Validation stricte des entrées (format UUID, types de données)
- Pas d'exposition d'informations sensibles dans les erreurs
- Pool de connexions pour éviter l'épuisement des ressources
- Limite de taille des requêtes (configurée par Express)

## Performance

- Insertion en batch pour optimiser les performances
- Pool de connexions PostgreSQL configurables
- Index TimescaleDB pour les requêtes temporelles
- Transaction atomique pour garantir la cohérence

## Troubleshooting

### Erreur de connexion à la base

Vérifier que `measurement-db` est démarré :
```bash
cd databases/measurement-db && docker-compose ps
```

### Token invalide

Vérifier que l'UUID existe dans la base :
```bash
docker exec -it measurement-db psql -U ial_user -d measurement_db -c "SELECT box_id FROM boxes;"
```

### Service ne démarre pas

Vérifier les logs :
```bash
docker-compose logs save-service
```

Vérifier les variables d'environnement dans `.env`
