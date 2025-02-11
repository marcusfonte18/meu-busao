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

      if (allBuses.current.length === 0) {
        allBuses.current = data;
      } else {
        const updatedBusesMap = new Map(
          allBuses.current.map((bus) => [bus.id, bus])
        );
        data.forEach((newBus: BusData) =>
          updatedBusesMap.set(newBus.id, newBus)
        );
        allBuses.current = Array.from(updatedBusesMap.values());
      }

      return allBuses.current;
    },
    refetchInterval: 5000,
  });
}
