import type { Metadata } from "next";
import { Manrope, Cormorant_Garamond, Geist_Mono } from "next/font/google";
import "./globals.css";

import { LanguageProvider } from "@/components/LanguageProvider";
import AppLayoutShell from "@/components/AppLayoutShell";


const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rostomyia Immobilier",
  description: "Agence immobilière à Oran, Algérie",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body className={`${manrope.variable} ${cormorant.variable} ${geistMono.variable} min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--text))] antialiased`}>
        <LanguageProvider>
          <AppLayoutShell>{children}</AppLayoutShell>
        </LanguageProvider>
      </body>
    </html>
  );
}
