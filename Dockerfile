# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

RUN pnpm install --frozen-lockfile
RUN pnpm prisma generate

COPY . .

# Build Next.js em modo standalone (imagem menor)
ENV DOCKER_BUILD=1
RUN pnpm build

# Runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Copiar output standalone do Next.js
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Scripts para os containers de sync (chamada HTTP ao app)
COPY --from=builder /app/scripts ./scripts

# App principal: inicia o servidor Next
CMD ["node", "server.js"]
