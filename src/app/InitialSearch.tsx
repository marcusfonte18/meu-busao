"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { BusFrontIcon } from "@/components/BusFrontIcon";
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
    const q = linhaInput.trim();
    if (q.length === 0 || mode !== "onibus") {
      setSuggestions([]);
      setShowSuggestions(false);
      setLoadingSuggestions(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoadingSuggestions(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || "";
        const res = await fetch(
          `${base}/api/lines?q=${encodeURIComponent(q)}&limit=12`
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
    <div className="w-full min-h-[100dvh] flex items-start justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md shadow-lg border-0 mt-8">
        <CardHeader className="pb-2 space-y-2">
          <CardTitle className="text-xl font-bold flex items-center">
            <BusFrontIcon className="h-5 w-5 mr-2 text-primary" />
            {mode === "brt" ? "Buscar Linha BRT" : "Buscar Linha de Ônibus"}
          </CardTitle>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant={mode === "onibus" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setMode("onibus")}
            >
              Ônibus
            </Button>
            <Button
              type="button"
              variant={mode === "brt" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setMode("brt")}
            >
              BRT
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex gap-2 relative" ref={wrapperRef}>
              <div className="flex-1 relative">
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
                  className="w-full"
                  autoComplete="off"
                />
                {showSuggestions && linhaInput.trim() && mode === "onibus" && (
                  <ul
                    className="absolute z-50 w-full mt-1 py-1 bg-popover border border-border rounded-md shadow-lg max-h-56 overflow-auto"
                    role="listbox"
                  >
                    {loadingSuggestions ? (
                      <li className="px-3 py-3 text-sm text-muted-foreground">
                        Buscando...
                      </li>
                    ) : suggestions.length > 0 ? (
                      suggestions.map((s) => (
                        <li
                          key={s.numero}
                          role="option"
                          className="px-3 py-2 cursor-pointer hover:bg-accent text-sm flex flex-col sm:flex-row sm:items-center sm:gap-2"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSuggestionClick(s);
                          }}
                        >
                          <span className="font-semibold">{s.numero}</span>
                          {s.nome && (
                            <span className="text-muted-foreground truncate">
                              {s.nome}
                            </span>
                          )}
                        </li>
                      ))
                    ) : (
                      <li className="px-3 py-3 text-sm text-muted-foreground">
                        Nenhuma linha encontrada
                      </li>
                    )}
                  </ul>
                )}
              </div>
              <Button
                type="button"
                onClick={() => handleAddLinha()}
                variant="secondary"
                className="flex-shrink-0"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>

            {linhas.length > 0 && (
              <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                {linhas.map((linha) => (
                  <Badge
                    key={linha}
                    variant="secondary"
                    className="cursor-pointer bg-black text-white transition-colors py-1 px-3"
                    onClick={() => handleRemoveLinha(linha)}
                  >
                    {linha}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}

            <Button
              type="submit"
              disabled={linhas.length === 0}
              className="w-full mt-2"
            >
              <BusFrontIcon className="h-4 w-4 mr-2" />
              Iniciar Monitoramento
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default InitialSearch;
