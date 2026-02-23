"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { Building2, MapPin } from "lucide-react";
import AppDropdown from "@/components/ui/app-dropdown";
import { DEFAULT_ORAN_QUARTIERS, ORAN_COMMUNES } from "@/lib/oran-locations";

const copy = {
  fr: {
    badge: "Oran • Immobilier premium",
    h1: "L’immobilier d’exception à Oran.",
    p: "Sélection soignée, visites rapides, accompagnement clair jusqu’à la signature.",
    primary: "Voir les biens",
    secondary: "Espace Agence",
    tertiary: "Déposer un bien",
  },
  ar: {
    badge: "وهران • عقارات مميزة",
    h1: "عقارات استثنائية في وهران.",
    p: "اختيارات مدروسة، زيارات سريعة، ومرافقة واضحة حتى التوقيع.",
    primary: "عرض العقارات",
    secondary: "فضاء الوكالات",
    tertiary: "اعرض عقارك",
  },
} as const;

const APARTMENT_TYPES = ["Studio", "F2", "F3", "F4", "F5", "T1", "T2", "T3", "T4", "T5", "T6"] as const;
const VILLA_LEVELS = ["R+1", "R+2", "R+3", "R+4", "R+5", "R+6"] as const;

type QuickDealType =
  | "Tous"
  | "Vente"
  | "Location"
  | "par_mois"
  | "six_mois"
  | "douze_mois"
  | "par_nuit"
  | "court_sejour";

type QuickInference = {
  category?: string;
  dealType?: QuickDealType;
  commune?: string;
};

type HomeQuartierItem = {
  name: string;
  commune: string | null;
};

type HomeHeroProps = {
  lang: "fr" | "ar";
  communes?: string[];
  quartiers?: HomeQuartierItem[];
};

