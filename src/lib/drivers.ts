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

/**
 * Converte RouteStopsMap em GeoJSON FeatureCollection de Points para o MapLibre.
 * Cola as paradas na polyline mais próxima e inverte coordenadas para [lng, lat].
 */
export function routeStopsToGeoJson(
  routeStops: RouteStopsMap,
  routeShapes: RouteShapesMap = {},
  polyOrderSwapped: Record<string, boolean> = {},
  selectedDirectionsByLine: SelectedDirectionsByLine = {}
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = [];

  for (const [linha, positions] of Object.entries(routeStops)) {
    const polylines = routeShapes[linha];
    const poly0 = polylines?.[0];
    const poly1 = polylines?.[1];
    const swapped = polyOrderSwapped[linha];
    const dirs = selectedDirectionsByLine[linha] ?? { ida: true, volta: true };
    const hasDirection =
      poly0 && poly0.length >= 2 && poly1 && poly1.length >= 2;
    const isBrt = getLineType(linha) === "brt";
    const lineColor = isBrt ? SECONDARY_COLOR : getLineHex(linha);

    positions.forEach(([lat, lng], idx) => {
      let finalLat = lat;
      let finalLng = lng;

      if (hasDirection) {
        const dist0 = minDistSqToPolyline(lat, lng, poly0);
        const dist1 = minDistSqToPolyline(lat, lng, poly1);
        const geoIsIda = dist0 <= dist1 ? !swapped : swapped;
        const isSelected = geoIsIda ? dirs.ida : dirs.volta;
        if (!isSelected) return;

        const poly = dist0 <= dist1 ? poly0 : poly1;
        const onLine = getClosestPointOnPolyline(lat, lng, poly);
        if (onLine) {
          finalLat = onLine[0];
          finalLng = onLine[1];
        }
      } else {
        if (!dirs.ida && !dirs.volta) return;
      }

      features.push({
        type: "Feature",
        id: `stop-${linha}-${idx}`,
        properties: {
          linha,
          color: lineColor,
        },
        geometry: {
          type: "Point",
          // Inversão para GeoJSON: [lng, lat]
          coordinates: [finalLng, finalLat],
        },
      });
    });
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

/** Modelo comum normalizado para veículos (Ônibus e BRT). */
export interface Vehicle {
  id: string;
  ordem: string;
  linha: string;
  latitude: number;
  longitude: number;
  velocidade: number;
  timestamp: string;
  heading?: number;
  type: TransportMode;
}

/** Converte BusData no modelo comum Vehicle */
export function toVehicle(bus: BusData): Vehicle {
  return {
    ...bus,
    velocidade: Number(bus.velocidade) || 0,
    type: getLineType(bus.linha),
  };
}

/**
 * Estima se o ônibus está em sentido ida (polyline 0) ou volta (polyline 1)
 * usando posição e, se existir, heading. Retorna null se não der para definir.
 */
export function estimateBusSentido(
  bus: BusData,
  polylines: [number, number][][] | undefined,
  headingDeg: number | undefined
): "ida" | "volta" | null {
  if (!polylines || polylines.length < 2) return null;
  const [poly0, poly1] = polylines;
  if (poly0.length < 2 || poly1.length < 2) return null;

  const bearing0 = getClosestSegmentBearing(poly0, bus.latitude, bus.longitude);
  const bearing1 = getClosestSegmentBearing(poly1, bus.latitude, bus.longitude);
  if (bearing0 == null || bearing1 == null) return null;

  if (headingDeg != null && !Number.isNaN(headingDeg)) {
    const diff0 = angleDiff(headingDeg, bearing0);
    const diff1 = angleDiff(headingDeg, bearing1);
    return diff0 <= diff1 ? "ida" : "volta";
  }

  const dist0 = minDistSqToPolyline(bus.latitude, bus.longitude, poly0);
  const dist1 = minDistSqToPolyline(bus.latitude, bus.longitude, poly1);
  return dist0 <= dist1 ? "ida" : "volta";
}

export interface BusHistoryItem {
  position: [number, number];
  timestamp: Date;
  speed: number;
}
export type BusHistoryMap = Record<string, BusHistoryItem[]>;

/** Calcula o heading a partir das duas últimas posições do histórico do ônibus */
export function getHeadingFromHistory(
  busHistory: BusHistoryMap,
  busId: string
): number | undefined {
  const history = busHistory[busId] || [];
  if (history.length < 2) return undefined;
  const [prev, curr] = [
    history[history.length - 2],
    history[history.length - 1],
  ];
  return getBearing(
    prev.position[0],
    prev.position[1],
    curr.position[0],
    curr.position[1]
  );
}

/**
 * Converte lista de veículos (buses) em GeoJSON FeatureCollection de Points
 * aplicando filtros de sentido (ida/volta) e definindo propriedades para a renderização.
 */
export function busesToGeoJson(
  buses: BusData[],
  routeShapes: RouteShapesMap = {},
  polyOrderSwapped: Record<string, boolean> = {},
  selectedDirectionsByLine: SelectedDirectionsByLine = {},
  selectedBusId: string | null = null,
  busHistory: BusHistoryMap = {}
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = [];

  for (const bus of buses) {
    const polylines = routeShapes[bus.linha];
    const heading =
      bus.heading ?? getHeadingFromHistory(busHistory, bus.id) ?? 0;
    let sentido = estimateBusSentido(bus, polylines, heading);
    const dirs = selectedDirectionsByLine[bus.linha] ?? {
      ida: true,
      volta: true,
    };

    if (sentido !== null) {
      if (polyOrderSwapped[bus.linha]) {
        sentido = sentido === "ida" ? "volta" : "ida";
      }
      const isVisible = sentido === "ida" ? dirs.ida : dirs.volta;
      if (!isVisible) continue;
    } else {
      if (!dirs.ida && !dirs.volta) continue;
    }

    const isBrt = getLineType(bus.linha) === "brt";
    const lineColor = isBrt ? SECONDARY_COLOR : getLineHex(bus.linha);
    const isSelected = selectedBusId === bus.id;
    const speed = Math.round(Number(bus.velocidade) || 0);

    features.push({
      type: "Feature",
      id: bus.id,
      properties: {
        id: bus.id,
        ordem: bus.ordem,
        linha: bus.linha,
        velocidade: speed,
        speed,
        speedLabel: `${speed} km/h`,
        heading,
        color: lineColor,
        isSelected: isSelected ? 1 : 0,
        timestamp: bus.timestamp,
      },
      geometry: {
        type: "Point",
        // Inversão para GeoJSON: [lng, lat]
        coordinates: [bus.longitude, bus.latitude],
      },
    });
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

/** Formata a data/hora da última atualização para exibição amigável */
export function formatLastUpdate(timestamp: string): string {
  try {
    const d = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "agora";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min atrás`;
    const diffH = Math.floor(diffMin / 60);
    return `${diffH}h atrás`;
  } catch {
    return "—";
  }
}



