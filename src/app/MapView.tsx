/* eslint-disable @typescript-eslint/no-require-imports */
"use client";
import React, { useState } from "react";
import dynamic from "next/dynamic";
import { BusData, BusHistoryMap } from "./types";
import { useEffect } from "react";
import "leaflet/dist/leaflet.css";
import { useMap, useMapEvents } from "react-leaflet";
import { toast } from "sonner";
import { Locate } from "lucide-react";
import type { TransportMode } from "./types";
import { getLineColorHex } from "@/components/bus-tracker/bus-marker";

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

/** Cores do tema: secondary (BRT). Ônibus usa getLineColorHex (teal/roxo por linha). */
const SECONDARY_COLOR = "#eab308";

/** Opções comuns para suavidade do traço (lineCap/lineJoin arredondados) */
const SMOOTH_PATH = { lineCap: "round" as const, lineJoin: "round" as const };

/** Número de setas de direção ao longo de cada traçado */
const DIRECTION_ARROWS_COUNT = 10;

/**
 * Amostra pontos ao longo da polyline e retorna posição + ângulo (direção do percurso).
 * Usado para desenhar flechas indicando o sentido da linha.
 */
function sampleDirectionArrows(
  positions: [number, number][],
  maxArrows: number = DIRECTION_ARROWS_COUNT
): { lat: number; lng: number; angle: number }[] {
  if (positions.length < 2) return [];
  const result: { lat: number; lng: number; angle: number }[] = [];
  const step = (positions.length - 1) / (maxArrows + 1);
  for (let k = 1; k <= maxArrows; k++) {
    const i = Math.min(Math.floor(k * step), positions.length - 2);
    const [lat, lng] = positions[i];
    const [nextLat, nextLng] = positions[i + 1];
    const angle = getBearing(lat, lng, nextLat, nextLng);
    result.push({ lat, lng, angle });
  }
  return result;
}

/**
 * Ícone de seta (triângulo) para indicar direção da linha. angle em graus (0 = Norte).
 * Usa SVG em data URL para renderização estável no Leaflet.
 */
