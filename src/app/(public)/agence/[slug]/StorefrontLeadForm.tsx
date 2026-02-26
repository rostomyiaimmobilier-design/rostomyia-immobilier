"use client";

import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";

type StorefrontLeadFormProps = {
  slug: string;
  brandPrimaryColor: string;
};

function toOptional(value: string) {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

export default function StorefrontLeadForm({ slug, brandPrimaryColor }: StorefrontLeadFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const response = await fetch("/api/agency/storefront-leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        name: toOptional(name),
        phone: toOptional(phone),
        email: toOptional(email),
        message: toOptional(message),
        source_path: typeof window !== "undefined" ? window.location.pathname : `/agence/${slug}`,
      }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setSubmitting(false);

    if (!response.ok) {
      setErrorMsg(payload?.error || "Impossible d'envoyer votre demande.");
      return;
    }

    setSuccessMsg("Demande envoyee. L'agence vous recontactera rapidement.");
    setName("");
    setPhone("");
    setEmail("");
    setMessage("");
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_40px_-28px_rgba(15,23,42,0.5)]">
      <div className="text-sm font-bold" style={{ color: brandPrimaryColor }}>
        Demander un rappel
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom complet *"
          required
          className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-900"
        />
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Telephone"
          className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-900"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-900 sm:col-span-2"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Votre besoin (achat, location, budget, quartier...)"
          rows={3}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-900 sm:col-span-2"
        />
      </div>
      {errorMsg ? <p className="mt-2 text-xs text-red-600">{errorMsg}</p> : null}
      {successMsg ? <p className="mt-2 text-xs text-emerald-700">{successMsg}</p> : null}
      <button
        type="submit"
        disabled={submitting}
        className="mt-3 inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
        style={{ backgroundColor: brandPrimaryColor }}
      >
        {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        Envoyer
      </button>
    </form>
  );
}
