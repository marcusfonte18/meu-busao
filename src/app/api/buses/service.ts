import { BusData } from "@/app/types";
import prisma from "@/lib/prisma";

import { formatDate, parseCoordinate } from "@/utils";

const MOBILIDADE_RIO_URL =
  process.env.MOBILIDADE_RIO_URL || "https://dados.mobilidade.rio/gps/sppo";

function processBusData(data: any[], linhas: Array<string>): BusData[] {
  const uniqueBuses = new Map<string, BusData>();

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
  const dataFinal = new Date();
  const dataInicial = new Date(dataFinal.getTime() - 20 * 1000);

  const dataInicialFormatted = formatDate(dataInicial);
  const dataFinalFormatted = formatDate(dataFinal);

  const url = `${MOBILIDADE_RIO_URL}?dataInicial=${dataInicialFormatted}&dataFinal=${dataFinalFormatted}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Erro ao carregar dados");

  return processBusData(await response.json(), linhas);
}

/** Sincroniza dados do DataRio (dados.mobilidade.rio) para o banco local. */
export async function syncBusesFromDataRio(): Promise<{ count: number }> {
  const dataFinal = new Date();
  const dataInicial = new Date(dataFinal.getTime() - 1 * 60 * 60 * 1000); // última 1 hora

  const dataInicialFormatted = formatDate(dataInicial);
  const dataFinalFormatted = formatDate(dataFinal);
  const url = `${MOBILIDADE_RIO_URL}?dataInicial=${dataInicialFormatted}&dataFinal=${dataFinalFormatted}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error("Erro ao buscar dados do DataRio");

  const data: Array<{
    ordem: string;
    linha: string;
    latitude: string;
    longitude: string;
    datahora: string;
    velocidade: string;
    datahoraenvio: string;
    datahoraservidor: string;
  }> = await response.json();

  const uniqueByOrdem = new Map(data.map((item) => [item.ordem, item]));
  const rows = Array.from(uniqueByOrdem.values()).map((item) => ({
    ordem: item.ordem,
    linha: item.linha,
    latitude: item.latitude,
    longitude: item.longitude,
    datahora: new Date(parseInt(item.datahora, 10)),
    velocidade: item.velocidade,
    datahoraenvio: new Date(parseInt(item.datahoraenvio, 10)),
    datahoraservidor: new Date(parseInt(item.datahoraservidor, 10)),
  }));

  await prisma.bus.deleteMany({});
  if (rows.length > 0) {
    await prisma.bus.createMany({ data: rows });
  }

  return { count: rows.length };
}
