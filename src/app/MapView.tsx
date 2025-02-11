"use client";

import dynamic from "next/dynamic";
import { BusData } from "./types";
import { useEffect } from "react";
import { getColorForLine } from "@/utils";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
});

import { useMap } from "react-leaflet";

const getBusIcon = (linha: string) => {
  if (typeof window === "undefined") return null; // Evita erro no SSR

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require("leaflet"); // Importação condicional
  const linhaColor = getColorForLine(linha);

  return new L.DivIcon({
    className: "bus-icon",
    html: `
      <div style="background-color: ${linhaColor}; color: white; width: 32px; height: 32px; border-radius: 50%; position: relative; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold;">
        ${linha}
        <div style="position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%); width: 12px; height: 12px; background-color: ${linhaColor}; border-radius: 50%;"></div>
      </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const BusMarkers = ({ buses }: { buses: any[] }) => {
  const map = useMap();

  useEffect(() => {
    if (buses.length > 0) {
      const firstBus = buses[0];
      map.setView([firstBus.latitude, firstBus.longitude], map.getZoom(), {
        animate: true,
      });
    }
  }, [buses, map]);

  return (
    <>
      {buses.map((bus) => (
        <Marker
          key={bus.id}
          position={[bus.latitude, bus.longitude]}
          icon={getBusIcon(bus.linha)}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-bold">Linha {bus.linha}</h3>
              <p className="text-sm">{bus.destino}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
};

export const MapView = ({ buses }: { buses: BusData[] }) => {
  return (
    <MapContainer
      center={[-22.9068, -43.1729]}
      zoom={13}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <BusMarkers buses={buses} />
    </MapContainer>
  );
};
