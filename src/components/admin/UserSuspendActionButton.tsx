"use client";

import { Lock, Unlock } from "lucide-react";
import { useFormStatus } from "react-dom";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  userId: string;
  variant: "suspend" | "unsuspend";
};

function SubmitButton({ variant }: { variant: "suspend" | "unsuspend" }) {
  const { pending } = useFormStatus();
  const isSuspend = variant === "suspend";

  if (isSuspend) {
    return (
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
      >
        <Lock size={13} />
        {pending ? "Suspension..." : "Suspendre"}
      </button>
    );
  }

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
    >
      <Unlock size={13} />
      {pending ? "Activation..." : "Reactiver"}
    </button>
  );
}

export default function UserSuspendActionButton({ action, userId, variant }: Props) {
  const confirmMessage =
    variant === "suspend"
      ? "Confirmer la suspension de ce compte utilisateur ?"
      : "Confirmer la reactivation de ce compte utilisateur ?";

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="user_id" value={userId} />
      <SubmitButton variant={variant} />
    </form>
  );
}
