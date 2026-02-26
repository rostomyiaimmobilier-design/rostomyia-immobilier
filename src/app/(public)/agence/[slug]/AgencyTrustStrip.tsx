import { BadgeCheck, ShieldCheck, Star } from "lucide-react";
import type { AgencyStorefrontData } from "./storefront-data";

export default function AgencyTrustStrip({ data }: { data: AgencyStorefrontData }) {
  const badges = data.nativeStudio.trust_badges.length
    ? data.nativeStudio.trust_badges
    : [
        "Conseillers verifies",
        "Dossiers juridiquement controles",
        "Accompagnement bancaire et notarial",
      ];

  return (
    <section className="mx-auto w-full px-4 pb-3 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.42)]">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
          <ShieldCheck size={12} />
          Confiance
        </span>
        {badges.map((badge, index) => (
          <span
            key={`${badge}-${index}`}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600"
          >
            {index % 2 === 0 ? <BadgeCheck size={12} /> : <Star size={12} />}
            {badge}
          </span>
        ))}
      </div>
    </section>
  );
}

