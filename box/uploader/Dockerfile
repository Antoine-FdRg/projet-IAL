FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npx esbuild src/main.ts --bundle --platform=node --target=node20 --outfile=dist/main.js --minify

FROM node:20-slim AS runner
WORKDIR /app

COPY --from=builder /app/dist ./dist

COPY configuration/scheduler.sh ./scheduler.sh
RUN chmod +x ./scheduler.sh

CMD ["./scheduler.sh"]
