#!/usr/bin/env node
/**
 * Popula a coleção route_shapes (traçados das linhas) a partir da pasta GTFS.
 * Rode uma vez em dev (onde está gtfs_rio-de-janeiro) e o banco fica pronto para produção.
 * Uso: node scripts/seed-route-shapes.js  ou  pnpm run seed:route-shapes
 * Requer: gtfs_rio-de-janeiro/ (routes.txt, trips.txt, shapes.txt) e DATABASE_URL no .env
 */
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { PrismaClient } = require("@prisma/client");

const GTFS_DIR = path.join(__dirname, "..", "gtfs_rio-de-janeiro");

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

function loadGTFS() {
  const routesPath = path.join(GTFS_DIR, "routes.txt");
  const tripsPath = path.join(GTFS_DIR, "trips.txt");
  const shapesPath = path.join(GTFS_DIR, "shapes.txt");

  if (!fs.existsSync(routesPath) || !fs.existsSync(tripsPath) || !fs.existsSync(shapesPath)) {
    return null;
  }

  const routeShortNameToShapeIds = new Map();
  const shapeIdToPositions = new Map();

  // routes.txt
  const routesContent = fs.readFileSync(routesPath, "utf-8");
  const routesLines = routesContent.split("\n").filter((l) => l.trim());
  const routesHeader = parseCSVLine(routesLines[0]);
  const routeIdIdx = routesHeader.indexOf("route_id");
  const shortNameIdx = routesHeader.indexOf("route_short_name");
  if (routeIdIdx === -1 || shortNameIdx === -1) return null;

  const routeIdToShortName = new Map();
  for (let i = 1; i < routesLines.length; i++) {
    const row = parseCSVLine(routesLines[i]);
    if (row[routeIdIdx] && row[shortNameIdx]) {
      routeIdToShortName.set(row[routeIdIdx], row[shortNameIdx]);
    }
  }

  // trips.txt
  const tripsContent = fs.readFileSync(tripsPath, "utf-8");
  const tripsLines = tripsContent.split("\n").filter((l) => l.trim());
  const tripsHeader = parseCSVLine(tripsLines[0]);
  const tripsRouteIdIdx = tripsHeader.indexOf("route_id");
  const shapeIdIdx = tripsHeader.indexOf("shape_id");
  if (tripsRouteIdIdx === -1 || shapeIdIdx === -1) return null;

  const routeIdToShapeIds = new Map();
  for (let i = 1; i < tripsLines.length; i++) {
    const row = parseCSVLine(tripsLines[i]);
    const routeId = row[tripsRouteIdIdx];
    const shapeId = row[shapeIdIdx];
    if (routeId && shapeId) {
      if (!routeIdToShapeIds.has(routeId)) routeIdToShapeIds.set(routeId, new Set());
      routeIdToShapeIds.get(routeId).add(shapeId);
    }
  }

  for (const [routeId, shapeIds] of routeIdToShapeIds) {
    const shortName = routeIdToShortName.get(routeId);
    if (shortName) {
      const existing = routeShortNameToShapeIds.get(shortName) ?? [];
      const merged = [...new Set([...existing, ...shapeIds])];
      routeShortNameToShapeIds.set(shortName, merged);
    }
  }

  // shapes.txt
  const shapesContent = fs.readFileSync(shapesPath, "utf-8");
  const shapesLines = shapesContent.split("\n").filter((l) => l.trim());
  const shapesHeader = parseCSVLine(shapesLines[0]);
  const sShapeIdIdx = shapesHeader.indexOf("shape_id");
  const seqIdx = shapesHeader.indexOf("shape_pt_sequence");
  const latIdx = shapesHeader.indexOf("shape_pt_lat");
  const lonIdx = shapesHeader.indexOf("shape_pt_lon");
  if (sShapeIdIdx === -1 || seqIdx === -1 || latIdx === -1 || lonIdx === -1) return null;

  const shapePoints = [];
  for (let i = 1; i < shapesLines.length; i++) {
    const row = parseCSVLine(shapesLines[i]);
    const shapeId = row[sShapeIdIdx];
    const seq = parseInt(row[seqIdx], 10);
    const lat = parseFloat(row[latIdx]);
    const lon = parseFloat(row[lonIdx]);
    if (shapeId && !isNaN(seq) && !isNaN(lat) && !isNaN(lon)) {
      shapePoints.push({ shapeId, seq, lat, lon });
    }
  }

  const shapeIdToPoints = new Map();
  for (const { shapeId, seq, lat, lon } of shapePoints) {
    if (!shapeIdToPoints.has(shapeId)) shapeIdToPoints.set(shapeId, []);
    shapeIdToPoints.get(shapeId).push({ seq, lat, lon });
  }
  for (const [sid, points] of shapeIdToPoints) {
    points.sort((a, b) => a.seq - b.seq);
    shapeIdToPositions.set(sid, points.map((p) => [p.lat, p.lon]));
  }

  return { routeShortNameToShapeIds, shapeIdToPositions };
}

async function main() {
  const data = loadGTFS();
  if (!data) {
    console.error("Pasta GTFS não encontrada ou incompleta:", GTFS_DIR);
    console.error("Coloque routes.txt, trips.txt e shapes.txt em gtfs_rio-de-janeiro/ e rode de novo.");
    process.exit(1);
  }

  const { routeShortNameToShapeIds, shapeIdToPositions } = data;
  const prisma = new PrismaClient();

  let inserted = 0;
  let updated = 0;

  for (const [linha, shapeIds] of routeShortNameToShapeIds) {
    const polylines = [];
    const seen = new Set();
    for (const shapeId of shapeIds) {
      if (seen.has(shapeId)) continue;
      seen.add(shapeId);
      const positions = shapeIdToPositions.get(shapeId);
      if (positions && positions.length >= 2) {
        polylines.push(positions);
      }
    }
    if (polylines.length === 0) continue;

    const existing = await prisma.routeShape.findUnique({ where: { linha } });
    if (existing) {
      await prisma.routeShape.update({
        where: { linha },
        data: { polylines },
      });
      updated++;
    } else {
      await prisma.routeShape.create({
        data: { linha, polylines },
      });
      inserted++;
    }
  }

  await prisma.$disconnect();
  console.log(`Route shapes: ${inserted} inseridas, ${updated} atualizadas.`);
  console.log("Em produção o mapa usará esses dados do banco (não precisa da pasta GTFS).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
