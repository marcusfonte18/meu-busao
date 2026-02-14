#!/usr/bin/env node
/**
 * Popula a coleção de linhas (Line) a partir do GTFS routes.txt.
 * Rode: node scripts/seed-lines.js (ou pnpm run seed:lines)
 * Requer: gtfs_rio-de-janeiro/routes.txt e DATABASE_URL no .env
 */
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { PrismaClient } = require("@prisma/client");

const GTFS_DIR = path.join(__dirname, "..", "gtfs_rio-de-janeiro");
const ROUTES_PATH = path.join(GTFS_DIR, "routes.txt");

/** Remove acentos para busca (ex.: "São Paulo" → "sao paulo"). */
function normalizeForSearch(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if ((c === "," && !inQuotes) || (c === "\r" && !inQuotes)) {
      result.push(current.trim());
      current = "";
    } else if (c !== "\r") current += c;
  }
  result.push(current.trim());
  return result;
}

async function main() {
  if (!fs.existsSync(ROUTES_PATH)) {
    console.error("Arquivo não encontrado:", ROUTES_PATH);
    process.exit(1);
  }
  const content = fs.readFileSync(ROUTES_PATH, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());
  const header = parseCSVLine(lines[0]);
  const shortIdx = header.indexOf("route_short_name");
  const longIdx = header.indexOf("route_long_name");
  const typeIdx = header.indexOf("route_type");
  const agencyIdx = header.indexOf("agency_id");
  const descIdx = header.indexOf("route_desc");
  if (shortIdx === -1 || longIdx === -1) {
    console.error("Colunas route_short_name ou route_long_name não encontradas");
    process.exit(1);
  }

  /** Classifica BRT vs ônibus pelo GTFS (route_type 702, nome com BRT/Trans*, agency, etc.). */
  function isBrt(row) {
    const tipo = (row[typeIdx] || "").trim();
    const agency = (row[agencyIdx] || "").toLowerCase();
    const desc = (row[descIdx] || "").toLowerCase();
    const nome = (row[longIdx] || "").toLowerCase();
    const numero = (row[shortIdx] || "").toLowerCase();
    const text = [agency, desc, nome, numero].join(" ");
    // route_type 702 = express bus (BRT no GTFS estendido)
    if (tipo === "702") return true;
    // Nomes típicos do BRT do Rio
    if (/brt|transoeste|transcarioca|transol[ií]mpica|transbrasil/i.test(text)) return true;
    return false;
  }

  const byNumero = new Map(); // numero -> { nome, tipo }
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const numero = (row[shortIdx] || "").trim();
    const nome = (row[longIdx] || "").trim();
    if (numero && !byNumero.has(numero)) {
      byNumero.set(numero, {
        nome: nome || numero,
        tipo: isBrt(row) ? "brt" : "onibus",
      });
    }
  }

  const prisma = new PrismaClient();
  const data = [...byNumero.entries()].map(([numero, { nome, tipo }]) => ({
    numero,
    nome,
    tipo,
    numeroSearch: normalizeForSearch(numero),
    nomeSearch: normalizeForSearch(nome || numero),
  }));

  await prisma.line.deleteMany({});
  if (data.length > 0) {
    await prisma.line.createMany({ data });
  }
  await prisma.$disconnect();
  const brts = data.filter((d) => d.tipo === "brt").length;
  console.log(`Linhas: ${data.length} importadas (${data.length - brts} ônibus, ${brts} BRT).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
