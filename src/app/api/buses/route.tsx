import { fetchBusData, fetchLast20SecondsBusData } from "@/app/api";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const latest = searchParams.get("latest") === "true";
    const linhasParam = searchParams.get("linhas");

    console.log({ latest, linhasParam });

    // Converte a string de linhas separadas por vírgula para um array
    const linhas = linhasParam ? linhasParam.split(",") : [];

    const data = latest
      ? await fetchLast20SecondsBusData(linhas)
      : await fetchBusData(linhas);

    // Filtra os dados de acordo com as linhas fornecidas
    const filteredData =
      linhas.length > 0
        ? data.filter((bus) => linhas.includes(bus.linha))
        : data;

    return NextResponse.json(filteredData, { status: 200 });
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
