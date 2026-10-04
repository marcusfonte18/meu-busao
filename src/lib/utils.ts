import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Base URL da API: vazio na web (mesma origem) ou URL absoluta no app nativo (Capacitor). */
export function getApiBase(): string {
  // Na web, usar sempre a mesma origem (relativo) para evitar erros de CORS e certificado
  if (typeof window !== "undefined") {
    const isCapacitor = Boolean(
      (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })?.Capacitor?.isNativePlatform?.()
    );
    if (!isCapacitor) return "";
  }

  const url = (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) || "";
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url.replace(/\/+$/, "");
  return `https://${url.replace(/^\/+/, "")}`;
}
