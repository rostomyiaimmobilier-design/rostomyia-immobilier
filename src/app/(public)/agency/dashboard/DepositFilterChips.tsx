"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

type DepositFilter = "all" | "processing" | "validated" | "rejected";

type DepositFilterChipsProps = {
  selectedFilter: DepositFilter;
  totalDeposits: number;
  processingDeposits: number;
  validatedDeposits: number;
  rejectedDeposits: number;
};

function buttonClass(active: boolean, tone: "default" | "processing" | "validated" | "rejected") {
  if (active && tone === "default") {
    return "border-[rgb(var(--navy))]/25 bg-[rgb(var(--navy))]/10 text-[rgb(var(--navy))]";
  }
  if (active && tone === "processing") {
    return "border-amber-300 bg-amber-50 text-amber-700";
  }
  if (active && tone === "validated") {
    return "border-emerald-300 bg-emerald-50 text-emerald-700";
  }
  if (active && tone === "rejected") {
    return "border-rose-300 bg-rose-50 text-rose-700";
  }
  return "border-black/10 bg-white text-black/65 hover:bg-black/[0.03]";
}

export default function DepositFilterChips({
  selectedFilter,
  totalDeposits,
  processingDeposits,
  validatedDeposits,
  rejectedDeposits,
}: DepositFilterChipsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [pendingFilter, setPendingFilter] = useState<DepositFilter | null>(null);

  useEffect(() => {
    if (!isPending) {
      setPendingFilter(null);
    }
  }, [isPending]);

  function applyFilter(filter: DepositFilter) {
    if (filter === selectedFilter) return;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (filter === "all") {
      params.delete("filter");
    } else {
      params.set("filter", filter);
    }
    const next = params.toString();
    const href = next ? `${pathname}?${next}` : pathname;

    setPendingFilter(filter);
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  const chips: Array<{
    filter: DepositFilter;
    label: string;
    count: number;
    tone: "default" | "processing" | "validated" | "rejected";
  }> = [
    { filter: "all", label: "Tous", count: totalDeposits, tone: "default" },
    { filter: "processing", label: "En cours", count: processingDeposits, tone: "processing" },
    { filter: "validated", label: "Valides", count: validatedDeposits, tone: "validated" },
    { filter: "rejected", label: "Rejetes", count: rejectedDeposits, tone: "rejected" },
  ];

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {chips.map((chip) => {
        const active = selectedFilter === chip.filter;
        const pending = isPending && pendingFilter === chip.filter;
        return (
          <button
            key={chip.filter}
            type="button"
            onClick={() => applyFilter(chip.filter)}
            disabled={isPending}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-70 ${buttonClass(active, chip.tone)}`}
          >
            {pending ? <Loader2 size={12} className="animate-spin" /> : null}
            {chip.label} ({chip.count})
          </button>
        );
      })}
    </div>
  );
}
