import type { Metadata } from "next";
import {
  Manrope,
  Cormorant_Garamond,
  Geist_Mono,
  Noto_Naskh_Arabic,
  Amiri,
} from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

import { LanguageProvider } from "@/components/LanguageProvider";
import { LANG_COOKIE_KEY, LEGACY_LANG_COOKIE_KEY, langToDir, normalizeLang } from "@/lib/i18n";


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

const arabicSans = Noto_Naskh_Arabic({
  variable: "--font-arabic-sans",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

const arabicDisplay = Amiri({
  variable: "--font-arabic-display",
  subsets: ["arabic"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Rostomyia Immobilier",
  description: "Agence immobilière à Oran, Algérie",
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    shortcut: ["/icon.png"],
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const lang = normalizeLang(
    cookieStore.get(LANG_COOKIE_KEY)?.value ?? cookieStore.get(LEGACY_LANG_COOKIE_KEY)?.value
  );

  return (
    <html lang={lang} dir={langToDir(lang)} className="dark">
      <body
        className={`${manrope.variable} ${cormorant.variable} ${geistMono.variable} ${arabicSans.variable} ${arabicDisplay.variable} min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--text))] antialiased`}
      >
        <LanguageProvider initialLang={lang}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
