#!/usr/bin/env bash
# Deploy na Oracle (ou outra VM): execute apenas este script a partir da pasta do projeto.
# Ex.: cd ~/projetos/meu-busao && ./scripts/deploy.sh
# Ou de qualquer pasta: bash /caminho/para/meu-busao/scripts/deploy.sh
set -e

# Ir para a raiz do projeto (onde está package.json)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Carregar nvm se existir (Oracle/VM costumam usar nvm; em script não-interativo o PATH pode não ter node)
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  set +e
  . "$NVM_DIR/nvm.sh"
  set -e
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo ">>> Erro: pnpm não encontrado. Instale Node e pnpm ou carregue o nvm (ex.: source ~/.nvm/nvm.sh)."
  exit 1
fi

if [ ! -f .env ]; then
  echo ">>> Aviso: arquivo .env não encontrado. Crie um com DATABASE_URL (e SYNC_BASE_URL se precisar)."
fi

echo ">>> Projeto: $PROJECT_ROOT"
echo ">>> Atualizando código (git pull)..."
git pull || true

echo ">>> Instalando dependências..."
pnpm install --frozen-lockfile

echo ">>> Gerando Prisma Client..."
pnpm prisma generate

echo ">>> Build do Next.js..."
pnpm build

if ! command -v pm2 >/dev/null 2>&1; then
  echo ">>> Erro: pm2 não encontrado. Instale com: npm install -g pm2"
  exit 1
fi

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
