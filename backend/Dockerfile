# Build context: repository root (npm workspaces share one lockfile)
FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY e2e/package.json e2e/
RUN npm ci --workspace backend --include-workspace-root=false

COPY backend backend
WORKDIR /app/backend
RUN npx prisma generate

ENV NODE_ENV=production API_PORT=4000 UPLOAD_DIR=/app/backend/uploads
EXPOSE 4000
# Apply migrations, seed system templates (idempotent), start the API
CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/seed.js && node src/server.js"]
