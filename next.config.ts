import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  ...(process.env.BUILD_FOR_APP === "1"
    ? { output: "export" as const }
    : {}),
};

export default nextConfig;
