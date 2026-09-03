import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FinSecure-MCP | Autonomous AML Forensic Engine",
  description: "Enterprise AML Multi-Hop Graph Triage Engine powered by Model Context Protocol (MCP) & Google Gemini 2.5 Flash",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-amber-500/30 selection:text-amber-200">
        {children}
      </body>
    </html>
  );
}
