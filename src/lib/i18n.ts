export type Lang = "fr" | "ar";

export const LANG_COOKIE_KEY = "rostomyia_lang";
export const LEGACY_LANG_COOKIE_KEY = "lang";
export const LANG_STORAGE_KEY = "rostomyia_lang";

export function normalizeLang(input: string | null | undefined): Lang {
  return input === "ar" ? "ar" : "fr";
}

export function langToDir(lang: Lang): "ltr" | "rtl" {
  return lang === "ar" ? "rtl" : "ltr";
}
