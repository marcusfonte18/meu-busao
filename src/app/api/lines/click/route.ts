import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * POST /api/lines/click
 * Body: { numero: string }
 * Incrementa o contador de cliques da linha. Usado ao selecionar uma linha na busca.
 * Não altera a tabela Line (GTFS), então atualizações de linhas não perdem os cliques.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const numero = typeof body.numero === "string" ? body.numero.trim() : "";
    if (!numero) {
      return NextResponse.json(
        { error: "Campo numero é obrigatório" },
        { status: 400 }
      );
    }
    if (!prisma.lineClick) {
      return NextResponse.json({ ok: true });
    }
    await prisma.lineClick.upsert({
      where: { numero },
      create: { numero, clicks: 1 },
      update: { clicks: { increment: 1 } },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[lines/click]", error);
    return NextResponse.json(
      { error: "Erro ao registrar clique" },
      { status: 500 }
    );
  }
}
