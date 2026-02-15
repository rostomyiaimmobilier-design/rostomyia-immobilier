import Link from "next/link";

export default function LeadsHome() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Leads</h1>
      <p className="mt-2 text-sm text-black/60">
        Gérer les dépôts de biens et les demandes de visite.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/leads/owners"
          className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm hover:bg-white"
        >
          <div className="text-lg font-semibold">Owner Leads</div>
          <div className="mt-1 text-sm text-black/60">
            Déposer un bien (vendeurs/bailleurs)
          </div>
        </Link>

        <Link
          href="/admin/leads/visits"
          className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm hover:bg-white"
        >
          <div className="text-lg font-semibold">Viewing Requests</div>
          <div className="mt-1 text-sm text-black/60">
            Réserver une visite
          </div>
        </Link>
      </div>
    </div>
  );
}
