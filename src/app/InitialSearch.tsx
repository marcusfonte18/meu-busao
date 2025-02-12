import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bus, Plus, X } from "lucide-react";

export const InitialSearch = ({
  onSearch,
}: {
  onSearch: (linhas: string[]) => void;
}) => {
  const [linhaInput, setLinhaInput] = useState("");
  const [linhas, setLinhas] = useState<string[]>([]);

  const handleAddLinha = () => {
    const linhaTrim = linhaInput.trim();
    if (linhaTrim && !linhas.includes(linhaTrim)) {
      setLinhas([...linhas, linhaTrim]);
      setLinhaInput("");
    }
  };

  const handleRemoveLinha = (linha: string) => {
    setLinhas(linhas.filter((l) => l !== linha));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (linhas.length > 0) {
      onSearch(linhas);
    }
  };

  return (
    <div className="w-full min-h-[100dvh] flex items-start justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md shadow-lg border-0 mt-8">
        <CardHeader className="pb-2 space-y-2">
          <CardTitle className="text-xl font-bold flex items-center">
            <Bus className="h-5 w-5 mr-2 text-primary" />
            Buscar Linha de Ônibus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Digite o número da linha"
                value={linhaInput}
                onChange={(e) => setLinhaInput(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleAddLinha}
                variant="secondary"
                className="flex-shrink-0"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>

            {linhas.length > 0 && (
              <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                {linhas.map((linha) => (
                  <Badge
                    key={linha}
                    variant="secondary"
                    className="cursor-pointer bg-black text-white transition-colors py-1 px-3"
                    onClick={() => handleRemoveLinha(linha)}
                  >
                    {linha}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}

            <Button
              type="submit"
              disabled={linhas.length === 0}
              className="w-full mt-2"
            >
              <Bus className="h-4 w-4 mr-2" />
              Iniciar Monitoramento
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default InitialSearch;
