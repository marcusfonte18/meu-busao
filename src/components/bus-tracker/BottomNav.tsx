"use client";

import Link from "next/link";
import { Search, MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  active: string;
  onBuscarClick?: () => void;
}

const navItems = [
  { id: "buscar", label: "Buscar", icon: Search, href: "/" },
  { id: "mapa", label: "Mapa", icon: MapPin, href: "/" },
  { id: "recentes", label: "Recentes", icon: Clock, href: "/" },
];

export function BottomNav({ active, onBuscarClick }: BottomNavProps) {
  return (
    <nav className="safe-area-bottom fixed bottom-0 left-0 right-0 z-50 flex h-14 items-stretch border-t border-border bg-card/95 backdrop-blur-lg">
      <div className="mx-auto flex h-full max-w-md flex-1 items-center justify-around px-2">
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
