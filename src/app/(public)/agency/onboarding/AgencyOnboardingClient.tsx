"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { DragEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import dayjs, { type Dayjs } from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import {
  Building2,
  Eye,
  Globe2,
  GripVertical,
  ImagePlus,
  Loader2,
  Monitor,
  Palette,
  Settings2,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Megaphone,
  Phone,
  Trash2,
  WandSparkles,
} from "lucide-react";

type AgencyOnboardingClientProps = {
  initial: {
    agencyName: string;
    agencyPhone: string;
    agencyEmail: string;
    agencyStatus: string;
    slug: string;
    tagline: string;
    description: string;
    coverUrl: string;
    facebookUrl: string;
    instagramUrl: string;
    tiktokUrl: string;
    whatsapp: string;
    logoUrl: string;
    heroTitle: string;
    heroSubtitle: string;
    aboutTitle: string;
    servicesText: string;
    highlightsText: string;
    serviceAreas: string;
    languagesSpoken: string;
    businessHours: string;
    contactEmail: string;
    contactPhone: string;
    contactAddress: string;
    ctaLabel: string;
    ctaUrl: string;
    marketplaceTitle: string;
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string;
    brandPrimaryColor: string;
    brandSecondaryColor: string;
    brandAccentColor: string;
    themePreset: string;
    showServicesSection: boolean;
    showHighlightsSection: boolean;
    showContactSection: boolean;
    showMarketplaceSection: boolean;
    sectionOrder: string[];
    customDomain: string;
    customDomainStatus: string;
  };
};

function normalizeSlug(input: string) {
  return String(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function toOptional(value: string) {
  const v = String(value ?? "").trim();
  return v || null;
}

function parseLines(value: string) {
  const items = String(value ?? "")
    .split(/\r?\n/g)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const unique = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (unique.has(key)) continue;
    unique.add(key);
    out.push(item);
    if (out.length >= 12) break;
  }
  return out;
}

function normalizeHexColor(value: string) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(raw)) return raw;
  return "";
}

function isLikelyHttpUrl(value: string) {
  const v = String(value ?? "").trim();
  if (!v) return true;
  return /^https?:\/\//i.test(v);
}

function isLikelyEmail(value: string) {
  const v = String(value ?? "").trim();
  if (!v) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function timeToDayjs(value: string): Dayjs | null {
  const clean = String(value ?? "").trim();
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(clean)) return null;
  const parsed = dayjs(`2000-01-01T${clean}`);
  return parsed.isValid() ? parsed : null;
}

function dayjsToTime(value: Dayjs | null) {
  if (!value || !value.isValid()) return "";
  return value.format("HH:mm");
}

function parseBusinessHours(value: string) {
  const raw = String(value ?? "").trim();
  const times = raw.match(/\b(?:[01]\d|2[0-3]):[0-5]\d\b/g) ?? [];
  const firstMatch = times[0] ?? "";

  const firstTime = times[0] ?? "09:00";
  const secondTime = times[1] ?? "18:00";

  let prefix = "";
  if (firstMatch) {
    const idx = raw.indexOf(firstMatch);
    if (idx > 0) {
      prefix = raw.slice(0, idx).trim();
    }
  }

  return {
    prefix,
    openingTime: firstTime,
    closingTime: secondTime,
  };
}

function composeBusinessHours(prefix: string, openingTime: string, closingTime: string) {
  const start = String(openingTime ?? "").trim();
  const end = String(closingTime ?? "").trim();
  const range = start && end ? `${start}-${end}` : start || end;
  const cleanPrefix = String(prefix ?? "").trim();
  if (!range) return cleanPrefix;
  return cleanPrefix ? `${cleanPrefix} ${range}` : range;
}

const PREMIUM_LABEL_CLASS = "text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]/62";
const PREMIUM_INPUT_CLASS =
  "h-11 w-full rounded-2xl border border-[rgb(var(--navy))]/14 bg-[linear-gradient(180deg,#fff,rgba(248,250,252,0.96))] px-3.5 text-sm font-medium text-black/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)] outline-none transition placeholder:text-black/35 focus:border-[rgb(var(--navy))]/45 focus:ring-4 focus:ring-[rgb(var(--gold))]/16";
const PREMIUM_TEXTAREA_CLASS =
  "w-full rounded-2xl border border-[rgb(var(--navy))]/14 bg-[linear-gradient(180deg,#fff,rgba(248,250,252,0.96))] px-3.5 py-2.5 text-sm font-medium text-black/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)] outline-none transition placeholder:text-black/35 focus:border-[rgb(var(--navy))]/45 focus:ring-4 focus:ring-[rgb(var(--gold))]/16";
const PREMIUM_COLOR_CLASS =
  "h-11 w-full rounded-2xl border border-[rgb(var(--navy))]/14 bg-[linear-gradient(180deg,#fff,rgba(248,250,252,0.96))] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)] outline-none transition focus:border-[rgb(var(--navy))]/45 focus:ring-4 focus:ring-[rgb(var(--gold))]/16";
const MAX_COVER_FILE_BYTES = 8 * 1024 * 1024;
const MAX_LOGO_FILE_BYTES = 6 * 1024 * 1024;

const THEME_PRESETS = [
  { id: "premium", label: "Premium", primary: "#0f172a", secondary: "#f8fafc", accent: "#d4af37" },
  { id: "sunset", label: "Sunset", primary: "#7c2d12", secondary: "#fff7ed", accent: "#f97316" },
  { id: "emerald", label: "Emerald", primary: "#064e3b", secondary: "#ecfdf5", accent: "#34d399" },
] as const;

