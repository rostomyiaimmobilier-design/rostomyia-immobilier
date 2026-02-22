"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  ArrowLeft,
  MapPin,
  CarFront,
  Building2,
  Ruler,
  Phone,
  MessageCircle,
  ChevronDown,
  CalendarDays,
  ExternalLink,
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
import { formatPaymentLabel, normalizeFold } from "@/lib/payment-fallback";

type Dict = {
  back: string;
  contact: string;
  call: string;
  wa: string;
  book: string;
  ref: string;
  desc: string;
  descText: string;
  keyFeaturesTitle: string;
  keyFeatureSurface: string;
  keyFeatureParking: string;
  keyFeatureResidence: string;
  keyFeatureSeaView: string;
  keyFeatureYes: string;
  keyFeatureNotSpecified: string;
  viewMore: string;
  viewLess: string;
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
  locationType?: string | null;
  price: string;
  location: string;
  beds: number;
  baths: number;
  area: number;
  description?: string | null;
};

type Props = {
  dir: "ltr" | "rtl";
  t: Dict & { otherOptions?: string };
  property: PropertyPayload;
  images: string[];
  waLink: string;
  phone: string;
  sections: DescriptionSection[];
  relatedProperties: Array<{
    ref: string;
    title: string;
    type: string;
    price: string | number | null;
    location: string;
    paymentTerms: string | null;
    locationType?: string | null;
    imageUrl: string | null;
  }>;
};

