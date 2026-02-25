"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  LANG_COOKIE_KEY,
  LANG_STORAGE_KEY,
  LEGACY_LANG_COOKIE_KEY,
  langToDir,
  type Lang,
} from "@/lib/i18n";

type LangContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  dir: "ltr" | "rtl";
};

const LangContext = createContext<LangContextValue | null>(null);

export default function LanguageProvider({
  children,
  initialLang,
}: {
  children: React.ReactNode;
  initialLang: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = langToDir(lang);
  }, [lang]);

  const setLang = useCallback((nextLang: Lang) => {
    setLangState(nextLang);
    localStorage.setItem(LANG_STORAGE_KEY, nextLang);
    document.cookie = `${LANG_COOKIE_KEY}=${nextLang}; path=/; max-age=31536000; samesite=lax`;
    document.cookie = `${LEGACY_LANG_COOKIE_KEY}=${nextLang}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  const value = useMemo<LangContextValue>(() => {
    return { lang, setLang, dir: langToDir(lang) };
  }, [lang, setLang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LanguageProvider");
  return ctx;
}
