"use client";

import { cn } from "@/lib/utils";
import {
  getLineColor,
  getLineHex,
  registerLines,
  type LineColorSet,
} from "@/lib/line-colors";

export { getLineColor, getLineHex, registerLines };
export type { LineColorSet };

/** Retorna objeto de cores para BusInfoPanel (bg, text, iconColor). */
export function getLineColorsForPanel(lineNumber: string): {
  bg: string;
  text: string;
  iconColor: string;
} {
  const c = getLineColor(lineNumber);
  return { bg: c.bg, text: c.text, iconColor: c.iconColor };
}

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
  speed,
  selected,
  onClick,
}: BusMarkerProps) {
  const colors = getLineColor(lineNumber);

  return (
    <button
      onClick={onClick}
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2 transition-transform duration-300 hover:z-20 hover:scale-110 active:scale-95"
      style={{ left: `${x}%`, top: `${y}%` }}
      aria-label={`Onibus linha ${lineNumber}`}
    >
      {selected && (
        <span
          className={cn(
            "absolute inset-0 -m-2 animate-ping rounded-full",
            colors.bg,
            "opacity-30"
          )}
        />
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
            colors.bg,
            colors.text,
            colors.shadow,
            colors.border,
            selected && "h-10 w-10 ring-4",
            selected && colors.ring
          )}
        >
          {lineNumber}
        </div>
        <svg
          className="-mt-1"
          width="10"
          height="7"
          viewBox="0 0 10 7"
          fill="none"
          aria-hidden="true"
        >
          <path d="M5 7L0 0H10L5 7Z" fill={getLineHex(lineNumber)} />
        </svg>
      </div>
    </button>
  );
}
