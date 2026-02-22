"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { toUiErrorMessage } from "@/lib/ui-errors";

type LoginStep = "password" | "otp";

export default function UserLoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [step, setStep] = useState<LoginStep>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function sendConfirmationOtp() {
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

    setStep("otp");
    setInfoMsg("Code OTP envoye par email. Verifiez votre boite de reception.");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    const normalizedEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    setLoading(false);

    if (error) {
      const raw = String(error.message ?? "").toLowerCase();
      if (raw.includes("email not confirmed")) {
        await sendConfirmationOtp();
        return;
      }
      setErrorMsg(toUiErrorMessage(error.message, { context: "auth" }));
      return;
    }

    router.push("/account");
    router.refresh();
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMsg("Entrez votre email pour verifier le code.");
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
    <div className="min-h-screen bg-[#0B0F14] text-white">
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 h-80 w-[52rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute top-1/3 -left-24 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-44 right-[-10rem] h-96 w-96 rounded-full bg-amber-400/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 py-10 sm:px-6">
        <Link href="/" className="mb-6 inline-flex justify-center">
          <Image
            src="/images/logo-rostomyia-whiteV.PNG.png"
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
                <p className="mt-1 text-sm text-white/60">Accedez a votre espace securise.</p>
              </div>

              <Link
                href="/"
                className="rounded-2xl px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                Retour
              </Link>
            </div>

            {step === "password" ? (
              <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">Email</label>
                  <input
                    type="email"
                    placeholder="ex: nom@domaine.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-emerald-500/40 focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-white/80">Mot de passe</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="text-xs font-medium text-white/55 transition hover:text-white/85"
                    >
                      {showPassword ? "Masquer" : "Afficher"}
                    </button>
                  </div>

                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Votre mot de passe"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-emerald-500/40 focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>

                {errorMsg ? (
                  <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {errorMsg}
                  </div>
                ) : null}
                {infoMsg ? (
                  <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                    {infoMsg}
                  </div>
                ) : null}

                <button
                  disabled={loading}
                  className="group relative w-full overflow-hidden rounded-2xl bg-white py-3 text-sm font-semibold text-[#0B0F14] shadow-sm transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span className="relative z-10">{loading ? "Connexion..." : "Se connecter"}</span>
                  <span
                    aria-hidden
                    className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald-500/15 to-transparent transition group-hover:translate-x-full"
                  />
                </button>

                <button
                  type="button"
                  onClick={sendConfirmationOtp}
                  disabled={loading}
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/15 disabled:opacity-70"
                >
                  Compte non confirme ? Recevoir OTP
                </button>
                <Link
                  href={`/auth/confirm-otp${email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ""}`}
                  className="block text-center text-sm font-medium text-emerald-300 hover:text-emerald-200"
                >
                  Verifier mon compte via OTP
                </Link>

                <div className="pt-2 text-center">
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-white/60 transition hover:text-emerald-300"
                  >
                    Mot de passe oublie ?
                  </Link>
                </div>

                <p className="pt-2 text-center text-xs text-white/45">
                  En vous connectant, vous acceptez nos conditions d&apos;utilisation.
                </p>
              </form>
            ) : (
              <form onSubmit={verifyOtp} className="mt-7 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-emerald-500/40 focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">Code OTP</label>
                  <input
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Entrez le code recu par email"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-emerald-500/40 focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>

                {errorMsg ? (
                  <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {errorMsg}
                  </div>
                ) : null}
                {infoMsg ? (
                  <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                    {infoMsg}
                  </div>
                ) : null}

                <button
                  disabled={loading}
                  className="group relative w-full overflow-hidden rounded-2xl bg-white py-3 text-sm font-semibold text-[#0B0F14] shadow-sm transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span className="relative z-10">{loading ? "Verification..." : "Verifier OTP"}</span>
                  <span
                    aria-hidden
                    className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald-500/15 to-transparent transition group-hover:translate-x-full"
                  />
                </button>

                <button
                  type="button"
                  onClick={sendConfirmationOtp}
                  disabled={loading}
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/15 disabled:opacity-70"
                >
                  Renvoyer OTP
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("password");
                    setOtp("");
                    setErrorMsg(null);
                    setInfoMsg(null);
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm font-semibold text-white/70 transition hover:bg-white/10"
                >
                  Retour connexion mot de passe
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-white/45">
          (c) {new Date().getFullYear()} Rostomyia Immobilier - Oran, Algerie
        </p>
      </div>
    </div>
  );
}
