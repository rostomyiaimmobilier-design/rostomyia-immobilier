"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import PropertyCard from "@/components/PropertyCard";
import { useLang } from "@/components/LanguageProvider";

export type PropertyItem = {
  id: string;
  ref: string; // used in URL /biens/[ref]
  title: string;
  type: "Vente" | "Location";
  price: string;
  location: string;
  beds: number;
  baths: number;
  area: number;
  images: string[];
};

type Mode = "Tous" | "Vente" | "Location";
type Lang = "fr" | "ar";

const dict: Record<
  Lang,
  { title: string; sub: string; searchPh: string; all: string; sale: string; rent: string; results: string }
> = {
  fr: {
    title: "Nos biens à Oran",
    sub: "Découvrez les meilleures offres de Rostomyia Immobilier.",
    searchPh: "Recherche: T3, Canastel, Villa…",
    all: "Tous",
    sale: "Vente",
    rent: "Location",
    results: "résultat(s)",
  },
  ar: {
    title: "عقاراتنا في وهران",
    sub: "تصفح أفضل عروض روستوميا للعقار.",
    searchPh: "بحث: T3، كاناستيل، فيلا…",
    all: "الكل",
    sale: "بيع",
    rent: "كراء",
    results: "نتيجة",
  },
};

export default function ListingsClient({ items }: { items: PropertyItem[] }) {
  const { lang, dir } = useLang();
  const t = dict[lang];

  const [q, setQ] = useState("");
  const [mode, setMode] = useState<Mode>("Tous");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return items.filter((p) => {
      const byMode = mode === "Tous" ? true : p.type === mode;

      const haystack = `${p.title} ${p.location} ${p.price}`.toLowerCase();
      const byQ = query ? haystack.includes(query) : true;

      return byMode && byQ;
    });
  }, [items, q, mode]);

  return (
    <main dir={dir} className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-[rgb(var(--gold))] blur-3xl opacity-15" />
        <div className="absolute -right-52 top-0 h-[560px] w-[560px] rounded-full bg-[rgb(var(--navy))] blur-3xl opacity-[0.06]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_10%,rgba(255,255,255,0.75),transparent_45%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-14">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[rgb(var(--navy))] md:text-4xl">
              {t.title}
            </h1>
            <p className="mt-2 text-black/60">{t.sub}</p>
          </div>

          <div className="flex w-full flex-col gap-3 md:w-[520px] md:flex-row">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.searchPh}
              className="w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm shadow-sm outline-none backdrop-blur focus:border-black/20"
            />

            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              className="rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm shadow-sm outline-none backdrop-blur focus:border-black/20"
            >
              <option value="Tous">{t.all}</option>
              <option value="Vente">{t.sale}</option>
              <option value="Location">{t.rent}</option>
            </select>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut", delay: 0.08 }}
          className="mt-6 inline-flex rounded-full border border-black/5 bg-white/60 px-3 py-1 text-sm text-black/60 shadow-sm backdrop-blur"
        >
          {filtered.length} {t.results}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.12 }}
          className="mt-6 grid gap-6 md:grid-cols-3"
        >
          {filtered.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </motion.div>
      </div>
    </main>
  );
}
