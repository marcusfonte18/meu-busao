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
  <div className="flex justify-center items-center h-[100dvh] bg-gray-100 dark:bg-gray-900">
    <div className="text-center flex flex-col justify-center items-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">
        {mode === "brt" ? "Carregando dados do BRT..." : "Carregando dados dos ônibus..."}
      </p>
    </div>
  </div>
);

function MapFooter() {
  return (
    <footer className="py-2 px-4 flex items-center justify-center gap-6 text-xs text-muted-foreground border-t border-border bg-card">
      <Link href="/" className="hover:text-foreground transition-colors">
        Meu Busão
      </Link>
      <Link href="/termos" className="hover:text-foreground transition-colors">
        Termos
      </Link>
      <Link href="/privacidade" className="hover:text-foreground transition-colors">
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
    if (mode !== "onibus" || selectedLinha.length === 0) {
      setRouteShapes({});
      return;
    }
    const base = process.env.NEXT_PUBLIC_API_URL || "";
    const linhas = selectedLinha.join(",");
    fetch(`${base}/api/route-shapes?linhas=${encodeURIComponent(linhas)}`)
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: RouteShapesMap) => setRouteShapes(data))
      .catch(() => setRouteShapes({}));
  }, [mode, selectedLinha.join(",")]);

  if (isLoading || !buses || buses.length === 0) {
    return <LoadingState mode={mode} />;
  }

  return (
    <div className="w-full h-[100dvh] flex flex-col">
      <Toaster position="top-center" />
      <Card className="flex-1 flex flex-col border-0 shadow-lg m-0 rounded-none md:m-4 md:rounded-lg min-h-0">
        <CardHeader className="pb-2 px-4 pt-4 flex-shrink-0">
          <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-lg sm:text-xl font-bold flex items-center flex-wrap gap-2">
              <Link
                href="/"
                className="flex items-center text-primary hover:opacity-80 transition-opacity"
                title="Voltar ao início"
              >
                <BusFrontIcon className="h-5 w-5 mr-1 flex-shrink-0" />
                <span className="flex-shrink-0">Meu Busão</span>
              </Link>
              <span className="text-muted-foreground font-normal text-sm sm:text-base whitespace-nowrap">
                – {mode === "brt" ? "BRT" : "Ônibus"} {selectedLinha.join(", ")}
              </span>
            </CardTitle>
            <div className="flex gap-2 flex-shrink-0">
              {onTrocarLinhas && (
                <Button
                  onClick={onTrocarLinhas}
                  variant="secondary"
                  className="w-full sm:w-auto"
                  size="sm"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Trocar linhas
                </Button>
              )}
              <Button
                onClick={onClearSelectedLinha}
                variant="destructive"
                className="w-full sm:w-auto"
                size="sm"
              >
                <X className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 min-h-0">
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
