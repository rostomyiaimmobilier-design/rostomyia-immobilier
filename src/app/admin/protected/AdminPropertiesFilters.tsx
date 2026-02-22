"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, RefreshCcw, Search, SlidersHorizontal } from "lucide-react";
import AppDropdown from "@/components/ui/app-dropdown";

type CategoryOption = {
  value: string;
  label: string;
};

type AdminPropertiesFiltersProps = {
  initialQ: string;
  initialTransaction: string;
  initialCategory: string;
  initialCover: string;
  totalCount: number;
  filteredCount: number;
  categoryOptions: CategoryOption[];
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

export default function AdminPropertiesFilters({
  initialQ,
  initialTransaction,
  initialCategory,
  initialCover,
  totalCount,
  filteredCount,
  categoryOptions,
}: AdminPropertiesFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [q, setQ] = useState(initialQ);
  const [transaction, setTransaction] = useState(initialTransaction || "all");
  const [category, setCategory] = useState(initialCategory);
  const [cover, setCover] = useState(initialCover || "all");

  useEffect(() => {
    const timer = setTimeout(() => {
      const current = searchParams?.toString() ?? "";
      const params = new URLSearchParams(current);

      setOrDelete(params, "q", q);
      setOrDelete(params, "transaction", transaction, "all");
      setOrDelete(params, "category", category);
      setOrDelete(params, "cover", cover, "all");
      params.delete("page");

      const next = params.toString();
      if (next === current) return;

      const href = next ? `${pathname}?${next}` : pathname;
      startTransition(() => {
        router.replace(href, { scroll: false });
      });
    }, AUTO_APPLY_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [q, transaction, category, cover, pathname, router, searchParams]);

  return (
    <div className="mb-4 rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm">
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

      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <label className="space-y-1 text-sm lg:col-span-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-black/50">Recherche</span>
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/45" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Titre, ref, localisation, description..."
              className="h-10 w-full rounded-xl border border-black/10 bg-white pl-9 pr-3 outline-none transition focus:border-[rgb(var(--navy))]/40"
            />
          </div>
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-black/50">Transaction</span>
          <AppDropdown
            value={transaction}
            onValueChange={setTransaction}
            triggerClassName="h-10"
            options={[
              { value: "all", label: "toutes" },
              { value: "sale", label: "vente" },
              { value: "location", label: "location" },
              { value: "par_mois", label: "par mois" },
              { value: "six_mois", label: "6 mois" },
              { value: "douze_mois", label: "12 mois" },
              { value: "par_nuit", label: "par nuit" },
              { value: "court_sejour", label: "court sejour" },
            ]}
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-black/50">Categories</span>
          <AppDropdown
            value={category}
            onValueChange={setCategory}
            triggerClassName="h-10"
            options={[
              { value: "", label: "toutes" },
              ...categoryOptions.map((item) => ({ value: item.value, label: item.label })),
            ]}
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-black/50">Visuel</span>
          <AppDropdown
            value={cover}
            onValueChange={setCover}
            triggerClassName="h-10"
            options={[
              { value: "all", label: "tous" },
              { value: "with", label: "avec cover" },
              { value: "without", label: "sans cover" },
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
