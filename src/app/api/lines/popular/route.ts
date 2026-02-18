import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const TOP_COUNT = 5;

/**
 * GET /api/lines/popular
 * Retorna as 5 linhas com mais cliques, com nome atualizado da tabela Line quando existir.
 * Assim, atualizações no cadastro de linhas (GTFS) refletem o nome, sem perder os cliques.
 */
export async function GET() {
  try {
    if (!prisma.lineClick) {
      return NextResponse.json({ lines: [] });
    }
    const topClicks = await prisma.lineClick.findMany({
      orderBy: { clicks: "desc" },
      take: TOP_COUNT,
      select: { numero: true, clicks: true },
    });

    if (topClicks.length === 0) {
      return NextResponse.json({ lines: [] });
    }

    const numeros = topClicks.map((t) => t.numero);
    const linesFromGtfs = await prisma.line.findMany({
      where: { numero: { in: numeros } },
      select: { numero: true, nome: true },
    });
    const nomeByNumero = new Map(linesFromGtfs.map((l) => [l.numero, l.nome]));

    const lines = topClicks.map(({ numero, clicks }) => ({
      numero,
      nome: nomeByNumero.get(numero) ?? null,
      clicks,
    }));

    return NextResponse.json({ lines });
  } catch (error) {
    console.error("[lines/popular]", error);
    return NextResponse.json(
      { error: "Erro ao buscar linhas populares" },
      { status: 500 }
    );
  }
}
