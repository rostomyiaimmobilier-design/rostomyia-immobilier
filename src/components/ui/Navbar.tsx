"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CircleUserRound } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";
import { createClient } from "@/lib/supabase/client";

type AuthUserState = {
  email: string | null;
  accountType: string | null;
  displayName: string | null;
};

export default function Navbar() {
  const { lang, setLang, dir } = useLang();
  const router = useRouter();
  const pathname = usePathname();

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUserState | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    const applyUser = (
      user: {
        email?: string | null;
        user_metadata?: Record<string, unknown> | null;
      } | null
    ) => {
      if (!isMounted) return;
      if (!user) {
        setAuthUser(null);
        return;
      }
      const meta = user.user_metadata ?? {};
      const accountType = typeof meta.account_type === "string" ? meta.account_type : null;
      const candidates = [
        meta.full_name,
        meta.username,
        meta.name,
        meta.agency_name,
        user.email,
      ];
      const displayName =
        candidates
          .map((value) => (typeof value === "string" ? value.trim() : ""))
          .find((value) => value.length > 0) ?? null;

      setAuthUser({
        email: user.email ?? null,
        accountType,
        displayName,
      });
    };

    supabase.auth.getUser().then(({ data }) => applyUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const t = {
    fr: {
      home: "Accueil",
      listings: "Biens",
      submit: "Proposer un bien",
      contact: "Contact",
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
      login: "دخول",
      signup: "إنشاء حساب",
      account: "حسابي",
      logout: "تسجيل الخروج",
      admin: "لوحة التحكم",
    },
  }[lang];
  const agencyLabel = lang === "ar" ? "فضاء الوكالات" : "Espace Agence";

  const shouldSkipRefreshOnLangSwitch = (() => {
    const p = String(pathname ?? "");
    if (!p) return false;
    if (p.startsWith("/proposer")) return true;
    if (p.startsWith("/admin/protected/new")) return true;
    if (/^\/admin\/protected\/[^/]+$/.test(p)) return true;
    return false;
  })();

  const changeLang = (newLang: "fr" | "ar") => {
    if (newLang === lang) return;
    setLang(newLang);
    // Keep selected files/state intact on upload/edit screens.
    if (!shouldSkipRefreshOnLangSwitch) {
      router.refresh();
    }
  };

  const isAgencyUser = authUser?.accountType === "agency";
  const isAdminUser = authUser?.accountType === "admin" || authUser?.accountType === "super_admin";
  const accountHref = isAgencyUser ? "/agency/dashboard" : "/account";
  const displayIdentity =
    authUser?.displayName ||
    authUser?.email?.split("@")[0] ||
    (lang === "ar" ? "حساب" : "Compte");

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
              <Link className="nav-link" href="/agency">{agencyLabel}</Link>
              <Link className="nav-link" href="/contact">{t.contact}</Link>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-3 md:flex">
                {authUser ? (
                  isAdminUser ? (
                    <>
                      <Link
                        href="/admin"
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm transition hover:bg-slate-50"
                      >
                        {t.admin}
                      </Link>
                      <Link
                        href="/admin/protected/profile"
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm transition hover:bg-slate-50"
                      >
                        Profile
                      </Link>
                    </>
                  ) : (
                    <Link
                      href={accountHref}
                      aria-label={t.account}
                      title={`${t.account} - ${displayIdentity}`}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                    >
                      <CircleUserRound size={18} />
                      <span className="sr-only">{t.account}</span>
                    </Link>
                  )
                ) : (
                  <>
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
                  </>
                )}
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
                href="/agency"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                {agencyLabel}
              </Link>
              <Link
                href="/contact"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                {t.contact}
              </Link>

              <div className="mt-2 space-y-2 border-t border-slate-200 pt-3">
                {authUser ? (
                  isAdminUser ? (
                    <>
                      <Link
                        href="/admin"
                        onClick={() => setMobileOpen(false)}
                        className="block rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        {t.admin}
                      </Link>
                      <Link
                        href="/admin/protected/profile"
                        onClick={() => setMobileOpen(false)}
                        className="block rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Profile
                      </Link>
                    </>
                  ) : (
                    <Link
                      href={accountHref}
                      onClick={() => setMobileOpen(false)}
                      aria-label={t.account}
                      title={`${t.account} - ${displayIdentity}`}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                    >
                      <CircleUserRound size={18} />
                      <span className="sr-only">{t.account}</span>
                    </Link>
                  )
                ) : (
                  <>
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
                  </>
                )}
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

