"use client";

import { Bus, Train } from "lucide-react";
import { cn } from "@/lib/utils";

interface TransportToggleProps {
  selected: Set<"onibus" | "brt">;
  onToggle: (type: "onibus" | "brt") => void;
}

export function TransportToggle({ selected, onToggle }: TransportToggleProps) {
  const isOnibus = selected.has("onibus");
  const isBrt = selected.has("brt");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onToggle("onibus")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200",
            isOnibus
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
              : "bg-card text-muted-foreground border border-border hover:border-primary/30 hover:text-foreground"
          )}
        >
          <Bus className="h-4 w-4" />
          <span>Ônibus</span>
          {isOnibus && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground/20 text-[10px] font-bold">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onToggle("brt")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200",
            isBrt
              ? "bg-secondary text-secondary-foreground shadow-lg shadow-secondary/25"
              : "bg-card text-muted-foreground border border-border hover:border-secondary/30 hover:text-foreground"
          )}
        >
          <Train className="h-4 w-4" />
          <span>BRT</span>
          {isBrt && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary-foreground/20 text-[10px] font-bold">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          )}
        </button>
      </div>
      {isOnibus && isBrt && (
        <p className="text-center text-xs text-muted-foreground">
          Mostrando linhas de Ônibus e BRT
        </p>
      )}
    </div>
  );
}
