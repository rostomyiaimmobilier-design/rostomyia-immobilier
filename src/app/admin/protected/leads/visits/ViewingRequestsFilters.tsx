"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, RefreshCcw, Search, SlidersHorizontal } from "lucide-react";
import AppDropdown from "@/components/ui/app-dropdown";

type ViewingRequestsFiltersProps = {
  initialQ: string;
  initialStatus: string;
  initialLang: string;
  initialCreatedWithin: string;
  totalCount: number;
  filteredCount: number;
};

const AUTO_APPLY_DEBOUNCE_MS = 350;

function setOrDelete(params: URLSearchParams, key: string, value: string, defaultValue = "") {
  const next = value.trim();
  if (!next || next === defaultValue) {
    params.delete(key);
    return;
  }
  params.set(key, next);
}

export default function ViewingRequestsFilters({
  initialQ,
  initialStatus,
  initialLang,
  initialCreatedWithin,
  totalCount,
  filteredCount,
}: ViewingRequestsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [q, setQ] = useState(initialQ);
  const [status, setStatus] = useState(initialStatus || "all");
  const [lang, setLang] = useState(initialLang || "all");
  const [createdWithin, setCreatedWithin] = useState(initialCreatedWithin);

  useEffect(() => {
    const timer = setTimeout(() => {
      const current = searchParams?.toString() ?? "";
      const params = new URLSearchParams(current);

      setOrDelete(params, "q", q);
      setOrDelete(params, "status", status, "all");
      setOrDelete(params, "lang", lang, "all");
      setOrDelete(params, "created_within", createdWithin);

      const next = params.toString();
      if (next === current) return;

      const href = next ? `${pathname}?${next}` : pathname;
      startTransition(() => {
        router.replace(href, { scroll: false });
      });
    }, AUTO_APPLY_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [q, status, lang, createdWithin, pathname, router, searchParams]);

  return (
    <div className="mt-5 rounded-2xl border border-black/10 bg-gradient-to-b from-white to-slate-50/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 rounded-xl bg-[rgb(var(--navy))]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
          <SlidersHorizontal size={14} />
          Filtres avances
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-black/65">
          {isPending ? <Loader2 size={13} className="animate-spin" /> : null}
          Resultats: {filteredCount} / {totalCount}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-black/50">Recherche</span>
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/45" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nom, telephone, ref, message..."
              className="h-10 w-full rounded-xl border border-black/10 bg-white pl-9 pr-3 outline-none transition focus:border-[rgb(var(--navy))]/40"
            />
          </div>
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-black/50">Statut</span>
          <AppDropdown
            value={status}
            onValueChange={setStatus}
            triggerClassName="h-10"
            options={[
              { value: "all", label: "tous" },
              { value: "new", label: "nouveau" },
              { value: "contacted", label: "contacte" },
              { value: "scheduled", label: "planifie" },
              { value: "closed", label: "ferme" },
            ]}
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-black/50">Langue</span>
          <AppDropdown
            value={lang}
            onValueChange={setLang}
            triggerClassName="h-10"
            options={[
              { value: "all", label: "toutes" },
              { value: "fr", label: "FR" },
              { value: "ar", label: "AR" },
            ]}
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-black/50">Creation</span>
          <AppDropdown
            value={createdWithin}
            onValueChange={setCreatedWithin}
            triggerClassName="h-10"
            options={[
              { value: "", label: "toutes" },
              { value: "7", label: "7 jours" },
              { value: "30", label: "30 jours" },
              { value: "90", label: "90 jours" },
            ]}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex h-10 items-center gap-2 rounded-xl bg-[rgb(var(--navy))]/8 px-4 text-sm font-medium text-[rgb(var(--navy))]">
          <SlidersHorizontal size={14} />
          Recherche automatique active
        </div>
        <Link
          href={pathname}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm font-medium text-[rgb(var(--navy))] transition hover:bg-black/5"
        >
          <RefreshCcw size={14} />
          Reinitialiser
        </Link>
      </div>
    </div>
  );
}
