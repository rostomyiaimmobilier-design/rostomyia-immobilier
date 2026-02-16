import Link from "next/link";
import { ArrowRight, CalendarCheck2, Home, Sparkles } from "lucide-react";

export default function LeadsHome() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-black/10 bg-white/75 p-6 shadow-sm backdrop-blur md:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--gold))]/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
          <Sparkles size={14} />
          Lead Center
        </div>
        <h1 className="mt-3 text-3xl font-extrabold text-[rgb(var(--navy))]">Leads</h1>
        <p className="mt-2 text-sm text-black/60">Gerer les depots de biens et les demandes de visite.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/protected/leads/owners"
          className="group rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgb(var(--navy))] text-white">
            <Home size={18} />
          </div>
          <h2 className="mt-4 text-xl font-bold text-[rgb(var(--navy))]">Owner Leads</h2>
          <p className="mt-1 text-sm text-black/60">Depots de biens par vendeurs et bailleurs.</p>
          <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[rgb(var(--navy))]">
            Ouvrir
            <ArrowRight size={14} className="transition group-hover:translate-x-1" />
          </span>
        </Link>

        <Link
          href="/admin/protected/leads/visits"
          className="group rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgb(var(--gold))]/75 text-[rgb(var(--navy))]">
            <CalendarCheck2 size={18} />
          </div>
          <h2 className="mt-4 text-xl font-bold text-[rgb(var(--navy))]">Viewing Requests</h2>
          <p className="mt-1 text-sm text-black/60">Demandes de visite clients et planification.</p>
          <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[rgb(var(--navy))]">
            Ouvrir
            <ArrowRight size={14} className="transition group-hover:translate-x-1" />
          </span>
        </Link>
      </section>
    </div>
  );
}
