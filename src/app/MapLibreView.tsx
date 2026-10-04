"use client";

import React, { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface MapLibreViewProps {
  initialCenter?: [number, number] | { lat: number; lng: number };
  initialZoom?: number;
  className?: string;
  routesGeoJson?: GeoJSON.FeatureCollection<GeoJSON.LineString>;
  onMapLoaded?: (map: maplibregl.Map) => void;
}

const DEFAULT_CENTER_LNG_LAT: [number, number] = [-43.1729, -22.9068];
const DEFAULT_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export function MapLibreView({
  initialCenter = DEFAULT_CENTER_LNG_LAT,
  initialZoom = 13,
  className = "h-full w-full",
  routesGeoJson,
  onMapLoaded,
}: MapLibreViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const isLoadedRef = useRef(false);

  // Normaliza o centro para [lng, lat] (MapLibre usa [longitude, latitude])
  const centerLngLat: [number, number] = React.useMemo(() => {
    if (Array.isArray(initialCenter)) {
      if (Math.abs(initialCenter[0]) <= 90 && Math.abs(initialCenter[1]) > 90) {
        return [initialCenter[1], initialCenter[0]];
      }
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
      isLoadedRef.current = true;

      // Adiciona source e layers de traçados de rotas caso já existam dados
      if (!map.getSource("route-shapes")) {
        map.addSource("route-shapes", {
          type: "geojson",
          data: routesGeoJson || { type: "FeatureCollection", features: [] },
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
            "line-color": ["get", "color"],
            "line-width": 3.5,
            "line-opacity": 0.9,
          },
        });
      }

      onMapLoaded?.(map);
    });

    mapRef.current = map;

    return () => {
      isLoadedRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Atualização dos traçados das linhas (RouteShapes)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current) return;

    const source = map.getSource("route-shapes") as maplibregl.GeoJSONSource | undefined;
    const data = routesGeoJson || { type: "FeatureCollection", features: [] };

    if (source) {
      source.setData(data);
    }
  }, [routesGeoJson]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "relative", width: "100%", height: "100%" }}
    />
  );
}

export default MapLibreView;
