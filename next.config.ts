import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  ...(process.env.BUILD_FOR_APP === "1"
    ? { output: "export" as const }
    : {}),
  // Build para Docker: gera .next/standalone (imagem menor)
  ...(process.env.DOCKER_BUILD === "1" ? { output: "standalone" as const } : {}),
};

export default nextConfig;
