import Link from "next/link";
import { MapPin, Zap, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BusFrontIcon } from "@/components/BusFrontIcon";

function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30 mt-auto">
      <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <span>© {new Date().getFullYear()} Meu Busão. Todos os direitos reservados.</span>
        <nav className="flex gap-6">
          <Link href="/termos" className="hover:text-foreground transition-colors">
            Termos de uso
          </Link>
          <Link href="/privacidade" className="hover:text-foreground transition-colors">
            Privacidade
          </Link>
        </nav>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <main className="flex-1 container mx-auto px-4 py-12 md:py-20">
        <section className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 flex items-center justify-center gap-3">
            <BusFrontIcon className="h-10 w-10 md:h-12 md:w-12 text-primary" />
            Meu Busão
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Acompanhe ônibus em tempo real no mapa. Escolha as linhas e veja onde estão agora.
          </p>
          <Button asChild size="lg" className="text-base">
            <Link href="/mapa">
              <MapPin className="h-5 w-5 mr-2" />
              Ver mapa
            </Link>
          </Button>
        </section>

        <section className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-16">
          <div className="flex flex-col items-center text-center p-4 rounded-lg border border-border bg-card">
            <Zap className="h-8 w-8 text-primary mb-3" />
            <h2 className="font-semibold mb-1">Tempo real</h2>
            <p className="text-sm text-muted-foreground">
              Posições atualizadas a cada poucos segundos.
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-4 rounded-lg border border-border bg-card">
            <LayoutGrid className="h-8 w-8 text-primary mb-3" />
            <h2 className="font-semibold mb-1">Várias linhas</h2>
            <p className="text-sm text-muted-foreground">
              Adicione quantas linhas quiser e acompanhe no mesmo mapa.
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-4 rounded-lg border border-border bg-card">
            <BusFrontIcon className="h-8 w-8 text-primary mb-3" />
            <h2 className="font-semibold mb-1">Simples</h2>
            <p className="text-sm text-muted-foreground">
              Sem cadastro. Digite o número da linha e comece.
            </p>
          </div>
        </section>

        <section className="text-center">
          <Button asChild variant="secondary" size="lg">
            <Link href="/mapa">Buscar linhas</Link>
          </Button>
        </section>
      </main>
      <Footer />
    </div>
  );
}
