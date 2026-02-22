"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  LayoutDashboard,
  ListChecks,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toUiErrorMessage } from "@/lib/ui-errors";

export default function AdminLoginPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const queryError = useMemo(() => {
    const raw = searchParams.get("error");
    if (!raw) return null;
    return toUiErrorMessage(raw, { context: "auth" });
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSubmitError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    setLoading(false);

    if (error) {
      setSubmitError(toUiErrorMessage(error.message, { context: "auth" }));
      return;
    }

    router.push("/admin/protected");
    router.refresh();
  }

  const errorMsg = submitError ?? queryError;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[rgb(var(--brand-bg))] px-4 py-12 md:py-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[rgb(var(--gold))]/20 blur-3xl" />
        <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-[rgb(var(--navy))]/12 blur-3xl" />
      </div>

      <section className="relative mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/84 p-7 shadow-sm backdrop-blur md:p-8">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-10 -top-10 h-44 w-44 rounded-full bg-[rgb(var(--gold))]/15 blur-3xl" />
            <div className="absolute right-0 top-8 h-40 w-40 rounded-full bg-[rgb(var(--navy))]/10 blur-3xl" />
          </div>

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--gold))]/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
              <Building2 size={13} />
              Admin access
            </div>
            <h1 className="mt-4 text-2xl font-bold text-[rgb(var(--navy))] md:text-3xl">Connexion administration</h1>
            <p className="mt-2 text-sm text-black/65">
              Accedez au backoffice pour gerer les leads, les agences et les validations.
            </p>

            <form onSubmit={handleSubmit} className="mt-6">
              <div className="space-y-4">
                <label className="grid gap-1.5 text-sm">
                  <span className="block font-medium text-black/70">Email administrateur</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 w-full rounded-2xl border border-black/10 bg-white px-3.5 outline-none transition focus:border-[rgb(var(--navy))]/35"
                    placeholder="admin@rostomyia.com"
                  />
                </label>

                <label className="grid gap-1.5 text-sm">
                  <span className="block font-medium text-black/70">Mot de passe</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 w-full rounded-2xl border border-black/10 bg-white px-3.5 outline-none transition focus:border-[rgb(var(--navy))]/35"
                    placeholder="••••••••"
                  />
                </label>
              </div>

              {errorMsg ? (
                <div className="mt-4 inline-flex w-full items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[rgb(var(--navy))] text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Connexion...
                  </>
                ) : (
                  <>
                    Se connecter
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-black/60">
              Retour au site public{" "}
              <Link href="/" className="font-semibold text-[rgb(var(--navy))] hover:underline">
                Rostomyia
              </Link>
            </p>
          </div>
        </article>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-black/10 bg-[rgb(var(--navy))] p-6 text-white shadow-sm md:p-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]">
              <ShieldCheck size={13} />
              Espace securise
            </div>
            <h2 className="mt-4 text-xl font-extrabold md:text-2xl">Pilotage centralise du backoffice</h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-2.5 rounded-2xl border border-white/15 bg-white/10 p-3 text-sm text-white/90">
                <LayoutDashboard size={15} className="mt-0.5 shrink-0" />
                <span>Vue globale des statistiques et activites.</span>
              </div>
              <div className="flex items-start gap-2.5 rounded-2xl border border-white/15 bg-white/10 p-3 text-sm text-white/90">
                <ListChecks size={15} className="mt-0.5 shrink-0" />
                <span>Traitement des leads proprietaires et visites.</span>
              </div>
              <div className="flex items-start gap-2.5 rounded-2xl border border-white/15 bg-white/10 p-3 text-sm text-white/90">
                <Users size={15} className="mt-0.5 shrink-0" />
                <span>Gestion des agences et validation des comptes.</span>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
              <LockKeyhole size={13} />
              Securite
            </div>
            <p className="mt-2 text-sm text-black/65">
              Acces reserve aux administrateurs verifies. Toute tentative non autorisee est bloquee.
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}
