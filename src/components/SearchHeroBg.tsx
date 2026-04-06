"use client";

export function SearchHeroBg() {
  return (
    <div className="search-hero-glow" aria-hidden>
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-blue-500/20 blur-[100px]" />
      <div className="absolute top-1/3 -left-32 w-[400px] h-[400px] rounded-full bg-cyan-500/15 blur-[80px]" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] rounded-full bg-indigo-500/15 blur-[90px]" />
      <div className="absolute top-1/2 right-1/4 w-[300px] h-[300px] rounded-full bg-blue-400/10 blur-[60px]" />
    </div>
  );
}
