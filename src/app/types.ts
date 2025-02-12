export type BusData = {
  id: string;
  ordem: string;
  linha: string;
  latitude: number;
  longitude: number;
  velocidade: number;
  timestamp: string;
};

interface BusHistory {
  position: [number, number];
  timestamp: Date;
  speed: number;
}

export interface BusHistoryMap {
  [key: string]: BusHistory[];
}
