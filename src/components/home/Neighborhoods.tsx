// src/components/home/Neighborhoods.tsx
import Link from "next/link";

const copy = {
  fr: { title: "Quartiers à Oran", note: "Filtre rapide" },
  ar: { title: "أحياء في وهران", note: "فلتر سريع" },
} as const;

const items = [
  { label_fr: "Akid Lotfi", label_ar: "العقيد لطفي", q: "Akid Lotfi" },
  { label_fr: "Canastel", label_ar: "كاناستيل", q: "Canastel" },
  { label_fr: "Maraval", label_ar: "مارافال", q: "Maraval" },
  { label_fr: "Les Castors", label_ar: "الكاستور", q: "Castors" },
  { label_fr: "Gambetta", label_ar: "غامبيتا", q: "Gambetta" },
  { label_fr: "Centre-ville", label_ar: "وسط المدينة", q: "Centre" },
];

export default function Neighborhoods({ lang }: { lang: "fr" | "ar" }) {
  const t = copy[lang];

  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <div className="flex items-end justify-between gap-4">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-[rgb(var(--navy))] md:text-3xl">
          {t.title}
        </h2>
        <div className="text-sm text-foreground/60">{t.note}</div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {items.map((x) => (
          <Link
            key={x.q}
            href={`/biens?district=${encodeURIComponent(x.q)}`}
            className="rounded-full bg-white/65 px-4 py-2 text-sm text-foreground/80 backdrop-blur transition hover:bg-white/85"
          >
            {lang === "ar" ? x.label_ar : x.label_fr}
          </Link>
        ))}
      </div>
    </section>
  );
}
