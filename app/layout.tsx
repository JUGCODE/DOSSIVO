import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://dossivo-outcome-workbench.xugv.chatgpt.site"),
  alternates: { canonical: "/", languages: { zh: "/zh/", en: "/en/", it: "/it/", "x-default": "/" } },
  title: "Dossivo 合规结果平台 | Piattaforma risultati di conformità",
  description: "把复杂合规要求转化为买方可核查的结果。Trasforma requisiti complessi in risultati verificabili dai buyer.",
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
