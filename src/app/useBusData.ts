import { useRef } from "react";

import { useQuery } from "@tanstack/react-query";

export type BusData = {
  id: string;
  ordem: string;
  linha: string;
  latitude: number;
  longitude: number;
  velocidade: number;
  timestamp: string;
};

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
        // Primeira chamada: armazena todos os ônibus
        allBuses.current = data;
      } else {
        // Chamadas subsequentes: mescla os novos dados com os existentes
        const updatedBusesMap = new Map(
          allBuses.current.map((bus) => [bus.id, bus])
        );
        data.forEach((newBus: BusData) =>
          updatedBusesMap.set(newBus.id, newBus)
        ); // Atualiza ou adiciona novos ônibus
        allBuses.current = Array.from(updatedBusesMap.values()); // Converte o Map de volta para array
      }

      return allBuses.current; // Retorna a lista completa de ônibus
    },
    refetchInterval: 5000, // Atualiza a cada 5 segundos
  });
}
