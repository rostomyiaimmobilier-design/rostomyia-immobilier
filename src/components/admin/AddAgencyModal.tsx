"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Building2, Plus, UserPlus, X } from "lucide-react";
import AppDropdown from "@/components/ui/app-dropdown";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
};

export default function AddAgencyModal({ action }: Props) {
  const [open, setOpen] = useState(false);
  const canUseDom = typeof document !== "undefined";

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

  const modal = open ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl border border-black/10 bg-white p-6 shadow-2xl md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-xl bg-[rgb(var(--navy))]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
              <UserPlus size={14} />
              Ajout manuel
            </div>
            <h2 className="mt-3 text-2xl font-extrabold text-[rgb(var(--navy))]">Ajouter une agence</h2>
            <p className="mt-2 text-sm text-black/60">
              Creation depuis admin avec validation obligatoire des informations agence.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white text-[rgb(var(--navy))] hover:bg-black/5"
          >
            <X size={16} />
          </button>
        </div>

        <form action={action} className="mt-5 grid gap-3 md:grid-cols-2">
          <label className="space-y-1.5 text-sm">
            <div className="font-medium text-black/70">Email *</div>
            <input
              name="email"
              type="email"
              required
              className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 outline-none transition focus:border-[rgb(var(--navy))]/40"
            />
          </label>

          <label className="space-y-1.5 text-sm">
            <div className="font-medium text-black/70">Mot de passe *</div>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 outline-none transition focus:border-[rgb(var(--navy))]/40"
            />
          </label>

          <label className="space-y-1.5 text-sm">
            <div className="font-medium text-black/70">Nom agence *</div>
            <input
              name="agency_name"
              required
              className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 outline-none transition focus:border-[rgb(var(--navy))]/40"
            />
          </label>

          <label className="space-y-1.5 text-sm">
            <div className="font-medium text-black/70">Responsable *</div>
            <input
              name="agency_manager_name"
              required
              className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 outline-none transition focus:border-[rgb(var(--navy))]/40"
            />
          </label>

          <label className="space-y-1.5 text-sm">
            <div className="font-medium text-black/70">Telephone *</div>
            <input
              name="agency_phone"
              required
              className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 outline-none transition focus:border-[rgb(var(--navy))]/40"
            />
          </label>

          <label className="space-y-1.5 text-sm">
            <div className="font-medium text-black/70">WhatsApp</div>
            <input
              name="agency_whatsapp"
              className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 outline-none transition focus:border-[rgb(var(--navy))]/40"
            />
          </label>

          <label className="space-y-1.5 text-sm">
            <div className="font-medium text-black/70">Ville *</div>
            <input
              name="agency_city"
              required
              className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 outline-none transition focus:border-[rgb(var(--navy))]/40"
            />
          </label>

          <label className="space-y-1.5 text-sm">
            <div className="font-medium text-black/70">Adresse *</div>
            <input
              name="agency_address"
              required
              className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 outline-none transition focus:border-[rgb(var(--navy))]/40"
            />
          </label>

          <label className="space-y-1.5 text-sm">
            <div className="font-medium text-black/70">Site web</div>
            <input
              name="agency_website"
              className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 outline-none transition focus:border-[rgb(var(--navy))]/40"
            />
          </label>

          <label className="space-y-1.5 text-sm">
            <div className="font-medium text-black/70">Annees d&apos;experience</div>
            <input
              name="agency_years_experience"
              type="number"
              min={0}
              className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 outline-none transition focus:border-[rgb(var(--navy))]/40"
            />
          </label>

          <label className="space-y-1.5 text-sm md:col-span-2">
            <div className="font-medium text-black/70">Zones (separees par virgules)</div>
            <input
              name="agency_service_areas"
              placeholder="Oran, Bir El Djir, Es Senia"
              className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 outline-none transition focus:border-[rgb(var(--navy))]/40"
            />
          </label>

          <label className="space-y-1.5 text-sm md:col-span-2">
            <div className="font-medium text-black/70">Statut initial</div>
            <AppDropdown
              name="agency_status"
              defaultValue="pending"
              triggerClassName="h-10"
              options={[
                { value: "pending", label: "pending" },
                { value: "active", label: "active" },
                { value: "suspended", label: "suspended" },
              ]}
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[rgb(var(--navy))] px-5 text-xs font-semibold tracking-wide text-white shadow-sm transition hover:opacity-95"
            >
              <Building2 size={14} />
              Ajouter l&apos;agence
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-[rgb(var(--navy))] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
      >
        <Plus size={15} />
        Ajout manuel
      </button>
      {canUseDom ? createPortal(modal, document.body) : null}
    </>
  );
}
