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

  useEffect(() => {
    routesGeoJsonRef.current = routesGeoJson;
  }, [routesGeoJson]);

  useEffect(() => {
    stopsGeoJsonRef.current = stopsGeoJson;
  }, [stopsGeoJson]);

  useEffect(() => {
    vehiclesGeoJsonRef.current = vehiclesGeoJson;
  }, [vehiclesGeoJson]);

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
    // 1. Source e Layers de Rotas (traçados)
    if (!map.getSource("route-shapes")) {
      map.addSource("route-shapes", {
        type: "geojson",
        data: routesGeoJsonRef.current || { type: "FeatureCollection", features: [] },
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
    if (!map.getSource("route-stops")) {
      map.addSource("route-stops", {
        type: "geojson",
        data: stopsGeoJsonRef.current || { type: "FeatureCollection", features: [] },
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
    if (!map.getSource("vehicles")) {
      map.addSource("vehicles", {
        type: "geojson",
        data: vehiclesGeoJsonRef.current || { type: "FeatureCollection", features: [] },
      });

      // Halo de destaque para o ônibus selecionado
      map.addLayer({
        id: "vehicles-selected-halo",
        type: "circle",
        source: "vehicles",
        filter: ["==", ["get", "isSelected"], 1],
        paint: {
          "circle-radius": 24,
          "circle-color": ["coalesce", ["get", "color"], "#10b981"],
          "circle-opacity": 0.35,
          "circle-stroke-width": 2,
          "circle-stroke-color": ["coalesce", ["get", "color"], "#10b981"],
          "circle-stroke-opacity": 0.7,
        },
      });

      // Círculo principal do ônibus
      map.addLayer({
        id: "vehicles-circle",
        type: "circle",
        source: "vehicles",
        paint: {
          "circle-radius": [
            "case",
            ["==", ["get", "isSelected"], 1],
            18,
            15,
          ],
          "circle-color": ["coalesce", ["get", "color"], "#10b981"],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2.5,
        },
      });

      // Indicador de direção (triângulo apontando para o heading)
      map.addLayer({
        id: "vehicles-direction",
        type: "symbol",
        source: "vehicles",
        layout: {
          "text-field": "▲",
          "text-font": ["Noto Sans Regular"],
          "text-size": [
            "case",
            ["==", ["get", "isSelected"], 1],
            12,
            10,
          ],
          "text-rotate": ["coalesce", ["get", "heading"], 0],
          "text-rotation-alignment": "map",
          "text-offset": [0, -1.5],
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: {
          "text-color": ["coalesce", ["get", "color"], "#10b981"],
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      });

      // Número da linha no centro do círculo
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
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      // Badge de velocidade acima do veículo quando selecionado
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
          "text-offset": [0, -2.6],
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
      if (mapRef.current) {
        mapRef.current.setStyle(next ? DARK_STYLE : LIGHT_STYLE);
      }
      return next;
    });
  }, []);

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
      map.on("click", "vehicles-circle", (e) => {
        const feature = e.features?.[0];
        if (feature?.properties?.id) {
          onSelectBus?.(feature.properties.id);
        }
      });

      map.on("mouseenter", "vehicles-circle", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "vehicles-circle", () => {
        map.getCanvas().style.cursor = "";
      });

      onMapLoaded?.(map);
    });

    // Quando o estilo é alterado (Modo Noturno / Claro), recoloca os layers customizados
    map.on("styledata", () => {
      if (map.isStyleLoaded() && !map.getSource("vehicles")) {
        setupCustomLayers(map);
      }
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

