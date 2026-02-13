import { useRef } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { BusData, type TransportMode } from "./types";

export function useBusData(linhas: Array<string>, mode: TransportMode = "onibus") {
  const allBuses = useRef<BusData[]>([]);

  return useQuery({
    queryKey: ["buses", mode, linhas],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const base = process.env.NEXT_PUBLIC_API_URL || "";

      if (mode === "brt") {
        const queryParams = new URLSearchParams();
        if (linhas.length > 0) queryParams.set("linhas", linhas.join(","));
        const response = await fetch(`${base}/api/brt?${queryParams.toString()}`);
        if (!response.ok) throw new Error("Erro ao buscar dados do BRT");
        const list: BusData[] = await response.json();
        if (list.length > 0) allBuses.current = list;
        return allBuses.current;
      }

      const queryParams = new URLSearchParams();
      if (allBuses.current.length > 0) queryParams.append("latest", "true");
      if (linhas.length > 0) queryParams.append("linhas", linhas.join(","));
      const response = await fetch(`${base}/api/buses?${queryParams.toString()}`);
      if (!response.ok) throw new Error("Erro ao buscar dados");

      const data = await response.json();
      const list = Array.isArray(data) ? data : [];
      if (list.length > 0) allBuses.current = list;
      return allBuses.current;
    },
    refetchInterval: 3000,
  });
}
