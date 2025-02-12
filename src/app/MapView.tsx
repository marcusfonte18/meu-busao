/* eslint-disable @typescript-eslint/no-require-imports */
"use client";
import React, { useState } from "react";
import { Bus, Clock, LocateFixed, Navigation, Route } from "lucide-react";
import dynamic from "next/dynamic";
import { BusData, BusHistoryMap } from "./types";
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

const getBusIcon = (linha: string, isSelected: boolean = false) => {
  if (typeof window === "undefined") return null;
  const L = require("leaflet");
  const linhaColor = getColorForLine(linha);

  return new L.DivIcon({
    className: "bus-icon",
    html: `
      <div style="
        background-color: ${linhaColor};
        color: white;
        width: ${isSelected ? "40px" : "32px"};
        height: ${isSelected ? "40px" : "32px"};
        border-radius: 50%;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${isSelected ? "14px" : "12px"};
        font-weight: bold;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        border: ${isSelected ? "3px" : "2px"} solid white;
        transition: all 0.3s ease;
        ${isSelected ? "animation: pulse 2s infinite;" : ""}
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
      </div>
      <style>
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      </style>`,
    iconSize: isSelected ? [40, 40] : [32, 32],
    iconAnchor: isSelected ? [20, 40] : [16, 32],
    popupAnchor: [0, -32],
  });
};

const LocationButton = () => {
  const [isTracking, setIsTracking] = useState(false);
  const map = useMap();
  let locationMarker: any = null;

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
    <div className="leaflet-bottom leaflet-left" style={{ zIndex: 999 }}>
      <div className="leaflet-control leaflet-bar !border-none">
        <button
          onClick={toggleLocation}
          className={`p-3 ${
            isTracking ? "bg-blue-500" : "bg-gray-500"
          } text-white rounded-full shadow-lg hover:${
            isTracking ? "bg-blue-600" : "bg-gray-600"
          } transition-colors`}
          title={isTracking ? "Parar de rastrear" : "Rastrear localização"}
        >
          <Navigation className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};
export const BusMarkers = ({ buses }: { buses: BusData[] }) => {
  const [selectedBus, setSelectedBus] = useState<string | null>(null);
  const [busHistory, setBusHistory] = useState<BusHistoryMap>({});
  const [initialViewSet, setInitialViewSet] = useState(false);
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

  return (
    <>
      {buses.map((bus: BusData) => {
        const isSelected = selectedBus === bus.id;
        const stats = calculateStats(bus.id);

        return (
          <Marker
            key={bus.id}
            position={[bus.latitude, bus.longitude]}
            icon={getBusIcon(bus.linha, isSelected)}
            eventHandlers={{
              click: () => setSelectedBus(isSelected ? null : bus.id),
            }}
          >
            <Popup className="rounded-lg shadow-lg">
              <div className="p-4 bg-white dark:bg-gray-800 min-w-[240px]">
                <div className="flex items-center space-x-2 mb-3">
                  <Bus className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-lg">Linha {bus.linha}</h3>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="flex items-center">
                    <LocateFixed className="h-4 w-4 mr-2" />
                    Velocidade atual: {Number(bus.velocidade).toFixed(1)} km/h
                  </p>
                  <p className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Velocidade média: {stats.avgSpeed} km/h
                  </p>
                  <p className="flex items-center">
                    <Route className="h-4 w-4 mr-2" />
                    Distância: {stats.distance} km
                  </p>
                  <p className="flex items-center">
                    <Bus className="h-4 w-4 mr-2" />
                    Placa: {bus.ordem}
                  </p>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
      <LocationButton />
    </>
  );
};
