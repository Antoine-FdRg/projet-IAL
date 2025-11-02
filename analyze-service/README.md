# Analyze Service - Service d'Analyse d'Anomalies

Service REST API de détection d'anomalies pour les mesures de santé IoT.

## Vue d'ensemble

Le `analyze-service` est une API REST qui analyse les mesures de santé (poids, pouls, température) stockées dans TimescaleDB et détecte automatiquement les anomalies selon trois types d'analyses :

1. **Seuils absolus** : Détecte les valeurs qui dépassent les limites physiologiques normales
2. **Variations brusques** : Identifie les changements rapides et anormaux
3. **Tendances** : Analyse les patterns sur la durée pour détecter les évolutions inquiétantes

## Architecture

### Fonctionnement

```
Service Client → HTTP GET /analyse/:stationId/{family|doctor} → Analyze Service
                                                                      ↓
                                                              Requête TimescaleDB
                                                                      ↓
                                                          Analyseurs (3 types)
                                                                      ↓
                                                          Response JSON
```

Le service expose une API REST avec deux endpoints :
- **Endpoint Family** : Analyse simplifiée sur 7 jours pour les proches
- **Endpoint Doctor** : Analyse détaillée sur 24 heures pour les médecins

### Endpoints

#### GET `/analyse/:stationId/family`

Analyse simplifiée pour les membres de la famille.

**Paramètres :**
- `stationId` (UUID) : Identifiant de la box/station

**Réponse :**
```json
{
  "state": "great" | "okay" | "bad" | "terrible",
  "message": "État général stable sur 7 jours"
}
```

**Logique :**
- Analyse les moyennes sur les 7 derniers jours
- Score simple basé sur des seuils absolus
- Message synthétique pour une compréhension rapide

**États :**
- `great` (0) : Toutes les moyennes dans les normes
- `okay` (1) : Légère déviation sur au moins une mesure
- `bad` (2) : Déviation notable nécessitant attention
- `terrible` (3) : Valeurs critiques nécessitant intervention

#### GET `/analyse/:stationId/doctor`

Analyse détaillée pour les professionnels de santé.

**Paramètres :**
- `stationId` (UUID) : Identifiant de la box/station

**Réponse :**
```json
{
  "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "reason": "Pouls: 165 bpm (tachycardie), Δ 45 bpm en 10 min | Poids: +5.2 kg en 24h"
}
```

**Logique :**
- Analyse toutes les mesures des dernières 24 heures
- Applique les 3 analyseurs (seuils, variations, tendances)
- Retourne la sévérité la plus élevée détectée
- Génère un résumé détaillé avec valeurs, durées et terminologie médicale

**Exemple de `reason` détaillé :**
```
"Température: 39.2°C (hyperthermie), Δ 2.1°C en 30 min | Pouls: 165 bpm (tachycardie), Δ 45 bpm en 10 min | Poids: 78.5 kg (+12.3 kg vs moy. 7j), +5.2 kg en 24h"
```

### Types d'Anomalies Détectées

#### 🚨 Seuils Absolus (ABSOLUTE_THRESHOLD)

Règles fixes basées sur les limites physiologiques :

- **Température** : < 35°C ou > 38°C
- **Pouls** : < 50 bpm ou > 160 bpm
- **Poids** : Écart > 10 kg par rapport à la moyenne des 7 derniers jours

#### 📈 Variations Brusques (SUDDEN_VARIATION)

Changements rapides sur de courtes périodes :

- **Température** : Δ > 1.5°C en 30 minutes
- **Pouls** : Δ > 30 bpm en 10 minutes
- **Poids** : Δ > 3 kg en 24 heures

#### 📉 Tendances (TREND_ANOMALY)

Patterns anormaux sur des périodes prolongées :

- **Température** : Augmentation > 1°C sur 4 heures consécutives
- **Pouls** : Au-dessus de 120 bpm pendant plus de 2 heures (>80% des mesures)
- **Poids** : Changement > 5 kg sur 7 jours

### Niveaux de Sévérité

- **CRITICAL** 🚨 : Urgence médicale - Intervention immédiate requise
- **HIGH** ⚠️  : Intervention urgente - Visite infirmière dans les prochaines heures
- **MEDIUM** ⚡ : Attention requise - Surveillance rapprochée et visite sous 24-48h
- **LOW** 👁️  : Surveillance - Contacter le patient pour vérifier son état

## Configuration

### Variables d'environnement

```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Database Connection
DB_HOST=measurement-db
DB_PORT=5432
DB_NAME=measurement_db
DB_USER=ial_user
DB_PASSWORD=ial_password

# Connection Pool
DB_POOL_MIN=2
DB_POOL_MAX=10
```

### Configuration des Seuils

Les seuils sont configurables dans `src/config/thresholds.ts` :

```typescript
export const THRESHOLD_CONFIG = {
  temperature: { min: 35.0, max: 38.0, unit: '°C' },
  pulse: { min: 50, max: 160, unit: 'bpm' },
  weight: { max_deviation_from_avg: 10, avg_period_days: 7, unit: 'kg' },
};
```

## Utilisation

### Démarrage

Le service est intégré dans la stack Docker et démarre automatiquement avec :

