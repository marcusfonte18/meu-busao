import { NextResponse } from "next/server";
import { fetchBrtData } from "./service";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const linhasParam = searchParams.get("linhas");
    const linhas = linhasParam ? linhasParam.split(",").map((l) => l.trim()) : [];

    const data = await fetchBrtData(linhas);
    return NextResponse.json(data, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("[brt]", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar dados do BRT",
        message: (error as Error).message,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
