"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

import { InitialSearch } from "../InitialSearch";
import { BusMap } from "../BusMap";

const STORAGE_KEY = "meu-busao-linhas";

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

function saveLinhas(linhas: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(linhas));
}

export default function MapaPage() {
  const [selectedLine, setSelectedLine] = useState<Array<string>>([]);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const saved = loadSavedLinhas();
    if (saved.length > 0) setSelectedLine(saved);
    setHasHydrated(true);
  }, []);

  const handleSearch = (linhas: string[]) => {
    setSelectedLine(linhas);
    saveLinhas(linhas);
  };

  const handleClear = () => {
    setSelectedLine([]);
    saveLinhas([]);
  };

  if (!hasHydrated) {
    return (
      <div className="w-full min-h-[100dvh] flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (selectedLine.length === 0) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-gray-50 dark:bg-gray-900">
        <div className="p-4">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Voltar ao início
          </Link>
        </div>
        <InitialSearch onSearch={handleSearch} />
      </div>
    );
  }

  return (
    <BusMap
      onClearSelectedLinha={handleClear}
      onTrocarLinhas={() => setSelectedLine([])}
      selectedLinha={selectedLine}
    />
  );
}
