import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBusData } from "./useBusData";
import { Bus, Loader2, X } from "lucide-react";
import { BusMarkers } from "./MapView";
import dynamic from "next/dynamic";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);

const LoadingState = () => (
  <div className="flex justify-center items-center h-[100dvh] bg-gray-100 dark:bg-gray-900">
    <div className="text-center flex flex-col justify-center items-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Carregando dados dos ônibus...</p>
    </div>
  </div>
);

export const BusMap = ({
  selectedLinha,
  onClearSelectedLinha,
}: {
  selectedLinha: Array<string>;
  onClearSelectedLinha: () => void;
}) => {
  const { data: buses, isLoading } = useBusData(selectedLinha);

  if (isLoading || !buses) {
    return <LoadingState />;
  }

  return (
    <div className="w-full h-[100dvh] flex flex-col">
      <Card className="flex-1 flex flex-col border-0 shadow-lg m-0 rounded-none md:m-4 md:rounded-lg">
        <CardHeader className="pb-2 px-4 pt-4">
          <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center justify-between">
            <CardTitle className="text-lg sm:text-xl font-bold flex items-center flex-wrap">
              <Bus className="h-5 w-5 mr-2 text-primary flex-shrink-0" />
              <span className="flex-shrink-0">
                Mapa de Ônibus em Tempo Real
              </span>
              {selectedLinha.length > 0 && (
                <span className="ml-2 text-muted-foreground text-sm sm:text-base whitespace-nowrap">
                  - Linhas {selectedLinha.join(", ")}
                </span>
              )}
            </CardTitle>
            <Button
              onClick={onClearSelectedLinha}
              variant="destructive"
              className="w-full sm:w-auto"
              size="sm"
            >
              <X className="h-4 w-4 mr-2" />
              Limpar Linhas
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <div className="h-full w-full overflow-hidden rounded-b-none md:rounded-b-lg">
            <MapContainer
              center={[-22.9068, -43.1729]}
              zoom={13}
              style={{ height: "100%", width: "100%" }}
              className="z-0"
              zoomControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <BusMarkers buses={buses} />
            </MapContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusMap;
