import { NextResponse } from "next/server";
import { getRouteShapesForLines } from "./gtfs";

export const dynamic = "force-dynamic";

/**
 * GET /api/route-shapes?linhas=399,669
 * Retorna os traçados oficiais (GTFS) das linhas pedidas para desenhar no mapa.
 * Resposta: { "399": [[[lat,lng],...], ...], "669": [...] }
 * Cada linha pode ter um ou mais polylines (ex.: ida e volta).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const linhasParam = searchParams.get("linhas");
    const linhas = linhasParam ? linhasParam.split(",").map((l) => l.trim()) : [];
    if (linhas.length === 0) {
      return NextResponse.json({});
    }
    const shapes = await getRouteShapesForLines(linhas);
    return NextResponse.json(shapes);
  } catch (error) {
    console.error("[route-shapes]", error);
    return NextResponse.json(
      { error: "Erro ao carregar traçados das linhas" },
      { status: 500 }
    );
  }
}
