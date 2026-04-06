#!/usr/bin/env node
/**
 * Popula a coleção route_stops (paradas das linhas) a partir da pasta GTFS.
 * Rode uma vez em dev (onde está gtfs_rio-de-janeiro) e o banco fica pronto para produção.
 * Uso: node scripts/seed-route-stops.js  ou  pnpm run seed:route-stops
 * Requer: gtfs_rio-de-janeiro/ (routes.txt, trips.txt, stops.txt, stop_times.txt) e DATABASE_URL no .env
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

function loadStopsFromGTFS() {
  const routesPath = path.join(GTFS_DIR, "routes.txt");
  const tripsPath = path.join(GTFS_DIR, "trips.txt");
  const stopsPath = path.join(GTFS_DIR, "stops.txt");
  const stopTimesPath = path.join(GTFS_DIR, "stop_times.txt");

  if (
    !fs.existsSync(routesPath) ||
    !fs.existsSync(tripsPath) ||
    !fs.existsSync(stopsPath) ||
    !fs.existsSync(stopTimesPath)
  ) {
    return null;
  }

  const routeIdToShortName = new Map();
  const routesContent = fs.readFileSync(routesPath, "utf-8");
  const routesLines = routesContent.split("\n").filter((l) => l.trim());
  const routesHeader = parseCSVLine(routesLines[0]);
  const routeIdIdx = routesHeader.indexOf("route_id");
  const shortNameIdx = routesHeader.indexOf("route_short_name");
  if (routeIdIdx === -1 || shortNameIdx === -1) return null;
  for (let i = 1; i < routesLines.length; i++) {
    const row = parseCSVLine(routesLines[i]);
    if (row[routeIdIdx] && row[shortNameIdx]) {
      routeIdToShortName.set(row[routeIdIdx], row[shortNameIdx]);
    }
  }

  const routeIdToTripIds = new Map();
  const tripsContent = fs.readFileSync(tripsPath, "utf-8");
  const tripsLines = tripsContent.split("\n").filter((l) => l.trim());
  const tripsHeader = parseCSVLine(tripsLines[0]);
  const tripsRouteIdIdx = tripsHeader.indexOf("route_id");
  const tripIdIdx = tripsHeader.indexOf("trip_id");
  if (tripsRouteIdIdx === -1 || tripIdIdx === -1) return null;
  for (let i = 1; i < tripsLines.length; i++) {
    const row = parseCSVLine(tripsLines[i]);
    const routeId = row[tripsRouteIdIdx];
    const tripId = row[tripIdIdx];
    if (routeId && tripId) {
      if (!routeIdToTripIds.has(routeId)) routeIdToTripIds.set(routeId, new Set());
      routeIdToTripIds.get(routeId).add(tripId);
    }
  }

  const tripIdToStops = new Map();
  const stopTimesContent = fs.readFileSync(stopTimesPath, "utf-8");
  const stopTimesLines = stopTimesContent.split("\n").filter((l) => l.trim());
  const stHeader = parseCSVLine(stopTimesLines[0]);
  const stTripIdIdx = stHeader.indexOf("trip_id");
  const stStopIdIdx = stHeader.indexOf("stop_id");
  const stSeqIdx = stHeader.indexOf("stop_sequence");
  if (stTripIdIdx === -1 || stStopIdIdx === -1) return null;
  for (let i = 1; i < stopTimesLines.length; i++) {
    const row = parseCSVLine(stopTimesLines[i]);
    const tripId = row[stTripIdIdx];
    const stopId = row[stStopIdIdx];
    const seq = stSeqIdx >= 0 ? parseInt(row[stSeqIdx], 10) : i;
    if (tripId && stopId && !isNaN(seq)) {
      if (!tripIdToStops.has(tripId)) tripIdToStops.set(tripId, []);
      tripIdToStops.get(tripId).push({ stopId, seq });
    }
  }
  const tripIdToStopIds = new Map();
  for (const [tripId, list] of tripIdToStops) {
    list.sort((a, b) => a.seq - b.seq);
    tripIdToStopIds.set(tripId, list.map((x) => x.stopId));
  }

  const stopIdToPosition = new Map();
  const stopsContent = fs.readFileSync(stopsPath, "utf-8");
  const stopsLines = stopsContent.split("\n").filter((l) => l.trim());
  const stopsHeader = parseCSVLine(stopsLines[0]);
  const stopIdIdx = stopsHeader.indexOf("stop_id");
  const latIdx = stopsHeader.indexOf("stop_lat");
  const lonIdx = stopsHeader.indexOf("stop_lon");
  if (stopIdIdx === -1 || latIdx === -1 || lonIdx === -1) return null;
  for (let i = 1; i < stopsLines.length; i++) {
    const row = parseCSVLine(stopsLines[i]);
    const id = row[stopIdIdx];
    const lat = parseFloat(row[latIdx]);
    const lon = parseFloat(row[lonIdx]);
    if (id && !isNaN(lat) && !isNaN(lon)) {
      stopIdToPosition.set(id, [lat, lon]);
    }
  }

  const routeShortNameToStopIds = new Map();
  for (const [routeId, tripIds] of routeIdToTripIds) {
    const shortName = routeIdToShortName.get(routeId);
    if (!shortName) continue;
    if (!routeShortNameToStopIds.has(shortName)) {
      routeShortNameToStopIds.set(shortName, new Set());
    }
    const set = routeShortNameToStopIds.get(shortName);
    for (const tripId of tripIds) {
      const stopIds = tripIdToStopIds.get(tripId) ?? [];
      stopIds.forEach((sid) => set.add(sid));
    }
  }

  return { routeShortNameToStopIds, stopIdToPosition };
}

async function main() {
  const data = loadStopsFromGTFS();
  if (!data) {
    console.error("Pasta GTFS não encontrada ou incompleta:", GTFS_DIR);
    console.error(
      "Coloque routes.txt, trips.txt, stops.txt e stop_times.txt em gtfs_rio-de-janeiro/ e rode de novo."
    );
    process.exit(1);
  }

  const { routeShortNameToStopIds, stopIdToPosition } = data;
  const prisma = new PrismaClient();

  let inserted = 0;
  let updated = 0;

  for (const [linha, stopIds] of routeShortNameToStopIds) {
    const positions = [];
    const seen = new Set();
    for (const stopId of stopIds) {
      const pos = stopIdToPosition.get(stopId);
      if (pos && !seen.has(`${pos[0]},${pos[1]}`)) {
        seen.add(`${pos[0]},${pos[1]}`);
        positions.push(pos);
      }
    }
    if (positions.length === 0) continue;

    const existing = await prisma.routeStop.findUnique({ where: { linha } });
    if (existing) {
      await prisma.routeStop.update({
        where: { linha },
        data: { positions },
      });
      updated++;
    } else {
      await prisma.routeStop.create({
        data: { linha, positions },
      });
      inserted++;
    }
  }

  await prisma.$disconnect();
  console.log(`Route stops: ${inserted} inseridas, ${updated} atualizadas.`);
  console.log("Em produção a API usará esses dados do banco (não precisa da pasta GTFS).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
