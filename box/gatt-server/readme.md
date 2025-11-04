# 🩺 IoT Ingest Server (Montre Connectée)

Ce projet fournit un petit serveur Node.js permettant de **recevoir, valider et publier des mesures IoT** (température, poids, pouls, etc.) vers **NATS JetStream**.  
L’image de ce service est intégrée dans le **docker-compose de la montre connectée**.

---

## 🚀 Fonctionnalités

- **Endpoint HTTP** `/ingest` pour recevoir des mesures depuis un appareil (POST JSON).
- **Validation des données** avec `zod` pour garantir le format correct.
- **Publication automatique** des mesures dans une file **NATS JetStream**.
- **Endpoint de santé** `/health` pour vérifier que le service fonctionne.

---

## 📁 Structure du projet

```
.
├── Dockerfile              # Image Node.js utilisée dans le docker-compose de la montre
├── build.sh                # Script de build Docker
├── index.ts                # Point d’entrée principal du serveur
├── lib/
│   └── nats.js             # Connexion et publication NATS JetStream
├── routes/
│   └── ingest.js           # Route principale pour les mesures
```

---

## ⚙️ Variables d’environnement

Le service dépend de deux variables principales :

| Variable             | Description                                      | Exemple                 |
| -------------------- | ------------------------------------------------ | ----------------------- |
| `NATS_SERVER`        | Adresse du serveur NATS (ex: `nats://nats:4222`) | `nats://localhost:4222` |
| `BOX_PRODUCER_QUEUE` | Nom du sujet NATS où publier les messages        | `measurements.watch1`   |
| `PORT` _(optionnel)_ | Port HTTP local                                  | `2000`                  |

---

## 🧠 Exemple de corps JSON attendu

```json
{
  "payload": {
    "type": "temperature",
    "value": 36.8,
    "unit": "°C",
    "timestamp": "2025-11-01T10:45:00Z"
  },
  "source": "mock-watch-1",
  "type": "watch"
}
```

---

## 📡 Exemple de requête cURL

```bash
curl -X POST http://localhost:3000/ingest \
  -H "Content-Type: application/json" \
  -d '{
        "payload": {"type": "pulse", "value": 80, "unit": "bpm"},
        "source": "mock-watch-1",
        "type": "watch"
      }'
```

Réponse attendue :

```json
{ "ok": true, "published": true }
```

---

## 🧱 Build & Exécution Docker

### 🔨 Construire l’image

```bash
./build.sh
```

Cela crée une image locale :

```
ial/gatt-server
```

> ⚠️ **Note** : Cette image est utilisée directement dans le **docker-compose** de la montre connectée.

### 🏃 Lancer en local (sans compose)

```bash
docker run -d --name ingest-server \
  -e NATS_SERVER=nats://nats:4222 \
  -e BOX_PRODUCER_QUEUE=measurements.watch1 \
  -p 3000:3000 \
  ial/gatt-server
```

---

## 🧩 Intégration NATS

- Le module [`lib/nats.js`](./lib/nats.js) gère la connexion à NATS et la publication dans JetStream.
- Le sujet est défini par la variable `BOX_PRODUCER_QUEUE`.
- Chaque message publié contient :
  ```json
  {
    "source": "mock-watch-1",
    "deviceType": "watch",
    "type": "temperature",
    "value": 36.8,
    "unit": "°C",
    "timestamp": "2025-11-01T10:45:00Z",
    "receivedAt": "2025-11-01T10:45:05Z"
  }
  ```

---

## 🧪 Test de santé

```bash
curl http://localhost:3000/health
# → {"status":"ok","ts":1730457900000}
```
