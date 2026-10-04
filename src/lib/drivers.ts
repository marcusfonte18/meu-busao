import type { BusData, TransportMode } from "@/app/types";
import { getLineHex } from "@/lib/line-colors";
import { getLineType } from "@/app/types";

export type RouteShapesMap = Record<string, [number, number][][]>;
export type RouteStopsMap = Record<string, [number, number][]>;
export type SelectedDirections = { ida: boolean; volta: boolean };
export type SelectedDirectionsByLine = Record<string, SelectedDirections>;

export const SECONDARY_COLOR = "#eab308";

/** Ângulo em graus (0 = Norte, 90 = Leste) a partir de dois pontos [lat, lng]. */
export function getBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const toDeg = (x: number) => (x * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  const bearing = toDeg(Math.atan2(y, x));
  return (bearing + 360) % 360;
}

/** Diferença angular em graus (0..180). */
export function angleDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Bearing da direção inicial da polyline (do início em direção ao fim). */
export function getPolylineInitialBearing(
  positions: [number, number][]
): number | null {
  if (positions.length < 2) return null;
  const idx = Math.min(Math.floor(positions.length * 0.2), positions.length - 1);
  const [a0, a1] = positions[0];
  const [b0, b1] = positions[idx];
  return getBearing(a0, a1, b0, b1);
}

/** Distância mínima (ao quadrado) de um ponto a uma polyline (aproximação em graus). */
export function minDistSqToPolyline(
  lat: number,
  lng: number,
  positions: [number, number][]
): number {
  if (positions.length === 0) return Infinity;
  let minSq = Infinity;
  for (let i = 0; i < positions.length - 1; i++) {
    const [a0, a1] = positions[i];
    const [b0, b1] = positions[i + 1];
    const t = Math.max(
      0,
      Math.min(
        1,
        ((lat - a0) * (b0 - a0) + (lng - a1) * (b1 - a1)) /
          ((b0 - a0) ** 2 + (b1 - a1) ** 2 || 1)
      )
    );
    const p0 = a0 + t * (b0 - a0);
    const p1 = a1 + t * (b1 - a1);
    const sq = (lat - p0) ** 2 + (lng - p1) ** 2;
    if (sq < minSq) minSq = sq;
  }
  return minSq;
}

/** Ponto da polyline mais próximo do ponto dado. */
export function getClosestPointOnPolyline(
  lat: number,
  lng: number,
  positions: [number, number][]
): [number, number] | null {
  if (positions.length === 0) return null;
  if (positions.length === 1) return [positions[0][0], positions[0][1]];
  let minSq = Infinity;
  let best: [number, number] = [positions[0][0], positions[0][1]];
  for (let i = 0; i < positions.length - 1; i++) {
    const [a0, a1] = positions[i];
    const [b0, b1] = positions[i + 1];
    const t = Math.max(
      0,
      Math.min(
        1,
        ((lat - a0) * (b0 - a0) + (lng - a1) * (b1 - a1)) /
          ((b0 - a0) ** 2 + (b1 - a1) ** 2 || 1)
      )
    );
    const p0 = a0 + t * (b0 - a0);
    const p1 = a1 + t * (b1 - a1);
    const sq = (lat - p0) ** 2 + (lng - p1) ** 2;
    if (sq < minSq) {
      minSq = sq;
      best = [p0, p1];
    }
  }
  return best;
}

/** Bearing do segmento da polyline mais próximo do ponto. */
export function getClosestSegmentBearing(
  positions: [number, number][],
  lat: number,
  lng: number
): number | null {
  if (positions.length < 2) return null;
  let minSq = Infinity;
  let bearing = 0;
  for (let i = 0; i < positions.length - 1; i++) {
    const [a0, a1] = positions[i];
    const [b0, b1] = positions[i + 1];
    const t = Math.max(
      0,
      Math.min(
        1,
        ((lat - a0) * (b0 - a0) + (lng - a1) * (b1 - a1)) /
          ((b0 - a0) ** 2 + (b1 - a1) ** 2 || 1)
      )
    );
    const p0 = a0 + t * (b0 - a0);
    const p1 = a1 + t * (b1 - a1);
    const sq = (lat - p0) ** 2 + (lng - p1) ** 2;
    if (sq < minSq) {
      minSq = sq;
      bearing = getBearing(a0, a1, b0, b1);
    }
  }
  return bearing;
}

/** Determina se a ordem das polylines (0 e 1) está invertida geograficamente em relação à primeira linha. */
export function calculatePolyOrderSwapped(
  routeShapes: RouteShapesMap,
  selectedLinhas: string[]
): Record<string, boolean> {
  const firstLine = selectedLinhas[0] ?? Object.keys(routeShapes)[0];
  if (!firstLine) return {};
  const firstPolys = routeShapes[firstLine];
  const b0 =
    firstPolys && firstPolys[0] ? getPolylineInitialBearing(firstPolys[0]) : null;
  if (b0 == null) return {};
  const result: Record<string, boolean> = {};
  for (const linha of Object.keys(routeShapes)) {
    if (linha === firstLine) continue;
    const polys = routeShapes[linha];
    const bx =
      polys && polys[0] ? getPolylineInitialBearing(polys[0]) : null;
    if (bx == null) continue;
    result[linha] = angleDiff(b0, bx) > 150;
  }
  return result;
}

/**
 * Converte RouteShapesMap em GeoJSON FeatureCollection de LineStrings para o MapLibre.
 * Inverte as coordenadas de [lat, lng] (Leaflet) para [lng, lat] (GeoJSON/MapLibre).
 */
export function routeShapesToGeoJson(
  routeShapes: RouteShapesMap,
  polyOrderSwapped: Record<string, boolean> = {},
  selectedDirectionsByLine: SelectedDirectionsByLine = {}
): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];

  for (const [linha, polylines] of Object.entries(routeShapes)) {
    const isBrt = getLineType(linha) === "brt";
    const lineColor = isBrt ? SECONDARY_COLOR : getLineHex(linha);
    const swapped = polyOrderSwapped[linha];
    const dirs = selectedDirectionsByLine[linha] ?? { ida: true, volta: true };

    polylines.slice(0, 2).forEach((positions, idx) => {
      const geoIsIda = (idx === 0 && !swapped) || (idx === 1 && swapped);
      const isSelected = geoIsIda ? dirs.ida : dirs.volta;
      if (!isSelected || positions.length < 2) return;

      // Inversão necessária: [lat, lng] -> [lng, lat]
      const coordinates: [number, number][] = positions.map(([lat, lng]) => [
        lng,
        lat,
      ]);

      features.push({
        type: "Feature",
        id: `route-${linha}-${idx}`,
        properties: {
          linha,
          color: lineColor,
          sentido: geoIsIda ? "ida" : "volta",
        },
        geometry: {
          type: "LineString",
          coordinates,
        },
      });
    });
  }

  return {
    type: "FeatureCollection",
    features,
  };
}
