import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
    <div className="mx-3">
      <Card className="max-w-md mx-auto mt-10 px-2 md:px-0">
        <CardHeader>
          <CardTitle>Buscar Linha de Ônibus</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Digite o número da linha"
                value={linhaInput}
                onChange={(e) => setLinhaInput(e.target.value)}
              />
              <Button type="button" onClick={handleAddLinha}>
                Adicionar
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {linhas.map((linha) => (
                <Badge
                  key={linha}
                  onClick={() => handleRemoveLinha(linha)}
                  className="cursor-pointer"
                >
                  {linha} ✕
                </Badge>
              ))}
            </div>

            <Button type="submit" disabled={linhas.length === 0}>
              Iniciar Monitoramento
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
