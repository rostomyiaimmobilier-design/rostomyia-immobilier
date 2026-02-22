import Link from "next/link";
import { ArrowUpRight, MapPin, Sparkles } from "lucide-react";

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
  fr: {
    eyebrow: "Biens verifies",
    title: "Selection Rostomyia",
    subtitle: "Des opportunites recentes, qualifiees, et pretes pour visite.",
    cta: "Voir tous les biens",
    tag: "Premium",
    fallbackType: "Bien",
    fallbackPrice: "Prix sur demande",
    open: "Ouvrir",
    empty: "Aucun bien disponible pour le moment.",
  },
  ar: {
    eyebrow: "Biens verifies",
    title: "Mukhtarat Rostomyia",
    subtitle: "Aqars mohatara wa jadida, jahiza lil ziara.",
    cta: "Ard al kol",
    tag: "Moumayaz",
    fallbackType: "Aqar",
    fallbackPrice: "Al siir ala talab",
    open: "Ard",
    empty: "La yojad aqarat alan.",
  },
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
    <section className="relative mx-auto w-full max-w-[1320px] px-4 py-16 sm:px-6 lg:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(55%_120%_at_50%_-10%,rgba(201,167,98,0.2),transparent)]"
      />

      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--navy))]">
            <Sparkles size={12} />
            {t.eyebrow}
          </div>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[rgb(var(--navy))] md:text-4xl">
            {t.title}
          </h2>
          <p className="max-w-2xl text-sm text-black/60 md:text-base">{t.subtitle}</p>
        </div>

        <Link
          href="/biens"
          className="inline-flex items-center gap-2 rounded-xl bg-[rgb(var(--navy))] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-95"
        >
          {t.cta}
          <ArrowUpRight size={15} />
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-black/10 bg-white/70 px-6 py-10 text-center text-sm text-black/60">
          {t.empty}
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((p, index) => (
            <Link
              key={p.id}
              href={`/biens/${p.ref}`}
              className="group relative overflow-hidden rounded-3xl border border-black/10 bg-white/75 shadow-[0_16px_45px_-28px_rgba(15,23,42,0.45)] backdrop-blur transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_55px_-30px_rgba(15,23,42,0.55)] animate-in fade-in-0 slide-in-from-bottom-2"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="relative aspect-[16/10] bg-black/5">
                {p.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.coverUrl}
                    alt={p.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full bg-[radial-gradient(circle_at_30%_20%,rgba(10,18,35,0.12),transparent_52%)]" />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent opacity-85" />

                <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--navy))] backdrop-blur">
                  {p.type ?? t.fallbackType}
                </div>

                <div className="absolute right-3 top-3 rounded-full bg-[rgb(var(--gold))] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--navy))]">
                  {t.tag}
                </div>

                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3 rounded-xl border border-white/20 bg-black/35 px-3 py-2 backdrop-blur-sm">
                  <div className="inline-flex min-w-0 items-center gap-1.5 text-xs text-white/90">
                    <MapPin size={13} className="shrink-0" />
                    <span className="truncate">
                      {[p.district, p.city, p.location].filter(Boolean).join(" - ") || "-"}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium uppercase tracking-wide text-white/80">
                    {t.open}
                  </span>
                </div>
              </div>

              <div className="space-y-3 p-5">
                <div className="line-clamp-2 min-h-[2.75rem] text-[15px] font-semibold leading-tight text-[rgb(var(--navy))]">
                  {p.title}
                </div>

                <div className="flex items-center justify-between border-t border-black/10 pt-3">
                  <div className="text-lg font-semibold tracking-tight text-[rgb(var(--navy))]">
                    {typeof p.price === "number"
                      ? `${p.price.toLocaleString("fr-FR")} DZD`
                      : typeof p.price === "string" && p.price.trim().length > 0
                        ? p.price
                        : t.fallbackPrice}
                  </div>
                  <div className="inline-flex items-center gap-1 text-xs font-medium text-black/55 transition group-hover:text-[rgb(var(--navy))]">
                    {t.open}
                    <ArrowUpRight size={13} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
