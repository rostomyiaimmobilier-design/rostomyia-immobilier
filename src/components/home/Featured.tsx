import Link from "next/link";

type Item = {
  id: string;
  ref: string;
  title: string;
  price?: number | string | null;
  type?: string | null;
  city?: string | null;
  district?: string | null;
  location?: string | null;
  coverUrl?: string | null;
};

const copy = {
  fr: { title: "Sélection Rostomyia", cta: "Tout voir", tag: "Premium" },
  ar: { title: "مختارات روستوميا", cta: "عرض الكل", tag: "مميز" },
} as const;

export default function Featured({
  lang,
  items,
}: {
  lang: "fr" | "ar";
  items: Item[];
}) {
  const t = copy[lang];

  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <div className="flex items-end justify-between gap-4">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-[rgb(var(--navy))] md:text-3xl">
          {t.title}
        </h2>

        <Link
          href="/biens"
          className="rounded-xl bg-white/80 px-3 py-2 text-sm text-black/70 backdrop-blur transition hover:bg-white"
        >
          {t.cta}
        </Link>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <Link
            key={p.id}
            href={`/biens/${p.ref}`}
            className="group overflow-hidden rounded-2xl bg-white/65 backdrop-blur transition-all duration-300 hover:-translate-y-1"
          >
            <div className="relative aspect-[4/3] bg-black/5">
              {p.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.coverUrl}
                  alt={p.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full bg-[radial-gradient(circle_at_30%_20%,rgba(10,18,35,0.10),transparent_50%)]" />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-80" />

              <div className="absolute left-3 top-3 rounded-full bg-white/85 px-3 py-1 text-xs backdrop-blur">
                <span className="text-[rgb(var(--navy))]">
                  {p.type ?? (lang === "ar" ? "عقار" : "Bien")}
                </span>
              </div>

              <div className="absolute right-3 top-3 rounded-full bg-[rgb(var(--gold))] px-3 py-1 text-xs font-semibold text-[rgb(var(--navy))]">
                {t.tag}
              </div>
            </div>

            <div className="p-4">
              <div className="line-clamp-1 text-sm font-semibold text-[rgb(var(--navy))]">
                {p.title}
              </div>

              <div className="mt-1 text-xs text-black/55">
                {[p.district, p.city, p.location].filter(Boolean).join(" • ") || "-"}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="text-base font-semibold tracking-tight text-[rgb(var(--navy))]">
                  {typeof p.price === "number"
                    ? `${p.price.toLocaleString("fr-FR")} DZD`
                    : typeof p.price === "string" && p.price.trim().length > 0
                    ? p.price
                    : lang === "ar"
                    ? "السعر عند الطلب"
                    : "Prix sur demande"}
                </div>
                <div className="text-xs text-black/55">
                  {lang === "ar" ? "عرض" : "Voir"}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
