# Multi-stage build for analyze-service
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build stage is not needed as we use tsx to run TypeScript directly
# But we keep the structure consistent with other services

# Production image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm install tsx

# Copy source code
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./

# Set environment to production
ENV NODE_ENV=production

# Run the service
CMD ["npm", "start"]
