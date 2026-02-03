"use client";

import { useEffect, useRef } from "react";

const SYNC_INTERVAL_MS = 15 * 1000; // 15 segundos

/** Dispara a sincronização DataRio → DB em intervalo enquanto a aplicação está aberta. */
export function BusSyncTrigger() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const runSync = () => fetch("/api/buses/sync").catch(() => {});

    runSync(); // primeira sincronização ao montar
    intervalRef.current = setInterval(runSync, SYNC_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return null;
}
