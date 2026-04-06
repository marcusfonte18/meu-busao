#!/usr/bin/env node
/**
 * Script de sync BRT para rodar no servidor (cron ou loop).
 * Atualiza o banco com dados de https://dados.mobilidade.rio/gps/brt.
 * Requer o app rodando (ex.: SYNC_BASE_URL ou http://127.0.0.1:3000).
 */
const BASE_URL = process.env.SYNC_BASE_URL || "http://127.0.0.1:3000";
const INTERVAL_MS = 15 * 1000; // 15 segundos

async function runSync() {
  try {
    const res = await fetch(`${BASE_URL}/api/brt/sync`);
    const data = await res.json().catch(() => ({}));
    const time = new Date().toISOString();
    if (res.ok) {
      console.log(`[${time}] Sync BRT ok: ${data.count ?? 0} veículos`);
    } else {
      console.error(`[${time}] Sync BRT erro:`, data.message || res.status);
    }
  } catch (err) {
    const time = new Date().toISOString();
    console.error(`[${time}] Sync BRT falhou:`, err.message);
    if (err.cause?.code === "ECONNREFUSED" || err.message?.includes("fetch failed")) {
      console.error(`   → O app está rodando? Rode "pnpm dev" ou "pnpm start" e tente de novo.`);
    }
  }
}

const loop = process.argv.includes("--loop");

if (loop) {
  // Pequeno delay para o app estar de pé antes do primeiro sync
  const delayMs = 3000;
  console.log(`Sync BRT iniciando em ${delayMs / 1000}s...`);
  setTimeout(() => {
    runSync();
    setInterval(runSync, INTERVAL_MS);
    console.log(`Sync BRT rodando a cada ${INTERVAL_MS / 1000}s (Ctrl+C para parar).`);
  }, delayMs);
} else {
  runSync();
}
