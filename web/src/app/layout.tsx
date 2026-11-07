import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ESP32-CAM | Reconhecimento de Expressões Faciais",
  description:
    "Painel de monitoramento em tempo real e simulação por webcam para classificação de expressões faciais com YuNet e HSEmotion.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
