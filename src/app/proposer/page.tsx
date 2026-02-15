"use client";

import { useState } from "react";
import { useLang } from "@/components/LanguageProvider";

export default function SubmitPropertyPage() {
  const { lang, dir } = useLang();

  const t =
    lang === "ar"
      ? {
          title: "اعرض عقارك",
          subtitle: "املأ المعلومات وسنتواصل معك بسرعة.",
          name: "الاسم الكامل",
          phone: "رقم الهاتف",
          type: "نوع العرض",
          sale: "بيع",
          rent: "كراء",
          location: "المنطقة",
          price: "السعر",
          beds: "عدد الغرف",
          desc: "وصف العقار",
          send: "إرسال عبر واتساب",
        }
      : {
          title: "Proposer un bien",
          subtitle: "Remplissez les infos et nous vous contacterons rapidement.",
          name: "Nom complet",
          phone: "Téléphone",
          type: "Type d’offre",
          sale: "Vente",
          rent: "Location",
          location: "Localisation",
          price: "Prix",
          beds: "Chambres",
          desc: "Description du bien",
          send: "Envoyer via WhatsApp",
        };

  const [owner, setOwner] = useState("");
  const [phone, setPhone] = useState("");
  const [mode, setMode] = useState("Vente");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");
  const [beds, setBeds] = useState("");
  const [desc, setDesc] = useState("");

  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP ?? "+213559712981";
  const waDigits = whatsapp.replace(/\D/g, "");

  const sendWhatsApp = () => {
    const msg =
      lang === "ar"
        ? `السلام عليكم، أريد عرض عقار:\n\nالاسم: ${owner}\nالهاتف: ${phone}\nالنوع: ${mode}\nالموقع: ${location}\nالسعر: ${price}\nالغرف: ${beds}\nالوصف: ${desc}`
        : `Bonjour, je souhaite proposer un bien:\n\nNom: ${owner}\nTéléphone: ${phone}\nType: ${mode}\nLocalisation: ${location}\nPrix: ${price}\nChambres: ${beds}\nDescription: ${desc}`;

    window.open(
      `https://wa.me/${waDigits}?text=${encodeURIComponent(msg)}`,
      "_blank"
    );
  };

  return (
    <main dir={dir} className="mx-auto max-w-3xl p-10">
      <h1 className="text-3xl font-bold text-slate-900">{t.title}</h1>
      <p className="mt-2 text-slate-600">{t.subtitle}</p>

      <div className="mt-8 space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        <input
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          placeholder={t.name}
          className="w-full rounded-xl border px-4 py-3"
        />

        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t.phone}
          className="w-full rounded-xl border px-4 py-3"
        />

        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="w-full rounded-xl border px-4 py-3"
        >
          <option value="Vente">{t.sale}</option>
          <option value="Location">{t.rent}</option>
        </select>

        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={t.location}
          className="w-full rounded-xl border px-4 py-3"
        />

        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder={t.price}
          className="w-full rounded-xl border px-4 py-3"
        />

        <input
          value={beds}
          onChange={(e) => setBeds(e.target.value)}
          placeholder={t.beds}
          className="w-full rounded-xl border px-4 py-3"
        />

        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder={t.desc}
          className="w-full rounded-xl border px-4 py-3 min-h-[120px]"
        />

        <button
          onClick={sendWhatsApp}
          className="w-full rounded-xl bg-yellow-500 py-3 font-semibold text-slate-900 hover:opacity-95"
        >
          💬 {t.send}
        </button>
      </div>
    </main>
  );
}
