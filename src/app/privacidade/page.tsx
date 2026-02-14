import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SearchHeroBg } from "@/components/SearchHeroBg";

export const metadata = {
  title: "Privacidade | Meu Busão",
  description: "Política de privacidade do Meu Busão.",
};

export default function PrivacidadePage() {
  return (
    <div className="relative min-h-[100dvh] search-hero-bg text-white overflow-hidden">
      <SearchHeroBg />
      <div className="relative z-10 container mx-auto px-4 py-12 max-w-3xl">
        <Link href="/">
          <Button variant="ghost" className="mb-8 text-white/80 hover:text-white hover:bg-white/10">
            ← Voltar
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-6 text-white">Política de privacidade</h1>
        <p className="text-white/60 text-sm mb-8">
          Última atualização: {new Date().toLocaleDateString("pt-BR")}
        </p>
        <div className="space-y-4 text-white/80">
          <p>
            O Meu Busão respeita sua privacidade. Esta política descreve como tratamos
            informações no uso do aplicativo.
          </p>
          <p>
            <strong className="text-white">Dados no dispositivo:</strong> As linhas de ônibus que você escolhe
            são armazenadas apenas no seu navegador (localStorage), no seu dispositivo.
            Não enviamos essas preferências para nossos servidores para identificá-lo.
          </p>
          <p>
            <strong className="text-white">Dados de uso:</strong> O acesso às páginas pode gerar logs técnicos
            (endereço IP, tipo de navegador, data/hora) no servidor, para operação e
            segurança. Não vendemos esses dados a terceiros.
          </p>
          <p>
            <strong className="text-white">Cookies:</strong> Podemos usar cookies ou tecnologias similares
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
