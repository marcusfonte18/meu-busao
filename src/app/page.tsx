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

const getColorForLinha = (linha: string) => {
  // Função para gerar um hash único a partir da linha
  let hash = 0;
  for (let i = 0; i < linha.length; i++) {
    hash = ((hash * 33) ^ linha.charCodeAt(i)) & 0xffffff; // Usando um número primo maior para dispersão
  }

  // Garantir que o valor da cor esteja bem distribuído
  const color1 = (hash >> 16) & 0xff; // Primeira parte do valor RGB
  const color2 = (hash >> 8) & 0xff; // Segunda parte
  const color3 = hash & 0xff; // Terceira parte

  // Gerar uma cor de maneira mais diversificada
  return `#${color1.toString(16).padStart(2, "0")}${color2
    .toString(16)
    .padStart(2, "0")}${color3.toString(16).padStart(2, "0")}`;
};

const getBusIcon = (linha: string) => {
  if (typeof window === undefined) return;

  const linhaColor = getColorForLinha(linha); // Gera uma cor consistente para a linha

  return new L.DivIcon({
    className: "bus-icon",
    html: `
      <div style="background-color: ${linhaColor}; color: white; width: 32px; height: 32px; border-radius: 50%; position: relative; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold;">
        ${linha}
        <div style="position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%); width: 12px; height: 12px; background-color: ${linhaColor}; border-radius: 50%;"></div>
      </div>`,
    iconSize: [32, 32], // Tamanho do ícone
    iconAnchor: [16, 32], // Ajusta o ponto de ancoragem para a parte inferior do ícone
    popupAnchor: [0, -32], // Ajusta a posição do popup
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

  // Componente de Loading Personalizado com Tailwind
  if (isLoading || !buses) {
    return (
      <div className="flex justify-center items-center h-screen bg-black">
        <div className="text-center flex flex-col justify-center items-center ">
          {/* Spinner com Tailwind */}
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-white">Carregando...</p> {/* Texto branco */}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl lg:text-2xl">
            Mapa de Ônibus em Tempo Real - Linhas {selectedLinha.join(", ")}
          </CardTitle>
          <div className="mt-4">
            <Button
              onClick={onClearSelectedLinha}
              className="bg-red-500 text-white w-auto px-6 py-2"
            >
              Limpar Linhas
            </Button>
          </div>
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
