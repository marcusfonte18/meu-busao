/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { useBusData } from "./useBusData";

const BusMap = () => {
  // Componente do mapa com carregamento dinâmico para evitar erros de SSR
  const MapComponent = () => {
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
    const Popup = dynamic(
      () => import("react-leaflet").then((mod) => mod.Popup),
      { ssr: false }
    );

    const { buses, loading } = useBusData();

    console.log(buses, loading);
    if (loading) return <p>....loading</p>;
    return (
      <div className="h-[600px] w-full rounded-lg overflow-hidden">
        <MapContainer
          center={[-22.9068, -43.1729]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {buses.map((bus: any) => (
            <Marker key={bus.id} position={[bus.latitude, bus.longitude]}>
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold">Linha {bus.linha}</h3>
                  <p className="text-sm">{bus.destino}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Mapa de Ônibus em Tempo Real</CardTitle>
        </CardHeader>
        <CardContent>
          <MapComponent />
        </CardContent>
      </Card>
    </div>
  );
};

export default BusMap;
