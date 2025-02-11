"use client";

import React, { useState } from "react";

import { InitialSearch } from "./InitialSearch";
import { BusMap } from "./BusMap";

export default function Home() {
  const [selectedLine, setSelectedLine] = useState<Array<string>>([]);

  if (selectedLine.length === 0) {
    return <InitialSearch onSearch={setSelectedLine} />;
  }

  return (
    <BusMap
      onClearSelectedLinha={() => setSelectedLine([])}
      selectedLinha={selectedLine}
    />
  );
}
