"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useBusData } from "./useBusData";
import { Loader2 } from "lucide-react";
import {
  BusMarkers,
  formatLastUpdate,
  type RouteShapesMap,
  type SelectedDirections,
} from "./MapView";
import { BusInfoPanel } from "@/components/bus-tracker/BusInfoPanel";
import { MapHeader } from "@/components/bus-tracker/MapHeader";
import { registerLines } from "@/lib/line-colors";
import type { TransportMode } from "./types";
import dynamic from "next/dynamic";

/** Converte nome da linha (ex: "Pavuna - Passeio") em labels dos sentidos. */
function parseDirectionLabels(nome: string): { ida: string; volta: string } {
  const parts = nome.split(/\s*[-–/]\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      ida: `${parts[0]} → ${parts[1]}`,
      volta: `${parts[1]} → ${parts[0]}`,
    };
  }
  return { ida: "Ida", volta: "Volta" };
}

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);

const LoadingState = ({ mode }: { mode: TransportMode }) => (
  <div className="relative flex h-[100dvh] items-center justify-center bg-background overflow-hidden">
    <div className="flex flex-col items-center justify-center space-y-4 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">
        {mode === "brt" ? "Carregando dados do BRT..." : "Carregando dados dos ônibus..."}
      </p>
    </div>
  </div>
);

function MapFooter() {
  return (
    <footer className="flex items-center justify-center gap-6 border-t border-border bg-card/50 px-4 py-2 text-xs text-muted-foreground">
      <Link href="/" className="transition-colors hover:text-foreground">
        Meu Busão
      </Link>
      <Link href="/termos" className="transition-colors hover:text-foreground">
        Termos
      </Link>
      <Link href="/privacidade" className="transition-colors hover:text-foreground">
        Privacidade
      </Link>
    </footer>
  );
}

