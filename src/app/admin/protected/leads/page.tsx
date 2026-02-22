import Link from "next/link";
import { ArrowRight, Building2, CalendarCheck2, Home, ListChecks, Sparkles, UserRoundPlus } from "lucide-react";

export default function LeadsHome() {
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/75 p-6 shadow-sm backdrop-blur md:p-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 -top-16 h-56 w-56 rounded-full bg-[rgb(var(--gold))]/18 blur-3xl" />
          <div className="absolute right-0 top-8 h-52 w-52 rounded-full bg-[rgb(var(--navy))]/10 blur-3xl" />
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--gold))]/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
            <Sparkles size={14} />
            Lead Center
          </div>
          <h1 className="mt-3 text-3xl font-extrabold text-[rgb(var(--navy))]">Centre de validation leads</h1>
          <p className="mt-2 max-w-2xl text-sm text-black/65">
            Centralisez les depots proprietaires, les depots agences et les demandes de visite dans un seul flux de travail.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-black/10 bg-white/85 p-3 text-sm text-black/70">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--navy))]/80">
                <Home size={13} />
                Owner Leads
              </div>
              <div className="mt-1 text-xs text-black/55">Qualification et validation des biens particuliers.</div>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white/85 p-3 text-sm text-black/70">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--navy))]/80">
                <Building2 size={13} />
                Depot Agences
              </div>
              <div className="mt-1 text-xs text-black/55">Controle des demandes externes avant publication.</div>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white/85 p-3 text-sm text-black/70">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--navy))]/80">
                <CalendarCheck2 size={13} />
                Viewing Requests
              </div>
              <div className="mt-1 text-xs text-black/55">Tri des demandes clients et planification rapide.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/protected/leads/owners"
          className="group relative overflow-hidden rounded-3xl border border-black/10 bg-white/82 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[rgb(var(--navy))]/8 blur-2xl" />
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgb(var(--navy))] text-white">
            <Home size={18} />
          </div>
          <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2 py-0.5 text-[11px] font-medium text-black/60">
            <UserRoundPlus size={12} />
            Proprio
          </div>
          <h2 className="mt-4 text-xl font-bold text-[rgb(var(--navy))]">Owner Leads</h2>
          <p className="mt-1 text-sm text-black/60">Depots de biens par vendeurs et bailleurs.</p>
          <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[rgb(var(--navy))]">
            Ouvrir
            <ArrowRight size={14} className="transition group-hover:translate-x-1" />
          </span>
        </Link>

        <Link
          href="/admin/protected/leads/depot-tiers"
          className="group relative overflow-hidden rounded-3xl border border-black/10 bg-white/82 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[rgb(var(--gold))]/20 blur-2xl" />
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgb(var(--navy))]/10 text-[rgb(var(--navy))]">
            <Building2 size={18} />
          </div>
          <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2 py-0.5 text-[11px] font-medium text-black/60">
            <ListChecks size={12} />
            Tierce partie
          </div>
          <h2 className="mt-4 text-xl font-bold text-[rgb(var(--navy))]">Depots agences</h2>
          <p className="mt-1 text-sm text-black/60">Demandes agences a valider avant publication.</p>
          <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[rgb(var(--navy))]">
            Ouvrir
            <ArrowRight size={14} className="transition group-hover:translate-x-1" />
          </span>
        </Link>

        <Link
          href="/admin/protected/leads/visits"
          className="group relative overflow-hidden rounded-3xl border border-black/10 bg-white/82 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[rgb(var(--navy))]/8 blur-2xl" />
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
