/* eslint-disable @typescript-eslint/no-require-imports */
"use client";
import React, { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { BusData, BusHistoryMap } from "./types";
import { useEffect } from "react";
import "leaflet/dist/leaflet.css";
import { useMap, useMapEvents } from "react-leaflet";
import { toast } from "sonner";
import { Locate } from "lucide-react";
import { getLineType, type TransportMode } from "./types";
import { getCurrentPosition, isNativePlatform, requestLocationPermission } from "@/lib/geolocation";
import { getLineHex } from "@/lib/line-colors";
import { cn } from "@/lib/utils";

const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
});

const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false }
);

const CircleMarker = dynamic(
  () => import("react-leaflet").then((mod) => mod.CircleMarker),
  { ssr: false }
);

/** Cores do tema: secondary (BRT). Ônibus usa getLineHex (paleta de 8 cores). */
const SECONDARY_COLOR = "#eab308";

/** Opções comuns para suavidade do traço (lineCap/lineJoin arredondados) */
const SMOOTH_PATH = { lineCap: "round" as const, lineJoin: "round" as const };

/** Ângulo em graus (0 = Norte, 90 = Leste) a partir de dois pontos. */
function getBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const toDeg = (x: number) => (x * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y =
    Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  const bearing = toDeg(Math.atan2(y, x));
  return (bearing + 360) % 360;
}

/** Diferença angular em graus (0..180). */
function angleDiff(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Distância mínima (ao quadrado) de um ponto a uma polyline (aproximação em graus). */
function minDistSqToPolyline(
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
          (((b0 - a0) ** 2 + (b1 - a1) ** 2) || 1)
      )
    );
    const p0 = a0 + t * (b0 - a0);
    const p1 = a1 + t * (b1 - a1);
    const sq = (lat - p0) ** 2 + (lng - p1) ** 2;
    if (sq < minSq) minSq = sq;
  }
  return minSq;
}

