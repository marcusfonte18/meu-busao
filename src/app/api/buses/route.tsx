import { fetchBusData, fetchLast20SecondsBusData } from "@/app/api";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const latest = searchParams.get("latest") === "true";
    const linhasParam = searchParams.get("linhas");

    // Converte a string de linhas separadas por vírgula para um array
    const linhas = linhasParam ? linhasParam.split(",") : [];

    const data = latest
      ? await fetchLast20SecondsBusData(linhas)
      : await fetchBusData(linhas);

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
