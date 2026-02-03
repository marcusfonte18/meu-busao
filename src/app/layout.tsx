import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "./QueryProvider";
import { BusSyncTrigger } from "./BusSyncTrigger";

export const metadata: Metadata = {
  title: "Meu Busao",
  description: "Visualize seu onibus em tempo real",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-black">
        <QueryProvider>
          <BusSyncTrigger />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
