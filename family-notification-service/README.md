# Family Notification Service

Service cron qui envoie des notifications aux membres de la famille pour les informer de l'état de santé de leurs proches.

## Vue d'ensemble

Le `family-notification-service` est un service Node.js/TypeScript avec cron qui :
1. S'exécute périodiquement (par défaut toutes les 10 minutes, configurable)
2. Récupère tous les patients ayant au moins un **proche** dans user-db
3. Appelle l'endpoint `/analyse/:stationId/family` de l'analyze-service pour chaque patient
4. Envoie une notification personnalisée pour chaque patient

## 📱 Discord vs WhatsApp : Choix d'implémentation

### Architecture cible (Production)

L'architecture finale prévue utilise **WhatsApp Business API** pour envoyer des messages personnalisés aux numéros de téléphone des proches enregistrés dans la base de données (table `externe` avec champ `tel`).

**Avantages de WhatsApp :**
- ✅ Canal de communication familier et universellement utilisé
- ✅ Messages personnalisés par proche (un message par numéro)
- ✅ Notification push sur mobile
- ✅ Historique de conversation préservé

### Implémentation actuelle (Démonstration)

Pour la démonstration, nous utilisons **Discord Webhooks** à la place de WhatsApp.

**Raison du choix :**

Meta impose des restrictions strictes sur l'utilisation de WhatsApp Business API :
- 🔒 **Numéros vérifiés uniquement** : Il est impossible d'envoyer des messages à des numéros arbitraires sans validation préalable
- 📝 **Inscription manuelle requise** : Chaque numéro de test doit être explicitement enregistré et vérifié dans la console Meta
- ⏱️ **Processus de validation long** : La vérification des numéros et l'accès à l'API nécessitent plusieurs étapes administratives
- 🎯 **Complexité disproportionnée** : Pour une démonstration technique, le coût d'intégration (inscription de numéros de test, validation Meta, gestion des tokens) est trop important par rapport à la valeur ajoutée

**Discord comme substitut de démonstration :**
- ✅ Configuration immédiate (webhook URL)
- ✅ Pas de restrictions sur les destinataires
- ✅ Démontre le concept de notification asynchrone
- ✅ Format de message identique (texte + emojis)

### Migration future vers WhatsApp

