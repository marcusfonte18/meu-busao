import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";

import { BusData } from "./types";

export function useBusData(linhas: Array<string>) {
  const allBuses = useRef<BusData[]>([]);

  return useQuery({
    queryKey: ["buses", linhas],
    queryFn: async () => {
      const queryParams = new URLSearchParams();

      if (allBuses.current.length > 0) {
        queryParams.append("latest", "true");
      }

      if (linhas.length > 0) {
        queryParams.append("linhas", linhas.join(","));
      }

      const response = await fetch(`/api/buses?${queryParams.toString()}`);
      if (!response.ok) throw new Error("Erro ao buscar dados");

      const data = await response.json();
      // API já retorna a lista completa atual; substituir sempre (não somar)
      allBuses.current = Array.isArray(data) ? data : [];
      return allBuses.current;
    },
    refetchInterval: 3000,
  });
}
