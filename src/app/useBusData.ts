/* eslint-disable @typescript-eslint/no-explicit-any */
// types.ts
type BusData = {
  id: string;
  linha: string;
  latitude: number;
  longitude: number;
  velocidade: number;
  timestamp: string;
  sentido: string;
};

// api.ts
const DATARIO_URL = "https://dados.mobilidade.rio/gps/sppo";

// Função para formatar a data no formato "AAAA-MM-DD+HH:MM:SS"
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}+${hours}:${minutes}:${seconds}`;
}

// Função para buscar os dados dos ônibus com os filtros de data
export async function fetchBusData(): Promise<BusData[]> {
  // Obtendo a hora atual
  const now = new Date();

  // Subtraindo 20 segundos
  now.setSeconds(now.getSeconds() - 20);

  // Formatando a data
  const dataInicialFormatted = formatDate(now);
  const dataFinalFormatted = formatDate(now);

  // Montando a URL com os filtros
  const url = `${DATARIO_URL}?dataInicial=${dataInicialFormatted}&dataFinal=${dataFinalFormatted}`;

  const response = await fetch(url);

  // Verifica se a resposta foi bem-sucedida
  if (!response.ok) {
    throw new Error("Erro ao carregar dados");
  }

  const data = await response.json();

  // const linhas = ["779", "795", "779", "384", "399", "669", "624"];

  // Filtrando e mapeando os dados
  return (
    data
      // .filter((bus: any) => linhas.includes(bus.linha)) // Exemplo: pegar só os ônibus da linha 857
      .map((bus: any) => ({
        id: bus.ordem,
        linha: bus.linha,
        latitude: Number(bus.latitude),
        longitude: Number(bus.longitude),
        velocidade: bus.velocidade,
        timestamp: bus.datahora,
        sentido: bus.sentido,
      }))
  );
}

// hooks/useBusData.ts
import { useState, useEffect } from "react";

export function useBusData() {
  const [buses, setBuses] = useState<BusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const updateBuses = async () => {
      try {
        const data = await fetchBusData();
        setBuses(data);
        setLoading(false);
      } catch {
        setError("Erro ao carregar dados dos ônibus");
        setLoading(false);
      }
    };

    updateBuses();
    // const interval = setInterval(updateBuses, 30000); // Atualiza a cada 30s

    // return () => clearInterval(interval);
  }, []);

  return { buses, loading, error };
}
