import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.BUILD_FOR_APP === "1"
    ? { output: "export" as const }
    : {}),
};

export default nextConfig;
