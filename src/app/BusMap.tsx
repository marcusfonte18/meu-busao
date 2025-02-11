import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBusData } from "./useBusData";
import { MapView } from "./MapView";

export const BusMap = ({
  selectedLinha,
  onClearSelectedLinha,
}: {
  selectedLinha: Array<string>;
  onClearSelectedLinha: any;
}) => {
  const { data: buses, isLoading } = useBusData(selectedLinha);

  // Componente de Loading Personalizado com Tailwind
  if (isLoading || !buses) {
    return (
      <div className="flex justify-center items-center h-screen bg-black">
        <div className="text-center flex flex-col justify-center items-center ">
          {/* Spinner com Tailwind */}
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-white">Carregando...</p> {/* Texto branco */}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl lg:text-2xl">
            Mapa de Ônibus em Tempo Real - Linhas {selectedLinha.join(", ")}
          </CardTitle>
          <div className="mt-4">
            <Button
              onClick={onClearSelectedLinha}
              className="bg-red-500 text-white w-auto px-6 py-2"
            >
              Limpar Linhas
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] w-full rounded-lg overflow-hidden">
            <MapView buses={buses} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
