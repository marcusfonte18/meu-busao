"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBusData } from "./useBusData";
import { Loader2, X, MapPin } from "lucide-react";
import { BusFrontIcon } from "@/components/BusFrontIcon";
import { BusMarkers, type RouteShapesMap } from "./MapView";
import type { TransportMode } from "./types";
import dynamic from "next/dynamic";
import { Toaster } from "sonner";

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

  if (isLoading || !buses || buses.length === 0) {
    return <LoadingState mode={mode} />;
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col">
      <Toaster position="top-center" />
      <Card className="m-0 flex min-h-0 flex-1 flex-col rounded-none border-border bg-card shadow-xl md:m-4 md:rounded-lg">
        <CardHeader className="flex-shrink-0 border-b border-border bg-card px-4 pt-4 pb-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex flex-wrap items-center gap-2 text-lg font-bold text-foreground sm:text-xl">
              <Link
                href="/"
                className="flex items-center text-primary transition-colors hover:text-primary/80"
                title="Voltar ao início"
              >
                <BusFrontIcon className="mr-1 h-5 w-5 flex-shrink-0" />
                <span className="flex-shrink-0">Meu Busão</span>
              </Link>
              <span className="text-sm font-normal text-muted-foreground sm:text-base whitespace-nowrap">
                – {mode === "brt" ? "BRT" : "Ônibus"} {selectedLinha.join(", ")}
              </span>
            </CardTitle>
            <div className="flex shrink-0 gap-2">
              {onTrocarLinhas && (
                <Button
                  onClick={onTrocarLinhas}
                  variant="outline"
                  size="sm"
                  className="border-border"
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Trocar linhas
                </Button>
              )}
              <Button
                onClick={onClearSelectedLinha}
                variant="destructive"
                size="sm"
              >
                <X className="mr-2 h-4 w-4" />
                Limpar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 p-0">
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
              <BusMarkers buses={buses} routeShapes={routeShapes} />
            </MapContainer>
          </div>
        </CardContent>
      </Card>
      <MapFooter />
    </div>
  );
};

export default BusMap;