function normalizeText(value: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function inferQuickFiltersFromQuery(
  rawQuery: string,
  options: {
    communes: readonly string[];
  }
): QuickInference {
  const queryNorm = normalizeText(rawQuery);
  if (!queryNorm) return {};

  const communesByLength = [...options.communes].sort((a, b) => b.length - a.length);

  const commune = communesByLength.find((item) => queryNorm.includes(normalizeText(item)));

  let dealType: QuickDealType | undefined;
  if (
    /\b(par\s*nuit|nuit|nightly|night)\b/.test(queryNorm)
  ) {
    dealType = "par_nuit";
  } else if (
    /\b(court\s*sejour|court\s*sejour|short\s*stay|sejour\s*court)\b/.test(queryNorm)
  ) {
    dealType = "court_sejour";
  } else if (
    /\b(12\s*mois|douze\s*mois|annuel|annuelle|annee|yearly)\b/.test(queryNorm)
  ) {
    dealType = "douze_mois";
  } else if (
    /\b(6\s*mois|six\s*mois)\b/.test(queryNorm)
  ) {
    dealType = "six_mois";
  } else if (
    /\b(par\s*mois|mensuel|mensuelle|monthly)\b/.test(queryNorm)
  ) {
    dealType = "par_mois";
  } else if (
    /\b(vente|a\s*vendre|vendre|sale|sell)\b/.test(queryNorm)
  ) {
    dealType = "Vente";
  } else if (
    /\b(location|a\s*louer|louer|rent|rental)\b/.test(queryNorm)
  ) {
    dealType = "Location";
  }

  let category: string | undefined;
  if (/\b(appartement|apartment|studio|f[2-6]|t[1-6])\b/.test(queryNorm)) {
    category = "appartement";
  } else if (/\b(villa)\b/.test(queryNorm)) {
    category = "villa";
  } else if (/\b(terrain|land)\b/.test(queryNorm)) {
    category = "terrain";
  } else if (/\b(local|shop|commercial)\b/.test(queryNorm)) {
    category = "local";
  } else if (/\b(bureau|office)\b/.test(queryNorm)) {
    category = "bureau";
  }

  return {
    category,
    dealType,
    commune,
  };
}

export default function HomeHero({ lang, communes = [], quartiers = [] }: HomeHeroProps) {
  const router = useRouter();
  const t = copy[lang];
  const isArabic = lang === "ar";
  const communeSource = communes.length > 0 ? communes : [...ORAN_COMMUNES];
  const communeMap = new Map<string, string>();
  communeSource.forEach((commune) => {
    const value = String(commune || "").replace(/\s+/g, " ").trim();
    const key = normalizeText(value);
    if (!key || communeMap.has(key)) return;
    communeMap.set(key, value);
  });
  const initialCommunes = communeMap.size
    ? Array.from(communeMap.values()).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }))
    : [...ORAN_COMMUNES];
  const initialCommune = initialCommunes.find((value) => normalizeText(value) === normalizeText("Bir El Djir"))
    ?? initialCommunes[0]
    ?? "";

  const [quick, setQuick] = useState<{
    q: string;
    dealType: QuickDealType;
    category: string;
    commune: string;
    district: string;
    rooms: string;
  }>({
    q: "",
    dealType: "douze_mois",
    category: "appartement",
    commune: initialCommune,
    district: "",
    rooms: "",
  });
  const communeOptions = useMemo(() => {
    const byNorm = new Map<string, string>();
    const source = communes.length > 0 ? communes : [...ORAN_COMMUNES];
    source.forEach((commune) => {
      const value = String(commune || "").replace(/\s+/g, " ").trim();
      const key = normalizeText(value);
      if (!key || byNorm.has(key)) return;
      byNorm.set(key, value);
    });
    return byNorm.size
      ? Array.from(byNorm.values()).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }))
      : [...ORAN_COMMUNES];
  }, [communes]);

  const quartierCatalog = useMemo(() => {
    const source = quartiers.length
      ? quartiers
      : DEFAULT_ORAN_QUARTIERS.map((name) => ({ name, commune: null as string | null }));
    const byKey = new Map<string, HomeQuartierItem>();
    source.forEach((row) => {
      const name = String(row.name || "").replace(/\s+/g, " ").trim();
      const commune = row.commune ? String(row.commune).replace(/\s+/g, " ").trim() : null;
      if (!name) return;
      const key = `${normalizeText(commune ?? "")}|${normalizeText(name)}`;
      if (!key || byKey.has(key)) return;
      byKey.set(key, { name, commune: commune || null });
    });
    return Array.from(byKey.values()).sort((a, b) => {
      const byCommune = String(a.commune ?? "").localeCompare(String(b.commune ?? ""), "fr", {
        sensitivity: "base",
      });
      if (byCommune !== 0) return byCommune;
      return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
    });
  }, [quartiers]);

  const allQuartierOptions = useMemo(
    () =>
      Array.from(new Set(quartierCatalog.map((item) => item.name))).sort((a, b) =>
        a.localeCompare(b, "fr", { sensitivity: "base" })
      ),
    [quartierCatalog]
  );

  const communeFilteredQuartiers = useMemo(() => {
    if (!quick.commune) return allQuartierOptions;
    const selectedCommune = normalizeText(quick.commune);
    const options = quartierCatalog
      .filter((item) => item.commune && normalizeText(item.commune) === selectedCommune)
      .map((item) => item.name);
    return options.length
      ? Array.from(new Set(options)).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }))
      : allQuartierOptions;
  }, [quick.commune, quartierCatalog, allQuartierOptions]);

  const dealTypeOptions: Array<{ value: QuickDealType; label: string }> = [
    { value: "Tous", label: lang === "ar" ? "الكل" : "Tous" },
    { value: "Vente", label: lang === "ar" ? "بيع" : "Vente" },
    { value: "Location", label: lang === "ar" ? "إيجار" : "Location" },
    { value: "par_mois", label: lang === "ar" ? "إيجار / شهري" : "Location / par mois" },
    { value: "six_mois", label: lang === "ar" ? "إيجار / 6 أشهر" : "Location / 6 mois" },
    { value: "douze_mois", label: lang === "ar" ? "إيجار / 12 شهر" : "Location / 12 mois" },
    { value: "par_nuit", label: lang === "ar" ? "إيجار / ليلة" : "Location / par nuit" },
    { value: "court_sejour", label: lang === "ar" ? "إيجار قصير المدى" : "Location / court sejour" },
  ];

  const categoryOptions = [
    { value: "", label: lang === "ar" ? "كل الفئات" : "Toutes categories" },
    { value: "appartement", label: lang === "ar" ? "شقة" : "Appartement" },
    { value: "villa", label: "Villa" },
    { value: "terrain", label: lang === "ar" ? "أرض" : "Terrain" },
    { value: "local", label: lang === "ar" ? "محل" : "Local" },
    { value: "bureau", label: lang === "ar" ? "مكتب" : "Bureau" },
  ];

  const districtOptions = useMemo(
    () => [
      {
        value: "",
        label: (
          <span className="inline-flex items-center gap-2">
            <MapPin size={14} className="text-[rgb(var(--navy))]/70" />
            {lang === "ar" ? "كل الأحياء" : "Tous quartiers"}
          </span>
        ),
      },
      ...communeFilteredQuartiers.map((quartier) => ({
        value: quartier,
        label: (
          <span className="inline-flex items-center gap-2">
            <MapPin size={14} className="text-[rgb(var(--navy))]/70" />
            {quartier}
          </span>
        ),
      })),
    ],
    [communeFilteredQuartiers, lang]
  );

  const roomOptions = useMemo(
    () => [
      {
        value: "",
        label: (
          <span className="inline-flex items-center gap-2">
            <Building2 size={14} className="text-amber-700/80" />
            {lang === "ar" ? "كل أنواع الشقق" : "Tous types d'appartements"}
          </span>
        ),
      },
      ...APARTMENT_TYPES.map((roomType) => ({
        value: roomType,
        label: (
          <span className="inline-flex items-center gap-2">
            <Building2 size={14} className="text-amber-700/80" />
            {roomType}
          </span>
        ),
      })),
    ],
    [lang]
  );

  const categoryDetailMode = quick.category === "appartement" ? "appartement" : quick.category === "villa" ? "villa" : "none";

  const categoryDetailOptions = useMemo(() => {
    if (categoryDetailMode === "appartement") {
      return roomOptions;
    }
    if (categoryDetailMode === "villa") {
      return [
        {
          value: "",
          label: (
            <span className="inline-flex items-center gap-2">
              <Building2 size={14} className="text-amber-700/80" />
              {lang === "ar" ? "كل مستويات R+" : "Tous niveaux R+"}
            </span>
          ),
        },
        ...VILLA_LEVELS.map((level) => ({
          value: level,
          label: (
            <span className="inline-flex items-center gap-2">
              <Building2 size={14} className="text-amber-700/80" />
              {level}
            </span>
          ),
        })),
      ];
    }
    return [
      {
        value: "",
        label: (
          <span className="inline-flex items-center gap-2">
            <Building2 size={14} className="text-amber-700/80" />
            {lang === "ar" ? "لا يوجد" : "Non"}
          </span>
        ),
      },
    ];
  }, [categoryDetailMode, lang, roomOptions]);

  function onQuickSearchSubmit(e: FormEvent) {
    e.preventDefault();

    const params = new URLSearchParams();
    const query = quick.q.trim();

    const inferred = inferQuickFiltersFromQuery(query, { communes: communeOptions });
    const district = quick.district;
    const categoryDetail = quick.rooms;
    const category = inferred.category ?? quick.category;
    const dealType = inferred.dealType ?? quick.dealType;
    const commune = inferred.commune ?? quick.commune;
    const searchQuery =
      category === "villa" && categoryDetail
        ? `${query} ${categoryDetail}`.trim()
        : query;

    if (searchQuery) params.set("q", searchQuery);
    if (district) params.set("district", district);
    if (category === "appartement" && categoryDetail) params.set("rooms", categoryDetail);
    if (dealType !== "Tous") params.set("dealType", dealType);
    if (category) params.set("category", category);
    if (commune) params.set("commune", commune);
    params.set("source", "home_quick_search");

    const href = params.toString() ? `/biens?${params.toString()}` : "/biens";
    router.push(href);
  }

  return (
    <section className="relative z-20 overflow-x-hidden overflow-y-visible">
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
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(112deg,rgba(249,244,235,0.88)_0%,rgba(243,232,214,0.68)_38%,rgba(24,34,66,0.24)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(186,154,92,0.2),transparent_44%),radial-gradient(circle_at_82%_15%,rgba(114,133,213,0.18),transparent_46%),linear-gradient(to_top,rgba(8,15,32,0.16),transparent_58%)]" />

      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[rgb(var(--gold))] blur-3xl opacity-15" />
        <div className="absolute -right-52 top-0 h-[620px] w-[620px] rounded-full bg-[rgb(var(--navy))] blur-3xl opacity-[0.06]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_12%,rgba(255,255,255,0.55),transparent_45%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-14 md:py-20">
        <div className="grid items-center gap-10 md:grid-cols-12">
          {/* LEFT */}
          <div className={`${isArabic ? "font-arabic-luxury" : ""} md:col-span-7`}>
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
              className={`${isArabic ? "font-arabic-luxury leading-[1.25]" : "font-display"} mt-5 text-4xl font-semibold tracking-tight text-[rgb(var(--navy))] md:text-6xl`}
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

              <Link
                href="/agency"
                className="inline-flex items-center justify-center rounded-2xl bg-white/80 px-5 py-3 text-sm font-medium text-[rgb(var(--navy))] backdrop-blur transition hover:bg-white"
              >
                {t.secondary}
              </Link>

              <Link
                href="/deposer"
                className="inline-flex items-center justify-center rounded-2xl bg-white/55 px-5 py-3 text-sm font-medium text-black/70 backdrop-blur transition hover:bg-white/75"
              >
                {t.tertiary}
              </Link>
            </motion.div>

            <motion.form
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
              onSubmit={onQuickSearchSubmit}
              className="relative z-40 mt-6 overflow-visible rounded-3xl border border-black/10 bg-white/72 p-4 shadow-[0_16px_38px_-28px_rgba(15,23,42,0.5)] backdrop-blur md:p-5"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[rgb(var(--navy))]/70">
                  {lang === "ar" ? "بحث سريع" : "Recherche rapide"}
                </div>
                <div className="text-xs text-black/55">
                  {lang === "ar" ? "الانتقال إلى العقارات" : "Redirection vers les biens"}
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-12">
                <div className="relative md:col-span-4">
                  <AppDropdown
                    value={quick.dealType}
                    onValueChange={(value) => setQuick((s) => ({ ...s, dealType: value as QuickDealType }))}
                    options={dealTypeOptions}
                  />
                </div>

                <div className="relative md:col-span-4">
                  <AppDropdown
                    value={quick.category}
                    onValueChange={(value) =>
                      setQuick((s) => ({
                        ...s,
                        category: value,
                        rooms: "",
                      }))
                    }
                    options={categoryOptions}
                  />
                </div>

                <div className="relative md:col-span-4">
                  <AppDropdown
                    value={quick.commune}
                    onValueChange={(value) =>
                      setQuick((s) => ({
                        ...s,
                        commune: value,
                        district: "",
                      }))
                    }
                    options={[
                      { value: "", label: lang === "ar" ? "كل البلديات" : "Toutes communes" },
                      ...communeOptions.map((commune) => ({ value: commune, label: commune })),
                    ]}
                  />
                </div>

                <div className="relative md:col-span-6">
                  <AppDropdown
                    value={quick.district}
                    onValueChange={(value) => setQuick((s) => ({ ...s, district: value }))}
                    options={districtOptions}
                  />
                </div>

                <div className="relative md:col-span-6">
                  <AppDropdown
                    value={quick.rooms}
                    onValueChange={(value) => setQuick((s) => ({ ...s, rooms: value }))}
                    options={categoryDetailOptions}
                    disabled={categoryDetailMode === "none"}
                  />
                </div>

                <div className="relative md:col-span-12">
                  <input
                    value={quick.q}
                    onChange={(e) => setQuick((s) => ({ ...s, q: e.target.value }))}
                    placeholder={lang === "ar" ? "كلمة مفتاحية..." : "Mot-cle..."}
                    className="h-11 w-full rounded-xl border border-black/10 bg-white/90 px-3 text-sm text-[rgb(var(--navy))] outline-none transition focus:border-[rgb(var(--navy))]/35"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[rgb(var(--navy))] px-4 text-sm font-semibold text-white transition hover:opacity-95 md:col-span-12"
                >
                  {lang === "ar" ? "بحث" : "Rechercher"}
                </button>
              </div>
            </motion.form>
          </div>

          {/* RIGHT visual */}
          <div className={`${isArabic ? "font-arabic-luxury" : ""} md:col-span-5`}>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.08 }}
              className="relative aspect-[4/5] overflow-hidden bg-white/50 backdrop-blur"
            >
              {/* If you have a hero photo, put it in /public/images/hero-oran.jpg */}
               <Image src="/images/hero-oran.jpg" alt={lang === "ar" ? "وهران" : "Oran"} fill priority className="object-cover" />

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
                lang === "ar" ? "زيارة سريعة" : "Visite rapide",
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
