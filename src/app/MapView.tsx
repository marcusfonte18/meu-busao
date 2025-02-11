/* eslint-disable @typescript-eslint/no-require-imports */
"use client";
import React, { useState } from "react";
import { Bus, LocateFixed, Navigation } from "lucide-react";
import dynamic from "next/dynamic";
import { BusData } from "./types";
import { useEffect } from "react";
import { getColorForLine } from "@/utils";
import "leaflet/dist/leaflet.css";
import { useMap, useMapEvents } from "react-leaflet";
import { toast } from "sonner";

const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
});

const getBusIcon = (linha: string) => {
  if (typeof window === "undefined") return null;
  const L = require("leaflet");
  const linhaColor = getColorForLine(linha);
  return new L.DivIcon({
    className: "bus-icon",
    html: `
      <div style="
        background-color: ${linhaColor};
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        border: 2px solid white;
      ">
        ${linha}
        <div style="
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%);
          width: 10px;
          height: 10px;
          background-color: ${linhaColor};
          border-radius: 50%;
          border: 2px solid white;
        "></div>
      </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const LocationButton = () => {
  const [isTracking, setIsTracking] = useState(false);
  const map = useMap();
  let locationMarker: any = null;

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
    setIsTracking(!isTracking);
  };

  return (
    <div className="leaflet-bottom leaflet-right" style={{ zIndex: 999 }}>
      <div className="leaflet-control leaflet-bar">
        <button
          onClick={toggleLocation}
          className={`p-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
            isTracking ? "text-blue-500" : "text-gray-700 dark:text-gray-300"
          }`}
          title={isTracking ? "Parar de rastrear" : "Rastrear localização"}
        >
          <Navigation className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export const BusMarkers = ({ buses }: { buses: any[] }) => {
  const map = useMap();

  useEffect(() => {
    if (buses.length > 0) {
      const firstBus = buses[0];
      map.setView([firstBus.latitude, firstBus.longitude]);
    }
  }, [buses, map]);

  return (
    <>
      {buses.map((bus: BusData) => (
        <Marker
          key={bus.id}
          position={[bus.latitude, bus.longitude]}
          icon={getBusIcon(bus.linha)}
        >
          <Popup className="rounded-lg shadow-lg">
            <div className="p-2">
              <div className="flex items-center space-x-2 mb-1">
                <Bus className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-base">Linha {bus.linha}</h3>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p className="flex items-center">
                  <LocateFixed className="h-3 w-3 mr-1" />
                  Velocidade: {bus.velocidade} km/h
                </p>
                <p className="flex items-center">
                  <Bus className="h-3 w-3 mr-1" />
                  Placa: {bus.ordem}
                </p>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
      <LocationButton />
    </>
  );
};
