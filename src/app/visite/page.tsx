"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Home,
  MessageSquare,
  Phone,
  ShieldCheck,
  Sparkles,
  User2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function toOptionalText(v: FormDataEntryValue | null): string | null {
  const s = String(v || "").trim();
  return s ? s : null;
}

function FieldShell({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{icon}</div>
      {children}
    </div>
  );
}

export default function VisitePage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const prefilledRef = (searchParams.get("ref") || "").trim();

  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      property_ref: toOptionalText(form.get("ref")),
      name: toOptionalText(form.get("name")),
      phone: toOptionalText(form.get("phone")),
      preferred_date: toOptionalText(form.get("date")),
      preferred_time: toOptionalText(form.get("time")),
      message: toOptionalText(form.get("message")),
      lang: "fr",
      status: "new",
    };

    const { error } = await supabase.from("viewing_requests").insert(payload);

    if (!error) setSent(true);
    else setErrorMsg(error.message || "Erreur: impossible d'envoyer.");
  }

  if (sent) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[rgb(var(--brand-bg))] px-4 py-16">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-28 top-0 h-72 w-72 rounded-full bg-[rgb(var(--gold))]/25 blur-3xl" />
          <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-[rgb(var(--navy))]/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-2xl rounded-3xl border border-emerald-200 bg-white/90 p-10 text-center shadow-sm backdrop-blur">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <CheckCircle2 size={26} />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold text-[rgb(var(--navy))]">Visite demandee</h1>
          <p className="mt-3 text-sm text-black/65">
            Merci. Notre equipe vous contacte rapidement pour confirmer le rendez-vous.
          </p>
          <Link
            href="/biens"
            className="mt-7 inline-flex items-center justify-center rounded-2xl bg-[rgb(var(--navy))] px-5 py-3 text-sm font-semibold text-white hover:opacity-95"
          >
            Retour aux biens
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[rgb(var(--brand-bg))] px-4 py-10 md:py-14">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-16 h-80 w-80 rounded-full bg-[rgb(var(--gold))]/22 blur-3xl" />
        <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-[rgb(var(--navy))]/12 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-6 md:grid-cols-[1.05fr_0.95fr]">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="rounded-3xl border border-black/10 bg-white/70 p-7 shadow-sm backdrop-blur md:p-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--gold))]/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
            <Sparkles size={14} />
            Service Premium
          </div>

          <h1 className="mt-4 text-3xl font-extrabold text-[rgb(var(--navy))] md:text-4xl">Programmer une visite</h1>
          <p className="mt-3 text-sm text-black/65">
            Demande simple et rapide. Nous vous rappelons pour confirmer le meilleur horaire de visite.
          </p>

          <div className="mt-6 rounded-2xl bg-[rgb(var(--navy))]/95 p-4 text-white ring-1 ring-black/10">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/75">
              <ShieldCheck size={14} className="text-[rgb(var(--gold))]" />
              Verification rapide
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-[rgb(var(--gold))]" />
                Confirmation par appel ou WhatsApp
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-[rgb(var(--gold))]" />
                Propositions de creneaux adaptes
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-[rgb(var(--gold))]" />
                Accompagnement sur place par Rostomyia
              </li>
            </ul>
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-black/10 bg-white/85 p-4">
            <svg viewBox="0 0 520 220" className="h-full w-full" role="img" aria-label="Illustration visite">
              <defs>
                <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgb(var(--gold))" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="rgb(var(--gold))" stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="navyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgb(var(--navy))" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#0f2238" stopOpacity="1" />
                </linearGradient>
              </defs>
              <rect x="0" y="0" width="520" height="220" rx="24" fill="#f8fafc" />
              <circle cx="80" cy="32" r="26" fill="url(#goldGrad)" />
              <circle cx="470" cy="186" r="38" fill="url(#goldGrad)" />
              <rect x="44" y="102" width="210" height="88" rx="10" fill="url(#navyGrad)" />
              <polygon points="36,106 149,34 264,106" fill="rgb(var(--navy))" />
              <rect x="124" y="132" width="46" height="58" rx="7" fill="#fff" opacity="0.9" />
              <rect x="72" y="132" width="30" height="26" rx="5" fill="#fff" opacity="0.9" />
              <rect x="188" y="132" width="30" height="26" rx="5" fill="#fff" opacity="0.9" />
              <rect x="300" y="46" width="178" height="130" rx="14" fill="white" stroke="#dbe3ee" strokeWidth="2" />
              <rect x="300" y="46" width="178" height="28" rx="14" fill="rgb(var(--navy))" />
              <rect x="323" y="95" width="30" height="30" rx="6" fill="rgb(var(--gold))" />
              <rect x="367" y="95" width="30" height="30" rx="6" fill="#dbe3ee" />
              <rect x="411" y="95" width="30" height="30" rx="6" fill="#dbe3ee" />
              <rect x="323" y="133" width="118" height="10" rx="5" fill="#e2e8f0" />
              <rect x="323" y="150" width="85" height="10" rx="5" fill="#e2e8f0" />
            </svg>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="rounded-3xl border border-black/10 bg-white/80 p-7 shadow-sm backdrop-blur md:p-8"
        >
          <h2 className="text-xl font-bold text-[rgb(var(--navy))]">Vos informations</h2>
          <p className="mt-2 text-sm text-black/60">Renseignez le formulaire et nous revenons vers vous rapidement.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <FieldShell icon={<Home size={16} />}>
              <input
                name="ref"
                placeholder="Reference du bien (optionnel)"
                className="h-12 w-full rounded-2xl border border-black/10 bg-white px-11 text-sm outline-none ring-0 transition focus:border-[rgb(var(--gold))]/70"
                defaultValue={prefilledRef}
              />
            </FieldShell>

            <FieldShell icon={<User2 size={16} />}>
              <input
                name="name"
                placeholder="Votre nom"
                className="h-12 w-full rounded-2xl border border-black/10 bg-white px-11 text-sm outline-none ring-0 transition focus:border-[rgb(var(--gold))]/70"
                required
              />
            </FieldShell>

            <FieldShell icon={<Phone size={16} />}>
              <input
                name="phone"
                placeholder="Telephone"
                className="h-12 w-full rounded-2xl border border-black/10 bg-white px-11 text-sm outline-none ring-0 transition focus:border-[rgb(var(--gold))]/70"
                required
              />
            </FieldShell>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FieldShell icon={<CalendarDays size={16} />}>
                <input
                  type="date"
                  name="date"
                  className="h-12 w-full rounded-2xl border border-black/10 bg-white px-11 text-sm outline-none ring-0 transition focus:border-[rgb(var(--gold))]/70"
                />
              </FieldShell>
              <FieldShell icon={<Clock3 size={16} />}>
                <input
                  name="time"
                  placeholder="Creneau (ex: 14h-16h)"
                  className="h-12 w-full rounded-2xl border border-black/10 bg-white px-11 text-sm outline-none ring-0 transition focus:border-[rgb(var(--gold))]/70"
                />
              </FieldShell>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-4 text-slate-500">
                <MessageSquare size={16} />
              </div>
              <textarea
                name="message"
                placeholder="Message complementaire (acces immeuble, disponibilite, etc.)"
                className="w-full rounded-2xl border border-black/10 bg-white px-11 py-3 text-sm outline-none transition focus:border-[rgb(var(--gold))]/70"
                rows={4}
              />
            </div>

            {errorMsg ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMsg}</p>
            ) : null}

            <button className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[rgb(var(--navy))] text-sm font-semibold text-white shadow-sm transition hover:opacity-95">
              <CalendarDays size={16} />
              Envoyer la demande
            </button>
          </form>
        </motion.section>
      </div>
    </main>
  );
}
