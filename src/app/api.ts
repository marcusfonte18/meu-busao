/* eslint-disable @typescript-eslint/no-explicit-any */
import prisma from "@/lib/prisma";
import { BusData } from "./useBusData";

const DATARIO_URL = "https://dados.mobilidade.rio/gps/sppo";

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}+${hours}:${minutes}:${seconds}`;
}

function parseCoordinate(value?: string): number {
  if (!value) return 0;
  const parsed = parseFloat(value.replace(",", "."));
  return isNaN(parsed) ? 0 : parsed;
}

// Processa os dados da API
function processBusData(data: any[], linhas: Array<string>): BusData[] {
  const uniqueBuses = new Map<string, BusData>();

  console.log("processBusData", { tamanho: data.length, data: data[0] });

  data.forEach((bus) => {
    if (!linhas.includes(bus.linha)) return;

    uniqueBuses.set(bus.ordem, {
      id: bus?.id ? bus.id : bus.ordem,
      ordem: bus.ordem,
      linha: bus.linha,
      latitude: parseCoordinate(bus.latitude),
      longitude: parseCoordinate(bus.longitude),
      velocidade: bus.velocidade,
      timestamp: bus.datahora,
    });
  });

  return Array.from(uniqueBuses.values());
}

export async function fetchBusData(linhas: Array<string>): Promise<BusData[]> {
  const buses = await prisma.bus.findMany({
    where: {
      linha: {
        in: linhas,
      },
    },
  });

  return processBusData(buses, linhas);
}

export async function fetchLast20SecondsBusData(
  linhas: Array<string>
): Promise<BusData[]> {
  const now = new Date();
  now.setSeconds(now.getSeconds() - 20);

  // Formatando a data
  const dataInicialFormatted = formatDate(now);
  const dataFinalFormatted = formatDate(now);

  // const timestamp = now.toISOString().replace("T", "+").slice(0, 19);
  const url = `${DATARIO_URL}?dataInicial=${dataInicialFormatted}&dataFinal=${dataFinalFormatted}`;
  console.log(url);

  const response = await fetch(url);
  if (!response.ok) throw new Error("Erro ao carregar dados");

  return processBusData(await response.json(), linhas);
}
