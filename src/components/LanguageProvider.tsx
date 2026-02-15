"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "fr" | "ar";

type LangContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  dir: "ltr" | "rtl";
};

const LangContext = createContext<LangContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    const saved = (localStorage.getItem("rostomyia_lang") as Lang | null) ?? "fr";
    setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("rostomyia_lang", l);
  };

  const value = useMemo<LangContextValue>(() => {
    return { lang, setLang, dir: lang === "ar" ? "rtl" : "ltr" };
  }, [lang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LanguageProvider");
  return ctx;
}
