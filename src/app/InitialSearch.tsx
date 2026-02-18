"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Plus, X, Search, Sparkles, TrendingUp, Clock, MapPin, Bus, Train } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLineType, type TransportMode } from "./types";

type LineSuggestion = { numero: string; nome: string };

export const InitialSearch = ({
  mode: initialMode,
  onSearch,
}: {
  mode: TransportMode;
  onSearch: (linhas: string[], mode: TransportMode) => void;
}) => {
  const [linhaInput, setLinhaInput] = useState("");
  const [linhas, setLinhas] = useState<string[]>([]);
  const [linhasNomes, setLinhasNomes] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<LineSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [userLocationLabel, setUserLocationLabel] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [popularLines, setPopularLines] = useState<{ numero: string; nome: string | null }[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchPopularLines = async () => {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${base}/api/lines/popular`);
      if (!res.ok) return;
      const data = await res.json();
      const list = data?.lines ?? [];
      if (Array.isArray(list) && list.length > 0) {
        setPopularLines(list);
      }
    } catch {
      setPopularLines([]);
    }
  };

  useEffect(() => {
    fetchPopularLines();
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setUserLocationLabel("Rio de Janeiro");
      setLocationLoading(false);
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const base = process.env.NEXT_PUBLIC_API_URL || "";
          const res = await fetch(
            `${base}/api/reverse-geocode?lat=${latitude}&lon=${longitude}`

          );

          const data = await res.json();

          console.log('data', data);

          const addr = data?.address;
          if (!addr) {
            setUserLocationLabel("Rio de Janeiro");
            setLocationLoading(false);
            return;
          }
          const suburb = addr.suburb || addr.neighbourhood || addr.quarter;
          const city = addr.city || addr.town || addr.municipality || addr.state;
          const state = addr.state;
          if (suburb && city) {
            setUserLocationLabel(`${suburb}, ${city}`);
          } else if (city) {
            setUserLocationLabel(state ? `${city}, ${state}` : city);
          } else {
            setUserLocationLabel("Rio de Janeiro");
          }
        } catch {
          setUserLocationLabel("Rio de Janeiro");
        }
        setLocationLoading(false);
      },
      () => {
        setUserLocationLabel("Rio de Janeiro");
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  const modoParam = "onibus,brt";
  const minChars = 1;

  useEffect(() => {
    const q = linhaInput.trim();
    if (q.length < minChars) {
      setSuggestions([]);
      setShowSuggestions(false);
      setLoadingSuggestions(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setShowSuggestions(true);
    setLoadingSuggestions(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || "";
        const res = await fetch(
          `${base}/api/lines?q=${encodeURIComponent(q)}&modo=${modoParam}&limit=20`
        );
        const data = await res.json().catch(() => ({ lines: [] }));
        const list = data.lines || [];
        setSuggestions(list);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
        setShowSuggestions(true);
      } finally {
        setLoadingSuggestions(false);
        debounceRef.current = null;
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [linhaInput, modoParam, minChars]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddLinha = (numero?: string, nome?: string) => {
    const num = (numero ?? linhaInput).trim();
    if (!num) return;
    if (linhas.includes(num)) {
      toast.info(`Linha ${num} já está na lista`);
      return;
    }
    setLinhas([...linhas, num]);
    if (nome) setLinhasNomes((prev) => ({ ...prev, [num]: nome }));
    setLinhaInput("");
    setSuggestions([]);
    setShowSuggestions(false);
    const display = nome ? `${num} – ${nome}` : `Linha ${num}`;
    toast.success(`${display} adicionada à lista`);

    // Registra clique no banco (não bloqueia a UI) e atualiza a lista de populares
    const base = process.env.NEXT_PUBLIC_API_URL || "";
    fetch(`${base}/api/lines/click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numero: num }),
    })
      .then(() => fetchPopularLines())
      .catch(() => {});
  };

  const handleAddPopular = (line: LineSuggestion) => {
    handleAddLinha(line.numero, line.nome);
  };

  const handleSuggestionClick = (s: LineSuggestion) => {
    handleAddLinha(s.numero, s.nome);
  };

  const handleRemoveLinha = (linha: string) => {
    const next = linhas.filter((l) => l !== linha);
    setLinhas(next);
    setLinhasNomes((prev) => {
      const updated = { ...prev };
      delete updated[linha];
      return updated;
    });
    toast.error(
      next.length === 0 ? "Todas as linhas foram removidas" : `Linha ${linha} removida`
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (linhas.length > 0) {
      const primaryMode: TransportMode = getLineType(linhas[0]) ?? "onibus";
      onSearch(linhas, primaryMode);
    }
  };

  const getLineDisplay = (num: string) => {
    const nome = linhasNomes[num];
    return nome ? `${num} – ${nome}` : `Linha ${num}`;
  };

  const linesToShow = popularLines.map((l) => ({
    numero: l.numero,
    nome: l.nome ?? `Linha ${l.numero}`,
  }));


  return (
    <div className="flex min-h-svh flex-col bg-background">
      <div className="mx-auto w-full max-w-md">
        {/* Header */}
        <header className="flex items-center justify-end px-5 pt-4 pb-3">
          <div className="flex max-w-[70%] items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate" title={userLocationLabel ?? undefined}>
              {locationLoading ? "Buscando localização..." : (userLocationLabel ?? "Rio de Janeiro")}
            </span>
          </div>
        </header>

        <main className="flex flex-col gap-5 px-5 pb-8 pt-2">
          {/* Title Section */}
          <div className="flex flex-col gap-1">
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
              <Sparkles className="h-6 w-6 text-secondary" />
              <span>Buscar Linha</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Encontre e monitore ônibus e BRT em tempo real
            </p>
          </div>

          {/* Busca sempre para ônibus e BRT (sem opção de trocar) */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-3">
              <div
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold",
                  "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                )}
              >
                <Bus className="h-4 w-4" />
                <span>Ônibus</span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground/20 text-[10px] font-bold">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              </div>
              <div
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold",
                  "bg-secondary text-secondary-foreground shadow-lg shadow-secondary/25"
                )}
              >
                <Train className="h-4 w-4" />
                <span>BRT</span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary-foreground/20 text-[10px] font-bold">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              </div>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Mostrando linhas de Ônibus e BRT
            </p>
          </div>

          {/* Search */}
          <div className="flex flex-col gap-3" ref={wrapperRef}>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={linhaInput}
                onChange={(e) => setLinhaInput(e.target.value)}
                onFocus={() => linhaInput.trim() && setShowSuggestions(true)}
                placeholder="Número ou destino (ex: 384, T47, Pavuna)"
                autoComplete="off"
                className="w-full rounded-xl border border-border bg-card py-3.5 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              {showSuggestions && linhaInput.trim().length >= minChars && (
                  <ul
                    className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card py-1 shadow-lg max-h-56 overflow-auto"
                    role="listbox"
                  >
                    {loadingSuggestions ? (
                      <li className="px-4 py-3 text-sm text-muted-foreground">
                        Buscando...
                      </li>
                    ) : suggestions.length > 0 ? (
                      suggestions.map((s) => (
                        <li
                          key={s.numero}
                          role="option"
                          className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSuggestionClick(s);
                          }}
                        >
                          <span className="font-semibold">{s.numero}</span>
                          {s.nome && (
                            <span className="truncate text-muted-foreground">
                              {s.nome}
                            </span>
                          )}
                        </li>
                      ))
                    ) : (
                      <li className="px-4 py-3 text-sm text-muted-foreground">
                        Nenhuma linha encontrada
                      </li>
                    )}
                  </ul>
                )}
            </div>

            {/* Add Button */}
            {/* <button
              type="button"
              onClick={() => handleAddLinha()}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card/50 py-3 text-sm font-medium text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 hover:text-primary active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </button> */}
          </div>

          {/* Selected Lines */}
          {linhas.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  Linhas selecionadas ({linhas.length})
                </span>
                {linhas.length > 1 && (
                  <button
                    onClick={() => {
                      setLinhas([]);
                      setLinhasNomes({});
                      toast.error("Todas as linhas foram removidas");
                    }}
                    className="text-xs font-medium text-destructive hover:underline"
                  >
                    Limpar todas
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {linhas.map((linha) => {
                  const lineType = getLineType(linha);
                  return (
                    <div
                      key={linha}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border p-3 transition-all duration-200 hover:shadow-md",
                        lineType === "onibus"
                          ? "border-primary/20 bg-primary/5"
                          : "border-secondary/20 bg-secondary/5"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                          lineType === "onibus"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        )}
                      >
                        {linha}
                      </div>
                      <div className="flex flex-1 flex-col gap-0.5">
                        <span className="text-sm font-semibold text-foreground">
                          {getLineDisplay(linha)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Estimativa em breve
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveLinha(linha)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Remover linha ${linha}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Start Monitoring Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={linhas.length === 0}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold transition-all duration-300 active:scale-[0.98]",
              linhas.length === 0
                ? "cursor-not-allowed bg-muted text-muted-foreground"
                : "bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
            )}
          >
            <span>▶</span>Iniciar Monitoramento
          </button>

          {/* Linhas populares: toque para adicionar à lista */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <TrendingUp className="h-4 w-4 text-secondary" />
              <span>Linhas populares</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Toque em uma linha para adicionar ao monitoramento
            </p>
            <div className="flex flex-wrap gap-2">
              {linesToShow.map((line) => {
                const isBrt = getLineType(line.numero) === "brt";
                const alreadyAdded = linhas.includes(line.numero);
                return (
                  <button
                    key={line.numero}
                    type="button"
                    onClick={() => handleAddPopular(line)}
                    className={cn(
                      "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:shadow-md active:scale-[0.98]",
                      isBrt
                        ? "bg-secondary text-secondary-foreground hover:opacity-90"
                        : "bg-primary text-primary-foreground hover:opacity-90",
                      alreadyAdded && "ring-2 ring-offset-2 ring-primary"
                    )}
                    aria-label={`Adicionar linha ${line.numero} ${line.nome}`}
                  >
                    <span className="font-bold">{line.numero}</span>
                    <span className="opacity-90">{line.nome}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default InitialSearch;