Lorsque le projet passera en production avec des utilisateurs réels, le service pourra être adapté en :
1. Remplaçant `discordNotifier.ts` par `whatsappNotifier.ts`
2. Utilisant l'API WhatsApp Business (Cloud API ou On-Premise)
3. Récupérant les numéros de téléphone depuis la table `externe` (via jointure avec `rel_patient_externe`)
4. Envoyant un message personnalisé par proche (au lieu d'un message groupé Discord)

Le reste de l'architecture (cron, analyse, base de données) reste identique.

## Utilisation

### Démarrage

```bash
# Avec docker-compose
cd family-notification-service
docker-compose up -d

# Ou intégré dans la stack globale
./start-cloud.sh  # (si ajouté au script)
```

### Logs

```bash
# Voir les logs en temps réel
docker logs -f family-notification-service

# Voir le dernier résumé d'exécution
docker logs family-notification-service | grep "Cron Job Summary" -A 10
```

### Configuration du webhook Discord

1. Dans Discord, allez dans les paramètres du serveur
2. Intégrations → Webhooks → Nouveau Webhook
3. Choisissez le canal de destination
4. Copiez l'URL du webhook
5. Ajoutez dans `.env` : `DISCORD_WEBHOOK_URL=<url_copiée>`

## Architecture

```
[Cron Scheduler] → [User DB] → [Analyze Service] → [Discord Webhook]
     ↓                ↓              ↓                    ↓
  Toutes les     Patients avec   Analyse 7j          Messages
   10 min          proches       simplifiée          formatés
```

### Workflow

1. **Cron trigger** : Exécution selon le schedule configuré (défaut: `*/10 * * * *`)
2. **Fetch patients** : Récupère les patients avec `rel_patient_externe.type = 'proche'`
3. **Analyze** : Pour chaque patient, appelle `GET /analyse/{station_token}/family`
4. **Notify** : Envoie un message Discord avec emoji selon l'état
5. **Summary** : Affiche un résumé de l'exécution avec statistiques

## Messages Discord

Format simple avec emojis :

```
☀️ Alice Dupont - État général stable sur 7 jours
☁️ Arthur Martin - Légère variation de pouls détectée
🌧️ Jean Durand - Température élevée nécessite attention
⛈️ Marie Blanc - Situation critique - intervention urgente
```

**Emojis par état :**
- ☀️ `great` : Tout va bien
- ☁️ `okay` : Légères préoccupations
- 🌧️ `bad` : Problèmes notables
- ⛈️ `terrible` : Situation critique

## Configuration

### Variables d'environnement

```env
# Cron Configuration
CRON_SCHEDULE=*/10 * * * *    # Cron expression (défaut: toutes les 10 min)
RUN_ON_STARTUP=false          # Exécuter immédiatement au démarrage (pour tests)

# Discord Configuration
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...  # URL webhook Discord

# Analyze Service Configuration
ANALYZE_SERVICE_URL=http://analyze-service:3001
ANALYZE_SERVICE_TIMEOUT=10000  # Timeout en millisecondes

# User Database Configuration
USER_DB_HOST=user-db
USER_DB_PORT=5432
USER_DB_NAME=userdb
USER_DB_USER=user
USER_DB_PASSWORD=password

# Measurement Database Configuration (pour usage futur)
MEASUREMENT_DB_HOST=measurement-db
MEASUREMENT_DB_PORT=5432
MEASUREMENT_DB_NAME=measurement_db
MEASUREMENT_DB_USER=ial_user
MEASUREMENT_DB_PASSWORD=ial_password
```

### Cron Schedule

Le format cron suit la syntaxe standard :

```
┌────────────── seconde (optionnel)
│ ┌──────────── minute (0 - 59)
│ │ ┌────────── heure (0 - 23)
│ │ │ ┌──────── jour du mois (1 - 31)
│ │ │ │ ┌────── mois (1 - 12)
│ │ │ │ │ ┌──── jour de la semaine (0 - 7, 0 et 7 = dimanche)
│ │ │ │ │ │
* * * * * *
```

**Exemples :**
- `*/10 * * * *` : Toutes les 10 minutes
- `0 */1 * * *` : Toutes les heures
- `0 8 * * 1` : Tous les lundis à 8h00
- `0 0 * * 0` : Tous les dimanches à minuit (1 fois par semaine)

## Développement

### Structure du projet

```
family-notification-service/
├── src/
│   ├── main.ts                       # Point d'entrée avec cron
│   ├── types.ts                      # Types TypeScript
│   ├── database/
│   │   ├── userDbConnection.ts       # Connexion user-db
│   │   ├── measurementDbConnection.ts # Connexion measurement-db
│   │   └── patientRepository.ts      # Requêtes patients
│   ├── services/
│   │   ├── analyzeClient.ts          # Client HTTP analyze-service
│   │   └── discordNotifier.ts        # Envoi messages Discord
│   └── config/
│       └── emojis.ts                 # Mapping états → emojis
├── .env
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── build.sh
└── README.md
```

### Tests locaux

```bash
# Installer les dépendances
npm install

# Configurer le .env (surtout DISCORD_WEBHOOK_URL)
cp .env.example .env
# Editer .env

# Tester immédiatement au démarrage
RUN_ON_STARTUP=true npm start

# Mode développement avec hot-reload
npm run dev
```

### Build

```bash
# Builder l'image Docker
./build.sh

# Ou manuellement
docker build -t ial/family-notification-service:latest .
```

## Gestion des erreurs

Le service applique la stratégie **"Logger et continuer"** :

- ✅ Si l'analyse d'un patient échoue → Log l'erreur + continuer avec les autres
- ✅ Si l'envoi Discord échoue → Log l'erreur + continuer avec les autres
- ✅ Résumé global en fin d'exécution avec statistiques complètes

**Exemple de log d'erreur :**

```
[2025-11-01T20:30:15.123Z] - ❌ Failed to analyze patient Alice Dupont: Request timeout after 10000ms
[2025-11-01T20:30:20.456Z] - ✅ Analysis complete for Arthur Martin: okay - Légère variation
```

**Résumé d'exécution :**

```
================================================================================
[2025-11-01T20:30:45.789Z] - 📊 Cron Job Summary
================================================================================
Total patients:               10
Successful notifications:     8
Failed analyses:              1
Failed notifications:         1
Execution time:               32.15s

⚠️  Errors encountered:
  1. Alice Dupont: Analysis failed: Request timeout after 10000ms
  2. Jean Durand: Failed to send Discord notification: HTTP 429: Too Many Requests
================================================================================
```

## Rate Limiting Discord

Discord limite à **30 requêtes par minute** par webhook. Le service applique automatiquement un délai de **2 secondes** entre chaque message pour respecter ces limites.

Pour de grands volumes (>30 patients), considérez :
- Augmenter l'intervalle du cron
- Utiliser des messages groupés (future évolution)
- Filtrer davantage les patients

## Intégration avec la stack

Le service dépend de :
- **user-db** : Pour récupérer les patients et leurs proches
- **measurement-db** : Connexion disponible (pas utilisée actuellement)
- **analyze-service** : Pour obtenir les analyses de santé

```
IoT Box → NATS → Save Service → measurement-db
                                      ↑
                                analyze-service (REST API)
                                      ↑
                          family-notification-service (Cron)
                                      ↓
user-db ← rel_patient_externe      Discord
```

## Évolutions futures

- [ ] Support des embeds Discord riches avec couleurs
- [ ] Messages groupés pour économiser les requêtes Discord
- [ ] Notifications par email en plus de Discord
- [ ] Filtrage par gravité (ne notifier que bad/terrible)
- [ ] Dashboard web pour voir l'historique des notifications
- [ ] Support multi-webhook (un webhook par niveau de gravité)
- [ ] Métriques Prometheus pour monitoring
- [ ] Tests unitaires et d'intégration

## Dépannage

### Le service ne démarre pas

```bash
# Vérifier les logs
docker logs family-notification-service

# Vérifier que les bases de données sont accessibles
docker exec family-notification-service sh -c "nc -zv user-db 5432"
docker exec family-notification-service sh -c "nc -zv analyze-service 3001"
```

### Aucune notification envoyée

1. Vérifier que `DISCORD_WEBHOOK_URL` est configuré
2. Vérifier qu'il y a des patients avec proches dans user-db :
   ```sql
   SELECT p.*, rpe.type
   FROM patient p
   JOIN rel_patient_externe rpe ON p.nss = rpe.id_patient
   WHERE rpe.type = 'proche' AND p.station_token IS NOT NULL;
   ```
3. Vérifier que l'analyze-service est accessible :
   ```bash
   docker exec family-notification-service curl http://analyze-service:3001/health
   ```

### Erreur Discord 429 (Rate Limit)

Trop de requêtes Discord. Solutions :
- Réduire la fréquence du cron (ex: `0 */1 * * *` pour 1x/heure)
- Vérifier qu'il n'y a pas d'autres services utilisant le même webhook

## Licence

ISC
