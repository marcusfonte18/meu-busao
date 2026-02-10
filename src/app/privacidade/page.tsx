import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Privacidade | Meu Busão",
  description: "Política de privacidade do Meu Busão.",
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Link href="/">
          <Button variant="ghost" className="mb-8">
            ← Voltar
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-6">Política de privacidade</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Última atualização: {new Date().toLocaleDateString("pt-BR")}
        </p>
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-4 text-muted-foreground">
          <p>
            O Meu Busão respeita sua privacidade. Esta política descreve como tratamos
            informações no uso do aplicativo.
          </p>
          <p>
            <strong>Dados no dispositivo:</strong> As linhas de ônibus que você escolhe
            são armazenadas apenas no seu navegador (localStorage), no seu dispositivo.
            Não enviamos essas preferências para nossos servidores para identificá-lo.
          </p>
          <p>
            <strong>Dados de uso:</strong> O acesso às páginas pode gerar logs técnicos
            (endereço IP, tipo de navegador, data/hora) no servidor, para operação e
            segurança. Não vendemos esses dados a terceiros.
          </p>
          <p>
            <strong>Cookies:</strong> Podemos usar cookies ou tecnologias similares
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
