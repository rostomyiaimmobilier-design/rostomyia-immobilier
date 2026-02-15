"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function VisitePage() {
  const supabase = createClient();

  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = new FormData(e.currentTarget);

    const { error } = await supabase.from("viewing_requests").insert({
      property_ref: form.get("ref"),
      name: form.get("name"),
      phone: form.get("phone"),
      preferred_date: form.get("date"),
      preferred_time: form.get("time"),
      message: form.get("message"),
      lang: "fr",
    });

    if (!error) setSent(true);
    else alert("Erreur : impossible d’envoyer.");
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Visite demandée ✅</h1>
        <p className="mt-3 text-black/60">
          Nous vous confirmons rapidement.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-3xl font-semibold">Réserver une visite</h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <input
          name="ref"
          placeholder="Référence du bien (optionnel)"
          className="w-full rounded-xl border p-3"
        />
        <input
          name="name"
          placeholder="Votre nom"
          className="w-full rounded-xl border p-3"
          required
        />
        <input
          name="phone"
          placeholder="Téléphone"
          className="w-full rounded-xl border p-3"
          required
        />

        <input
          type="date"
          name="date"
          className="w-full rounded-xl border p-3"
        />

        <input
          name="time"
          placeholder="Créneau souhaité (ex: après-midi)"
          className="w-full rounded-xl border p-3"
        />

        <textarea
          name="message"
          placeholder="Message"
          className="w-full rounded-xl border p-3"
          rows={4}
        />

        <button className="w-full rounded-xl bg-black py-3 text-white">
          Envoyer la demande
        </button>
      </form>
    </div>
  );
}
