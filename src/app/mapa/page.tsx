"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

import { InitialSearch } from "../InitialSearch";
import { BusMap } from "../BusMap";
import { SearchHeroBg } from "@/components/SearchHeroBg";
import type { TransportMode } from "../types";

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

export default function MapaPage() {
  const [selectedLine, setSelectedLine] = useState<Array<string>>([]);
  const [transportMode, setTransportMode] = useState<TransportMode>("onibus");
  const [hasHydrated, setHasHydrated] = useState(false);
  const [initialCenter, setInitialCenter] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    setSelectedLine(loadSavedLinhas());
    setTransportMode(loadSavedMode());
    setHasHydrated(true);
  }, []);

  // Pede geolocalização assim que a página do mapa carrega (na tela de seleção de linhas)
  // para o mapa já abrir na posição certa quando o usuário escolher as linhas
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
    saveLinhas([]);
  };

  if (!hasHydrated) {
    return (
      <div className="relative w-full min-h-[100dvh] flex items-center justify-center search-hero-bg overflow-hidden">
        <SearchHeroBg />
        <div className="relative z-10 animate-pulse text-white/80">Carregando...</div>
      </div>
    );
  }

  if (selectedLine.length === 0) {
    return (
      <div className="min-h-[100dvh] flex flex-col relative">
        <div className="absolute top-4 left-4 z-20">
          <Link
            href="/"
            className="text-sm text-white/80 hover:text-white transition-colors inline-flex items-center gap-1"
          >
            ← Voltar ao início
          </Link>
        </div>
        <InitialSearch mode="onibus" onSearch={handleSearch} />
      </div>
    );
  }

  return (
    <BusMap
      mode={transportMode}
      onClearSelectedLinha={handleClear}
      onTrocarLinhas={() => setSelectedLine([])}
      selectedLinha={selectedLine}
      initialCenter={initialCenter ?? DEFAULT_CENTER}
    />
  );
}
