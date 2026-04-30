# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---- Production stage ----
FROM node:20-alpine
LABEL maintainer="kid-journey"

# Security: run as non-root
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

# Copy deps from builder
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Copy source
COPY src/ ./src/
COPY montessori.js ./
COPY scripts/ ./scripts/
RUN mkdir -p data && node scripts/prepare-who-data.js "" data/who-lms-data.json
COPY public/ ./public/

# Create data dirs
RUN mkdir -p data/uploads && chown -R app:app data

USER app

EXPOSE 3107

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q --spider http://localhost:3107/api/auth/status || exit 1

CMD ["node", "src/server.js"]
