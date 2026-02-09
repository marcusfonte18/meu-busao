import { NextResponse } from "next/server";
import { fetchBusData } from "./service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const linhasParam = searchParams.get("linhas");

    const linhas = linhasParam ? linhasParam.split(",") : [];

    // Sempre lê do banco: o sync já atualiza a cada 15s no servidor
    const data = await fetchBusData(linhas);

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Erro ao buscar dados dos ônibus",
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
