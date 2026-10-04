"use client";

import React, { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface MapLibreViewProps {
  initialCenter?: [number, number] | { lat: number; lng: number };
  initialZoom?: number;
  className?: string;
  onMapLoaded?: (map: maplibregl.Map) => void;
}

const DEFAULT_CENTER_LNG_LAT: [number, number] = [-43.1729, -22.9068];
const DEFAULT_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export function MapLibreView({
  initialCenter = DEFAULT_CENTER_LNG_LAT,
  initialZoom = 13,
  className = "h-full w-full",
  onMapLoaded,
}: MapLibreViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Normaliza o centro para [lng, lat] (MapLibre usa [longitude, latitude])
  const centerLngLat: [number, number] = React.useMemo(() => {
    if (Array.isArray(initialCenter)) {
      // Se primeiro item for latitude negativa (ex: -22.9068 e longitude -43.1729)
      if (initialCenter[0] > -30 && initialCenter[0] < -20 && initialCenter[1] < -40) {
        return [initialCenter[1], initialCenter[0]];
      }
      return initialCenter;
    }
    return [initialCenter.lng, initialCenter.lat];
  }, [initialCenter]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DEFAULT_STYLE,
      center: centerLngLat,
      zoom: initialZoom,
      attributionControl: {},
    });

    map.addControl(
      new maplibregl.NavigationControl({
        showCompass: true,
        showZoom: true,
      }),
      "top-right"
    );

    map.on("load", () => {
      onMapLoaded?.(map);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "relative", width: "100%", height: "100%" }}
    />
  );
}

export default MapLibreView;
