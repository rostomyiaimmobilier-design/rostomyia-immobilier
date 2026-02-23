"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toUiErrorMessage } from "@/lib/ui-errors";

type Step = "phone" | "otp";

function getAccountType(user: { user_metadata?: Record<string, unknown> | null } | null) {
  return String(user?.user_metadata?.account_type ?? "")
    .trim()
    .toLowerCase();
}

function getGoogleOAuthRedirectTo() {
  const siteUrlFromEnv = String(process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  const browserOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(browserOrigin);
  const envIsLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(siteUrlFromEnv);
  const base = isLocalhost
    ? browserOrigin
    : siteUrlFromEnv && !envIsLocalhost
      ? siteUrlFromEnv
      : browserOrigin;
  return `${base.replace(/\/+$/, "")}/auth/callback`;
}

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [step, setStep] = useState<Step>("phone");
  const [otp, setOtp] = useState("");

  // Keep country prefix fixed and collect the rest of the number separately
  const countryPrefix = "+213";
  const [localNumber, setLocalNumber] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleGoogle() {
    setLoading(true);
    setErrorMsg(null);
    setMsg(null);
    const redirectTo = getGoogleOAuthRedirectTo();

    console.info("[auth] Google OAuth request", {
      origin: window.location.origin,
      redirectTo,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
      siteUrlEnv: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    });

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    setLoading(false);
    if (error) setErrorMsg(toUiErrorMessage(error.message, { context: "auth" }));
  }

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setMsg(null);

    const p = (countryPrefix + localNumber).trim();

    // Minimal check: must start with + and have enough digits (total length 8-15)
    if (!/^\+\d{8,15}$/.test(p.replace(/\s/g, ""))) {
      setLoading(false);
      setErrorMsg("Entrez un numéro valide. Exemple: +2135xxxxxxx");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({ phone: p });

    setLoading(false);

    if (error) {
      setErrorMsg(toUiErrorMessage(error.message, { context: "otp" }));
      return;
    }

    setStep("otp");
    setMsg("Code envoyé par SMS. Entrez le code pour continuer.");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setMsg(null);

    const { data, error } = await supabase.auth.verifyOtp({
      phone: (countryPrefix + localNumber).trim(),
      token: otp.trim(),
      type: "sms",
    });

    setLoading(false);

    if (error) {
      setErrorMsg("Code incorrect ou expiré. Réessayez.");
      return;
    }

    const accountType = getAccountType(data.user ?? null);
    if (accountType === "agency") {
      await supabase.auth.signOut();
      setErrorMsg("Ce compte agence doit se connecter via l'espace agence.");
      return;
    }
    if (accountType === "admin" || accountType === "super_admin") {
      await supabase.auth.signOut();
      setErrorMsg("Ce compte administrateur doit se connecter via /admin/login.");
      return;
    }

    router.push("/account");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#0B0F14] text-white">
      {/* Background glows */}
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 h-80 w-[52rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute top-1/3 -left-24 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-44 right-[-10rem] h-96 w-96 rounded-full bg-amber-400/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 py-10 sm:px-6">
        {/* Logo */}
        <Link href="/" className="mb-6 inline-flex justify-center">
          <Image
            src="/images/logo-rostomyia-whiteV.PNG"
            alt="Rostomyia Immobilier"
            width={260}
            height={260}
            priority
            className="h-auto w-[170px] sm:w-[210px] drop-shadow-sm"
          />
        </Link>

        <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />

          <div className="p-7 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Connexion</h1>
                <p className="mt-1 text-sm text-white/60">
                  Connectez-vous rapidement avec téléphone ou Google.
                </p>
              </div>
              <Link
                href="/"
                className="rounded-2xl px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                Retour
              </Link>
            </div>

            {/* Social */}
            <div className="mt-6 space-y-3">
              <button
                type="button"
                disabled={loading}
                onClick={handleGoogle}
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-70"
              >
                Continuer avec Google
              </button>

              {/* Apple placeholder (optional)
              <button
                type="button"
                disabled={loading}
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white/70"
              >
                Continuer avec Apple
              </button>
              */}
            </div>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-white/45">ou</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* OTP */}
            {step === "phone" ? (
              <form onSubmit={sendOtp} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">Téléphone (OTP)</label>

                  <div className="mt-1 flex items-center gap-3">
                    <div className="flex items-center justify-center whitespace-nowrap rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/90">
                      {countryPrefix}
                    </div>

                    <input
                      type="tel"
                      value={localNumber}
                      onChange={(e) => setLocalNumber(e.target.value)}
                      placeholder="5xxxxxxxx"
                      autoComplete="tel"
                      className="flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-emerald-500/40 focus:ring-4 focus:ring-emerald-500/10"
                    />
                  </div>

                  <p className="text-xs text-white/45">Entrez votre numéro au format local (ex: 5xxxxxxxx).</p>
                </div>

                {errorMsg && (
                  <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {errorMsg}
                  </div>
                )}
                {msg && (
                  <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                    {msg}
                  </div>
                )}

                <button
                  disabled={loading}
                  className="group relative w-full overflow-hidden rounded-2xl bg-white py-3 text-sm font-semibold text-[#0B0F14] shadow-sm transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span className="relative z-10">
                    {loading ? "Envoi..." : "Envoyer le code"}
                  </span>
                  <span
                    aria-hidden
                    className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald-500/15 to-transparent transition group-hover:translate-x-full"
                  />
                </button>

                <p className="pt-2 text-center text-xs text-white/45">
                  En continuant, vous acceptez nos conditions d’utilisation.
                </p>
              </form>
            ) : (
              <form onSubmit={verifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">
                    Code SMS
                  </label>
                  <input
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Entrez le code reçu"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-emerald-500/40 focus:ring-4 focus:ring-emerald-500/10"
                  />
                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => {
                          setStep("phone");
                          setOtp("");
                          setLocalNumber("");
                          setMsg(null);
                          setErrorMsg(null);
                        }}
                      className="font-medium text-white/60 hover:text-white"
                    >
                      Modifier le numéro
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOtp("");
                        setMsg(null);
                        setErrorMsg(null);
                      }}
                      className="font-medium text-white/60 hover:text-white"
                    >
                      Effacer
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {errorMsg}
                  </div>
                )}
                {msg && (
                  <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                    {msg}
                  </div>
                )}

                <button
                  disabled={loading}
                  className="group relative w-full overflow-hidden rounded-2xl bg-white py-3 text-sm font-semibold text-[#0B0F14] shadow-sm transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span className="relative z-10">
                    {loading ? "Vérification..." : "Vérifier & Continuer"}
                  </span>
                  <span
                    aria-hidden
                    className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald-500/15 to-transparent transition group-hover:translate-x-full"
                  />
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={sendOtp}
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/15 disabled:opacity-70"
                >
                  Renvoyer le code
                </button>

                <p className="pt-2 text-center text-xs text-white/45">
                  En continuant, vous acceptez nos conditions d’utilisation.
                </p>
              </form>
            )}

            <div className="mt-6 text-center text-sm text-white/60">
              Pas encore de compte ?{" "}
              <Link href="/auth/signup" className="font-semibold text-emerald-300 hover:text-emerald-200">
                Créer un compte
              </Link>
            </div>
            <div className="mt-2 text-center text-sm text-white/60">
              Vous etes une agence ?{" "}
              <Link href="/agency/login" className="font-semibold text-emerald-300 hover:text-emerald-200">
                Connexion agence
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-white/45">
          © {new Date().getFullYear()} Rostomyia Immobilier — Oran, Algérie
        </p>
      </div>
    </div>
  );
}

