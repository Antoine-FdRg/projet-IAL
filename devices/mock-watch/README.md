# 🕹️ Mock Watch — Simulateur de Montre Connectée

Ce projet simule une montre connectée capable d’envoyer régulièrement des mesures physiologiques (pouls, température, poids, pas, etc.) vers un serveur d’ingestion HTTP.  
Il permet de tester une architecture IoT sans matériel réel.

---

## 🚀 Fonctionnalités

- Génération de mesures aléatoires réalistes :
  - **Température** (°C, °F)
  - **Poids** (kg, lbs)
  - **Fréquence cardiaque** (bpm)
  - **Pas cumulés**
- Simulation d’erreurs Bluetooth ou réseau (20% de probabilité)
- Envoi automatique des données vers un endpoint HTTP (`/ingest`)
- Configuration flexible via un fichier `.env`
- Conteneurisation Docker simple pour exécution isolée

---

## 🧩 Structure du projet

```
.
├── .env                 # Variables d'environnement de la montre
├── build.sh             # Script pour builder l'image Docker
├── docker-compose.yml   # Orchestration Docker (mock-watch + backend cible)
├── Dockerfile           # Image Node.js légère pour la montre simulée
└── index.js             # Script principal de simulation
```

---

## ⚙️ Configuration (.env)

Le fichier `.env` contient les paramètres principaux du simulateur :

```bash
ENDPOINT_URL=http://gatt-server:2000/ingest  # URL de réception des mesures
PULSE_INTERVAL_MS=5000                       # Intervalle d’envoi du pouls (ms)
SEND_INTERVAL_MS=30000                       # Intervalle des autres mesures (ms)
INIT_WEIGHT_KG=70.5                          # Poids initial du profil simulé
SOURCE_ID=mock-watch-1                       # Identifiant unique de la montre
DEVICE_TYPE=watch                            # Type d’appareil simulé
```

---

## 🧠 Fonctionnement

Le script `index.js` :

- Génère périodiquement des mesures aléatoires dans des plages réalistes.
- Introduit occasionnellement des valeurs absurdes (“nonsense”) pour tester la robustesse du backend.
- Envoie chaque mesure au format JSON vers l’`ENDPOINT_URL`.

Exemple d’envoi :

```json
{
  "payload": {
    "type": "pulse",
    "value": 78,
    "unit": "bpm",
    "timestamp": "2025-11-01T09:20:05.123Z"
  },
  "source": "mock-watch-1",
  "type": "watch"
}
```

---

## 🐳 Utilisation avec Docker

### 1. Builder l’image

```bash
./build.sh
```

ou manuellement :

```bash
docker build -t ial/mock-watch .
```

### 2. Lancer le conteneur

```bash
docker-compose up -d
```

Cela démarre le simulateur et envoie les mesures au service défini dans `ENDPOINT_URL`.

### 3. Arrêter proprement

```bash
docker-compose down
```

ou via `Ctrl + C` si lancé en mode interactif :

```bash
🛑 Stop.
```

---

## 🧾 Logs

Lors de l’exécution, le simulateur affiche :

```
▶ Mock Watch — mock-watch-1
   • Pulse toutes 5s
   • Temp/Weight/Steps toutes 30s
   → http://gatt-server:2000/ingest
[OK] pulse -> 78 bpm | Accepted
[SIM ERR] Bluetooth connection lost @ 2025-11-01T09:22:12.301Z (non envoyé)
[OK] temperature -> 22.15 °C | Accepted
```

---

## 💡 Conseils

- Tu peux modifier les intervalles ou le poids initial dans `.env` pour simuler d’autres conditions.
- Pour tester plusieurs montres, crée plusieurs `.env` et conteneurs avec des `SOURCE_ID` différents.
- Si ton backend est en local, change simplement `ENDPOINT_URL` en `http://localhost:2000/ingest`.
