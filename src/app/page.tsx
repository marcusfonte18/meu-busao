import Link from "next/link";
import { MapPin, Zap, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BusFrontIcon } from "@/components/BusFrontIcon";
import { SearchHeroBg } from "@/components/SearchHeroBg";

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/20 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/60">
        <span>© {new Date().getFullYear()} Meu Busão. Todos os direitos reservados.</span>
        <nav className="flex gap-6">
          <Link href="/termos" className="hover:text-white transition-colors">
            Termos de uso
          </Link>
          <Link href="/privacidade" className="hover:text-white transition-colors">
            Privacidade
          </Link>
        </nav>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="relative min-h-[100dvh] flex flex-col search-hero-bg text-white overflow-hidden">
      <SearchHeroBg />

      <main className="relative z-10 flex-1 container mx-auto px-4 py-12 md:py-20">
        <section className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 flex items-center justify-center gap-3 text-white">
            <BusFrontIcon className="h-10 w-10 md:h-12 md:w-12 text-blue-300" />
            Meu Busão
          </h1>
          <p className="text-xl text-blue-200/80 mb-8">
            Acompanhe ônibus em tempo real no mapa. Escolha as linhas e veja onde estão agora.
          </p>
          <Button asChild size="lg" className="text-base bg-transparent hover:bg-blue-500/20 text-blue-300 border-2 border-blue-400/60 hover:border-blue-400">
            <Link href="/mapa">
              <MapPin className="h-5 w-5 mr-2" />
              Ver mapa
            </Link>
          </Button>
        </section>

        <section className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-16">
          <div className="flex flex-col items-center text-center p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
            <Zap className="h-8 w-8 text-blue-400 mb-3" />
            <h2 className="font-semibold mb-1 text-white">Tempo real</h2>
            <p className="text-sm text-white/70">
              Posições atualizadas a cada poucos segundos.
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
            <LayoutGrid className="h-8 w-8 text-blue-400 mb-3" />
            <h2 className="font-semibold mb-1 text-white">Várias linhas</h2>
            <p className="text-sm text-white/70">
              Adicione quantas linhas quiser e acompanhe no mesmo mapa.
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
            <BusFrontIcon className="h-8 w-8 text-blue-400 mb-3" />
            <h2 className="font-semibold mb-1 text-white">Simples</h2>
            <p className="text-sm text-white/70">
              Sem cadastro. Digite o número da linha e comece.
            </p>
          </div>
        </section>

        <section className="text-center">
          <Button asChild size="lg" className="bg-white/10 hover:bg-white/20 text-white border border-white/20">
            <Link href="/mapa">Buscar linhas</Link>
          </Button>
        </section>
      </main>
      <Footer />
    </div>
  );
}
