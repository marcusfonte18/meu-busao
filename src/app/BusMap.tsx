"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useBusData } from "./useBusData";
import { Loader2 } from "lucide-react";
import {
  type RouteShapesMap,
  type RouteStopsMap,
  type SelectedDirectionsByLine,
  type BusHistoryMap,
  formatLastUpdate,
  calculatePolyOrderSwapped,
  routeShapesToGeoJson,
  routeStopsToGeoJson,
  busesToGeoJson,
} from "@/lib/drivers";
import { MapLibreView } from "./MapLibreView";
import { BusInfoPanel } from "@/components/bus-tracker/BusInfoPanel";
import { MapHeader } from "@/components/bus-tracker/MapHeader";
import { getLineColor, registerLines } from "@/lib/line-colors";
import { getApiBase } from "@/lib/utils";
import { getLineType, type TransportMode } from "./types";

/** Converte nome da linha (ex: "Pavuna - Passeio") em labels dos sentidos. */
function parseDirectionLabels(nome: string): { ida: string; volta: string } {
  const parts = nome
    .split(/\s*[-–/]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return {
      ida: `${parts[0]} → ${parts[1]}`,
      volta: `${parts[1]} → ${parts[0]}`,
    };
  }
  return { ida: "Ida", volta: "Volta" };
}

const LoadingState = ({ selectedLinha }: { selectedLinha: string[] }) => {
  const hasOnibus = selectedLinha.some((l) => getLineType(l) === "onibus");
  const hasBrt = selectedLinha.some((l) => getLineType(l) === "brt");
  const label =
    hasOnibus && hasBrt
      ? "Carregando dados dos ônibus e BRT..."
      : hasBrt
        ? "Carregando dados do BRT..."
        : "Carregando dados dos ônibus...";
  return (
    <div className="relative flex h-[100dvh] items-center justify-center bg-background overflow-hidden">
      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">{label}</p>
      </div>
    </div>
  );
};

