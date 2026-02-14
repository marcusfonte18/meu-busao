"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { BusFrontIcon } from "@/components/BusFrontIcon";
import { SearchHeroBg } from "@/components/SearchHeroBg";
import type { TransportMode } from "./types";

type LineSuggestion = { numero: string; nome: string };

export const InitialSearch = ({
  mode: initialMode,
  onSearch,
}: {
  mode: TransportMode;
  onSearch: (linhas: string[], mode: TransportMode) => void;
}) => {
  const [mode, setMode] = useState<TransportMode>(initialMode);
  const [linhaInput, setLinhaInput] = useState("");
  const [linhas, setLinhas] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<LineSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    setLinhaInput("");
    setSuggestions([]);
    setShowSuggestions(false);
  }, [mode]);

  useEffect(() => {
    const q = linhaInput.trim();
    const minChars = mode === "brt" ? 1 : 2; // BRT: 35, 52 etc.; ônibus: 38, Pavuna
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
          `${base}/api/lines?q=${encodeURIComponent(q)}&modo=${mode}&limit=20`
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
  }, [linhaInput, mode]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddLinha = (numero?: string) => {
    const value = (numero ?? linhaInput).trim();
    if (value && !linhas.includes(value)) {
      setLinhas([...linhas, value]);
      setLinhaInput("");
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (s: LineSuggestion) => {
    handleAddLinha(s.numero);
  };

  const handleRemoveLinha = (linha: string) => {
    setLinhas(linhas.filter((l) => l !== linha));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (linhas.length > 0) {
      onSearch(linhas, mode);
    }
  };

  return (
    <div className="relative w-full min-h-[100dvh] flex flex-col items-center search-hero-bg p-4 sm:p-6">
      <SearchHeroBg />

      <Card className="relative z-10 w-full max-w-md mt-12 sm:mt-16 bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
        <CardHeader className="pb-4 space-y-4">
          <CardTitle className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {mode === "brt"
              ? "Buscar Linha BRT"
              : "Buscar Linha de Ônibus"}
          </CardTitle>
          <p className="text-sm text-blue-200/80">
            {mode === "brt"
              ? "Selecione as linhas do BRT para acompanhar em tempo real."
              : "Encontre sua linha por número ou destino."}
          </p>
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              className={`flex-1 transition-all ${
                mode === "onibus"
                  ? "bg-blue-500/90 hover:bg-blue-500 text-white border border-blue-400"
                  : "bg-white/5 text-white/80 hover:bg-white/10 border border-white/20"
              }`}
              onClick={() => setMode("onibus")}
            >
              Ônibus
            </Button>
            <Button
              type="button"
              size="sm"
              className={`flex-1 transition-all ${
                mode === "brt"
                  ? "bg-blue-500/90 hover:bg-blue-500 text-white border border-blue-400"
                  : "bg-white/5 text-white/80 hover:bg-white/10 border border-white/20"
              }`}
              onClick={() => setMode("brt")}
            >
              BRT
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-2 relative" ref={wrapperRef}>
              <div className="flex-1 min-w-0 relative">
                <Input
                  type="text"
                  placeholder={
                    mode === "brt"
                      ? "Número da linha BRT (ex: 35, 52)"
                      : "Número ou destino (ex: 384 ou Pavuna)"
                  }
                  value={linhaInput}
                  onChange={(e) => setLinhaInput(e.target.value)}
                  onFocus={() => linhaInput.trim() && setShowSuggestions(true)}
                  className="w-full min-w-0 bg-white/5 border-white/20 text-white placeholder:text-white/50 focus:border-blue-400 focus:ring-blue-400/30"
                  autoComplete="off"
                />
                {showSuggestions &&
                  linhaInput.trim().length >= (mode === "brt" ? 1 : 2) && (
                  <ul
                    className="absolute z-50 w-full mt-1 py-1 bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-lg shadow-xl max-h-56 overflow-auto"
                    role="listbox"
                  >
                    {loadingSuggestions ? (
                      <li className="px-3 py-3 text-sm text-blue-200/80">
                        Buscando...
                      </li>
                    ) : suggestions.length > 0 ? (
                      suggestions.map((s) => (
                        <li
                          key={s.numero}
                          role="option"
                          className="px-3 py-2.5 cursor-pointer hover:bg-blue-500/20 text-sm flex flex-col sm:flex-row sm:items-center sm:gap-2 text-white border-b border-white/5 last:border-0 transition-colors"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSuggestionClick(s);
                          }}
                        >
                          <span className="font-semibold text-blue-200">{s.numero}</span>
                          {s.nome && (
                            <span className="text-white/70 truncate">{s.nome}</span>
                          )}
                        </li>
                      ))
                    ) : (
                      <li className="px-3 py-3 text-sm text-white/60">
                        Nenhuma linha encontrada
                      </li>
                    )}
                  </ul>
                )}
              </div>
              <Button
                type="button"
                onClick={() => handleAddLinha()}
                className="flex-shrink-0 sm:w-auto w-full bg-white/10 hover:bg-white/20 text-white border border-white/20"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>

            {linhas.length > 0 && (
              <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-white/5 rounded-lg border border-white/10">
                {linhas.map((linha) => (
                  <span
                    key={linha}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleRemoveLinha(linha)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleRemoveLinha(linha)
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-500/30 text-white text-sm font-medium cursor-pointer hover:bg-blue-500/50 border border-blue-400/30 transition-colors"
                  >
                    {linha}
                    <X className="h-3 w-3" />
                  </span>
                ))}
              </div>
            )}

            <Button
              type="submit"
              disabled={linhas.length === 0}
              className="w-full mt-2 py-6 text-base font-semibold bg-transparent hover:bg-blue-500/20 text-blue-300 border-2 border-blue-400/60 hover:border-blue-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              <BusFrontIcon className="h-5 w-5 mr-2" />
              Iniciar Monitoramento
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default InitialSearch;
