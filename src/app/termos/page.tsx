import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Termos de uso | Meu Busão",
  description: "Termos de uso do Meu Busão.",
};

export default function TermosPage() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Link href="/">
          <Button variant="ghost" className="mb-8">
            ← Voltar
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-6">Termos de uso</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Última atualização: {new Date().toLocaleDateString("pt-BR")}
        </p>
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-4 text-muted-foreground">
          <p>
            Ao acessar e usar o Meu Busão, você concorda com estes termos. O serviço oferece
            visualização de ônibus em tempo real com base em dados de fontes públicas.
          </p>
          <p>
            O uso do aplicativo é por sua conta e risco. Não garantimos disponibilidade
            contínua nem precisão absoluta das posições exibidas. Os dados são fornecidos
            “como estão”.
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
