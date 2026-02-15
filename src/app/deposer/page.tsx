"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DeposerPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);

    const { error } = await supabase.from("owner_leads").insert({
      property_type: form.get("type"),
      city: form.get("city"),
      district: form.get("district"),
      name: form.get("name"),
      phone: form.get("phone"),
      message: form.get("message"),
      lang: "fr",
    });

    setLoading(false);

    if (!error) setSent(true);
    else alert("Erreur : impossible d’envoyer.");
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">
          Merci 🙏 Votre demande a été envoyée.
        </h1>
        <p className="mt-3 text-black/60">
          Rostomyia vous contactera rapidement.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-3xl font-semibold">Déposer un bien</h1>
      <p className="mt-2 text-black/60">
        Envoyez les infos, on vous rappelle rapidement.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <input
          name="type"
          placeholder="Type (Appartement, Villa...)"
          className="w-full rounded-xl border p-3"
          required
        />
        <input
          name="city"
          placeholder="Ville"
          className="w-full rounded-xl border p-3"
          required
        />
        <input
          name="district"
          placeholder="Quartier"
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
          placeholder="Téléphone / WhatsApp"
          className="w-full rounded-xl border p-3"
          required
        />
        <textarea
          name="message"
          placeholder="Détails (surface, prix, etc.)"
          className="w-full rounded-xl border p-3"
          rows={4}
        />

        <button
          disabled={loading}
          className="w-full rounded-xl bg-black py-3 text-white"
        >
          {loading ? "Envoi..." : "Envoyer"}
        </button>
      </form>
    </div>
  );
}