function getDirectionArrowIcon(angleDeg: number, color: string) {
  if (typeof window === "undefined") return null;
  const L = require("leaflet");
  const size = 20;
  const center = size / 2;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <g transform="rotate(${angleDeg} ${center} ${center})">
        <path d="M${center} 4 L${size - 4} ${size - 4} L8 ${size - 4} Z" fill="${color}" stroke="rgba(0,0,0,0.25)" stroke-width="0.8"/>
      </g>
    </svg>`;
  const encoded = encodeURIComponent(svg.trim()).replace(/'/g, "%27");
  return new L.DivIcon({
    className: "direction-arrow-icon",
    html: `<img src="data:image/svg+xml,${encoded}" width="${size}" height="${size}" alt="" />`,
    iconSize: [size, size],
    iconAnchor: [center, center],
  });
}

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
  let locationMarker: any = null;

  // Solicita geolocalização automaticamente ao carregar o mapa (sem precisar clicar no ícone)
  useEffect(() => {
    map.locate({ enableHighAccuracy: true, setView: false });
  }, [map]);

  // Restaurar o estado do rastreamento ao carregar o componente
  useEffect(() => {
    const savedTrackingState = localStorage.getItem("isTracking");
    if (savedTrackingState === "true") {
      setIsTracking(true);
      map.locate({ enableHighAccuracy: true, setView: false });
    }
  }, [map]);

  const createLocationMarker = (latlng: any, accuracy: number) => {
    if (typeof window === "undefined") return;
    const L = require("leaflet");

    if (locationMarker) {
      map.removeLayer(locationMarker);
    }

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

    locationMarker = L.marker(latlng, { icon: locationIcon })
      .addTo(map)
      .bindPopup(`Precisão: ~${Math.round(accuracy)} metros`);

    // Ajusta a visualização apenas na primeira detecção de localização
    if (isTracking && !locationMarker._initialViewSet) {
      map.setView(latlng);
      locationMarker._initialViewSet = true; // Marca que a visualização inicial foi ajustada
    }
  };

  useMapEvents({
    locationfound: (e) => {
      createLocationMarker(e.latlng, e.accuracy);
    },
    locationerror: () => {
      toast.error("Não foi possível obter sua localização");
      setIsTracking(false);
      localStorage.setItem("isTracking", "false"); // Salva o estado como inativo em caso de erro
    },
  });

  const toggleLocation = () => {
    if (!isTracking) {
      map.locate({ enableHighAccuracy: true, setView: false }); // Desativa a atualização automática da visualização
      toast.success("Rastreando sua localização");
    } else {
      map.stopLocate();
      if (locationMarker) {
        map.removeLayer(locationMarker);
      }
      toast.info("Parou de rastrear localização");
    }
    const newTrackingState = !isTracking;
    setIsTracking(newTrackingState);
    localStorage.setItem("isTracking", newTrackingState.toString()); // Salva o novo estado no localStorage
  };

  return (
    <div className="leaflet-top leaflet-right" style={{ zIndex: 999 }}>
      <div className="leaflet-control leaflet-bar !border-none">
        <button
          onClick={toggleLocation}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-colors hover:bg-primary/90"
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

export type DirectionFilter = "all" | "ida" | "volta";

/** Sentidos selecionados: ida e/ou volta. Ambos true = mostrar os dois. */
export type SelectedDirections = { ida: boolean; volta: boolean };

export const BusMarkers = ({
  buses,
  routeShapes = {},
  mode = "onibus",
  selectedBus,
  onSelectBus,
  selectedDirections = { ida: true, volta: true },
  selectedLinhas = [],
}: {
  buses: BusData[];
  routeShapes?: RouteShapesMap;
  mode?: TransportMode;
  selectedBus: string | null;
  onSelectBus: (id: string | null) => void;
  selectedDirections?: SelectedDirections;
  selectedLinhas?: string[];
}) => {
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

  const calculateStats = (busId: string) => {
    const history = busHistory[busId] || [];
    if (history.length === 0) return { avgSpeed: 0, distance: 0 };

    // Calcula a velocidade média usando apenas valores válidos
    const validSpeeds = history
      .map((record) => record.speed)
      .filter((speed) => !isNaN(speed) && speed >= 0 && speed < 150); // Filtra velocidades absurdas

    const avgSpeed =
      validSpeeds.length > 0
        ? validSpeeds.reduce((sum, speed) => sum + speed, 0) /
          validSpeeds.length
        : 0;

    // Calcula a distância apenas se houver pelo menos dois pontos
    let distance = 0;
    if (history.length >= 2) {
      for (let i = 1; i < history.length; i++) {
        const prev = history[i - 1].position;
        const curr = history[i].position;

        // Verifica se as coordenadas são válidas
        if (prev[0] && prev[1] && curr[0] && curr[1]) {
          const segmentDistance = map.distance(prev, curr);
          // Adiciona apenas se a distância for razoável (menos de 1km entre pontos)
          if (segmentDistance < 1000) {
            distance += segmentDistance;
          }
        }
      }
    }

    return {
      avgSpeed: Math.round(avgSpeed * 10) / 10, // Arredonda para uma casa decimal
      distance: Math.round((distance / 1000) * 10) / 10, // Converte para km e arredonda
    };
  };

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
    // Sem route shapes ou sentido indefinido: mostrar se pelo menos um sentido estiver selecionado
    if (sentido === null) {
      return selectedDirections.ida || selectedDirections.volta;
    }
    // Normaliza por linha: se poly0 desta linha aponta direção oposta à primeira, inverte ida/volta
    if (polyOrderSwapped[bus.linha]) {
      sentido = sentido === "ida" ? "volta" : "ida";
    }
    return sentido === "ida" ? selectedDirections.ida : selectedDirections.volta;
  });

  return (
    <>
      {/* Traçado oficial da linha (GTFS): ambas iguais e finas */}
      {Object.entries(routeShapes).flatMap(([linha, polylines]) => {
        const lineColor =
          mode === "onibus"
            ? getLineColorHex(selectedLinhas, linha)
            : SECONDARY_COLOR;
        const swapped = polyOrderSwapped[linha];
        return polylines.slice(0, 2).flatMap((positions, idx) => {
          // idx 0 = poly0, idx 1 = poly1. Se swapped, poly0=volta geo e poly1=ida geo.
          const geoIsIda = (idx === 0 && !swapped) || (idx === 1 && swapped);
          const isSelected = geoIsIda ? selectedDirections.ida : selectedDirections.volta;
          if (!isSelected) return [];
          const arrowPoints = sampleDirectionArrows(positions);
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
            ...arrowPoints.flatMap((p, ai) => {
              const icon = getDirectionArrowIcon(p.angle, lineColor);
              if (!icon) return [];
              return [
                <Marker
                  key={`${lineKey}-arrow-${ai}`}
                  position={[p.lat, p.lng]}
                  icon={icon}
                  interactive={false}
                />,
              ];
            }),
          ];
        });
      })}
      {/* Trilha (caminho já percorrido) de cada ônibus - mesma cor e suavidade */}
      {busesToShow.map((bus: BusData) => {
        const history = busHistory[bus.id] || [];
        const positions = history.map((h) => h.position as [number, number]);
        if (positions.length < 2) return null;
        const lineColor =
          mode === "onibus"
            ? getLineColorHex(selectedLinhas, bus.linha)
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
        const fillColor =
          mode === "onibus"
            ? getLineColorHex(selectedLinhas, bus.linha)
            : SECONDARY_COLOR;

        return (
          <Marker
            key={bus.id}
            position={[bus.latitude, bus.longitude]}
            icon={getBusIcon(bus.linha, mode, isSelected, speed, heading, fillColor)}
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
