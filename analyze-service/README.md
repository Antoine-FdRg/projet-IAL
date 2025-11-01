# Analyze Service - Service d'Analyse d'Anomalies

Service de détection d'anomalies en temps réel pour les mesures de santé IoT.

## Vue d'ensemble

Le `analyze-service` surveille en temps réel les mesures de santé (poids, pouls, température) et détecte automatiquement les anomalies selon trois types d'analyses :

1. **Seuils absolus** : Détecte les valeurs qui dépassent les limites physiologiques normales
2. **Variations brusques** : Identifie les changements rapides et anormaux
3. **Tendances** : Analyse les patterns sur la durée pour détecter les évolutions inquiétantes

## Architecture

### Fonctionnement

```
PostgreSQL NOTIFY → LISTEN → analyze-service → Analyseurs (3 types) → Alertes Console
       ↑                                                                        ↓
       |                                                              (Future: API externe)
  Trigger sur INSERT
```

Le service utilise le mécanisme PostgreSQL LISTEN/NOTIFY pour recevoir les notifications en temps réel :
- Un trigger sur la table `measurements` émet une notification via `pg_notify()`
- Le service maintient une connexion persistante avec `LISTEN new_measurement`
- Chaque nouvelle mesure déclenche les 3 analyseurs en parallèle
- Les anomalies détectées génèrent des alertes formatées dans la console

### Types d'Anomalies

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
# Database Connection
DB_HOST=measurement-db
DB_PORT=5432
DB_NAME=measurement_db
DB_USER=ial_user
DB_PASSWORD=ial_password

# Connection Pool
DB_POOL_MIN=2
DB_POOL_MAX=10

# Analysis Configuration
ANALYSIS_HISTORY_HOURS=24    # Historique pour analyse de tendances
ANALYSIS_TREND_HOURS=4       # Fenêtre d'analyse des tendances
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
```

### Monitoring des Logs

```bash
# Voir les logs en temps réel
docker logs -f analyze-service

# Voir les dernières alertes
docker logs analyze-service | grep "ALERTE"
```

### Format des Alertes

Exemple d'alerte affichée dans la console :

```
================================================================================
🚨 [ALERTE CRITICAL] 2025-11-01T16:25:17.125Z
================================================================================
Box ID       : 550e8400-e29b-41d4-a716-446655440001
Type         : Variation brusque
Mesure       : weight = 121.62 kg
Message      : Gain rapide de poids : 33.29 kg en 24 heures

Contexte :
  - Moyenne sur 1h: 91.93
  - Valeur précédente: 88.33
  - Variation: +33.29
  - Fenêtre temporelle: 24.00
  - Seuil: 3.00

Recommandation : 🚨 URGENCE MÉDICALE - Contacter immédiatement le patient et envisager une intervention d'urgence
================================================================================
```

## Développement

### Structure du Projet

```
analyze-service/
├── src/
│   ├── main.ts                          # Point d'entrée avec LISTEN/NOTIFY
│   ├── types.ts                         # Types TypeScript
│   ├── database/
│   │   ├── connection.ts                # Pool PostgreSQL + NOTIFY client
│   │   └── measurementRepository.ts     # Requêtes historiques
│   ├── analyzers/
│   │   ├── absoluteThresholdAnalyzer.ts # Analyseur de seuils
│   │   ├── variationAnalyzer.ts         # Analyseur de variations
│   │   └── trendAnalyzer.ts             # Analyseur de tendances
│   ├── services/
│   │   ├── analysisService.ts           # Orchestration des analyseurs
│   │   └── alertService.ts              # Gestion et formatage des alertes
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

# Lancer en mode développement (avec hot-reload)
npm run dev

# Lancer les tests (à venir)
npm test
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
                                            ↓ (NOTIFY trigger)
                                        Analyze Service
                                            ↓
                                     Alertes Console
                                     (Future: Webhook API)
```

### Trigger PostgreSQL

Le trigger est automatiquement créé par `databases/measurement-db/init.sql` :

```sql
CREATE OR REPLACE FUNCTION notify_new_measurement()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('new_measurement', json_build_object(...)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_new_measurement
    AFTER INSERT ON measurements
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_measurement();
```

## User Story

**En tant que médecin**
Je veux recevoir une notification en cas d'anomalie de santé
Afin de décider rapidement après analyse si je dois ordonner une visite infirmière

### Implémentation

✅ **Notification en temps réel** : Le service détecte les anomalies instantanément via PostgreSQL NOTIFY
✅ **Analyse multi-échelle** : Combine 3 types d'analyses (seuils, variations, tendances)
✅ **Contexte enrichi** : Chaque alerte inclut les données historiques et le contexte
✅ **Recommandations graduées** : 4 niveaux de sévérité avec recommandations d'action
🔄 **À venir** : Intégration webhook pour envoyer les alertes vers une API externe

## Évolutions Futures

- [ ] Persistance des alertes dans une table `anomaly_alerts`
- [ ] API REST pour consulter l'historique des alertes
- [ ] Webhook configurable pour notifier un système externe
- [ ] Machine Learning pour affiner les seuils par patient
- [ ] Dashboard temps réel avec visualisation des anomalies
- [ ] Configuration des seuils via API (sans rebuild)
- [ ] Tests unitaires et d'intégration complets

## Licence

ISC
