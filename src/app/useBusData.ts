import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";

export type BusData = {
  id: string;
  linha: string;
  latitude: number;
  longitude: number;
  velocidade: number;
  timestamp: string;
  sentido: string;
};

export function useBusData(linhas: Array<string>) {
  const isFirstCall = useRef(true);
  const [buses, setBuses] = useState<BusData[]>([]);

  return useQuery({
    queryKey: ["buses", linhas],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (!isFirstCall.current) queryParams.append("latest", "true");

      // Converte o array de linhas para uma string separada por vírgulas
      if (linhas.length > 0) queryParams.append("linhas", linhas.join(","));

      const response = await fetch(`/api/buses?${queryParams.toString()}`);
      if (!response.ok) throw new Error("Erro ao buscar dados");

      const data = await response.json();

      if (isFirstCall.current) {
        setBuses(data);
        isFirstCall.current = false;
      } else if (data.length > 0) {
        setBuses((prev) => {
          const busMap = new Map(prev.map((bus) => [bus.id, bus]));
          data.forEach((newBus: BusData) => busMap.set(newBus.id, newBus));
          return Array.from(busMap.values());
        });
      }

      return buses;
    },
    refetchInterval: 10000,
  });
}
