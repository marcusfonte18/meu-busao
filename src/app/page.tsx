"use client";

import React, { useState, useEffect } from "react";
import { Toaster } from "sonner";

import { resetRegistry } from "@/lib/line-colors";
import { InitialSearch } from "./InitialSearch";
import { BusMap } from "./BusMap";
import { BottomNav } from "@/components/bus-tracker/BottomNav";
import type { TransportMode } from "./types";

const STORAGE_KEY = "meu-busao-linhas";
const STORAGE_MODE_KEY = "meu-busao-mode";
const DEFAULT_CENTER = { lat: -22.9068, lng: -43.1729 } as const;

function loadSavedLinhas(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((l) => typeof l === "string") : [];
  } catch {
    return [];
  }
}

function loadSavedMode(): TransportMode {
  if (typeof window === "undefined") return "onibus";
  const m = localStorage.getItem(STORAGE_MODE_KEY);
  return m === "brt" ? "brt" : "onibus";
}

function saveLinhas(linhas: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(linhas));
}

function saveMode(mode: TransportMode) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_MODE_KEY, mode);
}

export default function HomePage() {
  const [selectedLine, setSelectedLine] = useState<Array<string>>([]);
  const [transportMode, setTransportMode] = useState<TransportMode>("onibus");
  const [hasHydrated, setHasHydrated] = useState(false);
  const [initialCenter, setInitialCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [busInfo, setBusInfo] = useState<{
    lineNumber: string;
    destination: string;
    speed: number;
    heading: number;
    headingLabel: string;
    lastUpdate: string;
  } | null>(null);

  useEffect(() => {
    setSelectedLine(loadSavedLinhas());
    setTransportMode(loadSavedMode());
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setInitialCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 120000, timeout: 15000 }
    );
  }, []);

  const handleSearch = (linhas: string[], mode: TransportMode) => {
    setSelectedLine(linhas);
    setTransportMode(mode);
    saveLinhas(linhas);
    saveMode(mode);
  };

  const handleClear = () => {
    setSelectedLine([]);
    resetRegistry();
    saveLinhas([]);
  };

  if (!hasHydrated) {
    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (selectedLine.length === 0) {
    return (
      <>
        <Toaster position="top-center" richColors theme="light" />
        <div className="flex min-h-[100dvh] flex-col pb-14">
          <InitialSearch mode="onibus" onSearch={handleSearch} />
        </div>
        <BottomNav active="buscar" />
      </>
    );
  }

  return (
    <>
      <Toaster position="top-center" richColors theme="light" />
      <BusMap
        mode={transportMode}
        onClearSelectedLinha={handleClear}
        onRemoveLine={(linha) => {
          const next = selectedLine.filter((l) => l !== linha);
          setSelectedLine(next);
          saveLinhas(next);
        }}
        onTrocarLinhas={() => setSelectedLine([])}
        onBusInfoChange={setBusInfo}
        selectedLinha={selectedLine}
        initialCenter={initialCenter ?? DEFAULT_CENTER}
      />
      <BottomNav
        active="mapa"
        busInfo={busInfo}
        onBuscarClick={() => {
          setSelectedLine([]);
          setBusInfo(null);
          resetRegistry();
          saveLinhas([]);
        }}
      />
    </>
  );
}
