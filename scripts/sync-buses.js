#!/usr/bin/env node
/**
 * Script de sync para rodar no servidor (cron ou loop).
 * Só um processo faz o sync; os usuários só leem os dados.
 * Requer o app rodando em http://127.0.0.1:3000 (ou BASE_URL).
 */
const BASE_URL = process.env.SYNC_BASE_URL || "http://127.0.0.1:3000";
const INTERVAL_MS = 15 * 1000; // 15 segundos

async function runSync() {
  try {
    const res = await fetch(`${BASE_URL}/api/buses/sync`);
    const data = await res.json().catch(() => ({}));
    const time = new Date().toISOString();
    if (res.ok) {
      console.log(`[${time}] Sync ok: ${data.count ?? 0} ônibus`);
    } else {
      console.error(`[${time}] Sync erro:`, data.message || res.status);
    }
  } catch (err) {
    const time = new Date().toISOString();
    console.error(`[${time}] Sync falhou:`, err.message);
    if (err.cause?.code === "ECONNREFUSED" || err.message?.includes("fetch failed")) {
      console.error(`   → O app está rodando? Rode "pnpm dev" em outro terminal e tente de novo.`);
    }
  }
}

const loop = process.argv.includes("--loop");

if (loop) {
  runSync();
  setInterval(runSync, INTERVAL_MS);
  console.log(`Sync rodando a cada ${INTERVAL_MS / 1000}s (Ctrl+C para parar).`);
} else {
  runSync();
}
