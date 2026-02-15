export default function BiensLoading() {
  return (
    <main className="mx-auto max-w-6xl p-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="h-9 w-64 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-5 w-96 max-w-full animate-pulse rounded-lg bg-slate-100" />
        </div>

        <div className="flex w-full flex-col gap-3 md:w-[520px] md:flex-row">
          <div className="h-12 w-full animate-pulse rounded-xl bg-slate-100" />
          <div className="h-12 w-40 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>

      <div className="mt-6 h-5 w-28 animate-pulse rounded-lg bg-slate-100" />

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <article
            key={i}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
          >
            <div className="aspect-[4/3] animate-pulse bg-slate-200" />
            <div className="space-y-3 p-4">
              <div className="h-5 w-4/5 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-3/5 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-2/5 animate-pulse rounded bg-slate-100" />
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
