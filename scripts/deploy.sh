#!/usr/bin/env bash
# Rode na VM (Oracle, DigitalOcean, etc.): cd ~/projetos/meu-busao && ./scripts/deploy.sh
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

SYNC_URL="${SYNC_BASE_URL:-http://127.0.0.1:3000}"
echo ">>> Reiniciando syncs (ônibus + BRT) com SYNC_BASE_URL=$SYNC_URL..."
pm2 delete meu-busao-sync 2>/dev/null || true
pm2 delete meu-busao-sync-brt 2>/dev/null || true
pm2 start bash -c "SYNC_BASE_URL=$SYNC_URL pnpm run sync:loop" --name meu-busao-sync
pm2 start bash -c "SYNC_BASE_URL=$SYNC_URL pnpm run sync:brt:loop" --name meu-busao-sync-brt
pm2 save

echo ">>> Deploy concluído. App na porta 3000; syncs rodando em background."
echo "    Logs app:    pm2 logs meu-busao"
echo "    Logs syncs:  pm2 logs meu-busao-sync meu-busao-sync-brt"
