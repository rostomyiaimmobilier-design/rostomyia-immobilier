"use client";

import { useLang } from "@/components/LanguageProvider";

export default function AboutPage() {
  const { lang, dir } = useLang();
  const t =
    lang === "ar"
      ? {
          title: "من نحن",
          text: "روستوميا للعقار - من نحن",
        }
      : {
          title: "A propos",
          text: "Rostomyia Immobilier - A propos",
        };

  return (
    <main dir={dir} className="p-10">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <p className="mt-2 text-slate-600">{t.text}</p>
    </main>
  );
}
