export default function AgencyDashboardLoading() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[rgb(var(--brand-bg))] px-4 py-10 md:py-14">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full bg-[rgb(var(--gold))]/20 blur-3xl" />
        <div className="absolute right-0 top-16 h-[340px] w-[340px] rounded-full bg-[rgb(var(--navy))]/12 blur-3xl" />
      </div>

      <section className="relative mx-auto w-full max-w-[1400px] space-y-6 animate-pulse">
        <div className="rounded-3xl border border-black/10 bg-white/75 p-7 shadow-sm backdrop-blur md:p-10">
          <div className="h-3 w-36 rounded bg-black/10" />
          <div className="mt-3 h-10 w-64 rounded-xl bg-black/10" />
          <div className="mt-3 h-4 w-80 max-w-full rounded bg-black/10" />
        </div>

        <section className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="h-5 w-44 rounded bg-black/10" />
            <div className="h-8 w-24 rounded-full bg-black/10" />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-black/10 bg-white p-4">
                <div className="h-3 w-20 rounded bg-black/10" />
                <div className="mt-3 h-7 w-12 rounded bg-black/10" />
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 w-28 rounded-full bg-black/10" />
            ))}
          </div>

          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <article key={i} className="overflow-hidden rounded-[26px] border border-black/10 bg-white">
                <div className="grid gap-0 md:grid-cols-[260px_1fr]">
                  <div className="min-h-[190px] bg-black/10" />
                  <div className="space-y-3 p-4 md:p-5">
                    <div className="h-5 w-44 rounded bg-black/10" />
                    <div className="h-6 w-3/4 rounded bg-black/10" />
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: 3 }).map((__, j) => (
                        <div key={j} className="h-6 w-24 rounded-full bg-black/10" />
                      ))}
                    </div>
                    <div className="h-4 w-full rounded bg-black/10" />
                    <div className="grid gap-2 md:grid-cols-4">
                      {Array.from({ length: 4 }).map((__, j) => (
                        <div key={j} className="h-10 rounded-xl bg-black/10" />
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
