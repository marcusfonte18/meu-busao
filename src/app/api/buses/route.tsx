import { NextResponse } from "next/server";
import { fetchBusData, fetchLast20SecondsBusData } from "./service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const latest = searchParams.get("latest") === "true";
    const linhasParam = searchParams.get("linhas");

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
