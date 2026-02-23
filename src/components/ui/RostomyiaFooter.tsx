"use client";

import Link from "next/link";
import Image from "next/image";
import { useLang } from "@/components/LanguageProvider";

const copy = {
  fr: {
    tagline:
      "Agence immobiliere premium a Oran. Vente, location et gestion de biens avec un accompagnement sur mesure.",
    city: "Oran, Algerie",
    premiumService: "Service premium",
    supportTag: "Conseil et suivi",
    navigation: "Navigation",
    home: "Accueil",
    listings: "Biens",
    contact: "Contact",
    needSupport: "Besoin d'un accompagnement ?",
    supportText:
      "Nous vous aidons a trouver le bien parfait, avec une approche premium.",
    rights: "Tous droits reserves.",
    design: "Design premium - Oran",
    phone: "Tel",
    address: "Adresse",
  },
  ar: {
    tagline:
      "وكالة عقارية فاخرة في وهران. بيع وكراء وتسيير العقارات بمرافقة مخصصة.",
    city: "وهران، الجزائر",
    premiumService: "خدمة فاخرة",
    supportTag: "استشارة ومتابعة",
    navigation: "التنقل",
    home: "الرئيسية",
    listings: "العقارات",
    contact: "اتصل بنا",
    needSupport: "تحتاج مرافقة؟",
    supportText:
      "نساعدك على العثور على العقار المناسب بخدمة فاخرة.",
    rights: "جميع الحقوق محفوظة.",
    design: "تصميم فاخر - وهران",
    phone: "الهاتف",
    address: "العنوان",
  },
} as const;

export default function RostomyiaFooter() {
  const { lang, dir } = useLang();
  const t = copy[lang];
  const agencyLabel = lang === "ar" ? "فضاء الوكالات" : "Espace Agence";

  return (
    <footer dir={dir} className="relative mt-auto overflow-hidden border-t border-white/10 bg-[#0B0F14] text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-64 w-[42rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-40 right-[-10rem] h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
      </div>

      <div aria-hidden className="relative">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-3">
          <div>
            <Link href="/" className="inline-flex items-center gap-4">
              <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
                <Image
                  src="/images/logo-rostomyia-white.PNG"
                  alt="Rostomyia Immobilier"
                  width={160}
                  height={160}
                  priority
                  className="h-auto w-[110px] sm:w-[130px]"
                />
              </div>
            </Link>

            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/70">
              {t.tagline}
            </p>

            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10 text-white/70">
                {t.city}
              </span>
              <span className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10 text-white/70">
                {t.premiumService}
              </span>
              <span className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10 text-white/70">
                {t.supportTag}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
              {t.navigation}
            </h3>

            <nav className="mt-4 grid gap-2 text-sm">
              <Link href="/" className="text-white/75 transition hover:text-white">
                {t.home}
              </Link>
              <Link href="/biens" className="text-white/75 transition hover:text-white">
                {t.listings}
              </Link>
              <Link href="/agency" className="text-white/75 transition hover:text-white">
                {agencyLabel}
              </Link>
              <Link href="/contact" className="text-white/75 transition hover:text-white">
                {t.contact}
              </Link>
            </nav>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
              {t.contact}
            </h3>

            <div className="mt-4 space-y-2 text-sm text-white/70">
              <p>
                Email: <span className="text-white/80">contact@rostomyia.com</span>
              </p>
              <p>
                {t.phone}: <span className="text-white/80">+213 ...</span>
              </p>
              <p>
                {t.address}: <span className="text-white/80">Oran</span>
              </p>
            </div>

            <div className="mt-5 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="text-sm font-semibold text-white/85">{t.needSupport}</div>
              <p className="mt-1 text-xs text-white/65">{t.supportText}</p>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} Rostomyia Immobilier. {t.rights}
          </span>
          <span className="text-white/50">{t.design}</span>
        </div>
      </div>
    </footer>
  );
}
