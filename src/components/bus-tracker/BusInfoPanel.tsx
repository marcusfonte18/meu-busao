"use client";

import { Clock, Navigation, Bus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLineColorsForPanel } from "./bus-marker";

interface BusInfoPanelProps {
  lineNumber: string;
  destination: string;
  mode: "onibus" | "brt";
  speed: number;
  heading: number;
  lastUpdate: string;
  onClose: () => void;
  selectedLinhas?: string[];
}

export function BusInfoPanel({
  lineNumber,
  destination,
  mode,
  speed,
  heading,
  lastUpdate,
  onClose,
  selectedLinhas = [],
}: BusInfoPanelProps) {
  const colors =
    mode === "onibus" && selectedLinhas.length > 0
      ? getLineColorsForPanel(lineNumber)
      : mode === "onibus"
        ? { bg: "bg-primary", text: "text-primary-foreground", iconColor: "hsl(174,72%,40%)" }
        : { bg: "bg-secondary", text: "text-secondary-foreground", iconColor: "hsl(38,92%,50%)" };

  const directionLabel = (deg: number) => {
    if (deg >= 337.5 || deg < 22.5) return "Norte";
    if (deg >= 22.5 && deg < 67.5) return "Nordeste";
    if (deg >= 67.5 && deg < 112.5) return "Leste";
    if (deg >= 112.5 && deg < 157.5) return "Sudeste";
    if (deg >= 157.5 && deg < 202.5) return "Sul";
    if (deg >= 202.5 && deg < 247.5) return "Sudoeste";
    if (deg >= 247.5 && deg < 292.5) return "Oeste";
    return "Noroeste";
  };

  return (
    <div className="absolute bottom-0 left-4 right-4 z-20 animate-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
              colors.bg,
              colors.text
            )}
          >
            {lineNumber}
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-bold text-foreground">
                {destination}
              </span>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Fechar painel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Bus className="h-3 w-3" style={{ color: colors.iconColor }} />
                {speed} km/h
              </span>
              <span className="flex items-center gap-1">
                <Navigation
                  className="h-3 w-3"
                  style={{ transform: `rotate(${heading}deg)`, color: colors.iconColor }}
                />
                {directionLabel(heading)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                {lastUpdate}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
