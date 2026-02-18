import { useRef } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { BusData } from "./types";

/**
 * Busca posições de ônibus e BRT via endpoint unificado /api/vehicles.
 * Retorna dados de ambas as fontes (linhas como 13, 384, T47, etc.).
 */
export function useBusData(linhas: Array<string>) {
  const allBuses = useRef<BusData[]>([]);

  return useQuery({
    queryKey: ["buses", linhas.join(",")],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const base = process.env.NEXT_PUBLIC_API_URL || "";
      const queryParams = new URLSearchParams();
      if (linhas.length > 0) queryParams.set("linhas", linhas.join(","));
      const response = await fetch(`${base}/api/vehicles?${queryParams.toString()}`);
      if (!response.ok) throw new Error("Erro ao buscar dados dos veículos");
      const data = await response.json();
      const list = Array.isArray(data) ? data : [];
      const prev = allBuses.current;
      // Evita ônibus "sumirem": não trocar por lista vazia nem por resposta que perdeu linhas inteiras
      const prevLines = new Set(prev.map((b) => b.linha));
      const newLines = new Set(list.map((b) => b.linha));
      const lostLines = [...prevLines].filter((l) => !newLines.has(l));
      const isPartial = list.length > 0 && lostLines.length > 0 && prev.length > 0;
      if (list.length === 0) {
        // Resposta vazia: mantém a anterior
      } else if (isPartial) {
        // Nova resposta não tem mais uma ou mais linhas que tínhamos → provável falha parcial, mantém anterior
      } else {
        allBuses.current = list;
      }
      return allBuses.current;
    },
    refetchInterval: 3000,
  });
}
