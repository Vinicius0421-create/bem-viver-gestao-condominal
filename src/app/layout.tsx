import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

// Inter: tipografia funcional para UI e dados (tabelas financeiras densas).
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Playfair Display: serifada elegante para títulos institucionais,
// reforçando o posicionamento premium da marca (preto e dourado).
const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Bem Viver | Sistema de Gestão Condominial",
    template: "%s | Bem Viver",
  },
  description:
    "Sistema de gestão condominial da Bem Viver Assessoria — prestação de contas, financeiro e administração de condomínios.",
  manifest: "/manifest.json",
  // Favicon/ícone principal: convenção de arquivo do Next.js
  // (src/app/icon.svg + src/app/favicon.ico + src/app/apple-icon.png) já
  // gera as tags automaticamente — não redeclarar aqui para não duplicar.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Bem Viver",
  },
};

export const viewport: Viewport = {
  themeColor: "#0e0d0b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