function MapFooter() {
  return (
    <footer className="flex items-center justify-center gap-6 border-t border-border bg-card/50 px-4 py-2 text-xs text-muted-foreground">
      <Link href="/" className="transition-colors hover:text-foreground">
        Meu Busão
      </Link>
      <Link href="/termos" className="transition-colors hover:text-foreground">
        Termos
      </Link>
      <Link
        href="/privacidade"
        className="transition-colors hover:text-foreground"
      >
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
  favoritos = [],
  onToggleFavorito,
}: {
  mode?: TransportMode;
  selectedLinha: Array<string>;
  onClearSelectedLinha: () => void;
  onRemoveLine?: (linha: string) => void;
  onTrocarLinhas?: () => void;
  onBusInfoChange?: (
    info: {
      lineNumber: string;
      destination: string;
      speed: number;
      heading: number;
      headingLabel: string;
      lastUpdate: string;
    } | null,
  ) => void;
  initialCenter?: [number, number] | { lat: number; lng: number };
  favoritos?: string[];
  onToggleFavorito?: (numero: string) => void;
}) => {
  const { data: buses, isLoading, dataUpdatedAt } = useBusData(selectedLinha);
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    if (!dataUpdatedAt) return;
    const update = () => {
      setSecondsAgo(Math.max(0, Math.floor((Date.now() - dataUpdatedAt) / 1000)));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [dataUpdatedAt]);

  const [routeShapes, setRouteShapes] = useState<RouteShapesMap>({});
  const [routeStops, setRouteStops] = useState<RouteStopsMap>({});
  const [busHistory, setBusHistory] = useState<BusHistoryMap>({});
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [selectedDirectionsByLine, setSelectedDirectionsByLine] =
    useState<SelectedDirectionsByLine>({});
  const [lineDirectionLabels, setLineDirectionLabels] = useState<
    Record<string, { ida: string; volta: string }>
  >({});
  const center: [number, number] = Array.isArray(initialCenter)
    ? initialCenter
    : [initialCenter.lat, initialCenter.lng];

  // Histórico de posições para cálculo do heading quando não fornecido pela API
  useEffect(() => {
    if (!buses || buses.length === 0) return;
    setBusHistory((prev) => {
      const next = { ...prev };
      for (const bus of buses) {
        if (!next[bus.id]) next[bus.id] = [];
        const maxRecords = 30;
        next[bus.id] = [
          ...next[bus.id].slice(-maxRecords),
          {
            position: [bus.latitude, bus.longitude],
            timestamp: new Date(),
            speed: Number(bus.velocidade) || 0,
          },
        ];
      }
      return next;
    });
  }, [buses]);

  useEffect(() => {
    if (selectedLinha.length === 0) {
      setRouteShapes({});
      return;
    }
    const base = getApiBase();
    const linhas = selectedLinha.join(",");
    fetch(`${base}/api/route-shapes?linhas=${encodeURIComponent(linhas)}`)
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: RouteShapesMap) => setRouteShapes(data))
      .catch(() => setRouteShapes({}));
  }, [selectedLinha.join(",")]);

  useEffect(() => {
    if (selectedLinha.length === 0) {
      setRouteStops({});
      return;
    }
    const base = getApiBase();
    const linhas = selectedLinha.join(",");
    fetch(`${base}/api/route-stops?linhas=${encodeURIComponent(linhas)}`)
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: RouteStopsMap) => setRouteStops(data))
      .catch(() => setRouteStops({}));
  }, [selectedLinha.join(",")]);

  useEffect(() => {
    if (selectedLinha.length === 0) {
      setLineDirectionLabels({});
      return;
    }
    const base = getApiBase();
    const acc: Record<string, { ida: string; volta: string }> = {};
    Promise.all(
      selectedLinha.map((numero) => {
        const modo = getLineType(numero);
        return fetch(
          `${base}/api/lines?q=${encodeURIComponent(numero)}&modo=${modo}&limit=30`,
        )
          .then((res) => (res.ok ? res.json() : { lines: [] }))
          .then((data: { lines: { numero: string; nome: string }[] }) => {
            const line =
              data.lines?.find((l) => l.numero === numero) ?? data.lines?.[0];
            if (line?.nome) acc[numero] = parseDirectionLabels(line.nome);
            else acc[numero] = { ida: "Ida", volta: "Volta" };
          });
      }),
    ).then(() => setLineDirectionLabels(acc));
  }, [selectedLinha.join(",")]);

  useEffect(() => {
    setSelectedDirectionsByLine((prev) => {
      const next: SelectedDirectionsByLine = {};
      for (const n of selectedLinha) {
        next[n] = prev[n] ?? { ida: true, volta: true };
      }
      return next;
    });
  }, [selectedLinha.join(",")]);

  // Painel de informações do ônibus selecionado
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
      heading >= 337.5 || heading < 22.5
        ? "Norte"
        : heading >= 22.5 && heading < 67.5
          ? "Nordeste"
          : heading >= 67.5 && heading < 112.5
            ? "Leste"
            : heading >= 112.5 && heading < 157.5
              ? "Sudeste"
              : heading >= 157.5 && heading < 202.5
                ? "Sul"
                : heading >= 202.5 && heading < 247.5
                  ? "Sudoeste"
                  : heading >= 247.5 && heading < 292.5
                    ? "Oeste"
                    : "Noroeste";

    onBusInfoChange?.({
      lineNumber: bus.linha,
      destination: `Linha ${bus.linha}`,
      speed: Math.round(Number(bus.velocidade) || 0),
      heading,
      headingLabel,
      lastUpdate: formatLastUpdate(bus.timestamp),
    });
  }, [selectedBusId, buses, onBusInfoChange]);

  // GeoJSON dos dados para o MapLibre
  const polyOrderSwapped = useMemo(
    () => calculatePolyOrderSwapped(routeShapes, selectedLinha),
    [routeShapes, selectedLinha],
  );

  const routesGeoJson = useMemo(
    () =>
      routeShapesToGeoJson(
        routeShapes,
        polyOrderSwapped,
        selectedDirectionsByLine,
      ),
    [routeShapes, polyOrderSwapped, selectedDirectionsByLine],
  );

  const stopsGeoJson = useMemo(
    () =>
      routeStopsToGeoJson(
        routeStops,
        routeShapes,
        polyOrderSwapped,
        selectedDirectionsByLine,
      ),
    [routeStops, routeShapes, polyOrderSwapped, selectedDirectionsByLine],
  );

  const vehiclesGeoJson = useMemo(
    () =>
      busesToGeoJson(
        buses || [],
        routeShapes,
        polyOrderSwapped,
        selectedDirectionsByLine,
        selectedBusId,
        busHistory,
      ),
    [
      buses,
      routeShapes,
      polyOrderSwapped,
      selectedDirectionsByLine,
      selectedBusId,
      busHistory,
    ],
  );

  if (isLoading || !buses || buses.length === 0) {
    return <LoadingState selectedLinha={selectedLinha} />;
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
          favoritos={favoritos}
          onToggleFavorito={onToggleFavorito}
        />
        {/* Sentido por linha & Badge de Atualização Ao Vivo */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-2">
          <div className="flex flex-col gap-2">
            {selectedLinha.map((numero) => {
              const labels = lineDirectionLabels[numero];
              const dirs = selectedDirectionsByLine[numero] ?? {
                ida: true,
                volta: true,
              };
              const { bg, text } = getLineColor(numero);
              const idaLabel = labels?.ida ?? "Ida";
              const voltaLabel = labels?.volta ?? "Volta";
              return (
                <div key={numero} className="flex flex-wrap items-center gap-2">
                  {selectedLinha.length > 1 && (
                    <span
                      className={`inline-flex shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${bg} ${text}`}
                    >
                      {numero}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedDirectionsByLine((prev) => {
                        const cur = prev[numero] ?? { ida: true, volta: true };
                        return { ...prev, [numero]: { ...cur, ida: !cur.ida } };
                      })
                    }
                    className={`max-w-[min(100%,18rem)] truncate rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      dirs.ida
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    }`}
                    title={idaLabel}
                  >
                    {idaLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedDirectionsByLine((prev) => {
                        const cur = prev[numero] ?? { ida: true, volta: true };
                        return {
                          ...prev,
                          [numero]: { ...cur, volta: !cur.volta },
                        };
                      })
                    }
                    className={`max-w-[min(100%,18rem)] truncate rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      dirs.volta
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    }`}
                    title={voltaLabel}
                  >
                    {voltaLabel}
                  </button>
                </div>
              );
            })}
          </div>
          {selectedLinha.length > 0 && (
            <div className="flex items-center gap-1.5 self-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span>Ao vivo</span>
              <span className="text-muted-foreground/50">•</span>
              <span className="text-muted-foreground">
                {secondsAgo <= 2 ? "agora" : `${secondsAgo}s atrás`}
              </span>
            </div>
          )}
        </div>
        <CardContent className="relative min-h-0 flex-1 p-0">
          <div className="h-full w-full overflow-hidden rounded-b-none md:rounded-b-lg">
            <MapLibreView
              initialCenter={center}
              initialZoom={13}
              routesGeoJson={routesGeoJson}
              stopsGeoJson={stopsGeoJson}
              vehiclesGeoJson={vehiclesGeoJson}
              selectedBusId={selectedBusId}
              onSelectBus={setSelectedBusId}
            />
          </div>
          {selectedBusId &&
            buses &&
            (() => {
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
