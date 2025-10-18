# =========================
# Étape 1 : Build TypeScript
# =========================
FROM node:20-alpine AS builder
WORKDIR /app

# Installe uniquement les dépendances nécessaires à la compilation
COPY package*.json ./
RUN npm ci --omit=dev

# Copie du code source et compilation
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

# =========================
# Étape 2 : Runtime minimal
# =========================
FROM node:20-slim AS runner
WORKDIR /app

# Copie uniquement le code JS compilé
COPY --from=builder /app/dist ./dist
COPY configuration/certs ./configuration/certs
COPY package*.json ./

# Installe uniquement les dépendances runtime (sans dev)
RUN npm ci --omit=dev --ignore-scripts --no-audit

# Commande par défaut : exécuter le JS compilé
CMD ["node", "dist/main.js"]
