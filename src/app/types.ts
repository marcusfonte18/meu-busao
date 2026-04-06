export type TransportMode = "onibus" | "brt";

/** Retorna o tipo de transporte pela numeração (ex: T47 ou t47 → BRT, 384 → ônibus). */
export function getLineType(numero: string): TransportMode {
  return numero.trim().toUpperCase().startsWith("T") ? "brt" : "onibus";
}

export type BusData = {
  id: string;
  ordem: string;
  linha: string;
  latitude: number;
  longitude: number;
  velocidade: number;
  timestamp: string;
  /** Direção em graus (0 = Norte). Vindo da API BRT como "direcao". */
  heading?: number;
};

interface BusHistory {
  position: [number, number];
  timestamp: Date;
  speed: number;
}

export interface BusHistoryMap {
  [key: string]: BusHistory[];
}
