"use client";

import { Bus, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface MapHeaderProps {
  lineNumbers: string[];
  mode: "onibus" | "brt";
  onClear: () => void;
  onChangeLine: () => void;
}

export function MapHeader({
  lineNumbers,
  mode,
  onClear,
  onChangeLine,
}: MapHeaderProps) {
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
            <span className="truncate font-display text-base font-bold text-foreground">
              Meu Busão
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <span
                className={cn(
                  "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase",
                  mode === "onibus"
                    ? "bg-primary/10 text-primary"
                    : "bg-secondary/10 text-secondary"
                )}
              >
                {mode === "brt" ? "BRT" : "Bus"}
              </span>
              <span className="truncate">{lineNumbers.join(", ")}</span>
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
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 rounded-xl bg-destructive px-3 py-2 text-xs font-bold text-destructive-foreground shadow-sm shadow-destructive/20 transition-all duration-200 hover:bg-destructive/90 active:scale-95"
          >
            <X className="h-3.5 w-3.5" />
            <span>Limpar</span>
          </button>
        </div>
      </div>
    </header>
  );
}
