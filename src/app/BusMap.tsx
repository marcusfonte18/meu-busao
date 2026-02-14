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
  type DirectionFilter,
} from "./MapView";
import { BusInfoPanel } from "@/components/bus-tracker/BusInfoPanel";
import { MapHeader } from "@/components/bus-tracker/MapHeader";
import type { TransportMode } from "./types";
import dynamic from "next/dynamic";
import { Toaster } from "sonner";

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
  onTrocarLinhas,
  initialCenter = [-22.9068, -43.1729],
}: {
  mode?: TransportMode;
  selectedLinha: Array<string>;
  onClearSelectedLinha: () => void;
  onTrocarLinhas?: () => void;
  initialCenter?: [number, number] | { lat: number; lng: number };
}) => {
  const { data: buses, isLoading } = useBusData(selectedLinha, mode);
  const [routeShapes, setRouteShapes] = useState<RouteShapesMap>({});
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>("all");
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

  if (isLoading || !buses || buses.length === 0) {
    return <LoadingState mode={mode} />;
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col">
      <Toaster position="top-center" />
      <Card className="m-0 flex min-h-0 flex-1 flex-col rounded-none border-border bg-card shadow-xl md:m-4 md:rounded-lg">
        <MapHeader
          lineNumbers={selectedLinha}
          mode={mode}
          onClear={onClearSelectedLinha}
          onChangeLine={onTrocarLinhas ?? (() => {})}
        />
        {/* Filtro de sentido: ver todos ou só ida/volta */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-muted/30 px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground">Sentido:</span>
          {(() => {
            const firstLine = selectedLinha[0];
            const labels = firstLine ? lineDirectionLabels[firstLine] : null;
            const idaLabel = labels?.ida ?? "Ida";
            const voltaLabel = labels?.volta ?? "Volta";
            return (
              <>
                <button
                  onClick={() => setDirectionFilter("all")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    directionFilter === "all"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setDirectionFilter("ida")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    directionFilter === "ida"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  }`}
                  title={idaLabel}
                >
                  {idaLabel}
                </button>
                <button
                  onClick={() => setDirectionFilter("volta")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    directionFilter === "volta"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  }`}
                  title={voltaLabel}
                >
                  {voltaLabel}
                </button>
              </>
            );
          })()}
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
                directionFilter={directionFilter}
              />
            </MapContainer>
          </div>
          {selectedBusId && buses && (() => {
            const bus = buses.find((b) => b.id === selectedBusId);
            if (!bus) return null;
            const heading = bus.heading ?? 0;
            const speed = Math.round(Number(bus.velocidade) || 0);
            return (
              <div className="absolute bottom-20 left-0 right-0 z-20 flex justify-center px-4">
                <BusInfoPanel
                  lineNumber={bus.linha}
                  destination={`Linha ${bus.linha}`}
                  mode={mode}
                  speed={speed}
                  heading={heading}
                  lastUpdate={formatLastUpdate(bus.timestamp)}
                  onClose={() => setSelectedBusId(null)}
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
