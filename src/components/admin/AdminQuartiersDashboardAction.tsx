"use client";

import QuartiersManagerModal from "@/components/admin/QuartiersManagerModal";
import { useAdminQuartiers } from "@/hooks/use-admin-quartiers";

export default function AdminQuartiersDashboardAction() {
  const {
    quartiers,
    loading,
    saving,
    managed,
    warning,
    error,
    refreshQuartiers,
    addQuartier,
    updateQuartier,
    removeQuartier,
  } = useAdminQuartiers();

  return (
    <QuartiersManagerModal
      quartiers={quartiers}
      loading={loading}
      saving={saving}
      managed={managed}
      warning={warning}
      error={error}
      onRefresh={refreshQuartiers}
      onAdd={addQuartier}
      onUpdate={updateQuartier}
      onDelete={removeQuartier}
      triggerLabel="Quartiers"
      triggerClassName="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-[rgb(var(--navy))] shadow-sm transition hover:bg-black/5"
    />
  );
}
