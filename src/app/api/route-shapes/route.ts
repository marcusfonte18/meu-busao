import { NextResponse } from "next/server";
import { getRouteShapesFromDb } from "./db";
import { getRouteShapesForLines } from "./gtfs";

export const dynamic = "force-dynamic";

/**
 * GET /api/route-shapes?linhas=399,669
 * Retorna os traçados oficiais das linhas para desenhar no mapa.
 * Lê primeiro do banco (route_shapes); linhas faltando vêm do GTFS local se a pasta existir.
 * Resposta: { "399": [[[lat,lng],...], ...], "669": [...] }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const linhasParam = searchParams.get("linhas");
    const linhas = linhasParam ? linhasParam.split(",").map((l) => l.trim()) : [];
    if (linhas.length === 0) {
      return NextResponse.json({});
    }

    const fromDb = await getRouteShapesFromDb(linhas);
    const missing = linhas.filter((l) => !fromDb[l]);
    const fromGtfs =
      missing.length > 0 ? await getRouteShapesForLines(missing) : {};

    const shapes = { ...fromGtfs, ...fromDb };
    return NextResponse.json(shapes);
  } catch (error) {
    console.error("[route-shapes]", error);
    return NextResponse.json(
      { error: "Erro ao carregar traçados das linhas" },
      { status: 500 }
    );
  }
}
