# Monorepo-aware image for @nidhivan/api. Build context is the REPO ROOT, not
# apps/api — the npm workspace lockfile lives there and Prisma needs the schema.
#
#   docker build -f apps/api/Dockerfile -t nidhivan-api .
#
# Debian slim rather than Alpine on purpose: bcrypt is a native addon and Prisma
# needs OpenSSL, both of which are far less trouble against glibc than musl.

# ---------- builder ----------
FROM node:22-slim AS builder
WORKDIR /app

# python3/make/g++ are needed to compile bcrypt when no prebuild matches.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Manifests first so dependency install caches independently of source changes.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

# Only the api workspace (plus the root) — avoids pulling the web app's Next.js
# toolchain into an image that will never serve it.
RUN npm ci --workspace @nidhivan/api --include-workspace-root

# @nidhivan/shared resolves through the workspace symlink; it ships raw TS and
# has no build step of its own.
COPY packages/shared packages/shared
COPY apps/api apps/api

RUN npx prisma generate --schema apps/api/prisma/schema.prisma
RUN npm run build --workspace @nidhivan/api

# ---------- runtime ----------
FROM node:22-slim AS runner
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# node_modules carries the generated Prisma client and the compiled bcrypt
# binding, so it is copied wholesale rather than reinstalled.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
# prisma/ is kept so `prisma migrate deploy` can run as a pre-deploy step.
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Drop root.
USER node

WORKDIR /app/apps/api
EXPOSE 3001

# Migrations run at startup because Render's preDeployCommand is a paid-plan
# feature. `migrate deploy` is idempotent and costs one query when there is
# nothing to apply, so the repeated runs on free-tier wake-ups are cheap.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
