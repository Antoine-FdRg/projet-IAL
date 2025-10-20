# 🗄️ Module DB — Démarrer la base de données (MongoDB)

Ce guide explique **uniquement** comment démarrer et vérifier la **base MongoDB** du projet.  
Il est pensé pour le dossier d'infra (ex : `box/infra/mongo`) mais reste valable si vous placez ce README dans un module `db` séparé.

---

## ✅ Prérequis

- 🐋 **Docker** et **Docker Compose** installés
- 🔌 Port **27017** libre (MongoDB) et **8081** libre (Mongo Express)
- (Optionnel) **mongosh** si vous voulez vous connecter en ligne de commande

---

## 🚀 Démarrage rapide

Dans le dossier qui contient `docker-compose.yml` (ex : `box/infra/mongo/`) :

```bash
docker compose up -d
```

- MongoDB est exposé sur `localhost:27017`
- Mongo Express (interface web) est dispo sur **http://localhost:8081**
  - Utilisateur : `admin`
  - Mot de passe : `admin`

> ℹ️ Au **premier lancement**, les scripts d’init (dossier `init/`) sont exécutés automatiquement :  
> création de la base `messagesdb`, d’un utilisateur applicatif, d’index, etc.

---

## 🧪 Vérifier que tout est OK

### 1) État des conteneurs

```bash
docker compose ps
```

### 2) Logs rapides

```bash
docker compose logs --tail=50
```

### 3) Connexion à MongoDB (avec mongosh)

Si vous avez `mongosh` localement :

```bash
mongosh "mongodb://root:rootpwd@localhost:27017/?authSource=admin"
```

Passer ensuite sur la base applicative :

```js
use messagesdb
db.stats()
db.messages.countDocuments()
```

### 4) Connexion via le conteneur

Sans `mongosh` local :

```bash
docker exec -it mongo mongosh "mongodb://root:rootpwd@localhost:27017/?authSource=admin"
```

---

## 👤 Utilisateurs & Authentification

Le script d’init (ex: `init/001-init.js`) crée :

- Base de données : **`messagesdb`**
- Utilisateur applicatif : **`app`** / **`root`** avec rôle `readWrite` sur `messagesdb`
- Index utiles sur la collection `messages` :
  - `receivedAt` (tri par récents)
  - `messageId` (unique, optionnel)
  - `expireAt` (TTL pour expiration auto)

Exemple de script d’init (rappel) :

```js
db = db.getSiblingDB("messagesdb");

db.createUser({
  user: "app",
  pwd: "root",
  roles: [{ role: "readWrite", db: "messagesdb" }],
});

db.createCollection("messages");
db.messages.createIndex({ receivedAt: -1 });
db.messages.createIndex({ messageId: 1 }, { unique: true });
db.messages.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 });
```

---

## 🔐 Chaînes de connexion (exemples)

### Application (user applicatif dans `admin`)

```
mongodb://app:root@localhost:27017/?authSource=admin
```

### Application (user applicatif dans `messagesdb`)

```
mongodb://app:root@localhost:27017/?authSource=messagesdb
```

### Administrateur root (attention : à éviter côté app)

```
mongodb://root:rootpwd@localhost:27017/?authSource=admin
```

---

## 🔄 Réinitialiser l’initialisation (scripts `init/`)

Si vous modifiez les scripts d’init **après** un premier démarrage, il faut repartir d’un volume vide :

```bash
docker compose down -v
docker compose up -d
```

> ⚠️ `-v` supprime les **données** locales du volume. Sauvegardez avant si nécessaire.

---

## 💾 Sauvegarde & Restauration (basique)

### Dump (sauvegarde) de la base `messagesdb`

```bash
docker exec -it mongo mongodump --db messagesdb --out /dump
docker cp mongo:/dump ./dump
```

### Restore (restauration)

```bash
docker cp ./dump mongo:/dump
docker exec -it mongo sh -c "mongorestore --drop --db messagesdb /dump/messagesdb"
```
