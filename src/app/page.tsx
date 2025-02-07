/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import "leaflet/dist/leaflet.css";
import { useBusData } from "./useBusData";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Badge } from "@/components/ui/badge";

const busIcon = new L.Icon({
  iconUrl: "/assets/location.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

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
          icon={busIcon}
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

const InitialSearch = ({
  onSearch,
}: {
  onSearch: (linhas: string[]) => void;
}) => {
  const [linhaInput, setLinhaInput] = useState("");
  const [linhas, setLinhas] = useState<string[]>([]);

  const handleAddLinha = () => {
    const linhaTrim = linhaInput.trim();
    if (linhaTrim && !linhas.includes(linhaTrim)) {
      setLinhas([...linhas, linhaTrim]);
      setLinhaInput(""); // Limpa o input
    }
  };

  const handleRemoveLinha = (linha: string) => {
    setLinhas(linhas.filter((l) => l !== linha));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (linhas.length > 0) {
      onSearch(linhas);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-10">
      <CardHeader>
        <CardTitle>Buscar Linha de Ônibus</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Digite o número da linha"
              value={linhaInput}
              onChange={(e) => setLinhaInput(e.target.value)}
            />
            <Button type="button" onClick={handleAddLinha}>
              Adicionar
            </Button>
          </div>

          {/* Lista de linhas adicionadas */}
          <div className="flex flex-wrap gap-2">
            {linhas.map((linha) => (
              <Badge
                key={linha}
                onClick={() => handleRemoveLinha(linha)}
                className="cursor-pointer"
              >
                {linha} ✕
              </Badge>
            ))}
          </div>

          <Button type="submit" disabled={linhas.length === 0}>
            Iniciar Monitoramento
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

const BusMap = ({
  selectedLinha,
  onClearSelectedLinha,
}: {
  selectedLinha: Array<string>;
  onClearSelectedLinha: any;
}) => {
  const { data: buses, isLoading } = useBusData(selectedLinha);

  if (isLoading || !buses) return <p>Carregando...</p>;

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>
            Mapa de Ônibus em Tempo Real - Linhas {Object.values(selectedLinha)}
          </CardTitle>
          <Button
            onClick={onClearSelectedLinha}
            className="mt-4 bg-red-500 text-white"
          >
            Limpar Linhas
          </Button>
        </CardHeader>
        <CardContent>
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
              <BusMarkers buses={buses} />
            </MapContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default function Home() {
  const [selectedLinha, setSelectedLinha] = useState<Array<string>>([]);

  if (selectedLinha.length === 0) {
    return <InitialSearch onSearch={setSelectedLinha} />;
  }

  return (
    <BusMap
      onClearSelectedLinha={() => setSelectedLinha([])}
      selectedLinha={selectedLinha}
    />
  );
}