const SECTION_ORDER_OPTIONS = [
  { key: "about", label: "A propos" },
  { key: "services", label: "Services" },
  { key: "contact", label: "Contact" },
  { key: "marketplace", label: "Marketplace" },
] as const;

type SectionOrderKey = (typeof SECTION_ORDER_OPTIONS)[number]["key"];

function normalizeSectionOrder(value: unknown) {
  const parsed = Array.isArray(value) ? value : [];
  const allowed = SECTION_ORDER_OPTIONS.map((item) => item.key);
  const unique = new Set<SectionOrderKey>();
  const ordered: SectionOrderKey[] = [];

  for (const item of parsed) {
    const key = String(item ?? "").trim().toLowerCase() as SectionOrderKey;
    if (!allowed.includes(key) || unique.has(key)) continue;
    unique.add(key);
    ordered.push(key);
  }

  for (const key of allowed) {
    if (!unique.has(key)) ordered.push(key);
  }

  return ordered;
}

function normalizeThemePreset(value: string) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (THEME_PRESETS.some((item) => item.id === normalized)) {
    return normalized as (typeof THEME_PRESETS)[number]["id"];
  }
  return "";
}

export default function AgencyOnboardingClient({ initial }: AgencyOnboardingClientProps) {
  const router = useRouter();
  const parsedHours = parseBusinessHours(initial.businessHours);

  const [slug, setSlug] = useState(initial.slug);
  const [tagline, setTagline] = useState(initial.tagline);
  const [description, setDescription] = useState(initial.description);
  const [coverUrl, setCoverUrl] = useState(initial.coverUrl);
  const [facebookUrl, setFacebookUrl] = useState(initial.facebookUrl);
  const [instagramUrl, setInstagramUrl] = useState(initial.instagramUrl);
  const [tiktokUrl, setTiktokUrl] = useState(initial.tiktokUrl);
  const [whatsapp, setWhatsapp] = useState(initial.whatsapp);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);

  const [heroTitle, setHeroTitle] = useState(initial.heroTitle);
  const [heroSubtitle, setHeroSubtitle] = useState(initial.heroSubtitle);
  const [aboutTitle, setAboutTitle] = useState(initial.aboutTitle || "A propos");
  const [servicesText, setServicesText] = useState(initial.servicesText);
  const [highlightsText, setHighlightsText] = useState(initial.highlightsText);
  const [serviceAreas, setServiceAreas] = useState(initial.serviceAreas);
  const [languagesSpoken, setLanguagesSpoken] = useState(initial.languagesSpoken);
  const [businessHoursPrefix] = useState(parsedHours.prefix);
  const [openingTime, setOpeningTime] = useState(parsedHours.openingTime);
  const [closingTime, setClosingTime] = useState(parsedHours.closingTime);

  const [contactEmail, setContactEmail] = useState(initial.contactEmail);
  const [contactPhone, setContactPhone] = useState(initial.contactPhone || initial.agencyPhone);
  const [contactAddress, setContactAddress] = useState(initial.contactAddress);
  const [ctaLabel, setCtaLabel] = useState(initial.ctaLabel || "Nous contacter");
  const [ctaUrl, setCtaUrl] = useState(initial.ctaUrl);
  const [customDomain, setCustomDomain] = useState(initial.customDomain);
  const [customDomainStatus] = useState(initial.customDomainStatus || "unverified");
  const [marketplaceTitle, setMarketplaceTitle] = useState(initial.marketplaceTitle || "Marketplace des biens");

  const [seoTitle, setSeoTitle] = useState(initial.seoTitle);
  const [seoDescription, setSeoDescription] = useState(initial.seoDescription);
  const [seoKeywords, setSeoKeywords] = useState(initial.seoKeywords);

  const [brandPrimaryColor, setBrandPrimaryColor] = useState(normalizeHexColor(initial.brandPrimaryColor) || "#0f172a");
  const [brandSecondaryColor, setBrandSecondaryColor] = useState(normalizeHexColor(initial.brandSecondaryColor) || "#f8fafc");
  const [brandAccentColor, setBrandAccentColor] = useState(normalizeHexColor(initial.brandAccentColor) || "#d4af37");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverDragActive, setCoverDragActive] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoDragActive, setLogoDragActive] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [selectedThemePreset, setSelectedThemePreset] = useState<
    (typeof THEME_PRESETS)[number]["id"] | ""
  >(normalizeThemePreset(initial.themePreset));
  const [sectionOrder, setSectionOrder] = useState<SectionOrderKey[]>(
    normalizeSectionOrder(initial.sectionOrder)
  );
  const [draggedSection, setDraggedSection] = useState<SectionOrderKey | null>(null);
  const [showServicesPreview, setShowServicesPreview] = useState(initial.showServicesSection);
  const [showHighlightsPreview, setShowHighlightsPreview] = useState(initial.showHighlightsSection);
  const [showContactPreview, setShowContactPreview] = useState(initial.showContactSection);
  const [showMarketplacePreview, setShowMarketplacePreview] = useState(initial.showMarketplaceSection);

  const publicHref = slug ? `/agence/${encodeURIComponent(slug)}` : "";
  const canPublish = slug.trim().length >= 3;

  const completion = useMemo(() => {
    const checks = [
      slug.trim().length >= 3,
      heroTitle.trim().length > 0,
      tagline.trim().length > 0,
      description.trim().length > 0,
      parseLines(servicesText).length > 0,
      contactPhone.trim().length > 0 || contactEmail.trim().length > 0,
      marketplaceTitle.trim().length > 0,
    ];
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [slug, heroTitle, tagline, description, servicesText, contactPhone, contactEmail, marketplaceTitle]);

  const servicesList = useMemo(() => parseLines(servicesText), [servicesText]);
  const highlightsList = useMemo(() => parseLines(highlightsText), [highlightsText]);
  const businessHoursLabel = useMemo(
    () => composeBusinessHours(businessHoursPrefix, openingTime, closingTime),
    [businessHoursPrefix, openingTime, closingTime]
  );

  function applyThemePreset(presetId: (typeof THEME_PRESETS)[number]["id"]) {
    const preset = THEME_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    setSelectedThemePreset(preset.id);
    setBrandPrimaryColor(preset.primary);
    setBrandSecondaryColor(preset.secondary);
    setBrandAccentColor(preset.accent);
  }

  function applyBuilderDefaults() {
    if (!heroTitle.trim()) setHeroTitle(initial.agencyName);
    if (!tagline.trim()) setTagline("Votre partenaire immobilier de confiance");
    if (!aboutTitle.trim()) setAboutTitle("A propos");
    if (!marketplaceTitle.trim()) setMarketplaceTitle("Nos biens disponibles");
    if (!ctaLabel.trim()) setCtaLabel("Demander un rappel");
    if (!contactEmail.trim()) setContactEmail(initial.agencyEmail);
    if (!contactPhone.trim()) setContactPhone(initial.agencyPhone);
    if (!slug.trim()) setSlug(normalizeSlug(initial.agencyName || initial.agencyEmail));
    setShowServicesPreview(true);
    setShowHighlightsPreview(true);
    setShowContactPreview(true);
    setShowMarketplacePreview(true);
  }

  function autoGenerateSlug() {
    setSlug(normalizeSlug(heroTitle || initial.agencyName || initial.agencyEmail));
  }

  function normalizeCustomDomainInput(value: string) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "");
  }

  function onSectionDragStart(key: SectionOrderKey) {
    setDraggedSection(key);
  }

  function onSectionDrop(targetKey: SectionOrderKey) {
    if (!draggedSection || draggedSection === targetKey) return;
    setSectionOrder((prev) => {
      const next = [...prev];
      const from = next.indexOf(draggedSection);
      const to = next.indexOf(targetKey);
      if (from < 0 || to < 0) return prev;
      next.splice(from, 1);
      next.splice(to, 0, draggedSection);
      return next;
    });
    setDraggedSection(null);
  }

  async function uploadCoverFile(file: File) {
    const body = new FormData();
    body.append("file", file);

    const response = await fetch("/api/agency/storefront-cover", {
      method: "POST",
      body,
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; path?: string; url?: string }
      | null;

    if (!response.ok || !payload?.url) {
      throw new Error(payload?.error || "Upload cover impossible.");
    }

    return payload.url;
  }

  async function uploadLogoFile(file: File) {
    const body = new FormData();
    body.append("file", file);

    const response = await fetch("/api/agency/storefront-logo", {
      method: "POST",
      body,
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; path?: string; url?: string }
      | null;

    if (!response.ok || !payload?.url) {
      throw new Error(payload?.error || "Upload logo impossible.");
    }

    return payload.url;
  }

  async function onCoverPicked(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Format cover invalide. Utilisez une image.");
      return;
    }
    if (file.size > MAX_COVER_FILE_BYTES) {
      setErrorMsg("Image cover trop volumineuse (max 8 MB).");
      return;
    }

    setCoverUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const url = await uploadCoverFile(file);
      setCoverUrl(url);
      setSuccessMsg("Image cover mise a jour.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Upload cover impossible.");
    } finally {
      setCoverUploading(false);
    }
  }

  async function onLogoPicked(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Format logo invalide. Utilisez une image.");
      return;
    }
    if (file.size > MAX_LOGO_FILE_BYTES) {
      setErrorMsg("Image logo trop volumineuse (max 6 MB).");
      return;
    }

    setLogoUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const url = await uploadLogoFile(file);
      setLogoUrl(url);
      setSuccessMsg("Logo mis a jour.");
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Upload logo impossible.");
    } finally {
      setLogoUploading(false);
    }
  }

  function onCoverDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setCoverDragActive(true);
  }

  function onCoverDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setCoverDragActive(false);
  }

  async function onCoverDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setCoverDragActive(false);
    const file = event.dataTransfer?.files?.[0] ?? null;
    await onCoverPicked(file);
  }

  function onLogoDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setLogoDragActive(true);
  }

  function onLogoDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setLogoDragActive(false);
  }

  async function onLogoDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setLogoDragActive(false);
    const file = event.dataTransfer?.files?.[0] ?? null;
    await onLogoPicked(file);
  }

  async function assertSlugAvailability(normalizedSlug: string) {
    const response = await fetch(
      `/api/agency/storefront-slug?slug=${encodeURIComponent(normalizedSlug)}`,
      { method: "GET", cache: "no-store" }
    );

    const payload = (await response.json().catch(() => null)) as
      | {
          error?: string;
          available?: boolean;
          normalizedSlug?: string;
          suggestion?: string;
        }
      | null;

    if (!response.ok) {
      throw new Error(payload?.error || "Verification du slug impossible.");
    }

    if (!payload?.available) {
      const suggestion = String(payload?.suggestion ?? "").trim();
      const suffix = suggestion ? ` Essayez: ${suggestion}` : "";
      throw new Error(`Ce slug est deja utilise.${suffix}`);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const normalizedSlug = normalizeSlug(slug);
    if (normalizedSlug.length < 3) {
      setErrorMsg("Slug vitrine invalide. Utilisez au moins 3 caracteres.");
      return;
    }

    const invalidUrl = [coverUrl, facebookUrl, instagramUrl, tiktokUrl, ctaUrl].some(
      (value) => !isLikelyHttpUrl(value)
    );
    if (invalidUrl) {
      setErrorMsg("Les liens doivent commencer par http:// ou https://");
      return;
    }

    if (!isLikelyEmail(contactEmail)) {
      setErrorMsg("Email de contact invalide.");
      return;
    }

    const normalizedCustomDomain = normalizeCustomDomainInput(customDomain);
    if (
      normalizedCustomDomain &&
      !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(normalizedCustomDomain)
    ) {
      setErrorMsg("Domaine personnalise invalide (ex: agence-exemple.com).");
      return;
    }

    if (!normalizeHexColor(brandPrimaryColor) || !normalizeHexColor(brandSecondaryColor) || !normalizeHexColor(brandAccentColor)) {
      setErrorMsg("Les couleurs doivent etre au format #RRGGBB.");
      return;
    }

    setLoading(true);
    try {
      await assertSlugAvailability(normalizedSlug);
    } catch (err: unknown) {
      setLoading(false);
      setErrorMsg(err instanceof Error ? err.message : "Slug indisponible.");
      return;
    }

    const response = await fetch("/api/agency/storefront", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: normalizedSlug,
        tagline: toOptional(tagline),
        description: toOptional(description),
        cover_url: toOptional(coverUrl),
        facebook_url: toOptional(facebookUrl),
        instagram_url: toOptional(instagramUrl),
        tiktok_url: toOptional(tiktokUrl),
        whatsapp: toOptional(whatsapp),
        is_enabled: true,
        hero_title: toOptional(heroTitle),
        hero_subtitle: toOptional(heroSubtitle),
        about_title: toOptional(aboutTitle),
        services: servicesList,
        highlights: highlightsList,
        service_areas: toOptional(serviceAreas),
        languages_spoken: toOptional(languagesSpoken),
        business_hours: toOptional(composeBusinessHours(businessHoursPrefix, openingTime, closingTime)),
        contact_email: toOptional(contactEmail),
        contact_phone: toOptional(contactPhone),
        contact_address: toOptional(contactAddress),
        cta_label: toOptional(ctaLabel),
        cta_url: toOptional(ctaUrl),
        custom_domain: toOptional(normalizedCustomDomain),
        marketplace_title: toOptional(marketplaceTitle),
        seo_title: toOptional(seoTitle),
        seo_description: toOptional(seoDescription),
        seo_keywords: toOptional(seoKeywords),
        brand_primary_color: normalizeHexColor(brandPrimaryColor),
        brand_secondary_color: normalizeHexColor(brandSecondaryColor),
        brand_accent_color: normalizeHexColor(brandAccentColor),
        theme_preset: toOptional(selectedThemePreset),
        show_services_section: showServicesPreview,
        show_highlights_section: showHighlightsPreview,
        show_contact_section: showContactPreview,
        show_marketplace_section: showMarketplacePreview,
        section_order: sectionOrder,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    setLoading(false);
    if (!response.ok) {
      setErrorMsg(payload?.error || "Impossible d'enregistrer la vitrine.");
      return;
    }

    setSlug(normalizedSlug);
    setSuccessMsg("Vitrine enregistree avec succes.");
    router.refresh();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[rgb(var(--brand-bg))] px-4 py-10 md:py-14">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[rgb(var(--gold))]/20 blur-3xl" />
        <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-[rgb(var(--navy))]/12 blur-3xl" />
      </div>

      <section className="relative mx-auto max-w-6xl space-y-5">
        <article className="rounded-3xl border border-black/10 bg-white/85 p-6 shadow-sm backdrop-blur md:p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--gold))]/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
            <Sparkles size={13} />
            Onboarding vitrine
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-black/10 bg-white">
                {logoUrl ? (
                  <Image src={logoUrl} alt={initial.agencyName} width={56} height={56} className="h-full w-full object-cover" unoptimized />
                ) : (
                  <Building2 size={20} className="text-[rgb(var(--navy))]" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-extrabold text-[rgb(var(--navy))] md:text-3xl">{initial.agencyName}</h1>
                <p className="text-sm text-black/65">Configurez votre mini-site et marketplace agence</p>
              </div>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm">
              <div className="text-xs uppercase tracking-wide text-black/50">Progression</div>
              <div className="mt-1 text-xl font-extrabold text-[rgb(var(--navy))]">{completion}%</div>
            </div>
          </div>
        </article>

        <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <article className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-sm md:p-8">
            <h2 className="inline-flex items-center gap-2 text-base font-bold text-[rgb(var(--navy))]">
              <Settings2 size={16} />
              Identite vitrine
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5 text-sm">
                <span className={PREMIUM_LABEL_CLASS}>Slug vitrine *</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(normalizeSlug(e.target.value))}
                    required
                    className={PREMIUM_INPUT_CLASS}
                  />
                  <button
                    type="button"
                    onClick={autoGenerateSlug}
                    className="inline-flex h-11 items-center gap-1 rounded-xl border border-[rgb(var(--navy))]/15 bg-white px-3 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--navy))] transition hover:bg-black/5"
                  >
                    <WandSparkles size={13} />
                    Auto
                  </button>
                </div>
                <p className="text-xs text-black/50">URL publique: {publicHref || "/agence/<slug>"}</p>
              </label>

              <label className="space-y-1.5 text-sm">
                <span className={PREMIUM_LABEL_CLASS}>Titre hero *</span>
                <input
                  type="text"
                  value={heroTitle}
                  onChange={(e) => setHeroTitle(e.target.value)}
                  placeholder="Nom commercial de votre agence"
                  className={PREMIUM_INPUT_CLASS}
                />
              </label>

              <label className="space-y-1.5 text-sm md:col-span-2">
                <span className={PREMIUM_LABEL_CLASS}>Sous-titre hero</span>
                <input
                  type="text"
                  value={heroSubtitle}
                  onChange={(e) => setHeroSubtitle(e.target.value)}
                  placeholder="Ex: Expert en vente, location et investissement"
                  className={PREMIUM_INPUT_CLASS}
                />
              </label>

              <label className="space-y-1.5 text-sm">
                <span className={PREMIUM_LABEL_CLASS}>Slogan</span>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className={PREMIUM_INPUT_CLASS}
                />
              </label>

              <label className="space-y-1.5 text-sm">
                <span className={PREMIUM_LABEL_CLASS}>Titre section a propos</span>
                <input
                  type="text"
                  value={aboutTitle}
                  onChange={(e) => setAboutTitle(e.target.value)}
                  className={PREMIUM_INPUT_CLASS}
                />
              </label>

              <div className="space-y-1.5 text-sm md:col-span-2">
                <span className={PREMIUM_LABEL_CLASS}>Image cover et logo</span>
                <div className="grid gap-3 md:grid-cols-[1.25fr_0.75fr]">
                  <div
                    onDragOver={onCoverDragOver}
                    onDragLeave={onCoverDragLeave}
                    onDrop={onCoverDrop}
                    className={`rounded-2xl border bg-[linear-gradient(180deg,#fff,rgba(248,250,252,0.96))] p-3.5 transition ${
                      coverDragActive
                        ? "border-[rgb(var(--navy))]/45 ring-4 ring-[rgb(var(--gold))]/16"
                        : "border-[rgb(var(--navy))]/14"
                    }`}
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/55">Cover</div>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <div className="relative h-20 w-28 overflow-hidden rounded-xl border border-[rgb(var(--navy))]/14 bg-slate-50">
                        {coverUrl ? (
                          <Image
                            src={coverUrl}
                            alt="Cover preview"
                            fill
                            sizes="112px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-black/35">
                            <ImagePlus size={20} />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <label
                          htmlFor="storefront-cover-input"
                          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-[rgb(var(--navy))]/14 bg-white px-3.5 text-sm font-medium text-[rgb(var(--navy))] transition hover:bg-black/5"
                        >
                          {coverUploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                          {coverUrl ? "Remplacer image" : "Choisir image"}
                        </label>

                        {coverUrl ? (
                          <button
                            type="button"
                            onClick={() => setCoverUrl("")}
                            className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 text-sm font-medium text-red-700 transition hover:bg-red-100"
                          >
                            <Trash2 size={14} />
                            Retirer
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-black/50">
                      PNG/JPG/WEBP - max 8 MB. Glissez-deposez une image ici ou utilisez le bouton.
                    </p>
                    <input
                      id="storefront-cover-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => onCoverPicked(event.target.files?.[0] ?? null)}
                    />
                  </div>

                  <div
                    onDragOver={onLogoDragOver}
                    onDragLeave={onLogoDragLeave}
                    onDrop={onLogoDrop}
                    className={`rounded-2xl border bg-[linear-gradient(180deg,#fff,rgba(248,250,252,0.96))] p-3.5 transition ${
                      logoDragActive
                        ? "border-[rgb(var(--navy))]/45 ring-4 ring-[rgb(var(--gold))]/16"
                        : "border-[rgb(var(--navy))]/14"
                    }`}
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/55">Logo</div>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-[rgb(var(--navy))]/14 bg-slate-50">
                        {logoUrl ? (
                          <Image
                            src={logoUrl}
                            alt="Logo preview"
                            fill
                            sizes="80px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-black/35">
                            <Building2 size={18} />
                          </div>
                        )}
                      </div>

                      <label
                        htmlFor="storefront-logo-input"
                        className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-[rgb(var(--navy))]/14 bg-white px-3.5 text-sm font-medium text-[rgb(var(--navy))] transition hover:bg-black/5"
                      >
                        {logoUploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                        {logoUrl ? "Remplacer logo" : "Choisir logo"}
                      </label>
                    </div>
                    <p className="mt-2 text-xs text-black/50">
                      {logoUrl
                        ? "Logo detecte et enregistre. Vous pouvez le remplacer."
                        : "Aucun logo. Ajoutez votre logo (max 6 MB)."}
                    </p>
                    <input
                      id="storefront-logo-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => onLogoPicked(event.target.files?.[0] ?? null)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-sm md:p-8">
            <h2 className="inline-flex items-center gap-2 text-base font-bold text-[rgb(var(--navy))]">
              <Megaphone size={16} />
              Contenu et positionnement
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5 text-sm md:col-span-2">
                <span className={PREMIUM_LABEL_CLASS}>Description agence *</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className={PREMIUM_TEXTAREA_CLASS}
                />
              </label>

              <label className="space-y-1.5 text-sm">
                <span className={PREMIUM_LABEL_CLASS}>Services (une ligne = un service)</span>
                <textarea
                  value={servicesText}
                  onChange={(e) => setServicesText(e.target.value)}
                  rows={6}
                  placeholder={"Vente immobiliere\nLocation longue duree\nGestion locative"}
                  className={PREMIUM_TEXTAREA_CLASS}
                />
              </label>

              <label className="space-y-1.5 text-sm">
                <span className={PREMIUM_LABEL_CLASS}>Points forts (une ligne = un point fort)</span>
                <textarea
                  value={highlightsText}
                  onChange={(e) => setHighlightsText(e.target.value)}
                  rows={6}
                  placeholder={"Accompagnement notarial\nEstimation gratuite\nSuivi digital"}
                  className={PREMIUM_TEXTAREA_CLASS}
                />
              </label>

              <label className="space-y-1.5 text-sm">
                <span className={PREMIUM_LABEL_CLASS}>Zones couvertes</span>
                <input
                  type="text"
                  value={serviceAreas}
                  onChange={(e) => setServiceAreas(e.target.value)}
                  placeholder="Oran, Bir El Djir, Es Senia"
                  className={PREMIUM_INPUT_CLASS}
                />
              </label>

              <label className="space-y-1.5 text-sm">
                <span className={PREMIUM_LABEL_CLASS}>Langues</span>
                <input
                  type="text"
                  value={languagesSpoken}
                  onChange={(e) => setLanguagesSpoken(e.target.value)}
                  placeholder="Francais, Arabe, Anglais"
                  className={PREMIUM_INPUT_CLASS}
                />
              </label>

              <label className="space-y-1.5 text-sm md:col-span-2">
                <span className={PREMIUM_LABEL_CLASS}>Horaires</span>
                <div className="grid gap-3 sm:grid-cols-2">
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <label className="space-y-1.5 text-sm">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/50">Ouverture</span>
                      <TimePicker
                        ampm={false}
                        value={timeToDayjs(openingTime)}
                        onChange={(value) => setOpeningTime(dayjsToTime(value))}
                        format="HH:mm"
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            size: "small",
                          },
                        }}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "1rem",
                            height: "2.75rem",
                            background: "linear-gradient(180deg,#fff,rgba(248,250,252,0.96))",
                            fontSize: "0.875rem",
                            fontWeight: 500,
                            color: "rgba(17,24,39,0.8)",
                          },
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: "rgba(15,23,42,0.14)",
                          },
                          "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: "rgba(15,23,42,0.45)",
                            borderWidth: "1px",
                          },
                        }}
                      />
                    </label>

                    <label className="space-y-1.5 text-sm">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/50">Fermeture</span>
                      <TimePicker
                        ampm={false}
                        value={timeToDayjs(closingTime)}
                        onChange={(value) => setClosingTime(dayjsToTime(value))}
                        format="HH:mm"
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            size: "small",
                          },
                        }}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "1rem",
                            height: "2.75rem",
                            background: "linear-gradient(180deg,#fff,rgba(248,250,252,0.96))",
                            fontSize: "0.875rem",
                            fontWeight: 500,
                            color: "rgba(17,24,39,0.8)",
                          },
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: "rgba(15,23,42,0.14)",
                          },
                          "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: "rgba(15,23,42,0.45)",
                            borderWidth: "1px",
                          },
                        }}
                      />
                    </label>
                  </LocalizationProvider>
                </div>
              </label>
            </div>
          </article>

          <article className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-sm md:p-8">
            <h2 className="inline-flex items-center gap-2 text-base font-bold text-[rgb(var(--navy))]">
              <Phone size={16} />
              Contact, conversion et reseaux
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5 text-sm">
                <span className={PREMIUM_LABEL_CLASS}>WhatsApp</span>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className={PREMIUM_INPUT_CLASS}
                />
              </label>

              <label className="space-y-1.5 text-sm">
                <span className={PREMIUM_LABEL_CLASS}>Telephone contact</span>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className={PREMIUM_INPUT_CLASS}
                />
              </label>

              <label className="space-y-1.5 text-sm">
                <span className={PREMIUM_LABEL_CLASS}>Email contact</span>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className={PREMIUM_INPUT_CLASS}
                />
              </label>

              <label className="space-y-1.5 text-sm">
                <span className={PREMIUM_LABEL_CLASS}>Adresse contact</span>
                <input
                  type="text"
                  value={contactAddress}
                  onChange={(e) => setContactAddress(e.target.value)}
                  className={PREMIUM_INPUT_CLASS}
                />
              </label>

              <label className="space-y-1.5 text-sm">
                <span className={PREMIUM_LABEL_CLASS}>Label CTA</span>
                <input
                  type="text"
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  placeholder="Nous contacter"
                  className={PREMIUM_INPUT_CLASS}
                />
              </label>

              <label className="space-y-1.5 text-sm">
                <span className={PREMIUM_LABEL_CLASS}>URL CTA</span>
                <input
                  type="url"
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="https://..."
                  className={PREMIUM_INPUT_CLASS}
                />
              </label>

              <label className="space-y-1.5 text-sm">
                <span className={PREMIUM_LABEL_CLASS}>Domaine personnalise</span>
                <input
                  type="text"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(normalizeCustomDomainInput(e.target.value))}
                  placeholder="ex: agence-exemple.com"
                  className={PREMIUM_INPUT_CLASS}
                />
                <p className="text-xs text-black/50">
                  Statut DNS:{" "}
                  <span className="font-semibold text-black/70">
                    {customDomainStatus === "verified"
                      ? "verifie"
                      : customDomainStatus === "pending_dns"
                        ? "en attente DNS"
                        : customDomainStatus === "error"
                          ? "erreur"
                          : "non verifie"}
                  </span>
                </p>
              </label>

              <label className="space-y-1.5 text-sm">
                <span className={PREMIUM_LABEL_CLASS}>Titre section marketplace</span>
                <input
                  type="text"
                  value={marketplaceTitle}
                  onChange={(e) => setMarketplaceTitle(e.target.value)}
                  className={PREMIUM_INPUT_CLASS}
                />
              </label>

              <label className="space-y-1.5 text-sm">
                <span className={PREMIUM_LABEL_CLASS}>Facebook URL</span>
                <input
                  type="url"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="https://facebook.com/..."
                  className={PREMIUM_INPUT_CLASS}
                />
              </label>

              <label className="space-y-1.5 text-sm">
                <span className={PREMIUM_LABEL_CLASS}>Instagram URL</span>
                <input
                  type="url"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/..."
                  className={PREMIUM_INPUT_CLASS}
                />
              </label>

              <label className="space-y-1.5 text-sm">
                <span className={PREMIUM_LABEL_CLASS}>TikTok URL</span>
                <input
                  type="url"
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  placeholder="https://tiktok.com/@..."
                  className={PREMIUM_INPUT_CLASS}
                />
              </label>
            </div>
          </article>

          <article className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-sm md:p-8">
            <h2 className="inline-flex items-center gap-2 text-base font-bold text-[rgb(var(--navy))]">
              <Palette size={16} />
              Branding et SEO
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="space-y-1.5 text-sm">
                <span className={PREMIUM_LABEL_CLASS}>Couleur primaire</span>
                <input
                  type="color"
                  value={brandPrimaryColor}
                  onChange={(e) => {
                    setSelectedThemePreset("");
                    setBrandPrimaryColor(e.target.value);
                  }}
                  className={PREMIUM_COLOR_CLASS}
                />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className={PREMIUM_LABEL_CLASS}>Couleur secondaire</span>
                <input
                  type="color"
                  value={brandSecondaryColor}
                  onChange={(e) => {
                    setSelectedThemePreset("");
                    setBrandSecondaryColor(e.target.value);
                  }}
                  className={PREMIUM_COLOR_CLASS}
                />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className={PREMIUM_LABEL_CLASS}>Couleur accent</span>
                <input
                  type="color"
                  value={brandAccentColor}
                  onChange={(e) => {
                    setSelectedThemePreset("");
                    setBrandAccentColor(e.target.value);
                  }}
                  className={PREMIUM_COLOR_CLASS}
                />
              </label>

              <label className="space-y-1.5 text-sm md:col-span-2">
                <span className={PREMIUM_LABEL_CLASS}>SEO title</span>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  className={PREMIUM_INPUT_CLASS}
                />
              </label>

              <label className="space-y-1.5 text-sm md:col-span-3">
                <span className={PREMIUM_LABEL_CLASS}>SEO description</span>
                <textarea
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  rows={3}
                  className={PREMIUM_TEXTAREA_CLASS}
                />
              </label>

              <label className="space-y-1.5 text-sm md:col-span-3">
                <span className={PREMIUM_LABEL_CLASS}>SEO keywords (separes par virgule)</span>
                <input
                  type="text"
                  value={seoKeywords}
                  onChange={(e) => setSeoKeywords(e.target.value)}
                  className={PREMIUM_INPUT_CLASS}
                />
              </label>
            </div>
          </article>

          {errorMsg ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMsg}</div> : null}
          {successMsg ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMsg}</div> : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[rgb(var(--navy))] px-4 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Building2 size={15} />}
              Enregistrer la vitrine
            </button>
            {canPublish ? (
              <Link
                href={publicHref}
                target="_blank"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
              >
                <Globe2 size={15} />
                Ouvrir ma vitrine
              </Link>
            ) : null}
            <Link
              href="/agency/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
            >
              Aller au dashboard
            </Link>
          </div>
        </form>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
          <article className="rounded-3xl border border-black/10 bg-white/88 p-5 shadow-sm">
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
              <SlidersHorizontal size={13} />
              Builder controls
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/55">Themes</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {THEME_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyThemePreset(preset.id)}
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                        selectedThemePreset === preset.id
                          ? "border-[rgb(var(--navy))]/30 bg-[rgb(var(--navy))] text-white shadow-sm"
                          : "border-black/10 bg-white text-[rgb(var(--navy))] hover:bg-black/5"
                      }`}
                    >
                      <span className="inline-flex h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: preset.accent }} />
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/55">Preview mode</div>
                <div className="mt-2 inline-flex rounded-xl border border-black/10 bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      previewDevice === "desktop" ? "bg-[rgb(var(--navy))] text-white" : "text-[rgb(var(--navy))] hover:bg-black/5"
                    }`}
                  >
                    <Monitor size={13} />
                    Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      previewDevice === "mobile" ? "bg-[rgb(var(--navy))] text-white" : "text-[rgb(var(--navy))] hover:bg-black/5"
                    }`}
                  >
                    <Smartphone size={13} />
                    Mobile
                  </button>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/55">Sections</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-black/75">
                  <label className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-2 py-1.5">
                    <input type="checkbox" checked={showServicesPreview} onChange={(e) => setShowServicesPreview(e.target.checked)} />
                    Services
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-2 py-1.5">
                    <input type="checkbox" checked={showHighlightsPreview} onChange={(e) => setShowHighlightsPreview(e.target.checked)} />
                    Points forts
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-2 py-1.5">
                    <input type="checkbox" checked={showContactPreview} onChange={(e) => setShowContactPreview(e.target.checked)} />
                    Contact
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-2 py-1.5">
                    <input type="checkbox" checked={showMarketplacePreview} onChange={(e) => setShowMarketplacePreview(e.target.checked)} />
                    Marketplace
                  </label>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/55">
                  Ordre des sections
                </div>
                <div className="mt-2 space-y-1.5">
                  {sectionOrder.map((key) => {
                    const label = SECTION_ORDER_OPTIONS.find((item) => item.key === key)?.label ?? key;
                    return (
                      <div
                        key={key}
                        draggable
                        onDragStart={() => onSectionDragStart(key)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => onSectionDrop(key)}
                        onDragEnd={() => setDraggedSection(null)}
                        className={`flex cursor-grab items-center gap-2 rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                          draggedSection === key
                            ? "border-[rgb(var(--navy))]/40 bg-[rgb(var(--navy))]/8"
                            : "border-black/10 bg-white text-[rgb(var(--navy))] hover:bg-black/5"
                        }`}
                      >
                        <GripVertical size={14} className="text-black/45" />
                        {label}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-1 text-[11px] text-black/50">
                  Glissez-deposez pour reordonner l&apos;affichage sur la page vitrine.
                </p>
              </div>

              <button
                type="button"
                onClick={applyBuilderDefaults}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[rgb(var(--navy))]/15 bg-white px-3.5 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--navy))] transition hover:bg-black/5"
              >
                <WandSparkles size={14} />
                Appliquer defaults intelligents
              </button>
            </div>
          </article>

          <article className="rounded-3xl border border-black/10 bg-white/88 p-5 shadow-sm">
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
              <Eye size={13} />
              Live preview
            </div>

            <div className={`mt-4 ${previewDevice === "mobile" ? "mx-auto max-w-[320px]" : ""}`}>
              <div className="overflow-hidden rounded-2xl border border-black/10 shadow-[0_12px_28px_rgba(15,23,42,0.14)]" style={{ backgroundColor: brandSecondaryColor }}>
                <div className="relative h-40">
                  {coverUrl ? (
                    <Image src={coverUrl} alt="Cover preview" fill sizes="480px" className="object-cover" unoptimized />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-100" />
                  )}
                  <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${brandPrimaryColor}99 0%, ${brandPrimaryColor}d9 100%)` }} />
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <div className="text-xs uppercase tracking-[0.12em] text-white/75">{aboutTitle || "A propos"}</div>
                    <div className="mt-1 text-lg font-extrabold">{heroTitle || initial.agencyName}</div>
                    <div className="mt-1 text-xs text-white/85">{tagline || "Votre partenaire immobilier"}</div>
                  </div>
                </div>

                <div className="space-y-3 p-4 text-[13px] text-black/80">
                  <p className="line-clamp-3">{description || "Ajoutez une description pour afficher votre positionnement."}</p>

                  {showServicesPreview && servicesList.length > 0 ? (
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/55">Services</div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {servicesList.slice(0, 4).map((item) => (
                          <span key={item} className="rounded-full border border-black/10 bg-white px-2 py-0.5 text-[11px]">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {showHighlightsPreview && highlightsList.length > 0 ? (
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/55">Points forts</div>
                      <ul className="mt-1.5 space-y-1 text-xs">
                        {highlightsList.slice(0, 3).map((item) => (
                          <li key={item} className="flex items-start gap-1.5">
                            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: brandAccentColor }} />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {showMarketplacePreview ? (
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/55">{marketplaceTitle || "Nos biens"}</div>
                      <div className="mt-1.5 grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-black/10 bg-white p-2 text-xs">Appartement T3 - Oran</div>
                        <div className="rounded-lg border border-black/10 bg-white p-2 text-xs">Villa - Bir El Djir</div>
                      </div>
                    </div>
                  ) : null}

                  {showContactPreview ? (
                    <div className="rounded-xl border border-black/10 bg-white/90 p-2.5 text-xs">
                      <div>{contactPhone || initial.agencyPhone}</div>
                      <div>{contactEmail || initial.agencyEmail}</div>
                      <div>{businessHoursLabel || "09:00-18:00"}</div>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    className="inline-flex h-9 w-full items-center justify-center rounded-xl px-3 text-xs font-bold text-[rgb(var(--navy))]"
                    style={{ backgroundColor: brandAccentColor }}
                  >
                    {ctaLabel || "Nous contacter"}
                  </button>
                </div>
              </div>
            </div>
          </article>
        </aside>
        </div>
      </section>
    </main>
  );
}
