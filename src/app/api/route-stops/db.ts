import prisma from "@/lib/prisma";

export type RouteStopsMap = Record<string, [number, number][]>;

/**
 * Busca paradas das linhas no banco (coleção route_stops).
 * Popule com: pnpm run seed:route-stops (uma vez em dev, com a pasta GTFS).
 */
export async function getRouteStopsFromDb(
  linhas: string[]
): Promise<RouteStopsMap> {
  if (linhas.length === 0) return {};

  const rows = await prisma.routeStop.findMany({
    where: { linha: { in: linhas } },
  });

  const result: RouteStopsMap = {};
  for (const row of rows) {
    const positions = row.positions as unknown as [number, number][];
    if (Array.isArray(positions) && positions.length > 0) {
      result[row.linha] = positions;
    }
  }
  return result;
}
