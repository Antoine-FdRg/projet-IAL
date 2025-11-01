# -----------------------------
# Dockerfile - Mock Watch
# -----------------------------
FROM node:20-alpine

# Répertoire de travail
WORKDIR /app

# Copier les dépendances
COPY package*.json ./

# Installer seulement ce qu'il faut
RUN npm install --production

# Copier le code source
COPY . .

# Exposer un log lisible (UTF-8)
ENV LANG=C.UTF-8

# Par défaut, node exécutera index.js
CMD ["node", "index.js"]
