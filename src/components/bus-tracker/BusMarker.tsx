"use client";

import { cn } from "@/lib/utils";

interface BusMarkerProps {
  lineNumber: string;
  x: number;
  y: number;
  mode: "onibus" | "brt";
  heading?: number;
  speed?: number;
  selected?: boolean;
  onClick?: () => void;
}

export function BusMarker({
  lineNumber,
  x,
  y,
  mode,
  speed,
  selected,
  onClick,
}: BusMarkerProps) {
  return (
    <button
      onClick={onClick}
      className="absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-300 hover:z-20 hover:scale-110 active:scale-95"
      style={{ left: `${x}%`, top: `${y}%` }}
      aria-label={`Ônibus linha ${lineNumber}`}
    >
      {selected && (
        <span className="absolute inset-0 -m-2 animate-ping rounded-full bg-primary/30" />
      )}
      <div className="relative flex flex-col items-center gap-0.5">
        {speed !== undefined && selected && (
          <span className="rounded-md bg-foreground/80 px-1.5 py-0.5 text-[9px] font-bold text-background">
            {speed} km/h
          </span>
        )}
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full border-2 text-[10px] font-bold shadow-lg transition-all",
            mode === "onibus"
              ? "border-primary bg-primary text-primary-foreground shadow-primary/30"
              : "border-secondary bg-secondary text-secondary-foreground shadow-secondary/30",
            selected && "h-10 w-10 ring-4",
            selected && mode === "onibus" && "ring-primary/20",
            selected && mode === "brt" && "ring-secondary/20"
          )}
        >
          {lineNumber}
        </div>
        <div
          className={cn(
            "-mt-1 h-0 w-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent",
            mode === "onibus" ? "border-t-primary" : "border-t-secondary"
          )}
        />
      </div>
    </button>
  );
}
