import fs from "fs";
import path from "path";

const GTFS_DIR = path.join(process.cwd(), "gtfs_rio-de-janeiro");

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === "," && !inQuotes) || (c === "\r" && !inQuotes)) {
      result.push(current.trim());
      current = "";
    } else if (c !== "\r") {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

let cache: {
  routeShortNameToShapeIds: Map<string, string[]>;
  shapeIdToPositions: Map<string, [number, number][]>;
} | null = null;

function loadGTFSCache(): typeof cache {
  if (cache) return cache;

  const routesPath = path.join(GTFS_DIR, "routes.txt");
  const tripsPath = path.join(GTFS_DIR, "trips.txt");
  const shapesPath = path.join(GTFS_DIR, "shapes.txt");

  if (!fs.existsSync(routesPath) || !fs.existsSync(tripsPath) || !fs.existsSync(shapesPath)) {
    return null;
  }

  const routeShortNameToShapeIds = new Map<string, string[]>();
  const shapeIdToPositions = new Map<string, [number, number][]>();

  // routes.txt: route_id, agency_id, route_short_name, ...
  const routesContent = fs.readFileSync(routesPath, "utf-8");
  const routesLines = routesContent.split("\n").filter((l) => l.trim());
  const routesHeader = parseCSVLine(routesLines[0]);
  const routeIdIdx = routesHeader.indexOf("route_id");
  const shortNameIdx = routesHeader.indexOf("route_short_name");
  if (routeIdIdx === -1 || shortNameIdx === -1) return null;

  const routeIdToShortName = new Map<string, string>();
  for (let i = 1; i < routesLines.length; i++) {
    const row = parseCSVLine(routesLines[i]);
    if (row[routeIdIdx] && row[shortNameIdx]) {
      routeIdToShortName.set(row[routeIdIdx], row[shortNameIdx]);
    }
  }

  // trips.txt: trip_id, route_id, ..., shape_id
  const tripsContent = fs.readFileSync(tripsPath, "utf-8");
  const tripsLines = tripsContent.split("\n").filter((l) => l.trim());
  const tripsHeader = parseCSVLine(tripsLines[0]);
  const tripsRouteIdIdx = tripsHeader.indexOf("route_id");
  const shapeIdIdx = tripsHeader.indexOf("shape_id");
  if (tripsRouteIdIdx === -1 || shapeIdIdx === -1) return null;

  const routeIdToShapeIds = new Map<string, Set<string>>();
  for (let i = 1; i < tripsLines.length; i++) {
    const row = parseCSVLine(tripsLines[i]);
    const routeId = row[tripsRouteIdIdx];
    const shapeId = row[shapeIdIdx];
    if (routeId && shapeId) {
      if (!routeIdToShapeIds.has(routeId)) routeIdToShapeIds.set(routeId, new Set());
      routeIdToShapeIds.get(routeId)!.add(shapeId);
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

  // shapes.txt: shape_id, shape_pt_sequence, shape_pt_lat, shape_pt_lon, ...
  const shapesContent = fs.readFileSync(shapesPath, "utf-8");
  const shapesLines = shapesContent.split("\n").filter((l) => l.trim());
  const shapesHeader = parseCSVLine(shapesLines[0]);
  const sShapeIdIdx = shapesHeader.indexOf("shape_id");
  const seqIdx = shapesHeader.indexOf("shape_pt_sequence");
  const latIdx = shapesHeader.indexOf("shape_pt_lat");
  const lonIdx = shapesHeader.indexOf("shape_pt_lon");
  if (sShapeIdIdx === -1 || seqIdx === -1 || latIdx === -1 || lonIdx === -1) return null;

  const shapePoints: { shapeId: string; seq: number; lat: number; lon: number }[] = [];
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

  const shapeIdToPoints = new Map<string, { seq: number; lat: number; lon: number }[]>();
  for (const { shapeId, seq, lat, lon } of shapePoints) {
    if (!shapeIdToPoints.has(shapeId)) {
      shapeIdToPoints.set(shapeId, []);
    }
    shapeIdToPoints.get(shapeId)!.push({ seq, lat, lon });
  }
  for (const [sid, points] of shapeIdToPoints) {
    points.sort((a, b) => a.seq - b.seq);
    shapeIdToPositions.set(sid, points.map((p) => [p.lat, p.lon] as [number, number]));
  }

  cache = { routeShortNameToShapeIds, shapeIdToPositions };
  return cache;
}

/**
 * Retorna os traçados (polylines) para as linhas pedidas.
 * Chave = número da linha (ex: "399"), valor = array de polylines (cada uma é array de [lat, lng]).
 */
export async function getRouteShapesForLines(
  linhas: string[]
): Promise<Record<string, [number, number][][]>> {
  const data = loadGTFSCache();
  if (!data) return {};

  const { routeShortNameToShapeIds, shapeIdToPositions } = data;
  const result: Record<string, [number, number][][]> = {};

  for (const linha of linhas) {
    const shapeIds = routeShortNameToShapeIds.get(linha);
    if (!shapeIds || shapeIds.length === 0) continue;

    const polylines: [number, number][][] = [];
    const seen = new Set<string>();
    for (const shapeId of shapeIds) {
      if (seen.has(shapeId)) continue;
      seen.add(shapeId);
      const positions = shapeIdToPositions.get(shapeId);
      if (positions && positions.length >= 2) {
        polylines.push(positions);
      }
    }
    if (polylines.length > 0) {
      result[linha] = polylines;
    }
  }

  return result;
}
