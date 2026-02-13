import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/lines?q=38
 * Busca linhas por número ou nome (ex.: "384" ou "Pavuna") para autocomplete.
 * Resposta: { lines: [{ numero, nome }, ...] }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const limit = Math.min(Number(searchParams.get("limit")) || 15, 30);

    if (q.length === 0) {
      return NextResponse.json({ lines: [] });
    }

    const lines = await prisma.line.findMany({
      where: {
        OR: [
          { numero: { contains: q } },
          { nome: { contains: q } },
        ],
      },
      orderBy: { numero: "asc" },
      take: limit,
      select: { numero: true, nome: true },
    });

    return NextResponse.json({
      lines: lines.map((l) => ({ numero: l.numero, nome: l.nome })),
    });
  } catch (error) {
    console.error("[lines]", error);
    return NextResponse.json(
      { error: "Erro ao buscar linhas" },
      { status: 500 }
    );
  }
}
