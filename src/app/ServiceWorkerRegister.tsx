"use client";

import { useEffect } from "react";

/**
 * Registra o SW apenas em produção para não interferir no dev / HMR.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Falha silenciosa (ex.: HTTP sem SW em alguns ambientes de teste)
    });
  }, []);

  return null;
}
