FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema=apps/backend/prisma/schema.prisma
RUN npx nx build backend --configuration=production

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/backend/.next/standalone ./
COPY --from=builder /app/apps/backend/.next/static ./apps/backend/.next/static
COPY --from=builder /app/apps/backend/public ./apps/backend/public
COPY --from=builder /app/apps/backend/prisma ./prisma

WORKDIR /prisma-cli
RUN npm init -y && npm install prisma@6
WORKDIR /app

EXPOSE 3000
CMD ["sh", "-c", "/prisma-cli/node_modules/.bin/prisma db push --schema=/app/prisma/schema.prisma --skip-generate && node apps/backend/server.js"]
