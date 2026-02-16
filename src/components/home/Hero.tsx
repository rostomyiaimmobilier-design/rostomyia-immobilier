"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

const WHATSAPP = "https://wa.me/213556195427";

const copy = {
  fr: {
    badge: "Oran • Immobilier premium",
    h1: "L’immobilier d’exception à Oran.",
    p: "Sélection soignée, visites rapides, accompagnement clair jusqu’à la signature.",
    primary: "Voir les biens",
    secondary: "WhatsApp",
    tertiary: "Déposer un bien",
    waMsg: "Bonjour Rostomyia, je souhaite publier un bien ou réserver une visite.",
  },
  ar: {
    badge: "وهران • عقارات مميزة",
    h1: "عقارات استثنائية في وهران.",
    p: "اختيارات مدروسة، زيارات سريعة، ومرافقة واضحة حتى التوقيع.",
    primary: "عرض العقارات",
    secondary: "واتساب",
    tertiary: "اعرض عقارك",
    waMsg: "السلام عليكم Rostomyia، أريد نشر عقار أو حجز زيارة.",
  },
} as const;

export default function HomeHero({ lang }: { lang: "fr" | "ar" }) {
  const t = copy[lang];
  const waLink = `${WHATSAPP}?text=${encodeURIComponent(t.waMsg)}`;

  return (
    <section className="relative overflow-hidden">
      {/* Hero background image */}
      <div className="pointer-events-none absolute inset-0">
        <Image
          src="/images/background.png"
          alt={lang === "ar" ? "خلفية وهران" : "Oran background"}
          fill
          priority
          className="object-cover object-center saturate-[1.2] contrast-110 brightness-[0.9]"
          sizes="100vw"
        />
      </div>

      {/* Readability overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(112deg,rgba(249,244,235,0.94)_0%,rgba(243,232,214,0.8)_38%,rgba(24,34,66,0.38)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(186,154,92,0.28),transparent_40%),radial-gradient(circle_at_82%_15%,rgba(114,133,213,0.28),transparent_42%),linear-gradient(to_top,rgba(8,15,32,0.32),transparent_55%)]" />

      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[rgb(var(--gold))] blur-3xl opacity-15" />
        <div className="absolute -right-52 top-0 h-[620px] w-[620px] rounded-full bg-[rgb(var(--navy))] blur-3xl opacity-[0.06]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_12%,rgba(255,255,255,0.55),transparent_45%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-14 md:py-20">
        <div className="grid items-center gap-10 md:grid-cols-12">
          {/* LEFT */}
          <div className="md:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="inline-flex items-center gap-2 rounded-full bg-white/65 px-4 py-1.5 text-sm backdrop-blur"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--gold))]" />
              <span className="text-[rgb(var(--navy))]/70">{t.badge}</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: "easeOut", delay: 0.05 }}
              className="font-display mt-5 text-4xl font-semibold tracking-tight text-[rgb(var(--navy))] md:text-6xl"
            >
              {t.h1}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: "easeOut", delay: 0.1 }}
              className="mt-4 max-w-xl text-base leading-relaxed text-black/60 md:text-lg"
            >
              {t.p}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
              className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Link
                href="/biens"
                className="inline-flex items-center justify-center rounded-2xl bg-[rgb(var(--navy))] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95"
              >
                {t.primary}
              </Link>

              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-2xl bg-white/80 px-5 py-3 text-sm font-medium text-[rgb(var(--navy))] backdrop-blur transition hover:bg-white"
              >
                {t.secondary}
              </a>

              <Link
                href="/deposer"
                className="inline-flex items-center justify-center rounded-2xl bg-white/55 px-5 py-3 text-sm font-medium text-black/70 backdrop-blur transition hover:bg-white/75"
              >
                {t.tertiary}
              </Link>
            </motion.div>

            {/* Trust row */}
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
              {[
                { a: "+100", b: lang === "ar" ? "عقار" : "biens" },
                { a: "Oran", b: lang === "ar" ? "وأطرافها" : "et alentours" },
                { a: lang === "ar" ? "< 1 ساعة" : "< 1h", b: lang === "ar" ? "استجابة" : "réponse" },
              ].map((x) => (
                <div
                  key={x.a}
                  className="rounded-2xl bg-white/60 p-4 backdrop-blur"
                >
                  <div className="text-sm font-semibold text-[rgb(var(--navy))]">
                    {x.a}
                  </div>
                  <div className="text-xs text-black/55">{x.b}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT visual */}
          <div className="md:col-span-5">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.08 }}
              className="relative aspect-[4/5] overflow-hidden bg-white/50 backdrop-blur"
            >
              {/* If you have a hero photo, put it in /public/images/hero-oran.jpg */}
               <Image src="/images/hero-oran.jpg" alt="Oran" fill priority className="object-cover" />

              {/* Premium placeholder */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(10,18,35,0.10),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(201,167,98,0.18),transparent_55%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(10,18,35,0.05))]" />

              <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-white/70 p-4 backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[rgb(var(--navy))]">
                      {lang === "ar" ? "اختيارات راقية" : "Sélection standing"}
                    </div>
                    <div className="text-xs text-black/55">
                      {lang === "ar"
                        ? "شقق • فيلات • قطع أرض"
                        : "Appartements • Villas • Terrains"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[rgb(var(--gold))] px-3 py-2 text-xs font-semibold text-[rgb(var(--navy))]">
                    {lang === "ar" ? "وهران" : "Oran"}
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-black/55">
              {[
                lang === "ar" ? "موثّق" : "Vérifié",
                lang === "ar" ? "زيارة بسرعة" : "Visite rapide",
                lang === "ar" ? "مرافقة" : "Accompagnement",
              ].map((chip) => (
                <span
                  key={chip}
                  className="rounded-full bg-white/70 px-3 py-1 backdrop-blur"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
