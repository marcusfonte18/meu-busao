import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { normalizeForSearch } from "@/utils";

export const dynamic = "force-dynamic";

/**
 * GET /api/lines?q=38&modo=onibus
 * Busca linhas por número ou nome. modo=onibus|brt filtra pelo tipo (GTFS).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const modo = (searchParams.get("modo") || "onibus") as "onibus" | "brt";
    const limit = Math.min(Number(searchParams.get("limit")) || 15, 30);
    const minChars = modo === "brt" ? 1 : 2;

    if (q.length < minChars) {
      return NextResponse.json({ lines: [] });
    }

    const qNorm = normalizeForSearch(q);
    const lines = await prisma.line.findMany({
      where: {
        tipo: modo,
        OR: [
          { numeroSearch: { contains: qNorm } },
          { nomeSearch: { contains: qNorm } },
        ],
      } as unknown as Prisma.LineWhereInput,
      orderBy: { numero: "asc" },
      take: limit,
      select: { numero: true, nome: true },
    });

    return NextResponse.json({
      lines: lines.map((l: { numero: string; nome: string }) => ({ numero: l.numero, nome: l.nome })),
    });
  } catch (error) {
    console.error("[lines]", error);
    return NextResponse.json(
      { error: "Erro ao buscar linhas" },
      { status: 500 }
    );
  }
}
