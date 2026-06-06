# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Placeholders for `next build` only — runtime env comes from docker-compose / Render.
ENV FRONTEND_URL=http://localhost:8080 \
    JWT_SECRET=build-placeholder-not-used-at-runtime \
    DATABASE_URL=postgresql://build:build@localhost:5432/build \
    S3_REGION=us-east-1 \
    S3_BUCKET=build \
    S3_ACCESS_KEY_ID=build \
    S3_SECRET_ACCESS_KEY=build
RUN npx prisma generate && npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate && npm cache clean --force

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/app ./app
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/next-env.d.ts ./next-env.d.ts
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh && chown -R nodejs:nodejs /app

USER nodejs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
