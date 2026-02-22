type AdminPageLoaderProps = {
  badge?: string;
  title?: string;
  subtitle?: string;
  cards?: number;
  rows?: number;
};

export default function AdminPageLoader({
  badge = "Chargement",
  title = "Chargement en cours...",
  subtitle = "Preparation des donnees",
  cards = 6,
  rows = 3,
}: AdminPageLoaderProps) {
  return (
    <div className="space-y-7 animate-pulse">
      <section className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/75 p-6 shadow-sm backdrop-blur md:p-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 -top-16 h-56 w-56 rounded-full bg-[rgb(var(--gold))]/18 blur-3xl" />
          <div className="absolute right-0 top-8 h-52 w-52 rounded-full bg-[rgb(var(--navy))]/10 blur-3xl" />
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="relative">
            <div className="inline-flex rounded-full bg-[rgb(var(--navy))]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
              {badge}
            </div>
            <div className="mt-3 h-8 w-72 rounded-xl bg-black/10" />
            <div className="mt-2 h-4 w-96 max-w-full rounded-lg bg-black/10" />
            <div className="mt-3 h-9 w-52 rounded-xl bg-black/10" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 w-36 rounded-2xl bg-black/10" />
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: cards }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-black/10 bg-white p-4">
              <div className="h-3 w-24 rounded bg-black/10" />
              <div className="mt-3 h-8 w-12 rounded bg-black/10" />
            </div>
          ))}
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="h-14 rounded-2xl bg-black/10" />
          <div className="h-14 rounded-2xl bg-black/10" />
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="h-6 w-48 rounded bg-black/10" />
            <div className="mt-2 h-4 w-64 rounded bg-black/10" />
          </div>
          <div className="h-8 w-28 rounded-xl bg-black/10" />
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: rows }).map((_, i) => (
            <article
              key={i}
              className="overflow-hidden rounded-3xl border border-black/10 bg-white/80 shadow-sm backdrop-blur"
            >
              <div className="h-52 w-full bg-black/10" />
              <div className="space-y-4 p-5">
                <div className="h-6 w-40 rounded bg-black/10" />
                <div className="h-4 w-28 rounded bg-black/10" />
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 4 }).map((__, j) => (
                    <div key={j} className="h-6 w-20 rounded-full bg-black/10" />
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="h-10 w-24 rounded-xl bg-black/10" />
                  <div className="h-10 w-24 rounded-xl bg-black/10" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <span className="sr-only">
        {title} - {subtitle}
      </span>
    </div>
  );
}
