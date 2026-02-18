#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$ROOT/src/app/api"
HIDE_DIR="$ROOT/src/app/_api"

# Carrega .env se existir (NEXT_PUBLIC_* é injetado no build)
if [ -f "$ROOT/.env" ]; then
  set -a
  source "$ROOT/.env"
  set +a
fi

# No app (Capacitor) não há servidor Next; a busca e os dados vêm da API em produção.
# Defina NEXT_PUBLIC_API_URL com a URL do seu deploy (ex: https://meubusao.vercel.app).
if [ -z "${NEXT_PUBLIC_API_URL}" ]; then
  echo "Erro: para o app, defina NEXT_PUBLIC_API_URL com a URL do backend (ex: https://seu-site.vercel.app)."
  echo "Exemplo: NEXT_PUBLIC_API_URL=https://seu-site.vercel.app pnpm build:app"
  exit 1
fi

# Static export does not support API routes; hide them during app build
if [ -d "$API_DIR" ]; then
  mv "$API_DIR" "$HIDE_DIR"
  trap 'mv "$HIDE_DIR" "$API_DIR"' EXIT
fi

cd "$ROOT"
BUILD_FOR_APP=1 pnpm exec next build
npx cap sync
