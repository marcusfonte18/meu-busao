"use client";

import { Bus, MapPin, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { getLineHex } from "@/lib/line-colors";
import { getLineType } from "@/app/types";

interface MapHeaderProps {
  lineNumbers: string[];
  mode?: "onibus" | "brt";
  onClear: () => void;
  onChangeLine: () => void;
  onRemoveLine?: (linha: string) => void;
  favoritos?: string[];
  onToggleFavorito?: (numero: string) => void;
}

export function MapHeader({
  lineNumbers,
  mode: _mode,
  onClear,
  onChangeLine,
  onRemoveLine,
  favoritos = [],
  onToggleFavorito,
}: MapHeaderProps) {
  const canRemoveIndividual = lineNumbers.length > 1 && onRemoveLine;
  const hasOnibus = lineNumbers.some((l) => getLineType(l) === "onibus");
  const hasBrt = lineNumbers.some((l) => getLineType(l) === "brt");
  const modeLabel =
    hasOnibus && hasBrt ? "Bus + BRT" : hasBrt ? "BRT" : "Bus";

  return (
    <header className="relative z-10 border-b border-border bg-card shadow-sm">
      <div className="flex items-center h-14 justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3 overflow-hidden">
          <Link
            href="/"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform active:scale-95"
            aria-label="Voltar ao início"
          >
            <Bus className="h-5 w-5" />
          </Link>
          <div className="flex flex-col overflow-hidden">
           
            <span className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
              <span
                className={cn(
                  "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase shrink-0",
                  hasBrt && !hasOnibus
                    ? "bg-secondary/10 text-secondary"
                    : "bg-primary/10 text-primary"
                )}
              >
                {modeLabel}
              </span>
              {lineNumbers.map((linha) => {
                const isBrt = getLineType(linha) === "brt";
                const isFav = favoritos.includes(linha);
                return (
                <span
                  key={linha}
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-lg px-2 py-0.5 text-[10px] font-bold text-white",
                    (canRemoveIndividual || onToggleFavorito) && "pr-0.5"
                  )}
                  style={{
                    backgroundColor: isBrt ? "hsl(var(--secondary))" : getLineHex(linha),
                  }}
                >
                  {linha}
                  {onToggleFavorito && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggleFavorito(linha);
                      }}
                      className="rounded p-0.5 hover:bg-white/20 transition-colors"
                      aria-label={isFav ? `Remover linha ${linha} dos favoritos` : `Favoritar linha ${linha}`}
                    >
                      <Star className={cn("h-3 w-3", isFav && "fill-current")} />
                    </button>
                  )}
                  {canRemoveIndividual && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onRemoveLine?.(linha);
                      }}
                      className="rounded p-0.5 hover:bg-white/20 transition-colors"
                      aria-label={`Remover linha ${linha}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
                );
              })}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onChangeLine}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 active:scale-95"
          >
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span>Trocar</span>
          </button>
       
        </div>
      </div>
    </header>
  );
}
