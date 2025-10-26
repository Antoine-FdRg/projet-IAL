# Measurement Database - TimescaleDB

Base de données TimescaleDB pour le stockage des mesures de santé des boitiers IoT.

## Architecture

### TimescaleDB
TimescaleDB est une extension PostgreSQL optimisée pour les séries temporelles. Elle offre :
- Hypertables pour le partitionnement automatique des données par timestamp
- Continuous aggregates pour les statistiques pré-calculées
- Retention policies pour la gestion automatique de l'historique
- Requêtes SQL standard avec optimisations time-series

## Tables

### `boxes`
Stocke les informations des boitiers et leurs tokens d'authentification.

| Colonne | Type | Description |
|---------|------|-------------|
| id | SERIAL | Clé primaire |
| box_id | VARCHAR(255) | Identifiant unique du boitier |
| token_hash | VARCHAR(255) | Hash SHA-256 du token d'authentification |
| description | TEXT | Description optionnelle |
| created_at | TIMESTAMPTZ | Date de création |
| updated_at | TIMESTAMPTZ | Date de dernière modification |

### `measurements`
Hypertable TimescaleDB pour les mesures (température, poids, pouls, pas).

| Colonne | Type | Description |
|---------|------|-------------|
| id | BIGSERIAL | Clé primaire |
| box_id | VARCHAR(255) | Référence au boitier (FK) |
| measurement_type | VARCHAR(50) | Type : temperature, weight, pulse, steps |
| value | NUMERIC(10,2) | Valeur de la mesure |
| unit | VARCHAR(20) | Unité de mesure (kg, °C, bpm, etc.) |
| timestamp | TIMESTAMPTZ | Timestamp de la mesure (clé de partition) |
| created_at | TIMESTAMPTZ | Date d'insertion en base |

### `measurements_hourly` (Vue matérialisée)
Agrégation horaire automatique des mesures pour des analyses rapides.

## Configuration

### Démarrer la base de données

1. Créer le fichier `.env` depuis `.env.example` :
```bash
cp .env.example .env
```

2. Démarrer le conteneur :
```bash
docker-compose up -d
```

3. Vérifier que la base est opérationnelle :
```bash
docker-compose ps
docker-compose logs -f measurement-db
```

### Variables d'environnement

- `POSTGRES_DB` : Nom de la base de données (défaut: measurement_db)
- `POSTGRES_USER` : Utilisateur PostgreSQL (défaut: ial_user)
- `POSTGRES_PASSWORD` : Mot de passe (défaut: ial_password)
- `POSTGRES_PORT` : Port exposé (défaut: 5432)

## Authentification des boitiers

### Tokens de test

Les tokens suivants sont créés au démarrage (seed data) :

| Box ID | Token en clair | Hash SHA-256 |
|--------|----------------|--------------|
| box1 | box1-secret-token | 5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8 |
| box2 | box2-secret-token | 6cf4e8f6e7d3f8b9a5c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4 |

### Générer un nouveau token

```bash
# Générer un token SHA-256
echo -n "mon-token-secret" | sha256sum

# Insérer dans la base
docker exec -it ial-measurement-db psql -U ial_user -d measurement_db -c \
  "INSERT INTO boxes (box_id, token_hash, description) VALUES ('box3', '<hash>', 'Description');"
```

## Fonctionnalités TimescaleDB

### Retention Policy
Les données plus anciennes que 90 jours sont automatiquement supprimées.

### Continuous Aggregates
La vue `measurements_hourly` est rafraîchie toutes les heures avec les statistiques :
- Moyenne, min, max par type de mesure
- Comptage des mesures
- Partitionnement par boitier et type

### Requêtes optimisées

```sql
-- Récupérer les mesures des dernières 24h pour un boitier
SELECT * FROM measurements
WHERE box_id = 'box1'
  AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- Statistiques horaires sur la dernière semaine
SELECT * FROM measurements_hourly
WHERE box_id = 'box1'
  AND bucket > NOW() - INTERVAL '7 days'
ORDER BY bucket DESC;

-- Moyenne quotidienne de température
SELECT
  time_bucket('1 day', timestamp) AS day,
  AVG(value) AS avg_temp
FROM measurements
WHERE measurement_type = 'temperature'
  AND timestamp > NOW() - INTERVAL '30 days'
GROUP BY day
ORDER BY day DESC;
```

## Maintenance

### Backup
```bash
docker exec ial-measurement-db pg_dump -U ial_user measurement_db > backup.sql
```

### Restauration
```bash
docker exec -i ial-measurement-db psql -U ial_user measurement_db < backup.sql
```

### Connexion à la base
```bash
docker exec -it ial-measurement-db psql -U ial_user -d measurement_db
```

## Intégration avec save-service

Le save-service se connecte à cette base via le réseau Docker `ial-pipeline_default` et utilise :
- L'authentification par token hash pour valider les boitiers
- L'insertion en batch pour optimiser les performances
- Les index temporels pour des écritures rapides
