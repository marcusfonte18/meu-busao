import { NextResponse } from "next/server";
import { syncBusesFromDataRio } from "../service";

/** Sincroniza ônibus do DataRio para o banco. Pode ser chamado em intervalo (ex.: a cada 15s) pelo front ou por um cron. */
export async function GET() {
  try {
    const { count } = await syncBusesFromDataRio();
    return NextResponse.json({ ok: true, count }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Erro ao sincronizar dados dos ônibus",
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
