import { useRef } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { BusData } from "./types";

export function useBusData(linhas: Array<string>) {
  const allBuses = useRef<BusData[]>([]);

  return useQuery({
    queryKey: ["buses", linhas],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const queryParams = new URLSearchParams();

      if (allBuses.current.length > 0) {
        queryParams.append("latest", "true");
      }

      if (linhas.length > 0) {
        queryParams.append("linhas", linhas.join(","));
      }

      const base = process.env.NEXT_PUBLIC_API_URL || "";
      const response = await fetch(`${base}/api/buses?${queryParams.toString()}`);
      if (!response.ok) throw new Error("Erro ao buscar dados");

      const data = await response.json();
      const list = Array.isArray(data) ? data : [];
      // Só substitui quando vier dados; se vier vazio, mantém o último para não deixar a tela em branco
      if (list.length > 0) {
        allBuses.current = list;
      }
      return allBuses.current;
    },
    refetchInterval: 3000,
  });
}
