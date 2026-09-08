FROM node:24.20.0-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24.20.0-bookworm-slim AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24.20.0-bookworm-slim AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates util-linux \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 app \
    && useradd --uid 10001 --gid app --shell /usr/sbin/nologin --create-home app
WORKDIR /app
COPY --from=builder --chown=app:app /app/dist/standalone /app
COPY --from=builder --chown=app:app /app/src/server/db/migrations /app/migrations
COPY --chown=app:app scripts /app/scripts
RUN mkdir -p /app/data /app/backups && chown -R app:app /app/data /app/backups
ENV NODE_ENV=production \
    APP_DATA_DIR=/app/data \
    BACKUP_DIR=/app/backups \
    DB_MIGRATIONS_DIR=/app/migrations \
    HOST=0.0.0.0 \
    PORT=3000
USER root
EXPOSE 3000
VOLUME ["/app/data", "/app/backups"]
ENTRYPOINT ["node", "scripts/container-entrypoint.mjs"]
