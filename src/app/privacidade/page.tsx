import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Privacidade | Meu Busão",
  description: "Política de privacidade do Meu Busão.",
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-[100dvh] overflow-hidden bg-background text-foreground">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <Link href="/">
          <Button variant="ghost" className="mb-8 text-primary hover:text-primary/80">
            ← Voltar
          </Button>
        </Link>
        <h1 className="mb-6 text-3xl font-bold text-foreground">Política de privacidade</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Última atualização: {new Date().toLocaleDateString("pt-BR")}
        </p>
        <div className="space-y-4 text-muted-foreground">
          <p>
            O Meu Busão respeita sua privacidade. Esta política descreve como tratamos
            informações no uso do aplicativo.
          </p>
          <p>
            <strong className="text-foreground">Dados no dispositivo:</strong> As linhas de ônibus que você escolhe
            são armazenadas apenas no seu navegador (localStorage), no seu dispositivo.
            Não enviamos essas preferências para nossos servidores para identificá-lo.
          </p>
          <p>
            <strong className="text-foreground">Dados de uso:</strong> O acesso às páginas pode gerar logs técnicos
            (endereço IP, tipo de navegador, data/hora) no servidor, para operação e
            segurança. Não vendemos esses dados a terceiros.
          </p>
          <p>
            <strong className="text-foreground">Cookies:</strong> Podemos usar cookies ou tecnologias similares
            estritamente necessárias ao funcionamento do site. Você pode configurar
            seu navegador para recusar cookies.
          </p>
          <p>
            Alterações nesta política serão publicadas nesta página. Em caso de dúvidas,
            utilize os canais de contato indicados no site.
          </p>
        </div>
      </div>
    </div>
  );
}
