"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/components/LanguageProvider";

export default function Navbar() {
  const { lang, setLang, dir } = useLang();
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);

      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();

        setIsAdmin(!!data?.is_admin);
      }
    }

    loadUser();

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
    setLang(newLang);
    document.cookie = `rostomyia_lang=${newLang}; path=/; max-age=31536000`;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
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

          <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/images/logo_rostomyia.PNG"
                alt="Rostomyia"
                width={120}
                height={120}
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

              {!user && (
                <>
                  <Link
                    href="/auth/login"
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50 transition"
                  >
                    {t.login}
                  </Link>

                  <Link
                    href="/auth/signup"
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:opacity-90 transition"
                  >
                    {t.signup}
                  </Link>
                </>
              )}

              {user && (
                <>
                  <Link
                    href="/account"
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50 transition"
                  >
                    {t.account}
                  </Link>

                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:opacity-90 transition"
                    >
                      {t.admin}
                    </Link>
                  )}

                  <button
                    onClick={handleLogout}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50 transition"
                  >
                    {t.logout}
                  </button>
                </>
              )}

              {/* Language Switch */}
              <div className="flex items-center gap-2">
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
