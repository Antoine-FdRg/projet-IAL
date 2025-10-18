# Box – MongoDB + GATT Server

Ce repo contient :

- **Infra MongoDB** (Docker + script d’init) pour stocker les messages reçus de l’extérieur.
- **Serveur GATT (Node.js/TypeScript)** qui se connecte à MongoDB et enregistre les messages (depuis BLE ou autres sources).

## 📁 Arborescence

```
box/
  infra/
    mongo/
      init/
        001-init.js           # création DB, user, index (TTL, uniques)
      docker-compose.yml      # Mongo + Mongo Express
  gatt-server/
    src/
      db/
        index.ts              # connexion Mongoose
        models/
          Message.ts          # schéma Message
        repositories/
          messageRepo.ts      # saveMessage/getRecentMessages
      index.ts                # bootstrap de test (sans BLE)
    .env                      # URI Mongo
    package.json
    tsconfig.json
  README.md
```

---

## 🚀 Démarrage rapide

### 1) Prérequis

- **Docker Desktop** (Windows/macOS/Linux)
- **Node.js** ≥ 18 + **npm**
- (Optionnel) `mongosh` (sinon on utilise `docker exec`)

### 2) Lancer l’infra Mongo

Depuis `box/infra/mongo` :

```bash
docker compose up -d
```

- MongoDB : `localhost:27017`
- Mongo Express (UI) : http://localhost:8081 (login: `admin` / `admin`)

> ⚠️ Les scripts d’init (dans `init/`) ne tournent **qu’au 1er démarrage** d’un volume vide.  
> Si vous les avez ajoutés après, faites un reset :  
> `docker compose down -v && docker compose up -d`.

### 3) Configurer le serveur GATT

Depuis `box/gatt-server` :

```bash
npm i
```

Créez `box/gatt-server/.env` (une seule ligne, sans guillemets) **Option A (user app dans admin)** :

```
MONGODB_URI=mongodb://app:root@localhost:27017/?authSource=admin
```

ou **Option B (user app dans messagesdb)** :

```
MONGODB_URI=mongodb://app:root@localhost:27017/?authSource=messagesdb
```

> Les deux options fonctionnent — choisissez celle qui correspond à la création de votre user dans `001-init.js`.

Lancez un test :

```bash
npm run dev
```

Vous devez voir :

```
[mongo] connecté
Messages récents: ...
```

---

## 🛠️ Détails techniques

### A) Docker Compose (infra/mongo/docker-compose.yml)

```yaml
services:
  mongo:
    image: mongo:7
    container_name: mongo
    restart: unless-stopped
    ports: ["27017:27017"]
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: rootpwd
    volumes:
      - mongo_data:/data/db
      - ./init/:/docker-entrypoint-initdb.d/:ro

  mongo-express:
    image: mongo-express:1
    container_name: mongo-express
    restart: unless-stopped
    ports: ["8081:8081"]
    environment:
      ME_CONFIG_MONGODB_ADMINUSERNAME: root
      ME_CONFIG_MONGODB_ADMINPASSWORD: rootpwd
      ME_CONFIG_MONGODB_URL: mongodb://root:rootpwd@mongo:27017/?authSource=admin
      ME_CONFIG_BASICAUTH_USERNAME: admin
      ME_CONFIG_BASICAUTH_PASSWORD: admin

volumes:
  mongo_data:
```

### B) Script d’init Mongo (infra/mongo/init/001-init.js)

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

### C) Configuration Node (gatt-server)

**package.json**

```json
{
  "name": "gatt-server",
  "version": "1.0.0",
  "type": "commonjs",
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "dotenv": "^16.4.5",
    "mongoose": "^8.6.0"
  },
  "devDependencies": {
    "@types/node": "^22.5.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.6.3"
  }
}
```

**tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "verbatimModuleSyntax": false,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

**src/db/index.ts**

```ts
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGODB_URI!;
if (!uri) throw new Error("MONGODB_URI manquant dans .env");

export async function connectMongo() {
  if (mongoose.connection.readyState === 1) return;
  console.log("[env] uri:", uri.replace(/(\/\/).+(:).+(@)/, "$1****$2****$3"));
  await mongoose.connect(uri, {
    dbName: "messagesdb",
    serverSelectionTimeoutMS: 8000,
    appName: "archi-gatt-server",
  } as any);
  console.log("[mongo] connecté");
}

export async function disconnectMongo() {
  await mongoose.disconnect();
}
```

**src/db/models/Message.ts**

```ts
import mongoose, { Schema, InferSchemaType } from "mongoose";

const MessageSchema = new Schema(
  {
    messageId: { type: String, index: true, unique: true, sparse: true },
    payload: { type: Schema.Types.Mixed, required: true },
    source: { type: String, default: "unknown" },
    metadata: { type: Schema.Types.Mixed },
    receivedAt: { type: Date, default: () => new Date(), index: -1 },
    expireAt: { type: Date, default: null, index: { expireAfterSeconds: 0 } },
  },
  { versionKey: false }
);

export type MessageDoc = InferSchemaType<typeof MessageSchema>;
export const MessageModel = mongoose.model(
  "Message",
  MessageSchema,
  "messages"
);
```

**src/db/repositories/messageRepo.ts**

```ts
import crypto from "crypto";
import { MessageModel } from "../models/Message";

export async function saveMessage({
  messageId,
  payload,
  source,
  metadata,
  ttlDays,
}: {
  messageId?: string;
  payload: any;
  source?: string;
  metadata?: Record<string, any>;
  ttlDays?: number;
}) {
  const expireAt = ttlDays ? new Date(Date.now() + ttlDays * 86400000) : null;
  return await MessageModel.create({
    messageId: messageId ?? crypto.randomUUID(),
    payload,
    source: source ?? "unknown",
    metadata: metadata ?? {},
    expireAt,
  });
}

export async function getRecentMessages(limit = 20) {
  return await MessageModel.find().sort({ receivedAt: -1 }).limit(limit).lean();
}
```

**src/index.ts**

```ts
import { connectMongo } from "./db";
import { saveMessage, getRecentMessages } from "./db/repositories/messageRepo";

async function main() {
  await connectMongo();
  await saveMessage({
    payload: { hello: "world" },
    source: "test",
    metadata: { note: "premier insert" },
    ttlDays: 30,
  });
  const recents = await getRecentMessages(5);
  console.log("Messages récents:", recents);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

## 🔐 Sécurité (bases)

- Ne commitez pas .env.

- Évitez d’utiliser root en prod ; créez un user applicatif dédié.

- Utilisez un mot de passe fort (URL-encodez si nécessaire).

- Pour la prod, privilégiez MongoDB Atlas (network rules + user par environnement).
