"use client";

import Link from "next/link";
import { Search, MapPin, Clock, Navigation, Bus } from "lucide-react";
import { cn } from "@/lib/utils";

export type BusInfoForNav = {
  lineNumber: string;
  destination: string;
  speed: number;
  heading: number;
  headingLabel: string;
  lastUpdate: string;
};

interface BottomNavProps {
  active: string;
  busInfo?: BusInfoForNav | null;
  onBuscarClick?: () => void;
}

const navItems = [
  { id: "buscar", label: "Buscar", icon: Search, href: "/" },
  { id: "mapa", label: "Mapa", icon: MapPin, href: "/" },
  { id: "recentes", label: "Recentes", icon: Clock, href: "/" },
];

export function BottomNav({ active, busInfo, onBuscarClick }: BottomNavProps) {
  const showBusInfo = active === "mapa" && busInfo;
  return (
    <nav className="safe-area-bottom fixed bottom-0 left-0 right-0 z-50 flex flex-col border-t border-border bg-card/95 backdrop-blur-lg">
    
      <div className={cn("mx-auto flex max-w-md flex-1 items-center justify-around px-2", showBusInfo ? "h-14 shrink-0" : "h-14 flex-1")}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === active;
          const isBuscar = item.id === "buscar";
          const isMapaAndBuscarClick = isBuscar && active === "mapa" && onBuscarClick;

          const content = (
            <>
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                  isActive && "bg-primary/10"
                )}
              >
                <Icon
                  className="h-5 w-5"
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </>
          );

          if (isMapaAndBuscarClick) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={onBuscarClick}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 transition-all duration-200",
                  "text-muted-foreground hover:text-foreground"
                )}
                aria-label={item.label}
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 transition-all duration-200",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
