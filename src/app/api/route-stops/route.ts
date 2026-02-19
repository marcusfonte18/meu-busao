import { NextResponse } from "next/server";
import { getRouteStopsFromDb } from "./db";

export const dynamic = "force-dynamic";

/**
 * GET /api/route-stops?linhas=384,399,669
 * Retorna as paradas (pontos de ônibus) das linhas a partir do banco.
 * Popule com: pnpm run seed:route-stops (em dev, com a pasta GTFS).
 * Resposta: { "384": [[lat,lng], ...], "399": [...], ... }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const linhasParam = searchParams.get("linhas");
    const linhas = linhasParam ? linhasParam.split(",").map((l) => l.trim()) : [];
    if (linhas.length === 0) {
      return NextResponse.json({});
    }

    const stops = await getRouteStopsFromDb(linhas);
    return NextResponse.json(stops);
  } catch (error) {
    console.error("[route-stops]", error);
    return NextResponse.json(
      { error: "Erro ao carregar paradas das linhas" },
      { status: 500 }
    );
  }
}
