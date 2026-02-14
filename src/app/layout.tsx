import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "./QueryProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });

export const metadata: Metadata = {
  title: "BusTracker Rio",
  description: "Monitore linhas de ônibus e BRT em tempo real no Rio de Janeiro",
  openGraph: {
    title: "BusTracker Rio",
    description: "Monitore linhas de ônibus e BRT em tempo real no Rio de Janeiro",
  },
  twitter: {
    card: "summary_large_image",
    title: "BusTracker Rio",
    description: "Monitore linhas de ônibus e BRT em tempo real no Rio de Janeiro",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d9488",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased bg-background text-foreground`}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
