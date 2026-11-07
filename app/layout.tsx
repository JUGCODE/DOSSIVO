import type { Metadata } from "next";
import "./globals.css";
import {UILanguageProvider} from "./ui-language";

export const metadata: Metadata = {
  metadataBase: new URL("https://dossivo-outcome-workbench.xugv.chatgpt.site"),
  alternates: { canonical: "/", languages: { zh: "/zh/", en: "/en/", it: "/it/", "x-default": "/" } },
  title: "DOSSIVO",
  description: "DOSSIVO",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased"><UILanguageProvider>{children}</UILanguageProvider></body>
    </html>
  );
}
