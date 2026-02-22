"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { MapPin, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import type { AdminQuartierItem } from "@/hooks/use-admin-quartiers";
import { ORAN_COMMUNES } from "@/lib/oran-locations";
import AppDropdown from "@/components/ui/app-dropdown";

type QuartiersManagerModalProps = {
  quartiers: AdminQuartierItem[];
  loading: boolean;
  saving: boolean;
  managed: boolean;
  warning: string | null;
  error: string | null;
  onRefresh: () => Promise<void> | void;
  onAdd: (name: string, commune?: string) => Promise<void>;
  onUpdate: (id: string, name: string, commune?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  triggerLabel?: string;
  triggerClassName?: string;
};

type CommuneOption = {
  value: string;
  label: string;
};

function normalizeName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isKnownOranCommune(value: string | null | undefined) {
  if (!value) return false;
  return ORAN_COMMUNES.some((commune) => commune === value);
}

export default function QuartiersManagerModal({
  quartiers,
  loading,
  saving,
  managed,
  warning,
  error,
  onRefresh,
  onAdd,
  onUpdate,
  onDelete,
  triggerLabel = "Gerer quartiers",
  triggerClassName,
}: QuartiersManagerModalProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [commune, setCommune] = useState("Oran");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [syncInfo, setSyncInfo] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [busyDeleteId, setBusyDeleteId] = useState<string | null>(null);
  const canUseDom = typeof document !== "undefined";

  function resetEditor() {
    setEditingId(null);
    setName("");
    setCommune("Oran");
    setLocalError(null);
  }

  function closeModal() {
    setOpen(false);
    resetEditor();
  }

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const totalLabel = useMemo(() => `${quartiers.length} quartier(s)`, [quartiers.length]);
  const communeOptions = useMemo<CommuneOption[]>(() => {
    const base = ORAN_COMMUNES.map((communeOption) => ({
      value: communeOption,
      label: communeOption,
    }));
    if (commune && !base.some((option) => option.value === commune)) {
      return [{ value: commune, label: commune }, ...base];
    }
    return base;
  }, [commune]);

  function startEdit(item: AdminQuartierItem) {
    setEditingId(item.id);
    setName(item.name);
    setCommune(isKnownOranCommune(item.commune) ? String(item.commune) : "Oran");
    setLocalError(null);
  }

  async function handleSave() {
    const normalized = normalizeName(name);
    if (normalized.length < 2) {
      setLocalError("Le nom du quartier doit contenir au moins 2 caracteres.");
      return;
    }

    setLocalError(null);
    try {
      if (editingId) {
        await onUpdate(editingId, normalized, commune || "Oran");
      } else {
        await onAdd(normalized, commune || "Oran");
      }
      resetEditor();
    } catch (err: unknown) {
      setLocalError(
        err instanceof Error
          ? err.message
          : editingId
            ? "Mise a jour du quartier impossible."
            : "Ajout du quartier impossible."
      );
    }
  }

  async function handleDelete(item: AdminQuartierItem) {
    const confirmed = window.confirm(`Supprimer le quartier "${item.name}" ?`);
    if (!confirmed) return;

    setLocalError(null);
    setBusyDeleteId(item.id);
    try {
      await onDelete(item.id);
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : "Suppression impossible.");
    } finally {
      setBusyDeleteId(null);
    }
  }

  async function handleAutoSync() {
    setLocalError(null);
    setSyncInfo(null);
    setSyncing(true);

    try {
      const res = await fetch("/api/admin/locations/sync", {
        method: "POST",
        credentials: "include",
      });
      const payload = (await res.json().catch(() => null)) as
        | { communes_inserted?: number; quartiers_inserted?: number; error?: string }
        | null;

      if (!res.ok) {
        throw new Error(payload?.error || "Synchronisation impossible.");
      }

      const communesInserted = Number(payload?.communes_inserted ?? 0);
      const quartiersInserted = Number(payload?.quartiers_inserted ?? 0);
      setSyncInfo(
        `Sync terminee: ${communesInserted} commune(s) + ${quartiersInserted} quartier(s) ajoute(s).`
      );
      await onRefresh();
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : "Synchronisation impossible.");
    } finally {
      setSyncing(false);
    }
  }

  const modal = open ? (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div
        aria-hidden
        onClick={closeModal}
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl border border-black/10 bg-white p-5 shadow-2xl md:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-xl bg-[rgb(var(--navy))]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
              <MapPin size={14} />
              Dataset quartiers
            </div>
            <h2 className="text-xl font-extrabold text-[rgb(var(--navy))]">Gestion des quartiers</h2>
            <p className="text-sm text-black/60">
              Controlez la liste des quartiers disponible dans les formulaires admin.
            </p>
          </div>

          <button
            type="button"
            onClick={closeModal}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white text-[rgb(var(--navy))] hover:bg-black/5"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 md:grid-cols-[1fr_220px_auto]">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nom du quartier (ex: Hai El Menzah)"
            className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[rgb(var(--navy))]/40"
          />
          <AppDropdown
            value={commune}
            onValueChange={(value) => setCommune(value)}
            options={communeOptions}
            triggerClassName="h-11 rounded-xl border border-black/10 bg-white"
            contentClassName="z-[140]"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[rgb(var(--navy))] px-4 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
            >
              {editingId ? <Pencil size={16} /> : <Plus size={16} />}
              {editingId ? "Enregistrer" : "Ajouter"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetEditor}
                disabled={saving}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Annuler
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{totalLabel}</div>
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={loading || saving || syncing}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Actualiser
          </button>
          <button
            type="button"
            onClick={() => void handleAutoSync()}
            disabled={loading || saving || syncing}
            className="inline-flex items-center gap-1 rounded-lg border border-[rgb(var(--navy))]/20 bg-[rgb(var(--navy))]/5 px-2.5 py-1 text-xs font-semibold text-[rgb(var(--navy))] transition hover:bg-[rgb(var(--navy))]/10 disabled:opacity-60"
          >
            {syncing ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
            Sync Algerie DB
          </button>
        </div>

        {warning ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
            {warning}
          </div>
        ) : null}

        {error ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {error}
          </div>
        ) : null}

        {localError ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {localError}
          </div>
        ) : null}

        {syncInfo ? (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
            {syncInfo}
          </div>
        ) : null}

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-100/80 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-2.5">Quartier</th>
                <th className="px-4 py-2.5">Commune</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {quartiers.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={3}>
                    Aucun quartier disponible.
                  </td>
                </tr>
              ) : (
                quartiers.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2.5 font-medium text-slate-900">{item.name}</td>
                    <td className="px-4 py-2.5 text-slate-600">{item.commune || "-"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        disabled={!managed || saving || item.id.startsWith("fallback-")}
                        onClick={() => startEdit(item)}
                        className="mr-2 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Pencil size={13} />
                        Modifier
                      </button>
                      <button
                        type="button"
                        disabled={!managed || saving || busyDeleteId === item.id || item.id.startsWith("fallback-")}
                        onClick={() => void handleDelete(item)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          triggerClassName ??
          "inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        }
      >
        <MapPin size={13} />
        {triggerLabel}
      </button>
      {canUseDom ? createPortal(modal, document.body) : null}
    </>
  );
}
