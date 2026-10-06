import type { BusData } from "@/app/types";
import prisma from "@/lib/prisma";

const BRT_GPS_URL = "https://dados.mobilidade.rio/gps/brt";

interface BRTVeiculo {
  codigo: string;
  placa?: string;
  linha: string;
  latitude: number;
  longitude: number;
  dataHora: number;
  velocidade: number;
  direcao?: number | string;
  trajeto?: string;
}

/** Busca dados do BRT no banco (sync já atualiza em intervalo). */
export async function fetchBrtData(linhas: string[]): Promise<BusData[]> {
  const where =
    linhas.length > 0 ? { linha: { in: linhas } } : {};
  const list = await prisma.brt.findMany({
    where,
    select: {
      codigo: true,
      placa: true,
      linha: true,
      latitude: true,
      longitude: true,
      velocidade: true,
      direcao: true,
      dataHora: true,
      sentido: true,
      route_id: true,
      trip_id: true,
      shape_id: true,
    },
  });

  return list.map((r) => {
    const bus: BusData = {
      id: r.codigo,
      ordem: r.placa ?? r.codigo,
      linha: r.linha,
      latitude: r.latitude,
      longitude: r.longitude,
      velocidade: r.velocidade,
      timestamp: r.dataHora.toISOString(),
    };
    if (r.direcao != null) bus.heading = r.direcao;
    if (r.sentido != null) bus.sentido = r.sentido;
    if (r.route_id != null) bus.routeId = r.route_id;
    if (r.trip_id != null) bus.tripId = r.trip_id;
    if (r.shape_id != null) bus.shapeId = r.shape_id;
    return bus;
  });
}

/** Sincroniza dados do BRT (dados.mobilidade.rio/gps/brt) para o banco. */
export async function syncBrtFromDataRio(): Promise<{ count: number }> {
  const response = await fetch(BRT_GPS_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MeuBusao/1.0)",
    },
  });
  if (!response.ok) throw new Error("Erro ao buscar dados do BRT");

  const json = await response.json();
  const veiculos: BRTVeiculo[] = Array.isArray(json?.veiculos) ? json.veiculos : [];

  const rows = veiculos.map((v) => {
    const lat = Number(v.latitude);
    const lng = Number(v.longitude);
    let direcao: number | null = null;
    if (v.direcao !== undefined && v.direcao !== null && v.direcao !== " ") {
      const num = typeof v.direcao === "string" ? parseFloat(v.direcao) : v.direcao;
      if (!Number.isNaN(num)) direcao = num;
    }
    return {
      codigo: v.codigo,
      placa: v.placa || null,
      linha: v.linha,
      latitude: Number.isNaN(lat) ? 0 : lat,
      longitude: Number.isNaN(lng) ? 0 : lng,
      dataHora: new Date(v.dataHora),
      velocidade: Number(v.velocidade) || 0,
      direcao,
    };
  });

  await prisma.brt.deleteMany({});
  if (rows.length > 0) {
    await prisma.brt.createMany({ data: rows });
  }
  return { count: rows.length };
}
