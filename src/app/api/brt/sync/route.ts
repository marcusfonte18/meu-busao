import { NextResponse } from "next/server";
import { syncBrtFromDataRio } from "../service";

/** Sincroniza BRT do DataRio para o banco. Pode ser chamado em intervalo (ex.: a cada 15s) por cron ou script. */
export async function GET() {
  try {
    const { count } = await syncBrtFromDataRio();
    return NextResponse.json({ ok: true, count }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Erro ao sincronizar dados do BRT",
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
