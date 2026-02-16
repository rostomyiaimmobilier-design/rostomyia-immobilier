"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Clock,
  ArrowUpRight,
  Send,
} from "lucide-react";

type Lang = "fr" | "ar";

const copy: Record<
  Lang,
  {
    badge: string;
    title: string;
    sub: string;
    cardTitle: string;
    formTitle: string;
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
    send: string;
    sentOk: string;
    sentSub: string;
    hours: string;
    hoursValue: string;
    address: string;
    addressValue: string;
    call: string;
    whatsapp: string;
    emailUs: string;
    mapTitle: string;
  }
> = {
  fr: {
    badge: "Contact",
    title: "Parlons de votre projet immobilier",
    sub: "Un conseiller Rostomyia vous répond rapidement. Local & diaspora — même niveau de clarté et de sécurité.",
    cardTitle: "Coordonnées",
    formTitle: "Envoyer un message",
    name: "Nom",
    email: "Email",
    phone: "Téléphone",
    subject: "Sujet",
    message: "Message",
    send: "Envoyer",
    sentOk: "Message envoyé ✅",
    sentSub: "Nous vous répondrons très vite.",
    hours: "Horaires",
    hoursValue: "Sam–Jeu: 09:00–18:00",
    address: "Adresse",
    addressValue: "Oran, Algérie",
    call: "Appeler",
    whatsapp: "WhatsApp",
    emailUs: "Email",
    mapTitle: "Nous trouver",
  },
  ar: {
    badge: "تواصل",
    title: "دعنا نساعدك في مشروعك العقاري",
    sub: "مستشار من روستوميا يرد بسرعة. محلي أو جالية — نفس مستوى الوضوح والأمان.",
    cardTitle: "بيانات التواصل",
    formTitle: "أرسل رسالة",
    name: "الاسم",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    subject: "الموضوع",
    message: "الرسالة",
    send: "إرسال",
    sentOk: "تم الإرسال ✅",
    sentSub: "سنرد عليك قريباً جداً.",
    hours: "الأوقات",
    hoursValue: "السبت–الخميس: 09:00–18:00",
    address: "العنوان",
    addressValue: "وهران، الجزائر",
    call: "اتصال",
    whatsapp: "واتساب",
    emailUs: "إيميل",
    mapTitle: "الموقع",
  },
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function InfoCard({
  icon,
  title,
  value,
  action,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  action?: string;
  href?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur">
      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[rgb(var(--gold))]/10 blur-3xl" />
      <div className="flex items-start gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[rgb(var(--navy))]/8 text-[rgb(var(--navy))]">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-[0.16em] text-black/45">{title}</div>
          <div className="mt-1 truncate text-sm font-semibold text-[rgb(var(--navy))]">
            {value}
          </div>

          {href && action ? (
            <a
              href={href}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-[rgb(var(--navy))] shadow-sm hover:bg-neutral-50"
            >
              {action} <ArrowUpRight size={14} />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function ContactClient({ lang }: { lang: Lang }) {
  const t = copy[lang];

  // TODO: Replace these with your real contact details
  const CONTACT = useMemo(
    () => ({
      phoneDisplay: "+213 0556195427", // change
      phoneHref: "tel:+2130556195427", // change
      whatsappDisplay: "+213 0556195427", // change
      whatsappHref: "https://wa.me/213000000000", // change
      emailDisplay: "contact@rostomyia.com", // change
      emailHref: "mailto:contact@rostomyia.com", // change
      address: t.addressValue,
      // Google Maps embed (replace query/address if you want)
      mapEmbed:
        "https://www.google.com/maps?q=Oran%20Algeria&output=embed",
    }),
    [t.addressValue]
  );

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const [status, setStatus] = useState<"idle" | "sent">("idle");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For now this is UI-only.
    // If you want real sending: I can hook it to Supabase + email provider (Resend) or WhatsApp deep-link.
    setStatus("sent");
    setTimeout(() => setStatus("idle"), 3500);
    setForm({ name: "", email: "", phone: "", subject: "", message: "" });
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="relative overflow-hidden rounded-[34px] border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur md:p-10"
      >
        <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-[rgb(var(--gold))]/16 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -bottom-24 h-64 w-64 rounded-full bg-[rgb(var(--navy))]/8 blur-3xl" />

        <span className="inline-flex rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs tracking-[0.18em] text-black/60 shadow-sm">
          {t.badge}
        </span>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[rgb(var(--navy))] md:text-5xl">
          {t.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/60 md:text-base">
          {t.sub}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <a
            href={CONTACT.whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))] px-5 py-2 text-sm font-semibold text-white shadow-lg hover:opacity-90"
          >
            <MessageCircle size={16} />
            {t.whatsapp}
          </a>
          <a
            href={CONTACT.phoneHref}
            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-2 text-sm font-semibold text-[rgb(var(--navy))] shadow-sm hover:bg-neutral-50"
          >
            <Phone size={16} />
            {t.call}
          </a>
        </div>
      </motion.section>

      {/* Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: contact cards */}
        <motion.aside
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="space-y-3 lg:col-span-4"
        >
          <div className="text-base font-semibold text-[rgb(var(--navy))]">{t.cardTitle}</div>

          <InfoCard
            icon={<Phone size={18} />}
            title={t.call}
            value={CONTACT.phoneDisplay}
            action={t.call}
            href={CONTACT.phoneHref}
          />
          <InfoCard
            icon={<MessageCircle size={18} />}
            title={t.whatsapp}
            value={CONTACT.whatsappDisplay}
            action={t.whatsapp}
            href={CONTACT.whatsappHref}
          />
          <InfoCard
            icon={<Mail size={18} />}
            title={t.emailUs}
            value={CONTACT.emailDisplay}
            action={t.emailUs}
            href={CONTACT.emailHref}
          />
          <InfoCard
            icon={<Clock size={18} />}
            title={t.hours}
            value={t.hoursValue}
          />
          <InfoCard
            icon={<MapPin size={18} />}
            title={t.address}
            value={CONTACT.address}
          />
        </motion.aside>

        {/* Center: form */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.05 }}
          className="lg:col-span-5"
        >
          <div className="rounded-[28px] border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur md:p-8">
            <div className="flex items-center justify-between gap-3">
              <div className="text-base font-semibold text-[rgb(var(--navy))]">{t.formTitle}</div>
              {status === "sent" ? (
                <div className="rounded-full bg-[rgb(var(--gold))]/20 px-3 py-1 text-xs font-semibold text-[rgb(var(--navy))]">
                  {t.sentOk}
                </div>
              ) : null}
            </div>

            <p className="mt-2 text-sm text-black/55">{status === "sent" ? t.sentSub : ""}</p>

            <form onSubmit={onSubmit} className="mt-6 space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder={t.name}
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/20"
                />
                <input
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder={t.email}
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/20"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder={t.phone}
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/20"
                />
                <input
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder={t.subject}
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/20"
                />
              </div>

              <textarea
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder={t.message}
                rows={6}
                className="w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/20"
              />

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[rgb(var(--navy))] px-5 py-3 text-sm font-semibold text-white shadow-lg hover:opacity-90"
              >
                <Send size={16} />
                {t.send}
              </button>

              <div className="text-xs text-black/45">
                {lang === "ar"
                  ? "ملاحظة: يمكننا ربط هذا النموذج بإيميل أو واتساب تلقائياً عند رغبتك."
                  : "Note: On peut connecter ce formulaire à l’email (Resend) ou WhatsApp automatiquement."}
              </div>
            </form>
          </div>
        </motion.section>

        {/* Right: map */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.1 }}
          className="lg:col-span-3"
        >
          <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white/70 shadow-sm backdrop-blur">
            <div className="p-4">
              <div className="text-base font-semibold text-[rgb(var(--navy))]">{t.mapTitle}</div>
              <p className="mt-1 text-sm text-black/55">
                {lang === "ar" ? "زرنا في وهران." : "Venez nous voir à Oran."}
              </p>
            </div>

            <div className="relative aspect-[4/5] bg-black/5">
              <iframe
                title="map"
                src={CONTACT.mapEmbed}
                className="absolute inset-0 h-full w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(10,18,35,0.12),transparent_45%)]" />
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
