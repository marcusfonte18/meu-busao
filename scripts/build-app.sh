#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$ROOT/src/app/api"
HIDE_DIR="$ROOT/src/app/_api"

# Static export does not support API routes; hide them during app build
if [ -d "$API_DIR" ]; then
  mv "$API_DIR" "$HIDE_DIR"
  trap 'mv "$HIDE_DIR" "$API_DIR"' EXIT
fi

cd "$ROOT"
BUILD_FOR_APP=1 pnpm exec next build
npx cap sync