export const BusMap = ({
  mode = "onibus",
  selectedLinha,
  onClearSelectedLinha,
  onRemoveLine,
  onTrocarLinhas,
  onBusInfoChange,
  initialCenter = [-22.9068, -43.1729],
}: {
  mode?: TransportMode;
  selectedLinha: Array<string>;
  onClearSelectedLinha: () => void;
  onRemoveLine?: (linha: string) => void;
  onTrocarLinhas?: () => void;
  onBusInfoChange?: (info: {
    lineNumber: string;
    destination: string;
    speed: number;
    heading: number;
    headingLabel: string;
    lastUpdate: string;
  } | null) => void;
  initialCenter?: [number, number] | { lat: number; lng: number };
}) => {
  const { data: buses, isLoading } = useBusData(selectedLinha, mode);
  const [routeShapes, setRouteShapes] = useState<RouteShapesMap>({});
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [selectedDirections, setSelectedDirections] = useState<SelectedDirections>({
    ida: true,
    volta: true,
  });
  const [lineDirectionLabels, setLineDirectionLabels] = useState<
    Record<string, { ida: string; volta: string }>
  >({});
  const center: [number, number] =
    Array.isArray(initialCenter)
      ? initialCenter
      : [initialCenter.lat, initialCenter.lng];

  useEffect(() => {
    if (selectedLinha.length === 0) {
      setRouteShapes({});
      return;
    }
    const base = process.env.NEXT_PUBLIC_API_URL || "";
    const linhas = selectedLinha.join(",");
    fetch(`${base}/api/route-shapes?linhas=${encodeURIComponent(linhas)}`)
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: RouteShapesMap) => setRouteShapes(data))
      .catch(() => setRouteShapes({}));
  }, [selectedLinha.join(",")]);

  useEffect(() => {
    if (selectedLinha.length === 0) {
      setLineDirectionLabels({});
      return;
    }
    const base = process.env.NEXT_PUBLIC_API_URL || "";
    const acc: Record<string, { ida: string; volta: string }> = {};
    Promise.all(
      selectedLinha.map((numero) =>
        fetch(`${base}/api/lines?q=${encodeURIComponent(numero)}&modo=${mode}&limit=1`)
          .then((res) => (res.ok ? res.json() : { lines: [] }))
          .then((data: { lines: { numero: string; nome: string }[] }) => {
            const line = data.lines?.[0];
            if (line?.nome) acc[numero] = parseDirectionLabels(line.nome);
            else acc[numero] = { ida: "Ida", volta: "Volta" };
          })
      )
    ).then(() => setLineDirectionLabels(acc));
  }, [selectedLinha.join(","), mode]);

  useEffect(() => {
    if (!selectedBusId || !buses) {
      onBusInfoChange?.(null);
      return;
    }
    const bus = buses.find((b) => b.id === selectedBusId);
    if (!bus) {
      onBusInfoChange?.(null);
      return;
    }
    const heading = bus.heading ?? 0;
    const headingLabel =
      heading >= 337.5 || heading < 22.5 ? "Norte" :
      heading >= 22.5 && heading < 67.5 ? "Nordeste" :
      heading >= 67.5 && heading < 112.5 ? "Leste" :
      heading >= 112.5 && heading < 157.5 ? "Sudeste" :
      heading >= 157.5 && heading < 202.5 ? "Sul" :
      heading >= 202.5 && heading < 247.5 ? "Sudoeste" :
      heading >= 247.5 && heading < 292.5 ? "Oeste" : "Noroeste";

    onBusInfoChange?.({
      lineNumber: bus.linha,
      destination: `Linha ${bus.linha}`,
      speed: Math.round(Number(bus.velocidade) || 0),
      heading,
      headingLabel,
      lastUpdate: formatLastUpdate(bus.timestamp),
    });
  }, [selectedBusId, buses, onBusInfoChange]);

  if (isLoading || !buses || buses.length === 0) {
    return <LoadingState mode={mode} />;
  }

  registerLines(selectedLinha);

  return (
    <div className="flex h-[100dvh] w-full flex-col">
      <Card className="m-0 flex min-h-0 flex-1 flex-col rounded-none border-border bg-card shadow-xl md:m-4 md:rounded-lg">
        <MapHeader
          lineNumbers={selectedLinha}
          mode={mode}
          onClear={onClearSelectedLinha}
          onChangeLine={onTrocarLinhas ?? (() => {})}
          onRemoveLine={onRemoveLine}
        />
        {/* Filtro de sentido: ambos selecionados por padrão; clique para alternar */}
        <div className="flex shrink-0 flex-col gap-2 border-b border-border bg-muted/30 px-4 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground shrink-0">Sentido:</span>
            <button
              onClick={() =>
                setSelectedDirections((prev) => ({ ...prev, ida: !prev.ida }))
              }
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedDirections.ida
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-primary/10 hover:text-primary"
              }`}
            >
              Ida
            </button>
            <button
              onClick={() =>
                setSelectedDirections((prev) => ({ ...prev, volta: !prev.volta }))
              }
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedDirections.volta
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-primary/10 hover:text-primary"
              }`}
            >
              Volta
            </button>
            <span className="text-[10px] text-muted-foreground">(aplica a todas as linhas)</span>
          </div>
        
        </div>
        <CardContent className="relative min-h-0 flex-1 p-0">
          <div className="h-full w-full overflow-hidden rounded-b-none md:rounded-b-lg">
            <MapContainer
              center={center}
              zoom={13}
              style={{ height: "100%", width: "100%" }}
              className="z-0"
              zoomControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <BusMarkers
                buses={buses}
                routeShapes={routeShapes}
                mode={mode}
                selectedBus={selectedBusId}
                onSelectBus={setSelectedBusId}
                selectedDirections={selectedDirections}
                selectedLinhas={selectedLinha}
              />
            </MapContainer>
          </div>
          {selectedBusId && buses && (() => {
            const bus = buses.find((b) => b.id === selectedBusId);
            if (!bus) return null;
            const heading = bus.heading ?? 0;
            const speed = Math.round(Number(bus.velocidade) || 0);
            return (
              <div className="absolute bottom-16 left-0 right-0 z-20 flex justify-center px-4">
                <BusInfoPanel
                  lineNumber={bus.linha}
                  destination={`Linha ${bus.linha}`}
                  mode={mode}
                  speed={speed}
                  heading={heading}
                  lastUpdate={formatLastUpdate(bus.timestamp)}
                  onClose={() => setSelectedBusId(null)}
                  selectedLinhas={selectedLinha}
                />
              </div>
            );
          })()}
        </CardContent>
      </Card>
      <MapFooter />
    </div>
  );
};

export default BusMap;
