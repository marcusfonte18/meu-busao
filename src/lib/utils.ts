import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Base URL da API: vazio na web (mesma origem) ou URL absoluta no app. Garante protocolo para não virar path relativo. */
export function getApiBase(): string {
  const url = (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) || ""
  // Em localhost (dev) usar sempre mesma origem para evitar CORS
  if (typeof window !== "undefined") {
    const o = window.location.origin
    if (o.startsWith("http://localhost") || o.startsWith("http://127.0.0.1")) return ""
  }
  if (!url) return ""
  if (/^https?:\/\//i.test(url)) return url.replace(/\/+$/, "")
  return `https://${url.replace(/^\/+/, "")}`
}
