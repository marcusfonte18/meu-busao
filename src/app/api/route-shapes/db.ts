import prisma from "@/lib/prisma";

export type RouteShapesMap = Record<string, [number, number][][]>;

/**
 * Busca traçados das linhas no banco (coleção route_shapes).
 * Popule com: pnpm run seed:route-shapes (uma vez, em dev, com a pasta GTFS).
 */
export async function getRouteShapesFromDb(
  linhas: string[]
): Promise<RouteShapesMap> {
  if (linhas.length === 0) return {};

  const rows = await prisma.routeShape.findMany({
    where: { linha: { in: linhas } },
  });

  const result: RouteShapesMap = {};
  for (const row of rows) {
    const polylines = row.polylines as unknown as [number, number][][];
    if (Array.isArray(polylines) && polylines.length > 0) {
      result[row.linha] = polylines;
    }
  }
  return result;
}