```bash
# Démarrer tous les services (cloud + station)
./start-all.sh

# Ou démarrer uniquement les services cloud
./start-cloud.sh

# Ou démarrer le service individuellement
cd analyze-service
docker-compose up -d
```

Le service est accessible sur `http://localhost:3001` (par défaut).

### Exemples d'appels API

#### Health Check

```bash
curl http://localhost:3001/health
```

**Réponse :**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-01T16:25:17.125Z"
}
```

#### Analyse Family

```bash
curl http://localhost:3001/analyse/550e8400-e29b-41d4-a716-446655440001/family
```

**Réponse :**
```json
{
  "state": "bad",
  "message": "Température élevée (38.5°C) et pouls rapide (165 bpm) détectés sur les 7 derniers jours"
}
```

#### Analyse Doctor

```bash
curl http://localhost:3001/analyse/550e8400-e29b-41d4-a716-446655440001/doctor
```

**Réponse :**
```json
{
  "severity": "CRITICAL",
  "reason": "Température: 39.2°C (hyperthermie), Δ 2.1°C en 30 min | Pouls: 165 bpm (tachycardie), Δ 45 bpm en 10 min"
}
```

### Codes d'erreur

- `400 Bad Request` : Format UUID invalide
- `404 Not Found` : Box ID inexistant dans la base
- `500 Internal Server Error` : Erreur serveur

### Monitoring des Logs

```bash
# Voir les logs en temps réel
docker logs -f analyze-service

# Voir les dernières requêtes
docker logs analyze-service | grep "GET /analyse"
```

## Développement

### Structure du Projet

```
analyze-service/
├── src/
│   ├── main.ts                          # Point d'entrée Express
│   ├── types.ts                         # Types TypeScript (DTOs, interfaces)
│   ├── database/
│   │   ├── connection.ts                # Pool PostgreSQL
│   │   ├── boxRepository.ts             # Validation des boxes
│   │   └── measurementRepository.ts     # Requêtes historiques
│   ├── analyzers/
│   │   ├── absoluteThresholdAnalyzer.ts # Analyseur de seuils
│   │   ├── variationAnalyzer.ts         # Analyseur de variations
│   │   └── trendAnalyzer.ts             # Analyseur de tendances
│   ├── services/
│   │   ├── familyAnalysisService.ts     # Logique endpoint family
│   │   └── doctorAnalysisService.ts     # Logique endpoint doctor
│   ├── controllers/
│   │   ├── familyAnalysisController.ts  # Controller family
│   │   └── doctorAnalysisController.ts  # Controller doctor
│   ├── routes/
│   │   └── analyzeRoutes.ts             # Définition des routes Express
│   ├── middleware/
│   │   └── errorHandler.ts              # Gestion globale des erreurs
│   └── config/
│       └── thresholds.ts                # Configuration des seuils
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

### Tests Locaux

```bash
# Installer les dépendances
npm install

# Lancer en mode développement
npm start

# Tester les endpoints
curl http://localhost:3001/health
curl http://localhost:3001/analyse/550e8400-e29b-41d4-a716-446655440001/family
curl http://localhost:3001/analyse/550e8400-e29b-41d4-a716-446655440001/doctor
```

### Build

```bash
# Builder l'image Docker
./build.sh

# Ou manuellement
docker build -t ial/analyze-service:latest .
```

## Intégration avec la Pipeline

Le service s'intègre dans l'architecture globale :

```
IoT Box → NATS Pipeline → Save Service → TimescaleDB
                                            ↑
                                    Analyze Service (REST API)
                                            ↑
                                  Services Clients (Dashboard, Mobile App, etc.)
```

Le service est **pull-based** : il ne reçoit pas de notifications automatiques, mais répond à la demande lorsqu'un client appelle les endpoints REST.

## User Stories

### Story 1 : Famille

**En tant que membre de la famille**
Je veux voir rapidement l'état général de mon proche
Afin de savoir si je dois m'inquiéter ou non

**Implémentation** : Endpoint `/analyse/:stationId/family`
- ✅ Analyse sur 7 jours pour vision globale
- ✅ États simples (great/okay/bad/terrible)
- ✅ Message synthétique compréhensible par un non-médecin

### Story 2 : Médecin

**En tant que médecin**
Je veux recevoir une analyse détaillée en cas d'anomalie de santé
Afin de décider rapidement si je dois ordonner une visite infirmière

**Implémentation** : Endpoint `/analyse/:stationId/doctor`
- ✅ Analyse détaillée sur 24h pour vision précise
- ✅ 3 types d'analyses (seuils, variations, tendances)
- ✅ Sévérité graduée (CRITICAL/HIGH/MEDIUM/LOW)
- ✅ Raison détaillée avec valeurs, durées et terminologie médicale
- ✅ Format user-friendly : "Pouls: 165 bpm (tachycardie), Δ 45 bpm en 10 min"

## Évolutions Futures

- [ ] Persistance des alertes dans une table `anomaly_alerts`
- [ ] Endpoint GET pour consulter l'historique des analyses
- [ ] Webhook configurable pour notifier un système externe
- [ ] Machine Learning pour affiner les seuils par patient
- [ ] Configuration des seuils via API (sans rebuild)
- [ ] Tests unitaires et d'intégration complets
- [ ] Authentification et autorisation (JWT)
- [ ] Rate limiting et caching pour optimiser les performances

## Licence

ISC
