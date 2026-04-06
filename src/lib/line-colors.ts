/**
 * Dynamic color palette for bus lines.
 * Supports up to 8 simultaneous lines with distinct, accessible colors.
 * Colors are assigned by index order (first line added = first color, etc.)
 */

export interface LineColorSet {
  hsl: string;
  bg: string;
  text: string;
  ring: string;
  shadow: string;
  border: string;
  bgLight: string;
  textOnLight: string;
  iconColor: string;
}

const PALETTE: { hsl: string; label: string }[] = [
  { hsl: "174, 72%, 40%", label: "Teal" }, // 1st line
  { hsl: "262, 60%, 55%", label: "Purple" }, // 2nd line
  { hsl: "38, 92%, 50%", label: "Amber" }, // 3rd line
  { hsl: "340, 75%, 55%", label: "Rose" }, // 4th line
  { hsl: "210, 70%, 50%", label: "Blue" }, // 5th line
  { hsl: "150, 60%, 40%", label: "Emerald" }, // 6th line
  { hsl: "25, 85%, 55%", label: "Orange" }, // 7th line
  { hsl: "290, 50%, 50%", label: "Fuchsia" }, // 8th line
];

function buildColorSet(hsl: string): LineColorSet {
  return {
    hsl: `hsl(${hsl})`,
    iconColor: `hsl(${hsl})`,
    bg: `bg-[hsl(${hsl})]`,
    text: "text-[hsl(0,0%,100%)]",
    ring: `ring-[hsl(${hsl})]/20`,
    shadow: `shadow-[hsl(${hsl})]/30`,
    border: `border-[hsl(${hsl})]`,
    bgLight: `bg-[hsl(${hsl})]/10`,
    textOnLight: `text-[hsl(${hsl})]`,
  };
}

/** Pre-built color sets for each palette slot */
const COLOR_SETS: LineColorSet[] = PALETTE.map((p) => buildColorSet(p.hsl));

/**
 * Registry that maps line numbers to palette indices.
 * Lines get colors in the order they are first registered.
 */
const lineRegistry = new Map<string, number>();

export function registerLine(lineNumber: string): void {
  if (!lineRegistry.has(lineNumber)) {
    lineRegistry.set(lineNumber, lineRegistry.size % COLOR_SETS.length);
  }
}

export function registerLines(lineNumbers: string[]): void {
  lineNumbers.forEach(registerLine);
}

export function getLineColor(lineNumber: string): LineColorSet {
  registerLine(lineNumber);
  const idx = lineRegistry.get(lineNumber) ?? 0;
  return COLOR_SETS[idx];
}

/** Retorna cor em formato hsl para uso em SVG, inline styles, etc. */
export function getLineHex(lineNumber: string): string {
  return getLineColor(lineNumber).hsl;
}

export function getAllRegisteredLines(): { number: string; color: LineColorSet }[] {
  return Array.from(lineRegistry.entries()).map(([num, idx]) => ({
    number: num,
    color: COLOR_SETS[idx],
  }));
}

export function resetRegistry(): void {
  lineRegistry.clear();
}

export { PALETTE, COLOR_SETS };
