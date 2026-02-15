"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  BedDouble,
  Bath,
  Ruler,
  Phone,
  MessageCircle,
  ShieldCheck,
  ListChecks,
  FileText,
  MapPinned,
  CheckCircle2,
  Sparkles,
  BadgeCheck,
  Banknote,
  ReceiptText,
} from "lucide-react";
import PropertyImageSlider from "@/components/PropertyImageSlider";

type Dict = {
  back: string;
  contact: string;
  call: string;
  wa: string;
  book: string;
  ref: string;
  desc: string;
  descText: string;
  details: string;
  locationLabel: string;
  priceLabel: string;
  commissionLabel: string;
  paymentLabel: string;
  undefinedLabel: string;
  cityCountry: string;
  bedsLabel: string;
  bathsLabel: string;
};

type DescriptionSection = {
  title?: string;
  paragraphs: string[];
  bullets: string[];
};

type PropertyPayload = {
  ref: string;
  title: string;
  type: string;
  price: string;
  location: string;
  beds: number;
  baths: number;
  area: number;
  description?: string | null;
};

type Props = {
  dir: "ltr" | "rtl";
  t: Dict;
  property: PropertyPayload;
  images: string[];
  waLink: string;
  phone: string;
  sections: DescriptionSection[];
};

export default function PropertyDetailClient({ dir, t, property, images, waLink, phone, sections }: Props) {
  function formatDzd(raw: string) {
    const txt = (raw ?? "").trim();
    if (!txt) return t.undefinedLabel;
    const digits = txt.replace(/[^\d]/g, "");
    if (!digits) return txt;
    const n = Number(digits);
    if (!Number.isFinite(n)) return txt;
    return `${n.toLocaleString("fr-DZ")} DZD`;
  }

  function sectionMeta(title?: string) {
    const v = (title ?? "").toLowerCase();
    if (v.includes("caracteristiques")) {
      return { icon: ListChecks, chip: "bg-[rgb(var(--gold))]/22 text-[rgb(var(--navy))] ring-[rgb(var(--gold))]/25" };
    }
    if (v.includes("emplacement")) {
      return { icon: MapPinned, chip: "bg-[rgb(var(--navy))]/6 text-[rgb(var(--navy))] ring-black/10" };
    }
    if (v.includes("description")) {
      return { icon: FileText, chip: "bg-black/5 text-[rgb(var(--navy))] ring-black/10" };
    }
    return { icon: FileText, chip: "bg-black/5 text-[rgb(var(--navy))] ring-black/10" };
  }

  function extractSidebarDetails() {
    let location = property.location;
    let paymentTerms = "";
    let agencyFees = "";
    let priceFromDesc = "";

    const lineValue = (line: string) => line.split(":").slice(1).join(":").trim();

    for (const s of sections) {
      const title = (s.title ?? "").toLowerCase();
      const lines = [...s.paragraphs, ...s.bullets];

      if (title.includes("emplacement") && lines.length) {
        location = lines[0];
      }

      for (const ln of lines) {
        const v = ln.toLowerCase();
        if (v.startsWith("emplacement")) location = lineValue(ln) || location;
        if (v.startsWith("loyer") || v.startsWith("prix")) priceFromDesc = lineValue(ln) || priceFromDesc;
        if (v.startsWith("paiement")) paymentTerms = lineValue(ln) || paymentTerms;
        if (v.startsWith("frais d'agence") || v.startsWith("frais d agence")) {
          agencyFees = lineValue(ln) || agencyFees;
        }
      }
    }

    const priceLabel = priceFromDesc || property.price;
    return {
      location,
      paymentTerms: paymentTerms || t.undefinedLabel,
      agencyFees: agencyFees || t.undefinedLabel,
      priceLabel: formatDzd(priceLabel),
    };
  }

  const sidebarDetails = extractSidebarDetails();
  const filteredSections = sections
    .map((s) => {
      const title = (s.title ?? "").toLowerCase();
      if (title.includes("emplacement")) return null;

      const keepLine = (line: string) => {
        const v = line.toLowerCase();
        return !(
          v.startsWith("emplacement") ||
          v.startsWith("loyer") ||
          v.startsWith("prix") ||
          v.startsWith("paiement") ||
          v.startsWith("frais d'agence") ||
          v.startsWith("frais d agence")
        );
      };

      const paragraphs = s.paragraphs.filter(keepLine);
      const bullets = s.bullets.filter(keepLine);
      if (!s.title && !paragraphs.length && !bullets.length) return null;
      if (s.title && !paragraphs.length && !bullets.length) return null;
      return { ...s, paragraphs, bullets };
    })
    .filter(Boolean) as DescriptionSection[];

  return (
    <main dir={dir} className="relative mx-auto max-w-6xl px-4 py-10">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 -top-20 h-72 w-72 rounded-full bg-[rgb(var(--gold))]/18 blur-3xl" />
        <div className="absolute -right-28 top-24 h-80 w-80 rounded-full bg-[rgb(var(--navy))]/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-white to-transparent" />
      </div>

      <Link href="/biens" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:underline">
        <ArrowLeft size={16} />
        {t.back}
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-[1.35fr_0.65fr]">
        <div>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <PropertyImageSlider
              images={images}
              alt={property.title}
              aspectClassName="aspect-[16/9]"
              sizes="(max-width: 768px) 100vw, 70vw"
              priority
              showThumbs
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mt-6"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--gold))]/20 px-3 py-1 text-xs font-semibold text-[rgb(var(--navy))] ring-1 ring-[rgb(var(--gold))]/25">
                <Sparkles size={14} />
                {property.type}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-[rgb(var(--navy))] ring-1 ring-black/10">
                <BadgeCheck size={14} className="text-[rgb(var(--gold))]" />
                {t.ref}: {property.ref}
              </span>
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-[rgb(var(--navy))]">{property.title}</h1>

            <p className="mt-2 inline-flex items-center gap-2 text-slate-600">
              <MapPin size={16} className="text-[rgb(var(--gold))]" />
              {property.location}
            </p>

            <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
              <p className="text-2xl font-bold text-[rgb(var(--navy))]">{formatDzd(property.price)}</p>
              <div className="h-1 w-44 rounded-full bg-gradient-to-r from-[rgb(var(--gold))]/25 via-[rgb(var(--gold))]/70 to-[rgb(var(--gold))]/25 opacity-70" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-6 rounded-2xl bg-white/78 p-6 backdrop-blur ring-1 ring-black/5"
          >
            <div className="flex flex-wrap gap-2 text-sm text-[rgb(var(--navy))]">
              <span className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1 ring-1 ring-black/10">
                <BedDouble size={14} className="text-[rgb(var(--gold))]" />
                {property.beds} {t.bedsLabel}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1 ring-1 ring-black/10">
                <Bath size={14} className="text-[rgb(var(--gold))]" />
                {property.baths} {t.bathsLabel}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1 ring-1 ring-black/10">
                <Ruler size={14} className="text-[rgb(var(--gold))]" />
                {property.area} m2
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-6 rounded-2xl bg-white/78 p-6 backdrop-blur ring-1 ring-black/5"
          >
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-[rgb(var(--navy))]">
              <FileText size={18} className="text-[rgb(var(--gold))]" />
              {t.desc}
            </h2>

            {filteredSections.length ? (
              <div className="mt-4 space-y-4">
                {filteredSections.map((s, idx) => (
                  <section key={idx} className="rounded-2xl bg-white/85 p-4 ring-1 ring-black/5">
                    {s.title ? (
                      <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--navy))]">
                        {(() => {
                          const meta = sectionMeta(s.title);
                          const Icon = meta.icon;
                          return (
                            <>
                              <span className={`inline-flex rounded-full px-2 py-1 ring-1 ${meta.chip}`}>
                                <Icon size={14} />
                              </span>
                              {s.title}
                            </>
                          );
                        })()}
                      </h3>
                    ) : null}

                    {s.paragraphs.map((p) => (
                      <p key={p} className="mt-2 text-sm leading-relaxed text-slate-700">
                        {p}
                      </p>
                    ))}

                    {s.bullets.length ? (
                      <ul className="mt-3 space-y-2 text-sm text-slate-700">
                        {s.bullets.map((b) => (
                          <li
                            key={b}
                            className="flex items-start gap-2 rounded-xl bg-black/3 px-3 py-2 ring-1 ring-black/5"
                          >
                            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[rgb(var(--gold))]" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </section>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-slate-600">{t.descText}</p>
            )}
          </motion.div>
        </div>

        <motion.aside
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="h-fit rounded-2xl bg-white/78 p-6 backdrop-blur ring-1 ring-black/5 md:sticky md:top-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[rgb(var(--navy))]">{t.contact}</h2>
              <p className="mt-1 text-sm text-slate-600">{t.cityCountry}</p>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-[rgb(var(--gold))]/20 ring-1 ring-[rgb(var(--gold))]/25" />
          </div>

          <div className="mt-4 rounded-2xl bg-[rgb(var(--navy))]/95 p-4 text-white">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wide text-white/75">
              <MapPin size={13} className="text-[rgb(var(--gold))]" />
              {t.locationLabel}
            </div>
            <div className="mt-1 text-sm text-white">{sidebarDetails.location}</div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white/12 p-3">
                <div className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-white/70">
                  <Banknote size={12} className="text-[rgb(var(--gold))]" />
                  {t.priceLabel}
                </div>
                <div className="mt-1 text-base font-semibold text-[rgb(var(--gold))]">{sidebarDetails.priceLabel}</div>
              </div>
              <div className="rounded-xl bg-white/12 p-3">
                <div className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-white/70">
                  <ReceiptText size={12} className="text-[rgb(var(--gold))]" />
                  {t.commissionLabel}
                </div>
                <div className="mt-1 text-sm font-semibold text-white">{sidebarDetails.agencyFees}</div>
              </div>
            </div>

            <div className="mt-3 rounded-xl bg-white/10 p-3 text-xs text-white/85">
              {t.paymentLabel}: {sidebarDetails.paymentTerms}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <a
              href={`tel:${phone}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[rgb(var(--navy))]
                         px-4 py-3 text-white shadow-sm transition hover:translate-y-[-1px] hover:opacity-95"
            >
              <Phone size={16} />
              {t.call}
            </a>

            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[rgb(var(--gold))]
                         px-4 py-3 font-semibold text-[rgb(var(--navy))] shadow-sm transition hover:translate-y-[-1px] hover:opacity-95"
            >
              <MessageCircle size={16} />
              {t.wa}
            </a>

            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-black/5 px-4 py-3
                         text-[rgb(var(--navy))] ring-1 ring-black/10 transition hover:bg-black/10"
              type="button"
            >
              <ShieldCheck size={16} className="text-[rgb(var(--gold))]" />
              {t.book}
            </button>
          </div>

          <div className="mt-6 rounded-2xl bg-black/3 p-4 ring-1 ring-black/5">
            <div className="text-xs uppercase tracking-wide text-slate-500">{t.details}</div>
            <div className="mt-2 text-sm text-slate-700">{property.location}</div>
          </div>

          <div className="mt-4 h-1 w-full rounded-full bg-gradient-to-r from-[rgb(var(--gold))]/30 via-[rgb(var(--gold))]/70 to-[rgb(var(--gold))]/30 opacity-70" />
        </motion.aside>
      </div>
    </main>
  );
}
