# Multi-stage build for family-notification-service

# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Stage 2: Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy source code and TypeScript config
COPY tsconfig.json ./
COPY src/ ./src/

# Install tsx for running TypeScript directly
RUN npm install -g tsx

# Expose no ports (cron service, not HTTP)

# Health check (just verify process is running)
HEALTHCHECK --interval=60s --timeout=5s --start-period=10s --retries=3 \
  CMD pgrep -f "node" > /dev/null || exit 1

# Start the service
CMD ["npm", "start"]
