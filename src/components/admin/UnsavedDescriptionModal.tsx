"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

type UnsavedDescriptionModalProps = {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
};

export default function UnsavedDescriptionModal({
  open,
  onStay,
  onLeave,
}: UnsavedDescriptionModalProps) {
  const canUseDom = typeof document !== "undefined";

  useEffect(() => {
    if (!open || !canUseDom) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onStay();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [canUseDom, onStay, open]);

  if (!open || !canUseDom) return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div
        aria-hidden
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onStay}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Avertissement modifications non enregistrees"
        className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="inline-flex items-center gap-2 rounded-xl bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
          <AlertTriangle size={14} />
          Avertissement
        </div>
        <h3 className="mt-3 text-lg font-extrabold text-slate-900">
          Description non enregistree
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          Vous allez quitter cette page avec des modifications de description non enregistrees.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onStay}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Rester sur la page
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
          >
            Quitter sans enregistrer
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
