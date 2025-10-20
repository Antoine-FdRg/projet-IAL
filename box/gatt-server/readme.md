# 📦 Box – MongoDB + GATT Server (REST Version)

Ce dépôt contient l’infrastructure et le code d’un système complet permettant de :

- Héberger une base **MongoDB** (via Docker) pour stocker des messages JSON entrants.
- Démarrer un **serveur Node.js/TypeScript** (REST) connecté à cette base.
- Enregistrer et consulter les messages reçus depuis des sources externes (capteurs, boîtiers, etc.).

---

## 📁 Arborescence

```
box/
  infra/
    mongo/
      init/
        001-init.js           # Script d’initialisation de la base
      docker-compose.yml      # Conteneur MongoDB + Mongo Express
  gatt-server/
    src/
      db.js                   # Connexion Mongoose
      models/
        Message.ts            # Schéma Mongoose pour les messages
      index.ts                # Exemple de bootstrap (sans BLE)
    .env                      # URI MongoDB
    package.json
    tsconfig.json
  README.md
```

---

## 🚀 Démarrage rapide

### 1️⃣ Prérequis

- 🐋 **Docker Desktop** (Windows/macOS/Linux)
- 🟢 **Node.js ≥ 18** + **npm**
- (Optionnel) `mongosh` pour interagir directement avec la base.

---

### 2️⃣ Lancer l’infrastructure MongoDB

Depuis le dossier :

```bash
cd box/infra/mongo
docker compose up -d
```

📍 Accès :

- **MongoDB** → `mongodb://localhost:27017`
- **Mongo Express (interface web)** → [http://localhost:8081](http://localhost:8081)
  - Identifiant : `admin`
  - Mot de passe : `admin`

> ⚠️ Les scripts d’init (`init/`) ne sont exécutés qu’au **premier lancement** sur un volume vide.  
> Si vous les avez ajoutés après, faites un reset :
>
> ```bash
> docker compose down -v && docker compose up -d
> ```

---

### 3️⃣ Configurer le serveur Node.js

Depuis `box/gatt-server` :

```bash
npm install
```

Créez le fichier `.env` :

```
MONGODB_URI=mongodb://app:root@localhost:27017/?authSource=admin
```

---

### 4️⃣ Démarrer le serveur

```bash
npm run dev
```

✅ Si tout est correct, vous verrez :

```
[mongo] connecté
Messages récents: [...]
```

---

## 🔐 Sécurité (bonnes pratiques)

- ❌ **Ne pas committer** le fichier `.env`
- 🔐 Utiliser un **compte non-root** pour l’application
- 🔑 Choisir un mot de passe fort (et l’URL-encoder si besoin)
- 🌐 En production : préférer **MongoDB Atlas**, avec des _Network Rules_ et un _user par environnement_

---

## 🧠 Pour aller plus loin

- Ajouter une API REST (`POST /ingest`, `GET /messages`)
- Ajouter un frontend minimal (React / Angular)
- Intégrer un service d’analyse des données (ex: Grafana / InfluxDB)
- Dockeriser le serveur Node.js pour un déploiement complet

---

## 👩‍💻 Auteur

**Emma ALLAIN**
