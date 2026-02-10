import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "./QueryProvider";

export const metadata: Metadata = {
  title: "Meu Busão – Ônibus em tempo real",
  description:
    "Acompanhe ônibus em tempo real no mapa. Escolha as linhas e veja onde estão agora.",
  openGraph: {
    title: "Meu Busão – Ônibus em tempo real",
    description:
      "Acompanhe ônibus em tempo real no mapa. Escolha as linhas e veja onde estão agora.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Meu Busão – Ônibus em tempo real",
    description:
      "Acompanhe ônibus em tempo real no mapa. Escolha as linhas e veja onde estão agora.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="bg-background text-foreground">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
