"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toUiErrorMessage } from "@/lib/ui-errors";

export default function ResetPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSuccess(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      setLoading(false);

      if (error) return setErr(toUiErrorMessage(error.message, { context: "auth" }));

      setSuccess("Si un compte existe, un email de réinitialisation a été envoyé.");
    } catch (e: unknown) {
      setLoading(false);
      const msg = e instanceof Error ? e.message : String(e);
      setErr(toUiErrorMessage(msg, { context: "auth" }));
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="rounded-3xl border border-black/10 bg-white/70 p-1 shadow-sm backdrop-blur md:grid md:grid-cols-2 md:gap-6">
        <div className="hidden md:flex flex-col justify-center gap-4 rounded-2xl p-8 bg-gradient-to-br from-green-50 to-teal-50">
          <div className="rounded-full bg-white/60 p-3 shadow-sm w-max">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c0 .667-.224 1.333-.667 1.833A3 3 0 009 15H7v3h10v-3h-2a3 3 0 01-2.333-1.167C12.224 12.333 12 11.667 12 11z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold">Besoin d&apos;aide ?</h2>
          <p className="text-sm text-black/60">Nous vous enverrons un lien pour réinitialiser votre mot de passe.</p>
        </div>

        <div className="rounded-3xl bg-white/80 p-6 md:p-10">
          <h1 className="text-2xl font-semibold">Réinitialiser le mot de passe</h1>
          <p className="mt-2 text-sm text-black/60">Entrez votre email pour recevoir un lien de réinitialisation.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-black/70">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="mt-1 w-full rounded-xl border border-black/10 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-200"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {err && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {err}
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                {success}
              </div>
            )}

            <button
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-green-600 to-teal-600 py-3 text-white shadow-md hover:opacity-95 disabled:opacity-60 transition"
            >
              {loading ? "Envoi..." : "Envoyer le lien"}
            </button>
          </form>

          <div className="mt-6 flex justify-between text-sm">
            <Link href="/auth/login" className="text-black/60 hover:text-black">
              Retour à la connexion
            </Link>
            <Link href="/auth/signup" className="text-black/60 hover:text-black">
              Créer un compte
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
