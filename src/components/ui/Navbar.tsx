"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/components/LanguageProvider";

export default function Navbar() {
  const { lang, setLang, dir } = useLang();
  const router = useRouter();

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const t = {
    fr: {
      home: "Accueil",
      listings: "Biens",
      submit: "Proposer un bien",
      contact: "Contact",
      about: "À propos",
      login: "Connexion",
      signup: "Inscription",
      account: "Mon compte",
      logout: "Déconnexion",
      admin: "Admin",
    },
    ar: {
      home: "الرئيسية",
      listings: "العقارات",
      submit: "اعرض عقارك",
      contact: "اتصل بنا",
      about: "من نحن",
      login: "دخول",
      signup: "إنشاء حساب",
      account: "حسابي",
      logout: "تسجيل الخروج",
      admin: "لوحة التحكم",
    },
  }[lang];

  const changeLang = (newLang: "fr" | "ar") => {
    if (newLang === lang) return;
    setLang(newLang);
    router.refresh();
  };

  return (
    <div dir={dir}>
      <nav className="sticky top-0 z-50">
        <div
          className={`relative border-b transition-all duration-300 ${
            scrolled
              ? "bg-white/80 backdrop-blur-xl shadow-lg border-black/10"
              : "bg-white/60 backdrop-blur-md border-black/5"
          }`}
        >
          {/* Gold ambient glow */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(201,167,98,0.15),transparent_40%)]" />

          <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6 md:py-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/images/logo_rostomyia.PNG"
                alt="Rostomyia"
                width={120}
                height={120}
                className="h-10 w-auto md:h-12"
              />
            </Link>

            {/* Desktop Links */}
            <div className="hidden gap-8 text-sm font-medium text-slate-700 md:flex">
              <Link className="nav-link" href="/">{t.home}</Link>
              <Link className="nav-link" href="/biens">{t.listings}</Link>
              <Link className="nav-link" href="/proposer">{t.submit}</Link>
              <Link className="nav-link" href="/contact">{t.contact}</Link>
              <Link className="nav-link" href="/a-propos">{t.about}</Link>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-3 md:flex">
                <Link
                  href="/auth/login"
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm transition hover:bg-slate-50"
                >
                  {t.login}
                </Link>

                <Link
                  href="/auth/signup"
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white transition hover:opacity-90"
                >
                  {t.signup}
                </Link>
              </div>

              {/* Language Switch */}
              <div className="hidden items-center gap-2 md:flex">
                <button
                  onClick={() => changeLang("fr")}
                  className={`rounded-lg px-3 py-2 text-sm border transition ${
                    lang === "fr"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  FR
                </button>

                <button
                  onClick={() => changeLang("ar")}
                  className={`rounded-lg px-3 py-2 text-sm border transition ${
                    lang === "ar"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  AR
                </button>
              </div>

              {/* Mobile Controls */}
              <div className="flex items-center gap-2 md:hidden">
                <button
                  onClick={() => changeLang("fr")}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                    lang === "fr"
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  FR
                </button>
                <button
                  onClick={() => changeLang("ar")}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                    lang === "ar"
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  AR
                </button>
                <button
                  type="button"
                  aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
                  aria-expanded={mobileOpen}
                  onClick={() => setMobileOpen((open) => !open)}
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                >
                  <span
                    className={`absolute h-0.5 w-4 bg-current transition ${
                      mobileOpen ? "rotate-45" : "-translate-y-1.5"
                    }`}
                  />
                  <span
                    className={`absolute h-0.5 w-4 bg-current transition ${
                      mobileOpen ? "opacity-0" : "opacity-100"
                    }`}
                  />
                  <span
                    className={`absolute h-0.5 w-4 bg-current transition ${
                      mobileOpen ? "-rotate-45" : "translate-y-1.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          <div
            className={`overflow-hidden border-t border-black/5 transition-all duration-300 md:hidden ${
              mobileOpen ? "max-h-[80vh] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="space-y-2 bg-white/95 px-4 py-3 backdrop-blur-xl">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                {t.home}
              </Link>
              <Link
                href="/biens"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                {t.listings}
              </Link>
              <Link
                href="/proposer"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                {t.submit}
              </Link>
              <Link
                href="/contact"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                {t.contact}
              </Link>
              <Link
                href="/a-propos"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                {t.about}
              </Link>

              <div className="mt-2 space-y-2 border-t border-slate-200 pt-3">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  {t.login}
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg bg-slate-900 px-3 py-2 text-center text-sm font-medium text-white transition hover:opacity-90"
                >
                  {t.signup}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hover underline style */}
      <style jsx global>{`
        .nav-link {
          position: relative;
          padding-bottom: 4px;
        }

        .nav-link::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: 0;
          height: 2px;
          width: 100%;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 200ms ease;
          background: rgba(201, 167, 98, 0.9);
          border-radius: 999px;
        }

        .nav-link:hover::after {
          transform: scaleX(1);
        }
      `}</style>
    </div>
  );
}
