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

export const getColorForLine = (linha: string) => {
  let hash = 0;
  for (let i = 0; i < linha.length; i++) {
    hash = ((hash * 33) ^ linha.charCodeAt(i)) & 0xffffff; // Usando um número primo maior para dispersão
  }

  const color1 = (hash >> 16) & 0xff;
  const color2 = (hash >> 8) & 0xff;
  const color3 = hash & 0xff;

  return `#${color1.toString(16).padStart(2, "0")}${color2
    .toString(16)
    .padStart(2, "0")}${color3.toString(16).padStart(2, "0")}`;
};