/** Ponto da polyline mais próximo do ponto dado — para colar a parada em cima da linha. */
function getClosestPointOnPolyline(
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
          (((b0 - a0) ** 2 + (b1 - a1) ** 2) || 1)
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

/** Bearing da direção inicial da polyline (do início em direção ao fim). */
function getPolylineInitialBearing(positions: [number, number][]): number | null {
  if (positions.length < 2) return null;
  const idx = Math.min(Math.floor(positions.length * 0.2), positions.length - 1);
  const [a0, a1] = positions[0];
  const [b0, b1] = positions[idx];
  return getBearing(a0, a1, b0, b1);
}

/** Bearing do segmento da polyline mais próximo do ponto. */
function getClosestSegmentBearing(
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
          (((b0 - a0) ** 2 + (b1 - a1) ** 2) || 1)
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

/**
 * Ícone do ônibus: círculo com número + triângulo (estilo BusTracker Rio).
 * fillColor: teal para primeira linha, roxo para segunda (quando mode=onibus).
 */
const getBusIcon = (
  linha: string,
  mode: TransportMode,
  isSelected: boolean,
  speed: number | undefined,
  _heading: number | undefined,
  fillColor: string
) => {
  if (typeof window === "undefined") return null;
  const L = require("leaflet");
  const size = isSelected ? 40 : 32;
  const gap = 2;
  const triangleH = 6;
  const totalH = (isSelected && speed !== undefined ? 14 : 0) + size + gap + triangleH;
  const totalW = Math.max(size, 40);

  const speedBadge =
    isSelected && speed !== undefined
      ? `<span style="
          display:inline-block;
          border-radius:4px;
          background:rgba(0,0,0,0.8);
          color:#fff;
          padding:2px 6px;
          font-size:9px;
          font-weight:700;
          margin-bottom:2px;
        ">${Math.round(speed)} km/h</span>`
      : "";

  return new L.DivIcon({
    className: "bus-icon",
    html: `
      <div style="
        width:${totalW}px;
        height:${totalH}px;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:flex-start;
      ">
        ${speedBadge}
        <div style="
          width:${size}px;
          height:${size}px;
          min-width:${size}px;
          min-height:${size}px;
          border-radius:50%;
          background-color:${fillColor};
          color:#fff;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:${isSelected ? "14px" : "12px"};
          font-weight:bold;
          box-shadow:0 4px 14px rgba(0,0,0,0.25);
          border:2px solid #fff;
          flex-shrink:0;
          ${isSelected ? "box-shadow:0 0 0 4px " + fillColor + "40;" : ""}
        ">${linha}</div>
        <div style="
          width:0;
          height:0;
          margin-top:${gap}px;
          border-left:5px solid transparent;
          border-right:5px solid transparent;
          border-top:${triangleH}px solid ${fillColor};
        "></div>
      </div>`,
    iconSize: [totalW, totalH],
    iconAnchor: [totalW / 2, totalH],
    popupAnchor: [0, -totalH],
  });
};

const LocationButton = () => {
  const [isTracking, setIsTracking] = useState(false);
  const map = useMap();
  const locationMarkerRef = useRef<any>(null);
  const isNative = isNativePlatform();

  const removeLocationMarker = () => {
    const marker = locationMarkerRef.current;
    if (marker && map.hasLayer(marker)) {
      map.removeLayer(marker);
    }
    locationMarkerRef.current = null;
  };

  const createLocationMarker = (latlng: any, accuracy: number) => {
    if (typeof window === "undefined") return;
    const L = require("leaflet");

    removeLocationMarker();

    const locationIcon = new L.DivIcon({
      className: "location-marker",
      html: `
        <div class="relative w-6 h-6">
          <div class="absolute inset-0 bg-blue-500 rounded-full opacity-20 animate-ping"></div>
          <div class="absolute inset-[25%] bg-blue-500 rounded-full border-2 border-white"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const marker = L.marker(latlng, { icon: locationIcon })
      .addTo(map)
      .bindPopup(`Precisão: ~${Math.round(accuracy)} metros`);
    locationMarkerRef.current = marker;

    if (isTracking && !(marker as any)._initialViewSet) {
      map.setView(latlng);
      (marker as any)._initialViewSet = true;
    }
  };

  const fetchAndShowLocation = () => {
    getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 })
      .then(({ latitude, longitude }) => {
        const latlng = [latitude, longitude] as [number, number];
        createLocationMarker(latlng, 0);
        map.setView(latlng);
      })
      .catch(() => {
        toast.error("Não foi possível obter sua localização");
        setIsTracking(false);
        localStorage.setItem("isTracking", "false");
      });
  };

  // App nativo: pedir permissão ao montar; buscar posição se rastreamento estava ativo
  useEffect(() => {
    if (isNative) {
      requestLocationPermission();
      const savedTrackingState = localStorage.getItem("isTracking");
      if (savedTrackingState === "true") {
        setIsTracking(true);
        fetchAndShowLocation();
      }
    }
  }, [isNative]);

  // Web: usar locate do Leaflet
  useEffect(() => {
    if (!isNative) {
      map.locate({ enableHighAccuracy: true, setView: false });
    }
  }, [map, isNative]);

  useEffect(() => {
    if (!isNative) {
      const savedTrackingState = localStorage.getItem("isTracking");
      if (savedTrackingState === "true") {
        setIsTracking(true);
        map.locate({ enableHighAccuracy: true, setView: false });
      }
    }
  }, [map, isNative]);

  useMapEvents(
    isNative
      ? {}
      : {
          locationfound: (e: { latlng: any; accuracy: number }) => {
            createLocationMarker(e.latlng, e.accuracy);
          },
          locationerror: () => {
            toast.error("Não foi possível obter sua localização");
            setIsTracking(false);
            localStorage.setItem("isTracking", "false");
          },
        }
  );

  const toggleLocation = () => {
    if (!isTracking) {
      if (isNative) {
        requestLocationPermission();
        fetchAndShowLocation();
        toast.success("Rastreando sua localização");
      } else {
        map.locate({ enableHighAccuracy: true, setView: false });
        toast.success("Rastreando sua localização");
      }
    } else {
      if (!isNative) map.stopLocate();
      removeLocationMarker();
      toast.info("Parou de rastrear localização");
    }
    const newTrackingState = !isTracking;
    setIsTracking(newTrackingState);
    localStorage.setItem("isTracking", newTrackingState.toString());
  };

  return (
    <div className="leaflet-top leaflet-right" style={{ zIndex: 999 }}>
      <div className="leaflet-control leaflet-bar !border-none">
        <button
          onClick={toggleLocation}
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
            isTracking
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
          title={isTracking ? "Parar de rastrear" : "Rastrear localização"}
        >
          <Locate className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
/** Distância em km e tempo estimado em min (linha reta, usando velocidade atual do ônibus). */
function estimateTimeToUser(
  map: { distance: (a: [number, number], b: [number, number]) => number },
  userLatLng: [number, number],
  bus: BusData
): { distanceKm: number; estimatedMin: number | null } {
  const distM = map.distance(userLatLng, [bus.latitude, bus.longitude]);
  const distanceKm = Math.round((distM / 1000) * 10) / 10;
  const speedKmh = Number(bus.velocidade) || 0;
  if (speedKmh <= 0) return { distanceKm, estimatedMin: null };
  const estimatedMin = Math.round((distanceKm / speedKmh) * 60);
  return { distanceKm, estimatedMin };
}

export type RouteShapesMap = Record<string, [number, number][][]>;

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

type SelectedDirections = { ida: boolean; volta: boolean };

/** Filtro de sentido por número de linha (independente entre linhas). */
export type SelectedDirectionsByLine = Record<string, SelectedDirections>;

export type RouteStopsMap = Record<string, [number, number][]>;

export const BusMarkers = ({
  buses,
  routeShapes = {},
  routeStops = {},
  mode = "onibus",
  selectedBus,
  onSelectBus,
  selectedDirectionsByLine = {},
  selectedLinhas = [],
}: {
  buses: BusData[];
  routeShapes?: RouteShapesMap;
  routeStops?: RouteStopsMap;
  mode?: TransportMode;
  selectedBus: string | null;
  onSelectBus: (id: string | null) => void;
  selectedDirectionsByLine?: SelectedDirectionsByLine;
  selectedLinhas?: string[];
}) => {
  const getDirsForLine = (linha: string): SelectedDirections =>
    selectedDirectionsByLine[linha] ?? { ida: true, volta: true };

  // Linhas cuja ordem poly0/poly1 é invertida em relação à primeira linha (normaliza sentido geográfico)
  const polyOrderSwapped = React.useMemo(() => {
    const firstLine = selectedLinhas[0] ?? Object.keys(routeShapes)[0];
    if (!firstLine) return {} as Record<string, boolean>;
    const firstPolys = routeShapes[firstLine];
    const b0 = firstPolys && firstPolys[0] ? getPolylineInitialBearing(firstPolys[0]) : null;
    if (b0 == null) return {} as Record<string, boolean>;
    const result: Record<string, boolean> = {};
    for (const linha of Object.keys(routeShapes)) {
      if (linha === firstLine) continue;
      const polys = routeShapes[linha];
      const bx = polys && polys[0] ? getPolylineInitialBearing(polys[0]) : null;
      if (bx == null) continue;
      // Se poly0 desta linha aponta ~180° oposto à poly0 da primeira, inverte ida/volta
      result[linha] = angleDiff(b0, bx) > 150;
    }
    return result;
  }, [routeShapes, selectedLinhas]);

  const [busHistory, setBusHistory] = useState<BusHistoryMap>({});
  const [initialViewSet, setInitialViewSet] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const map = useMap();

  // Wake Lock: mantém a tela ligada no celular enquanto o usuário está no mapa (requer HTTPS)
  useEffect(() => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let sentinel: { release: () => Promise<void> } | null = null;

    const requestWakeLock = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        sentinel = await (navigator as any).wakeLock.request("screen");
      } catch {
        // Ignora se o navegador recusar (ex.: modo economia de energia)
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    };

    requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      sentinel?.release?.().catch(() => {});
    };
  }, []);

  // Configuração inicial do mapa - acontece apenas uma vez
  useEffect(() => {
    if (!initialViewSet && buses.length > 0) {
      // Verifica se já existe uma localização do usuário
      if (map.locate) {
        map.locate({
          enableHighAccuracy: true,
          setView: false,
        });
      } else {
        // Se não conseguir acessar a localização, centraliza no primeiro ônibus
        const firstBus = buses[0];
        map.setView([firstBus.latitude, firstBus.longitude], 13);
        setInitialViewSet(true);
      }
    }
  }, [buses, map, initialViewSet]);

  // Handler para quando encontrar a localização do usuário
  useMapEvents({
    locationfound: (e) => {
      setUserLocation([e.latlng.lat, e.latlng.lng]);
      if (!initialViewSet) {
        map.setView(e.latlng, 13);
        setInitialViewSet(true);
      }
    },
    locationerror: () => {
      if (!initialViewSet && buses.length > 0) {
        const firstBus = buses[0];
        map.setView([firstBus.latitude, firstBus.longitude], 13);
        setInitialViewSet(true);
      }
    },
  });

  // Atualização do histórico dos ônibus (mantém o mesmo código)
  useEffect(() => {
    setBusHistory((prev) => {
      const newHistory = { ...prev };
      buses.forEach((bus) => {
        if (!newHistory[bus.id]) {
          newHistory[bus.id] = [];
        }
        const maxRecords = 60;
        newHistory[bus.id] = [
          ...newHistory[bus.id].slice(-maxRecords),
          {
            position: [bus.latitude, bus.longitude],
            timestamp: new Date(),
            speed: Number(bus.velocidade) || 0,
          },
        ];
      });
      return newHistory;
    });
  }, [buses]);

  // Seguir apenas o ônibus selecionado
  useEffect(() => {
    if (selectedBus) {
      const selectedBusData = buses.find((bus) => bus.id === selectedBus);
      if (selectedBusData) {
        map.setView(
          [selectedBusData.latitude, selectedBusData.longitude],
          Math.max(map.getZoom(), 15)
        );
      }
    }
  }, [selectedBus, buses, map]);

  const getHeadingForBus = (busId: string): number | undefined => {
    const history = busHistory[busId] || [];
    if (history.length < 2) return undefined;
    const [prev, curr] = [history[history.length - 2], history[history.length - 1]];
    const [lat1, lon1] = prev.position;
    const [lat2, lon2] = curr.position;
    return getBearing(lat1, lon1, lat2, lon2);
  };

  const busesToShow = buses.filter((bus) => {
    const polylines = routeShapes[bus.linha];
    let sentido = estimateBusSentido(
      bus,
      polylines,
      bus.heading ?? getHeadingForBus(bus.id)
    );
    const dirs = getDirsForLine(bus.linha);
    // Sem route shapes ou sentido indefinido: mostrar se pelo menos um sentido estiver selecionado
    if (sentido === null) {
      return dirs.ida || dirs.volta;
    }
    // Normaliza por linha: se poly0 desta linha aponta direção oposta à primeira, inverte ida/volta
    if (polyOrderSwapped[bus.linha]) {
      sentido = sentido === "ida" ? "volta" : "ida";
    }
    return sentido === "ida" ? dirs.ida : dirs.volta;
  });

  return (
    <>
      {/* Traçado oficial da linha (GTFS): desenha primeiro para ficar por baixo */}
      {Object.entries(routeShapes).flatMap(([linha, polylines]) => {
        const lineMode = getLineType(linha);
        const lineColor =
          lineMode === "onibus"
            ? getLineHex(linha)
            : SECONDARY_COLOR;
        const swapped = polyOrderSwapped[linha];
        const dirs = getDirsForLine(linha);
        return polylines.slice(0, 2).flatMap((positions, idx) => {
          // idx 0 = poly0, idx 1 = poly1. Se swapped, poly0=volta geo e poly1=ida geo.
          const geoIsIda = (idx === 0 && !swapped) || (idx === 1 && swapped);
          const isSelected = geoIsIda ? dirs.ida : dirs.volta;
          if (!isSelected) return [];
          const lineKey = `route-${linha}-${idx}`;
          return [
            <Polyline
              key={`route-outline-${linha}-${idx}`}
              positions={positions}
              pathOptions={{
                color: "rgba(0,0,0,0.25)",
                weight: 5,
                opacity: 1,
                ...SMOOTH_PATH,
              }}
            />,
            <Polyline
              key={lineKey}
              positions={positions}
              pathOptions={{
                color: lineColor,
                weight: 3,
                opacity: 0.9,
                ...SMOOTH_PATH,
              }}
            />,
          ];
        });
      })}
      {/* Paradas: coladas na linha (ponto mais próximo da rota) para a linha passar pelo centro */}
      {Object.entries(routeStops).flatMap(([linha, positions]) => {
        const polylines = routeShapes[linha];
        const poly0 = polylines?.[0];
        const poly1 = polylines?.[1];
        const swapped = polyOrderSwapped[linha];
        const dirs = getDirsForLine(linha);
        const hasDirection = poly0 && poly0.length >= 2 && poly1 && poly1.length >= 2;
        const lineColor = getLineType(linha) === "brt" ? SECONDARY_COLOR : getLineHex(linha);
        return positions.map(([lat, lng], idx) => {
          let center: [number, number] = [lat, lng];
          if (hasDirection) {
            const dist0 = minDistSqToPolyline(lat, lng, poly0);
            const dist1 = minDistSqToPolyline(lat, lng, poly1);
            const geoIsIda = dist0 <= dist1 ? !swapped : swapped;
            const isSelected = geoIsIda ? dirs.ida : dirs.volta;
            if (!isSelected) return null;
            const poly = dist0 <= dist1 ? poly0 : poly1;
            const onLine = getClosestPointOnPolyline(lat, lng, poly);
            if (onLine) center = onLine;
          } else {
            if (!dirs.ida && !dirs.volta) return null;
          }
          return (
            <CircleMarker
              key={`stop-${linha}-${idx}`}
              center={center}
              radius={3}
              pathOptions={{
                color: lineColor,
                fillColor: "#fff",
                fillOpacity: 1,
                weight: 2,
                opacity: 1,
              }}
            />
          );
        });
      })}
      {/* Trilha (caminho já percorrido) de cada ônibus - mesma cor e suavidade */}
      {busesToShow.map((bus: BusData) => {
        const history = busHistory[bus.id] || [];
        const positions = history.map((h) => h.position as [number, number]);
        if (positions.length < 2) return null;
        const lineMode = getLineType(bus.linha);
        const lineColor =
          lineMode === "onibus"
            ? getLineHex(bus.linha)
            : SECONDARY_COLOR;
        return (
          <Polyline
            key={`trail-${bus.id}`}
            positions={positions}
            pathOptions={{
              color: lineColor,
              weight: 4,
              opacity: 0.85,
              ...SMOOTH_PATH,
            }}
          />
        );
      })}
      {busesToShow.map((bus: BusData) => {
        const isSelected = selectedBus === bus.id;
        const heading = bus.heading ?? getHeadingForBus(bus.id) ?? 0;
        const speed = Number(bus.velocidade) || 0;
        const busMode = getLineType(bus.linha);
        const fillColor =
          busMode === "onibus"
            ? getLineHex(bus.linha)
            : SECONDARY_COLOR;

        return (
          <Marker
            key={bus.id}
            position={[bus.latitude, bus.longitude]}
            icon={getBusIcon(bus.linha, busMode, isSelected, speed, heading, fillColor)}
            eventHandlers={{
              click: () => onSelectBus(isSelected ? null : bus.id),
            }}
          />
        );
      })}
      <LocationButton />
    </>
  );
};
