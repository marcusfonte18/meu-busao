import { NextResponse } from "next/server";

/**
 * GET /api/reverse-geocode?lat=-22.82&lon=-43.20
 * Proxy para Nominatim (OpenStreetMap) - evita CORS ao chamar do servidor.
 * Nominatim exige User-Agent identificável: https://operations.osmfoundation.org/policies/nominatim/
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");

    if (!lat || !lon || isNaN(parseFloat(lat)) || isNaN(parseFloat(lon))) {
      return NextResponse.json({ error: "lat e lon obrigatórios" }, { status: 400 });
    }

    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", lat);
    url.searchParams.set("lon", lon);
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");

    const res = await fetch(url.toString(), {
      headers: {
        "Accept-Language": "pt-BR",
        "User-Agent": "MeuBusao/1.0 (bus tracker; https://github.com/meu-busao)",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Erro ao buscar endereço" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar endereço" }, { status: 500 });
  }
}
