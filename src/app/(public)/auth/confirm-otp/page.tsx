"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toUiErrorMessage } from "@/lib/ui-errors";

export default function ConfirmOtpPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState((searchParams.get("email") ?? "").trim().toLowerCase());
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  async function sendOtp() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setErrorMsg("Entrez votre email pour recevoir le code OTP.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: false,
      },
    });

    setLoading(false);

    if (error) {
      setErrorMsg(toUiErrorMessage(error.message, { context: "otp" }));
      return;
    }

    setInfoMsg("Code OTP envoye par email. Verifiez votre boite de reception.");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setErrorMsg("Entrez votre email.");
      return;
    }
    if (!otp.trim()) {
      setErrorMsg("Entrez le code OTP recu par email.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    const { error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: otp.trim(),
      type: "email",
    });

    setLoading(false);

    if (error) {
      setErrorMsg(toUiErrorMessage(error.message, { context: "otp" }));
      return;
    }

    router.push("/account");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-14">
      <div className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur md:p-8">
        <h1 className="text-2xl font-semibold text-[rgb(var(--navy))]">Confirmer votre compte</h1>
        <p className="mt-2 text-sm text-black/60">
          Entrez votre email puis le code OTP recu pour activer votre compte.
        </p>

        <form onSubmit={verifyOtp} className="mt-6 space-y-4">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-black/70">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3.5 outline-none transition focus:border-[rgb(var(--navy))]/35"
              required
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-black/70">Code OTP</span>
            <input
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Entrez le code OTP"
              className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3.5 outline-none transition focus:border-[rgb(var(--navy))]/35"
              required
            />
          </label>

          {errorMsg ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMsg}
            </div>
          ) : null}
          {infoMsg ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {infoMsg}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[rgb(var(--navy))] text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
          >
            {loading ? "Verification..." : "Verifier OTP"}
          </button>

          <button
            type="button"
            onClick={sendOtp}
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-black/10 bg-white text-sm font-semibold text-[rgb(var(--navy))] hover:bg-black/5 disabled:opacity-60"
          >
            Renvoyer OTP
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-black/60">
          Retour{" "}
          <Link href="/login" className="font-semibold text-[rgb(var(--navy))] hover:underline">
            connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
