# =========================
# Étape 1 : Build TypeScript
# =========================
FROM node:20-alpine AS builder
WORKDIR /app

# Installe uniquement les dépendances nécessaires à la compilation
COPY package*.json ./
RUN npm ci

# Copie du code source et compilation
COPY tsconfig.json ./
COPY src ./src
RUN npx esbuild src/main.ts --bundle --platform=node --target=node20 --outfile=dist/main.js --minify

# =========================
# Étape 2 : Runtime minimal
# =========================
FROM node:20-slim AS runner
WORKDIR /app

# Copie uniquement le code JS compilé
COPY --from=builder /app/dist ./dist

# Commande par défaut : exécuter le JS compilé
CMD ["node", "dist/main.js"]
