"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Locate, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import {
  getCurrentPosition,
  isNativePlatform,
  requestLocationPermission,
} from "@/lib/geolocation";
import { cn } from "@/lib/utils";

interface MapLibreViewProps {
  initialCenter?: [number, number] | { lat: number; lng: number };
  initialZoom?: number;
  className?: string;
  routesGeoJson?: GeoJSON.FeatureCollection<GeoJSON.LineString>;
  stopsGeoJson?: GeoJSON.FeatureCollection<GeoJSON.Point>;
  vehiclesGeoJson?: GeoJSON.FeatureCollection<GeoJSON.Point>;
  selectedBusId?: string | null;
  onSelectBus?: (id: string | null) => void;
  onMapLoaded?: (map: maplibregl.Map) => void;
}

const DEFAULT_CENTER_LNG_LAT: [number, number] = [-43.1729, -22.9068];
const LIGHT_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const DARK_STYLE = "https://tiles.openfreemap.org/styles/dark";

const BUS_ICON_PREFIX = "bus-";
const DEFAULT_LINE_COLOR = "#10b981";
// Ônibus visto de frente (viewBox 24x24)
const BUS_BODY_PATH =
  "M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10z";
// Para-brisa e faróis (pintados de branco por cima da carroceria)
const BUS_DETAILS_PATH =
  "M7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17z" +
  "M16.5 17c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" +
  "M18 11H6V6h12v5z";

/**
 * Gera o ícone do ônibus (id = "bus-<cor>"): círculo na cor da linha com borda
 * branca e sombra, e um ônibus branco grande dentro. Chamado via `styleimagemissing`.
 */
function addBusIcon(map: maplibregl.Map, id: string) {
  if (map.hasImage(id)) return;
  const color = id.slice(BUS_ICON_PREFIX.length) || DEFAULT_LINE_COLOR;
  const ratio = 3;
  const units = 40; // círculo de 32 + margem para borda e sombra
  const size = units * ratio;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(ratio, ratio);

  // Disco na cor da linha com borda branca e sombra
  ctx.beginPath();
  ctx.arc(20, 19, 16, 0, Math.PI * 2);
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 1.5;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  // Ônibus branco centralizado (para-brisa e faróis vazados na cor da linha)
  const scale = 0.9;
  ctx.translate(20 - 12 * scale, 19 - 11.5 * scale);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fill(new Path2D(BUS_BODY_PATH + BUS_DETAILS_PATH), "evenodd");

  map.addImage(id, ctx.getImageData(0, 0, size, size), { pixelRatio: ratio });
}

