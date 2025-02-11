export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}+${hours}:${minutes}:${seconds}`;
}

export function parseCoordinate(value: string): number {
  if (!value) return 0;

  const parsed = parseFloat(value.replace(",", "."));
  return isNaN(parsed) ? 0 : parsed;
}

export const getColorForLine = (line: string) => {
  let hash = 0;
  for (let i = 0; i < line.length; i++) {
    hash = (hash * 31 + line.charCodeAt(i)) & 0xffffffff; // Hash melhor distribuído
  }

  // Transformamos o hash em um valor dentro de 0-360 para matiz (H)
  const hue = Math.abs(hash % 360); // Cores variadas
  const saturation = 70; // Saturação fixa (deixar alto para cores vibrantes)
  const lightness = 50; // Luminosidade fixa (para evitar cores muito escuras)

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};
