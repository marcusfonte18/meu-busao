import { BusData } from "@/app/types";
import prisma from "@/lib/prisma";

import { formatDate, formatDateBrazil, parseCoordinate } from "@/utils";

const MOBILIDADE_RIO_URL = "https://dados.mobilidade.rio/gps/sppo";

function processBusData(data: any[], linhas: Array<string>): BusData[] {
  const uniqueBuses = new Map<string, BusData>();

  data.forEach((bus) => {
    const linha = String(bus.linha || bus.servico || "").trim();
    if (!linhas.includes(linha)) return;

    const ordem = String(bus.ordem || bus.id_veiculo || "");
    const vel =
      typeof bus.velocidade === "number"
        ? bus.velocidade
        : parseFloat(bus.velocidade) || 0;

    let timestampStr = "";
    if (bus.datahora instanceof Date) {
      timestampStr = bus.datahora.toISOString();
    } else if (bus.timestamp instanceof Date) {
      timestampStr = bus.timestamp.toISOString();
    } else if (bus.datahora) {
      timestampStr = String(bus.datahora);
    } else if (bus.datetime) {
      timestampStr = String(bus.datetime);
    } else {
      timestampStr = new Date().toISOString();
    }

    let heading: number | undefined = undefined;
    if (bus.direcao != null && !Number.isNaN(Number(bus.direcao))) {
      heading = Number(bus.direcao);
    }

    uniqueBuses.set(ordem, {
      id: bus?.id ? String(bus.id) : ordem,
      ordem,
      linha,
      latitude: parseCoordinate(String(bus.latitude)),
      longitude: parseCoordinate(String(bus.longitude)),
      velocidade: Math.round(vel),
      timestamp: timestampStr,
      heading,
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

  const dataInicialFormatted = formatDateBrazil(dataInicial);
  const dataFinalFormatted = formatDateBrazil(dataFinal);

  const url = `${MOBILIDADE_RIO_URL}?dataInicial=${dataInicialFormatted}&dataFinal=${dataFinalFormatted}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/115.0",
    },
  });
  if (!response.ok) throw new Error("Erro ao carregar dados");

  const raw = await response.json();
  const items = Array.isArray(raw) ? raw : [];
  return processBusData(items, linhas);
}

/** Sincroniza dados do DataRio (dados.mobilidade.rio) para o banco local. */
export async function syncBusesFromDataRio(): Promise<{ count: number }> {
  const dataFinal = new Date();
  const dataInicial = new Date(dataFinal.getTime() - 2 * 60 * 1000); // Janela de 2 minutos (tempo real)

  // API espera janela em horário de Brasília
  const dataInicialFormatted = formatDateBrazil(dataInicial);
  const dataFinalFormatted = formatDateBrazil(dataFinal);
  const url = `${MOBILIDADE_RIO_URL}?dataInicial=${dataInicialFormatted}&dataFinal=${dataFinalFormatted}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/115.0",
    },
  });
  if (!response.ok) throw new Error("Erro ao buscar dados do DataRio");

  const data: Array<any> = await response.json();

  const uniqueByOrdem = new Map<string, any>();
  for (const item of data) {
    const ordem = item.id_veiculo || item.ordem;
    if (!ordem) continue;
    uniqueByOrdem.set(String(ordem), item);
  }

  const rows = Array.from(uniqueByOrdem.values()).map((item) => {
    const ordem = String(item.id_veiculo || item.ordem);
    const linha = String(item.servico || item.linha || "").trim();
    let direcao: number | null = null;
    if (item.direcao != null && !Number.isNaN(Number(item.direcao))) {
      direcao = Number(item.direcao);
    }

    const datahora = item.datetime
      ? new Date(item.datetime)
      : item.datahora
      ? new Date(parseInt(item.datahora, 10))
      : new Date();

    const datahoraenvio = item.datetime_envio
      ? new Date(item.datetime_envio)
      : item.datahoraenvio
      ? new Date(parseInt(item.datahoraenvio, 10))
      : datahora;

    const datahoraservidor = item.datetime_servidor
      ? new Date(item.datetime_servidor)
      : item.datahoraservidor
      ? new Date(parseInt(item.datahoraservidor, 10))
      : datahora;

    return {
      ordem,
      linha,
      latitude: String(item.latitude),
      longitude: String(item.longitude),
      datahora,
      velocidade: String(item.velocidade ?? 0),
      datahoraenvio,
      datahoraservidor,
      timestamp: new Date(),
      direcao,
    };
  });

  await prisma.bus.deleteMany({});
  if (rows.length > 0) {
    for (let i = 0; i < rows.length; i += 1000) {
      await prisma.bus.createMany({ data: rows.slice(i, i + 1000) });
    }
  }

  return { count: rows.length };
}