export function MapLibreView({
  initialCenter = DEFAULT_CENTER_LNG_LAT,
  initialZoom = 13,
  className = "h-full w-full",
  routesGeoJson,
  stopsGeoJson,
  vehiclesGeoJson,
  selectedBusId = null,
  onSelectBus,
  onMapLoaded,
}: MapLibreViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const isLoadedRef = useRef(false);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const isNative = isNativePlatform();

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("meu-busao-theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const routesGeoJsonRef = useRef(routesGeoJson);
  const stopsGeoJsonRef = useRef(stopsGeoJson);
  const vehiclesGeoJsonRef = useRef(vehiclesGeoJson);

  // Mantém refs síncronos com as props mais recentes
  routesGeoJsonRef.current = routesGeoJson;
  stopsGeoJsonRef.current = stopsGeoJson;
  vehiclesGeoJsonRef.current = vehiclesGeoJson;

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.classList.toggle("dark", isDarkMode);
    }
  }, [isDarkMode]);

  // Normaliza o centro para [lng, lat] (MapLibre usa [longitude, latitude])
  const centerLngLat: [number, number] = React.useMemo(() => {
    if (Array.isArray(initialCenter)) {
      if (Math.abs(initialCenter[0]) <= 90 && Math.abs(initialCenter[1]) > 90) {
        return [initialCenter[1], initialCenter[0]];
      }
      if (
        initialCenter[0] > -30 &&
        initialCenter[0] < -20 &&
        initialCenter[1] < -40
      ) {
        return [initialCenter[1], initialCenter[0]];
      }
      return initialCenter;
    }
    return [initialCenter.lng, initialCenter.lat];
  }, [initialCenter]);

  // Wake Lock para manter tela acesa no mobile
  useEffect(() => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let sentinel: { release: () => Promise<void> } | null = null;

    const requestWakeLock = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        sentinel = await (navigator as any).wakeLock.request("screen");
      } catch {
        // Ignora caso recusado pelo navegador
      }
    };

    requestWakeLock();
    const handleVis = () => {
      if (document.visibilityState === "visible") requestWakeLock();
    };
    document.addEventListener("visibilitychange", handleVis);
    return () => {
      document.removeEventListener("visibilitychange", handleVis);
      sentinel?.release?.().catch(() => {});
    };
  }, []);

  const setupCustomLayers = useCallback((map: maplibregl.Map) => {
    const routesData = routesGeoJsonRef.current || {
      type: "FeatureCollection",
      features: [],
    };
    const stopsData = stopsGeoJsonRef.current || {
      type: "FeatureCollection",
      features: [],
    };
    const vehiclesData = vehiclesGeoJsonRef.current || {
      type: "FeatureCollection",
      features: [],
    };

    // 1. Source e Layers de Rotas (traçados)
    const routeSource = map.getSource("route-shapes") as
      | maplibregl.GeoJSONSource
      | undefined;
    if (routeSource) {
      routeSource.setData(routesData);
    } else {
      map.addSource("route-shapes", {
        type: "geojson",
        data: routesData,
      });

      map.addLayer({
        id: "route-shapes-casing",
        type: "line",
        source: "route-shapes",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "rgba(0, 0, 0, 0.25)",
          "line-width": 5.5,
        },
      });

      map.addLayer({
        id: "route-shapes-line",
        type: "line",
        source: "route-shapes",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": ["coalesce", ["get", "color"], "#10b981"],
          "line-width": 3.5,
          "line-opacity": 0.9,
        },
      });
    }

    // 2. Source e Layer de Paradas (Stops)
    const stopsSource = map.getSource("route-stops") as
      | maplibregl.GeoJSONSource
      | undefined;
    if (stopsSource) {
      stopsSource.setData(stopsData);
    } else {
      map.addSource("route-stops", {
        type: "geojson",
        data: stopsData,
      });

      map.addLayer({
        id: "route-stops-circles",
        type: "circle",
        source: "route-stops",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            12,
            1.5,
            14,
            3,
            16,
            4.5,
          ],
          "circle-color": "#ffffff",
          "circle-stroke-color": ["coalesce", ["get", "color"], "#10b981"],
          "circle-stroke-width": 2,
          "circle-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            11.5,
            0,
            12.5,
            1,
          ],
          "circle-stroke-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            11.5,
            0,
            12.5,
            1,
          ],
        },
      });
    }

    // 3. Source e Layers de Veículos (Buses / BRT)
    const vehiclesSource = map.getSource("vehicles") as
      | maplibregl.GeoJSONSource
      | undefined;
    if (vehiclesSource) {
      vehiclesSource.setData(vehiclesData);
    } else {
      map.addSource("vehicles", {
        type: "geojson",
        data: vehiclesData,
      });

      // Halo de destaque para o ônibus selecionado
      map.addLayer({
        id: "vehicles-selected-halo",
        type: "circle",
        source: "vehicles",
        filter: ["==", ["get", "isSelected"], 1],
        paint: {
          "circle-radius": 26,
          "circle-color": ["coalesce", ["get", "color"], DEFAULT_LINE_COLOR],
          "circle-opacity": 0.25,
          "circle-stroke-width": 2,
          "circle-stroke-color": ["coalesce", ["get", "color"], DEFAULT_LINE_COLOR],
          "circle-stroke-opacity": 0.7,
        },
      });

      // Ícone do ônibus na cor da linha (gerado em `styleimagemissing`)
      map.addLayer({
        id: "vehicles-icon",
        type: "symbol",
        source: "vehicles",
        layout: {
          "icon-image": [
            "concat",
            BUS_ICON_PREFIX,
            ["coalesce", ["get", "color"], DEFAULT_LINE_COLOR],
          ],
          "icon-size": ["case", ["==", ["get", "isSelected"], 1], 1.2, 1],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });

      // Número da linha em uma "pílula" acima do ônibus
      map.addLayer({
        id: "vehicles-label",
        type: "symbol",
        source: "vehicles",
        layout: {
          "text-field": ["to-string", ["coalesce", ["get", "linha"], ""]],
          "text-font": ["Noto Sans Bold"],
          "text-size": [
            "case",
            ["==", ["get", "isSelected"], 1],
            12,
            10,
          ],
          "text-offset": [0, -3],
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": ["coalesce", ["get", "color"], DEFAULT_LINE_COLOR],
          "text-halo-width": 3,
        },
      });

      // Badge de velocidade abaixo do veículo quando selecionado
      map.addLayer({
        id: "vehicles-speed",
        type: "symbol",
        source: "vehicles",
        filter: [
          "all",
          ["==", ["get", "isSelected"], 1],
          [">", ["get", "speed"], 0],
        ],
        layout: {
          "text-field": ["to-string", ["coalesce", ["get", "speedLabel"], ""]],
          "text-font": ["Noto Sans Regular"],
          "text-size": 10,
          "text-offset": [0, 3],
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "rgba(0,0,0,0.85)",
          "text-halo-width": 4,
        },
      });
    }
  }, []);

  // Alterna Modo Noturno / Claro
  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        document.documentElement.classList.toggle("dark", next);
        localStorage.setItem("meu-busao-theme", next ? "dark" : "light");
      }
      const map = mapRef.current;
      if (map) {
        map.once("style.load", () => {
          setupCustomLayers(map);
        });
        map.setStyle(next ? DARK_STYLE : LIGHT_STYLE);
      }
      return next;
    });
  }, [setupCustomLayers]);

  // Inicialização do Mapa
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    if (typeof window !== "undefined") {
      maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
    }

    const currentStyle = isDarkMode ? DARK_STYLE : LIGHT_STYLE;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: currentStyle,
      center: centerLngLat,
      zoom: initialZoom,
      attributionControl: {},
    });

    map.on("error", (e) => {
      console.warn("MapLibre GL:", e);
    });

    // Gera o ícone do ônibus na cor da linha quando o estilo pedir (inclusive após setStyle)
    map.on("styleimagemissing", (e) => {
      if (e.id.startsWith(BUS_ICON_PREFIX)) addBusIcon(map, e.id);
    });

    const ro = new ResizeObserver(() => {
      map.resize();
    });
    if (containerRef.current) {
      ro.observe(containerRef.current);
    }

    map.on("load", () => {
      isLoadedRef.current = true;
      map.resize();
      setupCustomLayers(map);

      // Eventos de clique e hover no veículo
      map.on("click", "vehicles-icon", (e) => {
        const feature = e.features?.[0];
        if (feature?.properties?.id) {
          onSelectBus?.(feature.properties.id);
        }
      });

      map.on("mouseenter", "vehicles-icon", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "vehicles-icon", () => {
        map.getCanvas().style.cursor = "";
      });

      onMapLoaded?.(map);
    });

    // Quando o estilo é recarregado (Modo Noturno / Claro), garante que os layers customizados existam
    map.on("style.load", () => {
      setupCustomLayers(map);
    });

    mapRef.current = map;

    return () => {
      ro.disconnect();
      isLoadedRef.current = false;
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Atualização dos traçados das linhas (RouteShapes)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current) return;
    const source = map.getSource("route-shapes") as
      | maplibregl.GeoJSONSource
      | undefined;
    const data = routesGeoJson || { type: "FeatureCollection", features: [] };
    if (source) source.setData(data);
  }, [routesGeoJson]);

  // Atualização das paradas das linhas (RouteStops)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current) return;
    const source = map.getSource("route-stops") as
      | maplibregl.GeoJSONSource
      | undefined;
    const data = stopsGeoJson || { type: "FeatureCollection", features: [] };
    if (source) source.setData(data);
  }, [stopsGeoJson]);

  // Atualização dos veículos (Buses / BRT)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current) return;
    const source = map.getSource("vehicles") as
      | maplibregl.GeoJSONSource
      | undefined;
    const data = vehiclesGeoJson || { type: "FeatureCollection", features: [] };
    if (source) source.setData(data);
  }, [vehiclesGeoJson]);

  // Seguir / centralizar no ônibus selecionado
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedBusId || !vehiclesGeoJson) return;

    const feature = vehiclesGeoJson.features.find(
      (f) => f.properties?.id === selectedBusId
    );
    if (feature && feature.geometry.type === "Point") {
      const [lng, lat] = feature.geometry.coordinates;
      map.easeTo({
        center: [lng, lat],
        zoom: Math.max(map.getZoom(), 15),
        duration: 500,
      });
    }
  }, [selectedBusId, vehiclesGeoJson]);

  // Geolocalização do Usuário
  const updateLocationMarker = useCallback(
    (lng: number, lat: number) => {
      const map = mapRef.current;
      if (!map) return;

      if (!userMarkerRef.current) {
        const el = document.createElement("div");
        el.className = "relative w-6 h-6";
        el.innerHTML = `
          <div class="absolute inset-0 bg-blue-500 rounded-full opacity-25 animate-ping"></div>
          <div class="absolute inset-[20%] bg-blue-500 rounded-full border-2 border-white shadow-md"></div>
        `;
        userMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map);
      } else {
        userMarkerRef.current.setLngLat([lng, lat]);
      }
    },
    []
  );

  const fetchAndShowLocation = useCallback(() => {
    getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 })
      .then(({ latitude, longitude }) => {
        updateLocationMarker(longitude, latitude);
        const map = mapRef.current;
        if (map) {
          map.easeTo({
            center: [longitude, latitude],
            zoom: Math.max(map.getZoom(), 14),
            duration: 800,
          });
        }
      })
      .catch(() => {
        toast.error("Não foi possível obter sua localização");
        setIsTracking(false);
        localStorage.setItem("isTracking", "false");
      });
  }, [updateLocationMarker]);

  const toggleLocation = () => {
    if (!isTracking) {
      if (isNative) requestLocationPermission();
      fetchAndShowLocation();
      toast.success("Rastreando sua localização");
      setIsTracking(true);
      localStorage.setItem("isTracking", "true");
    } else {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      toast.info("Parou de rastrear localização");
      setIsTracking(false);
      localStorage.setItem("isTracking", "false");
    }
  };

  return (
    <div
      className={className}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      <div
        ref={containerRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />

      {/* Controles Flutuantes do Mapa (Modo Noturno + Geolocalização) */}
      <div className="absolute right-3 top-3 z-10 flex flex-col rounded-lg bg-card/95 backdrop-blur-sm border border-border shadow-md overflow-hidden">
        {/* Botão de Modo Noturno / Claro */}
        <button
          type="button"
          onClick={toggleDarkMode}
          className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/60 active:bg-accent transition-colors"
          title={isDarkMode ? "Mudar para modo claro" : "Mudar para modo noturno"}
          aria-label={isDarkMode ? "Modo Claro" : "Modo Noturno"}
        >
          {isDarkMode ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-slate-700 dark:text-slate-300" />
          )}
        </button>

        <div className="h-px w-full bg-border/70" />

        {/* Botão de Localização do Usuário */}
        <button
          type="button"
          onClick={toggleLocation}
          className={cn(
            "flex h-9 w-9 items-center justify-center transition-colors",
            isTracking
              ? "bg-primary/15 text-primary hover:bg-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/60 active:bg-accent"
          )}
          title={isTracking ? "Parar de rastrear localização" : "Rastrear minha localização"}
          aria-label="Localização"
        >
          <Locate className={cn("h-4 w-4", isTracking && "animate-pulse")} />
        </button>
      </div>
    </div>
  );
}

export default MapLibreView;

