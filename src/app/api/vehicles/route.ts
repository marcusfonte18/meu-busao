import { NextResponse } from "next/server";
import { fetchBusData } from "../buses/service";
import { fetchBrtData } from "../brt/service";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * GET /api/vehicles?linhas=13,384,T47
 * Retorna posições de ônibus e BRT para as linhas informadas.
 * Consulta as duas fontes (ônibus e BRT) e mescla os resultados.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const linhasParam = searchParams.get("linhas");
    const linhas = linhasParam
      ? linhasParam.split(",").map((l) => l.trim()).filter(Boolean)
      : [];

    if (linhas.length === 0) {
      return NextResponse.json([], { status: 200, headers: corsHeaders });
    }

    const [onibusList, brtList] = await Promise.all([
      fetchBusData(linhas).catch(() => []),
      fetchBrtData(linhas).catch(() => []),
    ]);

    const merged = [...onibusList, ...brtList];

    return NextResponse.json(merged, { status: 200, headers: corsHeaders });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Erro ao buscar dados dos veículos",
        message: (error as Error).message,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
