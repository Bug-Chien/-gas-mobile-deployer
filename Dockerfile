# Multi-stage build for Next.js standalone output
# 用於 Cloud Run / 任何 OCI 容器平台

# --- 1. deps ---
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

# --- 2. builder ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 預設不帶 DATABASE_URL 也能 build；只有 runtime 需要
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# --- 3. runner ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080

# 非 root user
RUN addgroup -S app && adduser -S app -G app

# Standalone server + 必要的執行期依賴
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
# Prisma engine + schema 給 runtime migrate
COPY --from=builder --chown=app:app /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=app:app /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder --chown=app:app /app/prisma ./prisma
COPY --from=builder --chown=app:app /app/node_modules/prisma ./node_modules/prisma

USER app
EXPOSE 8080

# 啟動時跑 migrate deploy 再啟 server
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
