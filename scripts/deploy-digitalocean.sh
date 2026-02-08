#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

echo ">>> Instalando dependências..."
pnpm install --frozen-lockfile

echo ">>> Gerando Prisma Client..."
pnpm prisma generate

echo ">>> Build do Next.js..."
pnpm build

echo ">>> Reiniciando app com PM2..."
pm2 delete meu-busao 2>/dev/null || true
pm2 start pnpm --name meu-busao -- start
pm2 save
pm2 startup 2>/dev/null || true

echo ">>> Deploy concluído. App rodando na porta 3000."
echo "    Para ver logs: pm2 logs meu-busao"
