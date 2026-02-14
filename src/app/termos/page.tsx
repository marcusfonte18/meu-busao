import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Termos de uso | Meu Busão",
  description: "Termos de uso do Meu Busão.",
};

export default function TermosPage() {
  return (
    <div className="min-h-[100dvh] overflow-hidden bg-background text-foreground">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <Link href="/">
          <Button variant="ghost" className="mb-8 text-primary hover:text-primary/80">
            ← Voltar
          </Button>
        </Link>
        <h1 className="mb-6 text-3xl font-bold text-foreground">Termos de uso</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Última atualização: {new Date().toLocaleDateString("pt-BR")}
        </p>
        <div className="space-y-4 text-muted-foreground">
          <p>
            Ao acessar e usar o Meu Busão, você concorda com estes termos. O serviço oferece
            visualização de ônibus em tempo real com base em dados de fontes públicas.
          </p>
          <p>
            O uso do aplicativo é por sua conta e risco. Não garantimos disponibilidade
            contínua nem precisão absoluta das posições exibidas. Os dados são fornecidos
            &quot;como estão&quot;.
          </p>
          <p>
            Você se compromete a não usar o serviço para fins ilegais ou que prejudiquem
            terceiros. Reservamo-nos o direito de alterar estes termos; o uso continuado
            após alterações constitui aceitação.
          </p>
          <p>
            Para dúvidas, entre em contato através dos canais indicados no site.
          </p>
        </div>
      </div>
    </div>
  );
}
