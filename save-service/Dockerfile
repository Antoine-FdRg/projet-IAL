FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src ./src
COPY tsconfig.json ./

# Copy environment example (actual .env will be mounted)
COPY .env ./


# Start the service
CMD ["npm", "start"]
