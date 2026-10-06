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
      sentido: bus.sentido ?? undefined,
      routeId: bus.route_id ?? undefined,
      tripId: bus.trip_id ?? undefined,
      shapeId: bus.shape_id ?? undefined,
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

    // DataRio SPPO envia datetime no horário de Brasília com sufixo Z indevido
    const parseDataRioDate = (val: any) => {
      if (!val) return new Date();
      if (typeof val === "string" && val.endsWith("Z")) {
        return new Date(val.replace(/Z$/, "-03:00"));
      }
      if (typeof val === "string" && /^\d+$/.test(val)) {
        return new Date(parseInt(val, 10));
      }
      return new Date(val);
    };

    const datahora = parseDataRioDate(item.datetime || item.datahora);
    const datahoraenvio = parseDataRioDate(
      item.datetime_envio || item.datahoraenvio
    );
    const datahoraservidor = parseDataRioDate(
      item.datetime_servidor || item.datahoraservidor
    );

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
