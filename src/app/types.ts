export type TransportMode = "onibus" | "brt";

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
