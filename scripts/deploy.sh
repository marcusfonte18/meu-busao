#!/usr/bin/env bash
# Rode na VM (Oracle, DigitalOcean, etc.): cd ~/projetos/meu-busao && ./scripts/deploy.sh
set -e
cd "$(dirname "$0")/.."

echo ">>> Atualizando código (git pull)..."
git pull || true

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
export SYNC_BASE_URL="$SYNC_URL"
echo ">>> Reiniciando syncs (ônibus + BRT) com SYNC_BASE_URL=$SYNC_URL..."
# Remove processos atuais e nomes antigos que possam ter ficado no PM2
for name in meu-busao-sync meu-busao-sync-brt sync-buses "sync:brt:loop"; do
  pm2 delete "$name" 2>/dev/null || true
done
pm2 start pnpm --name meu-busao-sync -- run sync:loop
pm2 start pnpm --name meu-busao-sync-brt -- run sync:brt:loop
pm2 save

echo ">>> Deploy concluído. App na porta 3000; syncs rodando em background."
echo "    Logs app:    pm2 logs meu-busao"
echo "    Logs syncs:  pm2 logs meu-busao-sync meu-busao-sync-brt"
