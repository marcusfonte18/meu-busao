import { BusData } from "@/app/types";
import prisma from "@/lib/prisma";

import { formatDate, parseCoordinate } from "@/utils";

const MOBILIDADE_RIO_URL = process.env.MOBILIDADE_RIO_URL || "";

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
  const now = new Date();
  now.setSeconds(now.getSeconds() - 20);

  const dataInicialFormatted = formatDate(now);
  const dataFinalFormatted = formatDate(now);

  const url = `${MOBILIDADE_RIO_URL}?dataInicial=${dataInicialFormatted}&dataFinal=${dataFinalFormatted}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error("Erro ao carregar dados");

  return processBusData(await response.json(), linhas);
}
