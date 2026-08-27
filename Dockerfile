# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1 — builder: resolve the production dependency tree and generate the
# Prisma client. Nothing from this stage ships except node_modules.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Only the files needed to install dependencies and run the Prisma
# `postinstall` hook (`prisma generate`).
COPY package*.json ./
COPY prisma/ prisma/
COPY prisma.config.ts ./

# Deterministic, production-only install. The postinstall hook emits the
# generated client into node_modules/.prisma.
RUN npm ci --omit=dev

# ---------------------------------------------------------------------------
# Stage 2 — runner: minimal runtime image with only production code.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner

# dumb-init reaps zombies and forwards signals so Node shuts down cleanly
# when it runs as PID 1.
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false

WORKDIR /app

# Production dependency tree (includes the generated Prisma client).
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

# Application code plus the files Prisma needs at runtime for `db push`.
COPY --chown=node:node package*.json ./
COPY --chown=node:node prisma/ prisma/
COPY --chown=node:node prisma.config.ts ./
COPY --chown=node:node src/ src/

# Run as the built-in unprivileged user shipped with the node image.
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]

# Sync the schema to the database, then start the API.
CMD ["sh", "-c", "npx prisma db push && npm start"]
