"use client";

import { cn } from "@/lib/utils";

/** Cores por linha (ex.: 384=teal, 639=roxo). Primeira linha=teal, segunda=roxo. */
export const LINE_COLORS: Record<
  string,
  { bg: string; text: string; ring: string; shadow: string; border: string; iconColor: string }
> = {
  "384": {
    bg: "bg-[hsl(174,72%,40%)]",
    text: "text-[hsl(0,0%,100%)]",
    ring: "ring-[hsl(174,72%,40%)]/20",
    shadow: "shadow-[hsl(174,72%,40%)]/30",
    border: "border-[hsl(174,72%,40%)]",
    iconColor: "hsl(174,72%,40%)",
  },
  "639": {
    bg: "bg-[hsl(262,60%,55%)]",
    text: "text-[hsl(0,0%,100%)]",
    ring: "ring-[hsl(262,60%,55%)]/20",
    shadow: "shadow-[hsl(262,60%,55%)]/30",
    border: "border-[hsl(262,60%,55%)]",
    iconColor: "hsl(262,60%,55%)",
  },
};

export const LINE_HEX: Record<string, string> = {
  "384": "#0d9488",
  "639": "#7c3aed",
};

/** Cor para primeira linha (teal) e segunda (roxo). */
export const COLOR_FIRST_LINE = "#0d9488";
export const COLOR_SECOND_LINE = "#7c3aed";

/** Retorna a cor da linha baseada na posição em selectedLinhas. Primeira=teal, segunda=roxo. */
export function getLineColorHex(
  selectedLinhas: string[],
  lineNumber: string
): string {
  const idx = selectedLinhas.indexOf(lineNumber);
  if (idx === 1) return COLOR_SECOND_LINE;
  return COLOR_FIRST_LINE;
}

/** Retorna o objeto de cores (para BusInfoPanel) baseado na posição em selectedLinhas. */
export function getLineColorsByIndex(
  selectedLinhas: string[],
  lineNumber: string
): { bg: string; text: string; iconColor: string } {
  const idx = selectedLinhas.indexOf(lineNumber);
  if (idx === 1) return LINE_COLORS["639"];
  return LINE_COLORS["384"] ?? { bg: "bg-primary", text: "text-primary-foreground", iconColor: "hsl(174,72%,40%)" };
}

function getLineColor(lineNumber: string) {
  return (
    LINE_COLORS[lineNumber] ?? {
      bg: "bg-primary",
      text: "text-primary-foreground",
      ring: "ring-primary/20",
      shadow: "shadow-primary/30",
      border: "border-primary",
      iconColor: "hsl(174,72%,40%)",
    }
  );
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
          <path
            d="M5 7L0 0H10L5 7Z"
            fill={LINE_HEX[lineNumber] ?? COLOR_FIRST_LINE}
          />
        </svg>
      </div>
    </button>
  );
}