export default function PropertyDetailClient({
  dir,
  t,
  property,
  images,
  waLink,
  phone,
  sections,
  relatedProperties,
}: Props) {
  const isArabic = dir === "rtl";

  function normalizeText(input?: string | null) {
    return normalizeFold(input);
  }

  function formatDzd(raw: string | number | null | undefined) {
    const txt = String(raw ?? "").trim();
    if (!txt) return t.undefinedLabel;
    const digits = txt.replace(/[^\d]/g, "");
    if (!digits) return txt;
    const n = Number(digits);
    if (!Number.isFinite(n)) return txt;
    return `${n.toLocaleString("fr-DZ")} DZD`;
  }

  function formatPayment(raw: string | null | undefined) {
    return formatPaymentLabel({
      rawPayment: raw,
      undefinedLabel: t.undefinedLabel,
      isArabic,
    });
  }

  function parseMoneyToInt(raw: string | number | null | undefined) {
    const txt = String(raw ?? "").trim();
    if (!txt) return null;
    const digits = txt.replace(/[^\d]/g, "");
    if (!digits) return null;
    const n = Number(digits);
    return Number.isFinite(n) ? n : null;
  }

  function isShortStayLocationType(raw: string | null | undefined) {
    const n = normalizeText(raw);
    return (
      n.includes("par_nuit") ||
      n.includes("par nuit") ||
      n.includes("nuit") ||
      n.includes("court_sejour") ||
      n.includes("court sejour") ||
      n.includes("sejour")
    );
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

  const featureLineArabicMap: Record<string, string> = {
    "suite parentale": "جناح رئيسي",
    "residence fermee": "إقامة مغلقة",
    "parking sous-sol": "موقف سيارات تحت الارض",
    "parking sous sol": "موقف سيارات تحت الارض",
    garage: "مرآب",
    box: "مرآب",
    luxe: "فاخر",
    "haut standing": "رفيع المستوى",
    domotique: "نظام منزل ذكي",
    "double ascenseur": "مصعدان",
    concierge: "خدمة الاستقبال",
    "camera de surveillance": "كاميرات مراقبة",
    "groupe electrogene": "مولد كهربائي",
    "chauffage central": "تدفئة مركزية",
    climatisation: "تكييف",
    cheminee: "مدفاة",
    dressing: "غرفة ملابس",
    "porte blindee": "باب مصفح",
    "cuisine equipee": "مطبخ مجهز",
    "salle de bain italienne": "حمام عصري",
    "deux balcons": "شرفتان",
    terrasse: "شرفة كبيرة",
    jardin: "حديقة",
    piscine: "مسبح",
    "salle de sport": "قاعة رياضة",
    interphone: "إنترفون",
  };

  function translateTransactionValue(value: string) {
    const n = normalizeText(value);
    if ((n.includes("location") && n.includes("nuit")) || n.includes("par_nuit")) return "كراء / بالليلة";
    if ((n.includes("location") && n.includes("par mois")) || n.includes("par_mois")) return "كراء / بالشهر";
    if (n.includes("location") && (n.includes("6 mois") || n.includes("six mois") || n.includes("six_mois"))) {
      return "كراء / 6 أشهر";
    }
    if (
      n.includes("location") &&
      (n.includes("12 mois") || n.includes("douze mois") || n.includes("douze_mois"))
    ) {
      return "كراء / 12 شهر";
    }
    if (n.includes("vente")) return "بيع";
    if (n.includes("location")) return "كراء";
    return value;
  }

  function localizeFeatureLine(input: string) {
    if (!isArabic) return input;
    const raw = input.trim();
    const normalized = normalizeText(raw).replace(/\s+/g, " ");
    if (!normalized) return raw;

    const mapped = featureLineArabicMap[normalized];
    if (mapped) return mapped;

    if (normalized.startsWith("modalite")) {
      const parts = raw.split(":");
      if (parts.length > 1) {
        const value = parts.slice(1).join(":").trim();
        return `نوع المعاملة: ${translateTransactionValue(value)}`;
      }
      return "نوع المعاملة";
    }

    if (normalized.startsWith("etage")) {
      const parts = raw.split(":");
      if (parts.length > 1) {
        const value = parts.slice(1).join(":").trim();
        return `الطابق: ${value}`;
      }
      return "الطابق";
    }

    return raw;
  }

  function extractSidebarDetails() {
    let location = property.location;
    let paymentTerms = "";
    let agencyFees = "";
    let priceFromDesc = "";

    const lineValue = (line: string) => {
      const colon = line.split(":").slice(1).join(":").trim();
      if (colon) return colon;
      return line.split("-").slice(1).join("-").trim();
    };

    for (const s of sections) {
      const title = (s.title ?? "").toLowerCase();
      const lines = [...s.paragraphs, ...s.bullets];

      if (title.includes("emplacement") && lines.length) {
        location = lines[0];
      }

      for (const ln of lines) {
        const v = ln.toLowerCase();
        const n = normalizeText(ln);
        if (v.startsWith("emplacement")) location = lineValue(ln) || location;
        if (v.startsWith("loyer") || v.startsWith("prix")) priceFromDesc = lineValue(ln) || priceFromDesc;
        if (
          n.startsWith("paiement") ||
          n.startsWith("paiment") ||
          n.startsWith("payment") ||
          n.startsWith("modalites de paiement") ||
          n.startsWith("modalites paiement") ||
          n.startsWith("mode de paiement")
        ) {
          paymentTerms = lineValue(ln) || paymentTerms;
        }
        if (v.startsWith("frais d'agence") || v.startsWith("frais d agence")) {
          agencyFees = lineValue(ln) || agencyFees;
        }
      }
    }

    const cleanedAgencyFees = agencyFees
      .replace(/\s*[-|–—]?\s*rostomyia\s+immobilier\.?/gi, "")
      .trim();

    const priceSource = priceFromDesc || property.price;
    const priceNumber = parseMoneyToInt(priceSource);
    const agencyFeesNumber = parseMoneyToInt(cleanedAgencyFees);
    const shouldAddAgencyToPrice = isShortStayLocationType(property.locationType);
    const totalPrice =
      shouldAddAgencyToPrice && priceNumber != null && agencyFeesNumber != null
        ? priceNumber + agencyFeesNumber
        : null;
    const paymentWithUnit = formatPaymentLabel({
      rawPayment: paymentTerms.trim(),
      locationType: property.locationType,
      undefinedLabel: t.undefinedLabel,
      isArabic,
    });

    return {
      location,
      paymentTerms: paymentWithUnit,
      agencyFees:
        shouldAddAgencyToPrice && agencyFeesNumber != null
          ? formatDzd(agencyFeesNumber)
          : cleanedAgencyFees || t.undefinedLabel,
      priceLabel: formatDzd(totalPrice ?? priceSource),
    };
  }

  const sidebarDetails = extractSidebarDetails();
  const resolvedLocation = (sidebarDetails.location || property.location || "").trim();
  const mapQuery = resolvedLocation ? `${resolvedLocation}, Oran, Algeria` : "";
  const mapEmbedUrl = mapQuery
    ? `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=14&ie=UTF8&iwloc=&output=embed`
    : "";
  const mapHref = mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
    : "";
  const openMapLabel = dir === "rtl" ? "فتح الخريطة" : "Ouvrir sur la carte";
  const mapFallback = dir === "rtl" ? "الموقع غير محدد حالياً." : "Emplacement non precise pour le moment.";
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});
  const [showContactMenu, setShowContactMenu] = useState(false);

  function isFeatureSectionTitle(input?: string) {
    const t = normalizeText(input);
    return t.includes("caracteristiques principales") || t.includes("caracteristiques");
  }

  const filteredSections = sections
    .map((s) => {
      const title = (s.title ?? "").toLowerCase();
      if (title.includes("emplacement")) return null;

      const keepLine = (line: string) => {
        const v = line.toLowerCase();
        const n = normalizeText(line);
        const isPaymentLine =
          n.startsWith("paiement") ||
          n.startsWith("paiment") ||
          n.startsWith("payment") ||
          n.startsWith("modalites de paiement") ||
          n.startsWith("modalites paiement") ||
          n.startsWith("mode de paiement");
        return !(
          v.startsWith("emplacement") ||
          v.startsWith("loyer") ||
          v.startsWith("prix") ||
          isPaymentLine ||
          v.startsWith("frais d'agence") ||
          v.startsWith("frais d agence") ||
          n.startsWith("type :") ||
          n.startsWith("configuration :") ||
          n.startsWith("superficie :")
        );
      };

      const paragraphs = s.paragraphs.filter(keepLine);
      const bullets = s.bullets.filter(keepLine);
      if (!s.title && !paragraphs.length && !bullets.length) return null;
      if (s.title && !paragraphs.length && !bullets.length) return null;
      return { ...s, paragraphs, bullets };
    })
    .filter(Boolean) as DescriptionSection[];
  const topFeatureBullets =
    filteredSections.find((s) => isFeatureSectionTitle(s.title))?.bullets.slice(0, 3) ?? [];
  const allDetailsText = [property.title, ...filteredSections.flatMap((s) => [s.title ?? "", ...s.paragraphs, ...s.bullets])]
    .join(" ")
    .trim();
  const normalizedDetails = normalizeText(allDetailsText);
  const hasParkingSousSol = /parking\s+sous[-\s]?sol/.test(normalizedDetails);
  const hasResidence = normalizedDetails.includes("residence");
  const hasVueSurMer = /vue\s+(sur\s+)?mer/.test(normalizedDetails);
  const keyCharacteristics = [
    { icon: <Ruler size={15} />, label: t.keyFeatureSurface, value: `${property.area} m2` },
    {
      icon: <CarFront size={15} />,
      label: t.keyFeatureParking,
      value: hasParkingSousSol ? t.keyFeatureYes : t.keyFeatureNotSpecified,
    },
    {
      icon: <Building2 size={15} />,
      label: t.keyFeatureResidence,
      value: hasResidence ? t.keyFeatureYes : t.keyFeatureNotSpecified,
    },
    {
      icon: <MapPin size={15} />,
      label: t.keyFeatureSeaView,
      value: hasVueSurMer ? t.keyFeatureYes : t.keyFeatureNotSpecified,
    },
  ];

  return (
    <main
      dir={dir}
      className="relative mx-auto max-w-6xl overflow-x-hidden px-4 py-10"
    >
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
        <div className="min-w-0">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <PropertyImageSlider
              images={images}
              alt={property.title}
              aspectClassName="aspect-[4/3] md:aspect-[16/9]"
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
              <p className="text-2xl font-bold text-[rgb(var(--navy))]">{sidebarDetails.priceLabel}</p>
              <div className="h-1 w-44 rounded-full bg-gradient-to-r from-[rgb(var(--gold))]/25 via-[rgb(var(--gold))]/70 to-[rgb(var(--gold))]/25 opacity-70" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-6 overflow-hidden bg-[rgb(var(--navy))]/95 ring-1 ring-[rgb(var(--gold))]/35"
          >
            <div className="border-b border-[rgb(var(--gold))]/40 bg-[rgb(var(--gold))]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--gold))]">
              {t.keyFeaturesTitle}
            </div>

            <div className="grid grid-cols-1 divide-y divide-white/15 bg-[rgb(var(--navy))]/95 text-white sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              {keyCharacteristics.map((item) => (
                <KeyFeatureTile key={item.label} icon={item.icon} label={item.label} value={item.value} />
              ))}
            </div>

            {topFeatureBullets.length > 0 && (
              <div className="grid grid-cols-1 divide-y divide-[rgb(var(--navy))]/10 bg-white text-[rgb(var(--navy))] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {topFeatureBullets.map((item) => (
                  <div key={item} className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium">
                    <CheckCircle2 size={14} className="shrink-0 text-[rgb(var(--gold))]" />
                    <span>{localizeFeatureLine(item)}</span>
                  </div>
                ))}
              </div>
            )}
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
                  <section
                    key={idx}
                    className={`rounded-2xl p-4 ring-1 ${isFeatureSectionTitle(s.title) ? "bg-[rgb(var(--navy))]/3 ring-[rgb(var(--navy))]/10" : "bg-white/85 ring-black/5"}`}
                  >
                    {s.title ? (
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--navy))]">
                          {(() => {
                            const meta = sectionMeta(s.title);
                            const Icon = meta.icon;
                            return (
                              <>
                                <span className={`inline-flex rounded-full px-2 py-1 ring-1 ${meta.chip}`}>
                                  <Icon size={14} />
                                </span>
                                {isFeatureSectionTitle(s.title) ? t.keyFeaturesTitle : s.title}
                              </>
                            );
                          })()}
                        </h3>

                        {isFeatureSectionTitle(s.title) && s.bullets.length > 6 ? (
                          <button
                            type="button"
                            onClick={() => setExpandedSections((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                            className="rounded-lg border border-black/10 bg-white px-2 py-1 text-[11px] font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
                          >
                            {expandedSections[idx] ? t.viewLess : t.viewMore}
                          </button>
                        ) : null}
                      </div>
                    ) : null}

                    {s.paragraphs.map((p) => (
                      <p key={p} className="mt-2 text-sm leading-relaxed text-slate-700">
                        {isFeatureSectionTitle(s.title) ? localizeFeatureLine(p) : p}
                      </p>
                    ))}

                    {s.bullets.length ? (
                      isFeatureSectionTitle(s.title) ? (
                        <ul className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                          {(expandedSections[idx] ? s.bullets : s.bullets.slice(0, 6)).map((b) => (
                            <li
                              key={b}
                              className="flex items-start gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-black/10"
                            >
                              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[rgb(var(--gold))]" />
                              <span>{localizeFeatureLine(b)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
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
                      )
                    ) : null}
                  </section>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-slate-600">{t.descText}</p>
            )}
          </motion.div>

          <section className="mt-6 rounded-2xl bg-white/78 p-6 backdrop-blur ring-1 ring-black/5 md:hidden">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[rgb(var(--navy))]">{t.contact}</h2>
                <p className="mt-1 text-sm text-slate-600">{t.cityCountry}</p>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-[rgb(var(--gold))]/20 ring-1 ring-[rgb(var(--gold))]/25" />
            </div>

            <div className="mt-4 rounded-2xl bg-[rgb(var(--navy))]/95 p-4 text-white">
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white/12 p-3">
                  <div className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-white/70">
                    <Banknote size={12} className="text-[rgb(var(--gold))]" />
                    {t.priceLabel}
                  </div>
                  <div className="mt-1 text-base font-semibold text-white">{sidebarDetails.priceLabel}</div>
                </div>
                <div className="rounded-xl bg-white/12 p-3">
                  <div className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-white/70">
                    <ReceiptText size={12} className="text-[rgb(var(--gold))]" />
                    {t.commissionLabel}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white">{sidebarDetails.agencyFees}</div>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-[rgb(var(--gold))]/35 bg-[rgb(var(--gold))]/18 p-3">
                <div className="text-[11px] uppercase tracking-wide text-white/75">{t.paymentLabel}</div>
                <div className="mt-1 text-sm font-semibold text-[rgb(var(--gold))]">{sidebarDetails.paymentTerms}</div>
              </div>
            </div>

            <div className="relative mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowContactMenu((v) => !v)}
                className="inline-flex items-center justify-center gap-1 rounded-xl bg-[rgb(var(--navy))] px-2 py-2 text-xs font-semibold text-white"
              >
                <Phone size={14} />
                {t.call}
                <ChevronDown size={12} className={`transition ${showContactMenu ? "rotate-180" : ""}`} />
              </button>
              <Link
                href={`/visite?ref=${encodeURIComponent(property.ref)}`}
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-black/10 bg-white px-2 py-2 text-xs font-semibold text-[rgb(var(--navy))]"
              >
                <CalendarDays size={14} />
                {t.book}
              </Link>

              {showContactMenu && (
                <div className="absolute top-full left-0 right-0 z-20 mt-2 rounded-xl border border-black/10 bg-white p-2 shadow-lg">
                  <a
                    href={`tel:${phone}`}
                    className="inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[rgb(var(--navy))] hover:bg-black/5"
                  >
                    <Phone size={15} />
                    {phone}
                  </a>
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[rgb(var(--navy))] hover:bg-black/5"
                  >
                    <MessageCircle size={15} />
                    WhatsApp
                  </a>
                </div>
              )}
            </div>
          </section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18 }}
            className="mt-6 rounded-2xl bg-white/78 p-6 backdrop-blur ring-1 ring-black/5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-[rgb(var(--navy))]">
                <MapPinned size={18} className="text-[rgb(var(--gold))]" />
                {t.locationLabel}
              </h2>
              {mapHref ? (
                <a
                  href={mapHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
                >
                  <ExternalLink size={13} />
                  {openMapLabel}
                </a>
              ) : null}
            </div>

            <p className="mt-2 text-sm text-slate-600">{resolvedLocation || t.undefinedLabel}</p>

            {mapEmbedUrl ? (
              <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-black/10">
                <iframe
                  title={`${t.locationLabel} - ${property.title}`}
                  src={mapEmbedUrl}
                  className="h-60 w-full md:h-72"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-black/15 bg-white p-4 text-sm text-slate-600">
                {mapFallback}
              </div>
            )}

            {relatedProperties.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
                  {t.otherOptions || "Autres biens"}
                </h3>
                <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2">
                  {relatedProperties.map((item) => (
                    <Link
                      key={item.ref}
                      href={`/biens/${encodeURIComponent(item.ref)}`}
                      className="min-w-0 basis-[78%] shrink-0 snap-start overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:basis-[52%] lg:basis-[38%] xl:basis-[32%]"
                    >
                      <div className="aspect-[4/3] w-full bg-slate-100">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-slate-200 via-slate-100 to-white" />
                        )}
                      </div>
                      <div className="space-y-2 p-3">
                        <div className="line-clamp-1 text-sm font-semibold text-[rgb(var(--navy))]">{item.title}</div>
                        <div className="line-clamp-1 text-xs text-slate-600">{item.location || t.undefinedLabel}</div>
                        <div className="rounded-lg bg-[rgb(var(--navy))]/6 px-2 py-1 text-xs font-semibold text-[rgb(var(--navy))]">
                          <span className="text-black/60">{t.priceLabel}: </span>
                          {formatDzd(item.price)}
                        </div>
                        <div className="rounded-lg bg-[rgb(var(--gold))]/20 px-2 py-1 text-xs font-semibold text-[rgb(var(--navy))]">
                          <span className="text-black/60">{t.paymentLabel}: </span>
                          {formatPayment(item.paymentTerms || item.locationType)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </motion.section>
        </div>

        <motion.aside
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="hidden h-fit rounded-2xl bg-white/78 p-6 backdrop-blur ring-1 ring-black/5 md:block md:sticky md:top-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[rgb(var(--navy))]">{t.contact}</h2>
              <p className="mt-1 text-sm text-slate-600">{t.cityCountry}</p>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-[rgb(var(--gold))]/20 ring-1 ring-[rgb(var(--gold))]/25" />
          </div>

          <div className="mt-4 rounded-2xl bg-[rgb(var(--navy))]/95 p-4 text-white">
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white/12 p-3">
                <div className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-white/70">
                  <Banknote size={12} className="text-[rgb(var(--gold))]" />
                  {t.priceLabel}
                </div>
                <div className="mt-1 text-base font-semibold text-white">{sidebarDetails.priceLabel}</div>
              </div>
              <div className="rounded-xl bg-white/12 p-3">
                <div className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-white/70">
                  <ReceiptText size={12} className="text-[rgb(var(--gold))]" />
                  {t.commissionLabel}
                </div>
                <div className="mt-1 text-sm font-semibold text-white">{sidebarDetails.agencyFees}</div>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-[rgb(var(--gold))]/35 bg-[rgb(var(--gold))]/18 p-3">
              <div className="text-[11px] uppercase tracking-wide text-white/75">{t.paymentLabel}</div>
              <div className="mt-1 text-sm font-semibold text-[rgb(var(--gold))]">{sidebarDetails.paymentTerms}</div>
            </div>
          </div>

          <div className="mt-4 hidden space-y-3 md:block">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowContactMenu((v) => !v)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[rgb(var(--navy))]
                           px-4 py-3 text-white shadow-sm transition hover:translate-y-[-1px] hover:opacity-95"
              >
                <Phone size={16} />
                {t.call}
                <ChevronDown size={14} className={`transition ${showContactMenu ? "rotate-180" : ""}`} />
              </button>

              {showContactMenu && (
                <div className="absolute left-0 right-0 z-20 mt-2 rounded-xl border border-black/10 bg-white p-2 shadow-lg">
                  <a
                    href={`tel:${phone}`}
                    className="inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[rgb(var(--navy))] hover:bg-black/5"
                  >
                    <Phone size={15} />
                    {phone}
                  </a>
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[rgb(var(--navy))] hover:bg-black/5"
                  >
                    <MessageCircle size={15} />
                    WhatsApp
                  </a>
                </div>
              )}
            </div>

            <Link
              href={`/visite?ref=${encodeURIComponent(property.ref)}`}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[rgb(var(--navy))] to-slate-900 px-4 py-3
                         font-semibold text-white shadow-sm ring-1 ring-black/10 transition hover:translate-y-[-1px] hover:opacity-95"
            >
              <CalendarDays size={16} className="text-[rgb(var(--gold))]" />
              {t.book}
              <span className="rounded-full bg-white/12 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/85">
                24h
              </span>
            </Link>
          </div>

          <div className="mt-4 h-1 w-full rounded-full bg-gradient-to-r from-[rgb(var(--gold))]/30 via-[rgb(var(--gold))]/70 to-[rgb(var(--gold))]/30 opacity-70" />
        </motion.aside>
      </div>
    </main>
  );
}

function KeyFeatureTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="px-4 py-3">
      <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-white/70">
        <span className="text-[rgb(var(--gold))]">{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
