"use client";

import { useTransition } from "react";

export default function DeletePropertyForm({
  propertyId,
  action,
}: {
  propertyId: string;
  action: (formData: FormData) => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => {
        // We need the id in the FormData
        fd.set("id", propertyId);
        startTransition(() => action(fd));
      }}
      onSubmit={(e) => {
        if (
          !confirm("Supprimer ce bien ? Cette action est irréversible.")
        ) {
          e.preventDefault();
        }
      }}
      className="inline"
    >
      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-60 active:scale-[0.99]"
      >
        {isPending ? "Suppression..." : "Supprimer"}
      </button>
    </form>
  );
}
