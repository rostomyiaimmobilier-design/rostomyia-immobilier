"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Filter,
  ImageIcon,
  Loader2,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tags,
  X,
} from "lucide-react";
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
const TRANSACTION_OPTIONS = [
  { value: "all", label: "toutes" },
  { value: "sale", label: "vente" },
  { value: "location", label: "location" },
  { value: "par_mois", label: "par mois" },
  { value: "six_mois", label: "6 mois" },
  { value: "douze_mois", label: "12 mois" },
  { value: "par_nuit", label: "par nuit" },
  { value: "court_sejour", label: "court sejour" },
] as const;

const COVER_OPTIONS = [
  { value: "all", label: "tous" },
  { value: "with", label: "avec cover" },
  { value: "without", label: "sans cover" },
] as const;

const QUICK_TRANSACTION_OPTIONS = [
  { value: "all", label: "Toutes" },
  { value: "sale", label: "Vente" },
  { value: "location", label: "Location" },
  { value: "par_nuit", label: "Par nuit" },
  { value: "court_sejour", label: "Court sejour" },
] as const;

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

  const transactionLabel =
    TRANSACTION_OPTIONS.find((item) => item.value === transaction)?.label ?? transaction;
  const categoryLabel =
    (categoryOptions.find((item) => item.value === category)?.label ?? category) || "toutes";
  const coverLabel = COVER_OPTIONS.find((item) => item.value === cover)?.label ?? cover;
  const hasActiveFilters =
    q.trim().length > 0 || transaction !== "all" || category.trim().length > 0 || cover !== "all";
  const activeFiltersCount = Number(q.trim().length > 0) + Number(transaction !== "all") + Number(category.trim().length > 0) + Number(cover !== "all");

  return (
    <section className="mb-5 overflow-hidden rounded-3xl border border-black/10 bg-[linear-gradient(140deg,rgba(255,255,255,0.98),rgba(245,249,255,0.95))] p-4 shadow-sm md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-xl bg-[rgb(var(--navy))]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
            <SlidersHorizontal size={14} />
            Filtres avances
          </div>
          <h2 className="text-base font-semibold text-black/85 md:text-lg">Pilotage rapide du catalogue biens</h2>
          <p className="text-xs text-black/55">Les filtres s&apos;appliquent automatiquement avec synchronisation URL.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/90 px-3 py-1.5 text-xs font-semibold text-black/70">
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Filter size={13} />}
            Resultats: {filteredCount} / {totalCount}
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--gold))]/30 bg-[rgb(var(--gold))]/15 px-3 py-1.5 text-xs font-semibold text-[rgb(var(--navy))]">
            <Sparkles size={13} />
            Actifs: {activeFiltersCount}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-6">
        <label className="space-y-1 text-sm lg:col-span-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-black/50">Recherche globale</span>
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/45" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Titre, ref, localisation, description..."
              className="h-11 w-full rounded-xl border border-black/10 bg-white/95 pl-9 pr-3 outline-none transition focus:border-[rgb(var(--navy))]/45"
            />
          </div>
        </label>

        <label className="space-y-1 text-sm">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-black/50">
            <Tags size={12} />
            Transaction
          </span>
          <AppDropdown
            value={transaction}
            onValueChange={setTransaction}
            triggerClassName="h-11"
            options={TRANSACTION_OPTIONS.map((item) => ({ value: item.value, label: item.label }))}
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-black/50">
            <Tags size={12} />
            Categories
          </span>
          <AppDropdown
            value={category}
            onValueChange={setCategory}
            triggerClassName="h-11"
            options={[
              { value: "", label: "toutes" },
              ...categoryOptions.map((item) => ({ value: item.value, label: item.label })),
            ]}
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-black/50">
            <ImageIcon size={12} />
            Visuel
          </span>
          <AppDropdown
            value={cover}
            onValueChange={setCover}
            triggerClassName="h-11"
            options={COVER_OPTIONS.map((item) => ({ value: item.value, label: item.label }))}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {QUICK_TRANSACTION_OPTIONS.map((option) => {
          const isActive = transaction === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTransaction(option.value)}
              className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold transition ${
                isActive
                  ? "border-[rgb(var(--gold))]/55 bg-[rgb(var(--gold))]/18 text-[rgb(var(--navy))]"
                  : "border-black/10 bg-white text-black/65 hover:bg-black/[0.03]"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-black/10 pt-4">
        <div className="inline-flex h-10 items-center gap-2 rounded-xl bg-[rgb(var(--navy))]/8 px-4 text-sm font-medium text-[rgb(var(--navy))]">
          <Sparkles size={14} />
          Recherche automatique active
        </div>
        {hasActiveFilters ? (
          <div className="flex flex-wrap items-center gap-2">
            {q.trim() ? (
              <button
                type="button"
                onClick={() => setQ("")}
                className="inline-flex h-9 items-center gap-1 rounded-full border border-black/10 bg-white px-3 text-xs font-semibold text-black/65 hover:bg-black/[0.03]"
              >
                q: {q.trim().slice(0, 18)}
                <X size={12} />
              </button>
            ) : null}
            {transaction !== "all" ? (
              <button
                type="button"
                onClick={() => setTransaction("all")}
                className="inline-flex h-9 items-center gap-1 rounded-full border border-black/10 bg-white px-3 text-xs font-semibold text-black/65 hover:bg-black/[0.03]"
              >
                {transactionLabel}
                <X size={12} />
              </button>
            ) : null}
            {category.trim() ? (
              <button
                type="button"
                onClick={() => setCategory("")}
                className="inline-flex h-9 items-center gap-1 rounded-full border border-black/10 bg-white px-3 text-xs font-semibold text-black/65 hover:bg-black/[0.03]"
              >
                {categoryLabel}
                <X size={12} />
              </button>
            ) : null}
            {cover !== "all" ? (
              <button
                type="button"
                onClick={() => setCover("all")}
                className="inline-flex h-9 items-center gap-1 rounded-full border border-black/10 bg-white px-3 text-xs font-semibold text-black/65 hover:bg-black/[0.03]"
              >
                {coverLabel}
                <X size={12} />
              </button>
            ) : null}
          </div>
        ) : (
          <div className="inline-flex h-9 items-center rounded-full border border-dashed border-black/15 bg-white/70 px-3 text-xs font-medium text-black/45">
            Aucun filtre actif
          </div>
        )}
        <Link
          href={pathname}
          className="ml-auto inline-flex h-10 items-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm font-medium text-[rgb(var(--navy))] transition hover:bg-black/5"
        >
          <RefreshCcw size={14} />
          Reinitialiser
        </Link>
      </div>
    </section>
  );
}
