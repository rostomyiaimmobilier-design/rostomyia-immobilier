"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { DragEvent, FocusEvent, FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import dayjs, { type Dayjs } from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import {
  type AgencyNativeStudioBlock,
  type AgencyNativeStudioBlockType,
  type AgencyNativeStudioSection,
  normalizeAgencyNativeStudioPayload,
  type AgencyNativeStudioPayload,
} from "@/lib/agency-storefront-puck";
import {
  Building2,
  ChevronDown,
  ChevronRight,
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
  X,
} from "lucide-react";
import PropertyPanel from "./editor/PropertyPanel";
import {
  DEFAULT_SELECTION_STATE,
  inspectorValidators,
  selectionReducer,
  setByPath,
  zodErrorsToMap,
  type InspectorFieldSchema,
  type InspectorSchema,
} from "./editor/inspector";
import type { AgencyEditableSectionId } from "../../agence/[slug]/AgencyPreviewSectionOverlay";

type AgencyPreviewSectionAction =
  | "edit"
  | "move-up"
  | "move-down"
  | "hide-show"
  | "duplicate"
  | "delete"
  | "style";

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
    builderPayload: unknown;
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

function hexToRgb(value: string) {
  const hex = normalizeHexColor(value);
  if (!hex) return null;
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function channelLuminance(channel: number) {
  const normalized = channel / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function contrastRatio(fg: string, bg: string) {
  const f = hexToRgb(fg);
  const b = hexToRgb(bg);
  if (!f || !b) return null;
  const l1 = 0.2126 * channelLuminance(f.r) + 0.7152 * channelLuminance(f.g) + 0.0722 * channelLuminance(f.b);
  const l2 = 0.2126 * channelLuminance(b.r) + 0.7152 * channelLuminance(b.g) + 0.0722 * channelLuminance(b.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
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

function isLikelyInternalOrHttpUrl(value: string) {
  const v = String(value ?? "").trim();
  if (!v) return true;
  if (/^https?:\/\//i.test(v)) return true;
  if (/^mailto:/i.test(v)) return true;
  if (/^tel:/i.test(v)) return true;
  if (/^\//.test(v)) return true;
  return false;
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

function isoToDatetimeLocal(value: string) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function datetimeLocalToIso(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
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
const DETAILS_BLOCK_CLASS =
  "rounded-2xl border border-black/10 bg-[linear-gradient(180deg,#ffffff,rgba(248,250,252,0.92))] p-3.5";
const DETAILS_BLOCK_TITLE_CLASS = "text-[11px] font-semibold uppercase tracking-[0.12em] text-black/55";
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
type StudioBlockSection = AgencyNativeStudioSection;
type SidebarPanelKey = "theme" | "layout" | "blocks" | "previewMode" | "sections" | "order" | "actions";
type DetailsPanelKey = "identity" | "content" | "contact" | "branding";
type BuilderLeftTab = "structure" | "elements" | "cms";
type StructureSelectableKind = "section" | "component";
type StructureComponentItem = {
  id: string;
  label: string;
  selectKind: StructureSelectableKind;
  selectPath?: string[];
  componentId?: string;
};
type StructureSectionItem = {
  id: string;
  label: string;
  editableSection: AgencyEditableSectionId;
  components: StructureComponentItem[];
};
type StructurePageItem = {
  id: string;
  label: string;
  sections: StructureSectionItem[];
};
const SECTION_LABEL_BY_KEY: Record<SectionOrderKey, string> = {
  about: "A propos",
  services: "Services",
  contact: "Contact",
  marketplace: "Marketplace",
};
const PREVIEW_SECTION_LABELS: Record<AgencyEditableSectionId, string> = {
  hero: "Hero",
  about: "A propos",
  services: "Services",
  marketplace: "Marketplace",
  contact: "Contact",
  cta: "CTA",
  testimonials: "Testimonials",
};
const PREVIEW_REORDERABLE_SECTIONS: SectionOrderKey[] = [
  "about",
  "services",
  "contact",
  "marketplace",
];
const ELEMENT_LIBRARY_GROUPS = [
  {
    id: "pages",
    title: "Pages",
    items: [
      { id: "add-about", label: "Add About section", action: "section-about" },
      { id: "add-services", label: "Add Services section", action: "section-services" },
      { id: "add-contact", label: "Add Contact section", action: "section-contact" },
      { id: "add-marketplace", label: "Add Marketplace section", action: "section-marketplace" },
    ],
  },
  {
    id: "sections",
    title: "Sections",
    items: [
      { id: "new-text", label: "Text block", action: "block-text" },
      { id: "new-list", label: "Features list", action: "block-list" },
      { id: "new-cta", label: "CTA block", action: "block-cta" },
      { id: "new-gallery", label: "Gallery item", action: "gallery-item" },
    ],
  },
  {
    id: "elements",
    title: "Elements",
    items: [
      { id: "feature-card", label: "Feature card", action: "services-item" },
      { id: "highlight-item", label: "Highlight item", action: "highlights-item" },
      { id: "brand-cta", label: "Primary CTA", action: "brand-cta" },
    ],
  },
] as const;

const STUDIO_BLOCK_SECTION_OPTIONS: Array<{ value: StudioBlockSection; label: string }> = [
  { value: "about", label: "A propos" },
  { value: "services", label: "Services" },
  { value: "contact", label: "Contact" },
  { value: "marketplace", label: "Marketplace" },
];

const STUDIO_BLOCK_TYPE_OPTIONS: Array<{ value: AgencyNativeStudioBlockType; label: string }> = [
  { value: "text", label: "Texte" },
  { value: "list", label: "Liste" },
  { value: "cta", label: "CTA" },
];

const STUDIO_TEMPLATE_OPTIONS = [
  {
    id: "luxury",
    label: "Luxury",
    subtitle: "Immersive hero, premium accents and high-end feel.",
    preview: "linear-gradient(135deg,#0f172a 0%,#1e293b 45%,#d4af37 100%)",
  },
  {
    id: "minimal",
    label: "Minimal",
    subtitle: "Clean sections, low-noise layout and compact cards.",
    preview: "linear-gradient(135deg,#111827 0%,#334155 55%,#94a3b8 100%)",
  },
  {
    id: "corporate",
    label: "Corporate",
    subtitle: "Structured service blocks with strong conversion hierarchy.",
    preview: "linear-gradient(135deg,#0f172a 0%,#0c4a6e 55%,#0284c7 100%)",
  },
] as const;

type StudioTemplateId = (typeof STUDIO_TEMPLATE_OPTIONS)[number]["id"];
const PREVIEW_ZOOM_STEPS = [30, 50, 75, 100, 125, 150] as const;
type PreviewZoomPreset = "fit" | (typeof PREVIEW_ZOOM_STEPS)[number];
type NativeStudioPageSection = AgencyNativeStudioSection;
type NativeStudioPageFieldKey = keyof AgencyNativeStudioPayload["page_content"]["about"];
type NativeStudioPageEntry = AgencyNativeStudioPayload["page_content"]["about"];
type InspectorSectionId = AgencyEditableSectionId;

const INSPECTOR_SECTION_IDS: InspectorSectionId[] = [
  "hero",
  "about",
  "services",
  "marketplace",
  "contact",
  "cta",
  "testimonials",
];
const TYPOGRAPHY_SCALE_STEPS: Array<AgencyNativeStudioPayload["responsive_overrides"]["mobile"]["typography_scale"]> = [
  "sm",
  "md",
  "lg",
];
const SPACING_SCALE_STEPS: Array<AgencyNativeStudioPayload["responsive_overrides"]["mobile"]["section_spacing"]> = [
  "compact",
  "normal",
  "relaxed",
];

function scaleStepToIndex(value: string, steps: readonly string[]) {
  const index = steps.indexOf(value);
  return index >= 0 ? index : 1;
}

function scaleIndexToStep<T extends string>(index: number, steps: readonly T[]) {
  const safeIndex = Math.min(steps.length - 1, Math.max(0, Math.round(index)));
  return steps[safeIndex] || steps[0];
}

type CanvasDragState =
  | { kind: "section"; section: SectionOrderKey }
  | { kind: "servicesItems"; index: number }
  | { kind: "highlightsItems"; index: number }
  | { kind: "galleryItems"; index: number };

const DEFAULT_NATIVE_PAGE_CONTENT: Record<NativeStudioPageSection, NativeStudioPageEntry> = {
  about: {
    title: "Notre expertise immobiliere",
    intro:
      "Une equipe locale dediee a la vente, la location et l'accompagnement notarial avec un suivi transparent de chaque dossier.",
    image_url:
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1600&q=80",
    image_alt: "Facade d'une agence immobiliere premium",
    image_focal_x: 50,
    image_focal_y: 50,
  },
  services: {
    title: "Services immobiliers sur mesure",
    intro:
      "Estimation precise, marketing digital, qualification des acquereurs et negociations securisees pour accelerer vos transactions.",
    image_url:
      "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1600&q=80",
    image_alt: "Interieur moderne d'un bien immobilier",
    image_focal_x: 50,
    image_focal_y: 50,
  },
  contact: {
    title: "Parlons de votre projet",
    intro:
      "Planifiez un echange avec un conseiller pour recevoir une strategie adaptee a votre budget, votre delai et votre zone cible.",
    image_url:
      "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1600&q=80",
    image_alt: "Equipe conseil en rendez-vous client",
    image_focal_x: 50,
    image_focal_y: 50,
  },
  marketplace: {
    title: "Selection de biens verifies",
    intro:
      "Explorez des opportunites residentielles et commerciales avec photos qualifiees, prix actualises et informations claires.",
    image_url:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
    image_alt: "Maison contemporaine avec piscine",
    image_focal_x: 50,
    image_focal_y: 50,
  },
};

const DEFAULT_TRUST_BADGES = [
  "Conseillers verifies",
  "Dossiers juridiquement controles",
  "Accompagnement bancaire et notarial",
];

const PAGE_SECTION_PRESETS: Record<
  NativeStudioPageSection,
  Array<{ id: "luxury" | "minimal" | "corporate" | "dark"; label: string; title: string; intro: string; image_url: string }>
> = {
  about: [
    {
      id: "luxury",
      label: "Luxury",
      title: "Accompagnement patrimonial premium",
      intro: "Une approche sur mesure pour valoriser vos actifs et securiser chaque transaction avec un niveau de service haut de gamme.",
      image_url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80",
    },
    {
      id: "minimal",
      label: "Minimal",
      title: "Expertise locale claire et efficace",
      intro: "Un process simple, transparent et rapide pour vendre, louer ou investir dans les meilleures conditions.",
      image_url: "https://images.unsplash.com/photo-1599423300746-b62533397364?auto=format&fit=crop&w=1600&q=80",
    },
    {
      id: "corporate",
      label: "Corporate",
      title: "Conseil immobilier structure",
      intro: "Pilotage data-driven, cadre juridique rigoureux et execution commerciale orientee resultat.",
      image_url: "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1600&q=80",
    },
    {
      id: "dark",
      label: "Dark",
      title: "Signature immobiliere haut impact",
      intro: "Narratif fort, selection premium et relation client ultra-personnalisee pour les projets d'exception.",
      image_url: "https://images.unsplash.com/photo-1616594039964-3f38e9a27202?auto=format&fit=crop&w=1600&q=80",
    },
  ],
  services: [
    {
      id: "luxury",
      label: "Luxury",
      title: "Services immobiliers concierge",
      intro: "Commercialisation selective, negotiation confidentielle et coordination notaire/banque jusqu'a la signature.",
      image_url: "https://images.unsplash.com/photo-1560185009-5bf9f2849488?auto=format&fit=crop&w=1600&q=80",
    },
    {
      id: "minimal",
      label: "Minimal",
      title: "Services essentiels",
      intro: "Estimation, diffusion, visites qualifiees et accompagnement complet avec une experience fluide.",
      image_url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1600&q=80",
    },
    {
      id: "corporate",
      label: "Corporate",
      title: "Execution commerciale structuree",
      intro: "Process industrialise, reporting hebdomadaire et KPIs de performance sur chaque mandat.",
      image_url: "https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=1600&q=80",
    },
    {
      id: "dark",
      label: "Dark",
      title: "Collection services elite",
      intro: "Mise en scene premium, storytelling visuel et diffusion ciblee pour des acquereurs qualifies.",
      image_url: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=1600&q=80",
    },
  ],
  contact: [
    {
      id: "luxury",
      label: "Luxury",
      title: "Parlez a votre conseiller dedie",
      intro: "Prenez rendez-vous pour une strategie personnalisee et recevez un plan d'action en 24h.",
      image_url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80",
    },
    {
      id: "minimal",
      label: "Minimal",
      title: "Contact rapide",
      intro: "Un formulaire simple pour etre rappele rapidement par un expert local.",
      image_url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=80",
    },
    {
      id: "corporate",
      label: "Corporate",
      title: "Cellule conseil transaction",
      intro: "Equipe operationnelle disponible pour arbitrer vos decisions d'achat, vente ou location.",
      image_url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80",
    },
    {
      id: "dark",
      label: "Dark",
      title: "Acces prioritaire",
      intro: "Canal direct pour projets sensibles et opportunites off-market.",
      image_url: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1600&q=80",
    },
  ],
  marketplace: [
    {
      id: "luxury",
      label: "Luxury",
      title: "Portefeuille exclusif",
      intro: "Biens soigneusement verifies, valorisation photo premium et accompagnement transactionnel complet.",
      image_url: "https://images.unsplash.com/photo-1600607687644-c7f34b5b74da?auto=format&fit=crop&w=1600&q=80",
    },
    {
      id: "minimal",
      label: "Minimal",
      title: "Marketplace claire",
      intro: "Catalogue lisible, fiches essentielles et actions rapides pour passer a la visite.",
      image_url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80",
    },
    {
      id: "corporate",
      label: "Corporate",
      title: "Catalogue performatif",
      intro: "Filtrage intelligent, priorisation des leads et suivi analytique des demandes.",
      image_url: "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1600&q=80",
    },
    {
      id: "dark",
      label: "Dark",
      title: "Selection signature",
      intro: "Presentation haut contraste et storytelling visuel oriente conversion.",
      image_url: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1600&q=80",
    },
  ],
};

function createDefaultPageContent(): Record<NativeStudioPageSection, NativeStudioPageEntry> {
  return {
    about: { ...DEFAULT_NATIVE_PAGE_CONTENT.about },
    services: { ...DEFAULT_NATIVE_PAGE_CONTENT.services },
    contact: { ...DEFAULT_NATIVE_PAGE_CONTENT.contact },
    marketplace: { ...DEFAULT_NATIVE_PAGE_CONTENT.marketplace },
  };
}

type BuilderHistoryEntry = {
  id: string;
  label: string;
  savedAt: string;
  snapshot: string;
};

type CommandPaletteItem = {
  id: string;
  label: string;
  hint: string;
  keywords: string[];
  run: () => void;
};

function nudgePreviewZoomPreset(
  current: PreviewZoomPreset,
  direction: "in" | "out"
): PreviewZoomPreset {
  const currentValue = current === "fit" ? 100 : current;
  const currentIndex = PREVIEW_ZOOM_STEPS.indexOf(currentValue);
  const safeIndex = currentIndex >= 0 ? currentIndex : PREVIEW_ZOOM_STEPS.indexOf(100);
  const nextIndex =
    direction === "in"
      ? Math.min(PREVIEW_ZOOM_STEPS.length - 1, safeIndex + 1)
      : Math.max(0, safeIndex - 1);
  return PREVIEW_ZOOM_STEPS[nextIndex] || 100;
}

type PublicationAction = "save" | "draft" | "publish" | "schedule";

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

function createNativeStudioBlock(
  type: AgencyNativeStudioBlockType = "text",
  section: StudioBlockSection = "about"
): AgencyNativeStudioBlock {
  const id = `native-block-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    section,
    type,
    title: type === "cta" ? "Nouvel appel a l'action" : "Nouveau bloc",
    body:
      type === "list"
        ? "Element 1\nElement 2\nElement 3"
        : "Ajoutez ici le contenu du bloc.",
    image_url: "",
    image_alt: "",
    cta_label: type === "cta" ? "Nous contacter" : "",
    cta_href: type === "cta" ? "/contact" : "",
  };
}

function nativeStudioCardClass(studio: AgencyNativeStudioPayload) {
  const surface =
    studio.section_surface === "flat"
      ? "border border-black/8 bg-white/95 shadow-none"
      : studio.design_system.shadow_intensity === "soft"
        ? "border border-black/10 bg-white/90 shadow-[0_10px_20px_-18px_rgba(15,23,42,0.55)]"
        : studio.design_system.shadow_intensity === "strong"
          ? "border border-black/10 bg-white/92 shadow-[0_24px_44px_-22px_rgba(15,23,42,0.6)]"
          : "border border-black/10 bg-white/90 shadow-sm";
  const density = studio.card_density === "compact" ? "p-3" : "p-4";
  const radius =
    studio.card_radius === "md"
      ? "rounded-xl"
      : studio.card_radius === "full"
        ? "rounded-[1.75rem]"
        : "rounded-2xl";
  return `${surface} ${radius} ${density}`;
}

function nativeStudioHeroHeightClass(studio: AgencyNativeStudioPayload) {
  if (studio.hero_variant === "compact") return "h-32";
  if (studio.hero_variant === "immersive") return "h-52";
  return "h-40";
}

function previewTypographyScaleClass(value: AgencyNativeStudioPayload["design_tokens"]["typography_scale"]) {
  if (value === "sm") return "text-[12px] leading-relaxed";
  if (value === "lg") return "text-[14px] leading-relaxed";
  return "text-[13px] leading-relaxed";
}

function previewSectionSpacingScaleClass(value: AgencyNativeStudioPayload["section_spacing"]) {
  if (value === "compact") return "space-y-3";
  if (value === "relaxed") return "space-y-6";
  return "space-y-4";
}

function nativeStudioFontStack(
  studio: AgencyNativeStudioPayload,
  key: "heading_font" | "body_font"
) {
  if (key === "heading_font") {
    if (studio.design_system.heading_font === "montserrat") {
      return "Montserrat, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";
    }
    if (studio.design_system.heading_font === "lora") {
      return "Lora, ui-serif, Georgia, Cambria, serif";
    }
    return "Playfair Display, ui-serif, Georgia, Cambria, serif";
  }

  if (studio.design_system.body_font === "inter") {
    return "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";
  }
  if (studio.design_system.body_font === "poppins") {
    return "Poppins, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";
  }
  return "Manrope, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";
}

function buildStudioPublishSnapshot(studio: AgencyNativeStudioPayload) {
  return {
    hero_variant: studio.hero_variant,
    hero_image_alt: studio.hero_image_alt,
    hero_image_focal_x: studio.hero_image_focal_x,
    hero_image_focal_y: studio.hero_image_focal_y,
    card_density: studio.card_density,
    section_surface: studio.section_surface,
    cta_style: studio.cta_style,
    marketplace_columns: studio.marketplace_columns,
    card_radius: studio.card_radius,
    button_radius: studio.button_radius,
    section_spacing: studio.section_spacing,
    design_tokens: studio.design_tokens,
    design_system: studio.design_system,
    responsive_overrides: studio.responsive_overrides,
    page_content: studio.page_content,
    blocks: studio.blocks,
    trust_badges: studio.trust_badges,
    mobile_conversion_rail: studio.mobile_conversion_rail,
  };
}

function studioSnapshotDiffSummary(
  current: ReturnType<typeof buildStudioPublishSnapshot>,
  baseline: ReturnType<typeof buildStudioPublishSnapshot> | null
) {
  if (!baseline) return ["Aucune baseline publiee."];
  const diffs: string[] = [];

  const keys = [
    "hero_variant",
    "card_density",
    "section_surface",
    "cta_style",
    "marketplace_columns",
    "card_radius",
    "button_radius",
    "section_spacing",
  ] as const;
  for (const key of keys) {
    if (current[key] !== baseline[key]) diffs.push(`Style: ${key}`);
  }

  if (current.hero_image_alt !== baseline.hero_image_alt) diffs.push("Hero image alt");
  if (current.hero_image_focal_x !== baseline.hero_image_focal_x) diffs.push("Hero focal X");
  if (current.hero_image_focal_y !== baseline.hero_image_focal_y) diffs.push("Hero focal Y");

  for (const section of ["about", "services", "contact", "marketplace"] as const) {
    if (current.page_content[section].title !== baseline.page_content[section].title) {
      diffs.push(`Titre ${section}`);
    }
    if (current.page_content[section].intro !== baseline.page_content[section].intro) {
      diffs.push(`Texte ${section}`);
    }
    if (current.page_content[section].image_url !== baseline.page_content[section].image_url) {
      diffs.push(`Image ${section}`);
    }
    if (current.page_content[section].image_alt !== baseline.page_content[section].image_alt) {
      diffs.push(`Image alt ${section}`);
    }
    if (current.page_content[section].image_focal_x !== baseline.page_content[section].image_focal_x) {
      diffs.push(`Image focal X ${section}`);
    }
    if (current.page_content[section].image_focal_y !== baseline.page_content[section].image_focal_y) {
      diffs.push(`Image focal Y ${section}`);
    }
  }

  if (JSON.stringify(current.design_tokens) !== JSON.stringify(baseline.design_tokens)) {
    diffs.push("Design tokens");
  }
  if (JSON.stringify(current.design_system) !== JSON.stringify(baseline.design_system)) {
    diffs.push("Design system");
  }
  if (JSON.stringify(current.responsive_overrides) !== JSON.stringify(baseline.responsive_overrides)) {
    diffs.push("Responsive overrides");
  }
  if (JSON.stringify(current.trust_badges) !== JSON.stringify(baseline.trust_badges)) {
    diffs.push("Trust badges");
  }
  if (current.mobile_conversion_rail !== baseline.mobile_conversion_rail) {
    diffs.push("Mobile conversion rail");
  }
  if (current.blocks.length !== baseline.blocks.length) {
    diffs.push("Nombre de blocs");
  } else if (JSON.stringify(current.blocks) !== JSON.stringify(baseline.blocks)) {
    diffs.push("Contenu des blocs");
  }

  return diffs.length ? diffs : ["Aucune difference"];
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
  const [nativeStudio, setNativeStudio] = useState<AgencyNativeStudioPayload>(
    normalizeAgencyNativeStudioPayload(initial.builderPayload)
  );

  const [seoTitle, setSeoTitle] = useState(initial.seoTitle);
  const [seoDescription, setSeoDescription] = useState(initial.seoDescription);
  const [seoKeywords, setSeoKeywords] = useState(initial.seoKeywords);

  const [brandPrimaryColor, setBrandPrimaryColor] = useState(normalizeHexColor(initial.brandPrimaryColor) || "#0f172a");
  const [brandSecondaryColor, setBrandSecondaryColor] = useState(normalizeHexColor(initial.brandSecondaryColor) || "#f8fafc");
  const [brandAccentColor, setBrandAccentColor] = useState(normalizeHexColor(initial.brandAccentColor) || "#d4af37");

  const [loading, setLoading] = useState(false);
  const [publishAction, setPublishAction] = useState<PublicationAction>("save");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverDragActive, setCoverDragActive] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoDragActive, setLogoDragActive] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [canvasZoomPreset, setCanvasZoomPreset] = useState<PreviewZoomPreset>("fit");
  const [canvasViewportWidth, setCanvasViewportWidth] = useState(0);
  const [realZoomPreset, setRealZoomPreset] = useState<PreviewZoomPreset>("fit");
  const [realViewportWidth, setRealViewportWidth] = useState(0);
  const [previewAsVisitor, setPreviewAsVisitor] = useState(false);
  const [previewRenderer, setPreviewRenderer] = useState<"real" | "studio">("real");
  const [previewReloadNonce, setPreviewReloadNonce] = useState(0);
  const [previewEditingSection, setPreviewEditingSection] = useState<AgencyEditableSectionId | null>(null);
  const [previewQuickTab] = useState<"content" | "style">("content");
  const [previewSplitCompare, setPreviewSplitCompare] = useState(false);
  const [previewMediaUploading, setPreviewMediaUploading] = useState(false);
  const [contentLocale, setContentLocale] = useState<"fr" | "ar">(
    nativeStudio.locale_default || "fr"
  );
  const [selectedThemePreset, setSelectedThemePreset] = useState<
    (typeof THEME_PRESETS)[number]["id"] | ""
  >(normalizeThemePreset(initial.themePreset));
  const [sectionOrder, setSectionOrder] = useState<SectionOrderKey[]>(
    normalizeSectionOrder(initial.sectionOrder)
  );
  const [draggedSection, setDraggedSection] = useState<SectionOrderKey | null>(null);
  const [draggedStudioBlockId, setDraggedStudioBlockId] = useState<string | null>(null);
  const [selectedStudioBlockId, setSelectedStudioBlockId] = useState<string | null>(
    nativeStudio.blocks[0]?.id ?? null
  );
  const [showServicesPreview, setShowServicesPreview] = useState(initial.showServicesSection);
  const [showHighlightsPreview, setShowHighlightsPreview] = useState(initial.showHighlightsSection);
  const [showContactPreview, setShowContactPreview] = useState(initial.showContactSection);
  const [showMarketplacePreview, setShowMarketplacePreview] = useState(initial.showMarketplaceSection);
  const [openSidebarPanels, setOpenSidebarPanels] = useState<Record<SidebarPanelKey, boolean>>({
    theme: true,
    layout: true,
    blocks: true,
    previewMode: true,
    sections: false,
    order: false,
    actions: true,
  });
  const [openDetailsPanels, setOpenDetailsPanels] = useState<Record<DetailsPanelKey, boolean>>({
    identity: false,
    content: false,
    contact: false,
    branding: false,
  });
  const [openStructurePages, setOpenStructurePages] = useState<Record<string, boolean>>({
    "page-home": true,
    "page-about": false,
    "page-services": false,
    "page-contact": false,
    "page-marketplace": false,
  });
  const [openStructureSections, setOpenStructureSections] = useState<Record<string, boolean>>({
    "home-hero": true,
  });
  const [leftBuilderTab, setLeftBuilderTab] = useState<BuilderLeftTab>("structure");
  const [openElementGroups, setOpenElementGroups] = useState<Record<string, boolean>>({
    pages: true,
    sections: true,
    elements: false,
  });
  const [, setStyleInspectorSection] = useState<AgencyEditableSectionId | "global">("global");
  const [selection, dispatchSelection] = useReducer(selectionReducer, DEFAULT_SELECTION_STATE);
  const [inlineEditingPath, setInlineEditingPath] = useState<string | null>(null);
  const [canvasDragState, setCanvasDragState] = useState<CanvasDragState | null>(null);
  const [inspectorErrors, setInspectorErrors] = useState<Record<string, string>>({});
  const [isInspectorSaving, setIsInspectorSaving] = useState(false);
  const [inspectorSaveError, setInspectorSaveError] = useState<string | null>(null);
  const [inspectorLastSavedAt, setInspectorLastSavedAt] = useState<string>("");
  const [isInspectorFocusedFlash, setIsInspectorFocusedFlash] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [commandActiveIndex, setCommandActiveIndex] = useState(0);
  const [historyEntries, setHistoryEntries] = useState<BuilderHistoryEntry[]>([]);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<string>("");
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [collabPeers, setCollabPeers] = useState<Array<{ id: string; activeAt: number }>>([]);
  const [collabSection, setCollabSection] = useState<AgencyEditableSectionId>("about");
  const [collabComment, setCollabComment] = useState("");
  const [collabComments, setCollabComments] = useState<
    Array<{ id: string; section: AgencyEditableSectionId; text: string; at: number }>
  >([]);
  const snapshotRef = useRef<string>("");
  const lastAutoHashRef = useRef<string>("");
  const lastUndoSnapshotRef = useRef<string>("");
  const applyingUndoRedoRef = useRef(false);
  const previewActionRef = useRef<
    (section: AgencyEditableSectionId, action: AgencyPreviewSectionAction, fromSection?: AgencyEditableSectionId) => void
  >(() => undefined);
  const collabIdRef = useRef(`editor-${Math.random().toString(36).slice(2, 8)}`);
  const collabChannelRef = useRef<BroadcastChannel | null>(null);
  const canvasViewportRef = useRef<HTMLDivElement | null>(null);
  const realViewportRef = useRef<HTMLDivElement | null>(null);
  const realPreviewFrameRef = useRef<HTMLIFrameElement | null>(null);
  const commandInputRef = useRef<HTMLInputElement | null>(null);
  const inspectorPanelRef = useRef<HTMLElement | null>(null);
  const inspectorFocusTimerRef = useRef<number | null>(null);
  const lastRealPreviewRefreshAtRef = useRef(0);
  const skipNextInspectorAutosaveRef = useRef(true);
  const isPreviewQuickModalOpen = previewEditingSection !== null;
  const isAnyDetailsModalOpen =
    openDetailsPanels.identity ||
    openDetailsPanels.content ||
    openDetailsPanels.contact ||
    openDetailsPanels.branding ||
    isPreviewQuickModalOpen;

  useEffect(() => {
    return () => {
      if (inspectorFocusTimerRef.current) {
        window.clearTimeout(inspectorFocusTimerRef.current);
        inspectorFocusTimerRef.current = null;
      }
    };
  }, []);

  const publicHref = slug ? `/agence/${encodeURIComponent(slug)}` : "";
  const canPublish = slug.trim().length >= 3;
  const previewFrameSrc = useMemo(() => {
    const normalized = normalizeSlug(slug);
    if (normalized.length < 3) return "about:blank";
    const params = new URLSearchParams();
    if (contentLocale === "ar") params.set("lang", "ar");
    params.set("preview_editor", "1");
    params.set("_preview", String(previewReloadNonce));
    return `/agence/${encodeURIComponent(normalized)}?${params.toString()}`;
  }, [slug, contentLocale, previewReloadNonce]);
  const canvasBaseWidth = useMemo(() => {
    if (previewDevice === "mobile") return 360;
    if (previewDevice === "tablet") return 860;
    return 1280;
  }, [previewDevice]);
  const fitCanvasZoom = useMemo(() => {
    if (canvasViewportWidth <= 0) return 1;
    return Math.min(1, Math.max(0.4, canvasViewportWidth / canvasBaseWidth));
  }, [canvasViewportWidth, canvasBaseWidth]);
  const canvasZoomScale = canvasZoomPreset === "fit" ? fitCanvasZoom : canvasZoomPreset / 100;
  const canvasZoomLabel =
    canvasZoomPreset === "fit" ? `Fit (${Math.round(canvasZoomScale * 100)}%)` : `${canvasZoomPreset}%`;
  const fitRealZoom = useMemo(() => {
    if (realViewportWidth <= 0) return 1;
    return Math.min(1, Math.max(0.4, realViewportWidth / canvasBaseWidth));
  }, [realViewportWidth, canvasBaseWidth]);
  const realZoomScale = realZoomPreset === "fit" ? fitRealZoom : realZoomPreset / 100;
  const realZoomLabel =
    realZoomPreset === "fit" ? `Fit (${Math.round(realZoomScale * 100)}%)` : `${realZoomPreset}%`;

  useEffect(() => {
    const node = canvasViewportRef.current;
    if (!node) {
      setCanvasViewportWidth(0);
      return;
    }

    const update = () => setCanvasViewportWidth(node.clientWidth);
    update();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => update());
    observer.observe(node);
    return () => observer.disconnect();
  }, [previewRenderer, previewDevice]);

  useEffect(() => {
    const node = realViewportRef.current;
    if (!node) {
      setRealViewportWidth(0);
      return;
    }

    const update = () => setRealViewportWidth(node.clientWidth);
    update();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => update());
    observer.observe(node);
    return () => observer.disconnect();
  }, [previewRenderer, previewDevice]);

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
  const selectedStudioBlock = useMemo(
    () => nativeStudio.blocks.find((block) => block.id === selectedStudioBlockId) ?? null,
    [nativeStudio.blocks, selectedStudioBlockId]
  );
  const activeResponsiveOverride = useMemo(
    () => nativeStudio.responsive_overrides[previewDevice],
    [nativeStudio.responsive_overrides, previewDevice]
  );
  const previewCardClass = useMemo(() => nativeStudioCardClass(nativeStudio), [nativeStudio]);
  const previewHeroHeightClass = useMemo(() => nativeStudioHeroHeightClass(nativeStudio), [nativeStudio]);
  const previewMarketplaceGridClass = nativeStudio.marketplace_columns === "2" ? "grid-cols-2" : "grid-cols-3";
  const previewSectionSpacingClass = previewSectionSpacingScaleClass(activeResponsiveOverride.section_spacing);
  const previewTypographyClass = previewTypographyScaleClass(activeResponsiveOverride.typography_scale);
  const previewButtonRadiusClass =
    nativeStudio.button_radius === "md"
      ? "rounded-lg"
      : nativeStudio.button_radius === "full"
        ? "rounded-full"
        : "rounded-xl";
  const previewBodyFontFamily = useMemo(
    () => nativeStudioFontStack(nativeStudio, "body_font"),
    [nativeStudio]
  );
  const previewHeadingFontFamily = useMemo(
    () => nativeStudioFontStack(nativeStudio, "heading_font"),
    [nativeStudio]
  );
  const previewSectionOrder = useMemo(() => {
    const allowed = SECTION_ORDER_OPTIONS.map((item) => item.key);
    const seen = new Set<SectionOrderKey>();
    const ordered: SectionOrderKey[] = [];

    for (const key of sectionOrder) {
      if (!allowed.includes(key) || seen.has(key)) continue;
      seen.add(key);
      ordered.push(key);
    }
    for (const key of allowed) {
      if (!seen.has(key)) ordered.push(key);
    }

    return ordered.filter((key) => {
      if (key === "services") return showServicesPreview;
      if (key === "contact") return showContactPreview;
      if (key === "marketplace") return showMarketplacePreview;
      return true;
    });
  }, [sectionOrder, showServicesPreview, showContactPreview, showMarketplacePreview]);
  const previewBlocksBySection = useMemo<Record<SectionOrderKey, AgencyNativeStudioBlock[]>>(() => {
    const grouped: Record<SectionOrderKey, AgencyNativeStudioBlock[]> = {
      about: [],
      services: [],
      contact: [],
      marketplace: [],
    };
    for (const block of nativeStudio.blocks) {
      if (block.section in grouped) {
        grouped[block.section as SectionOrderKey].push(block);
      }
    }
    return grouped;
  }, [nativeStudio.blocks]);
  const structurePages = useMemo<StructurePageItem[]>(() => {
    const sectionTarget = (
      id: string,
      label: string,
      section: AgencyEditableSectionId,
      path?: string[]
    ): StructureComponentItem => ({
      id,
      label,
      selectKind: "section",
      selectPath: path ?? [section],
    });
    const componentTarget = (
      id: string,
      label: string,
      path: string[],
      componentId?: string
    ): StructureComponentItem => ({
      id,
      label,
      selectKind: "component",
      selectPath: path,
      componentId: componentId || id,
    });
    const blockTargets = (key: SectionOrderKey) =>
      previewBlocksBySection[key].slice(0, 8).map((block, index) => {
        const label = `${block.type.toUpperCase()}${block.title ? `: ${block.title}` : ` #${index + 1}`}`;
        if (key === "marketplace") {
          return componentTarget(
            `${key}-gallery-${block.id}`,
            label,
            ["galleryItems", String(index)],
            block.id
          );
        }
        return componentTarget(`${key}-block-${block.id}`, label, ["blocks", block.id], block.id);
      });
    const serviceTargets = servicesList.slice(0, 8).map((item, index) =>
      componentTarget(
        `services-item-${index}`,
        item || `Service ${index + 1}`,
        ["servicesItems", String(index)],
        `services-item-${index}`
      )
    );
    const highlightTargets = highlightsList.slice(0, 8).map((item, index) =>
      componentTarget(
        `highlights-item-${index}`,
        item || `Highlight ${index + 1}`,
        ["highlightsItems", String(index)],
        `highlight-item-${index}`
      )
    );

    const homeSections: StructureSectionItem[] = [
      {
        id: "home-hero",
        label: "Hero",
        editableSection: "hero",
        components: [
          sectionTarget("hero-badge", "Badge", "hero", ["hero", "badge"]),
          sectionTarget("hero-title", "Titre", "hero", ["hero", "headline"]),
          sectionTarget("hero-subheadline", "Sous-titre", "hero", ["hero", "subheadline"]),
          sectionTarget("hero-cta", "CTA", "hero", ["cta"]),
          sectionTarget("hero-image", "Image cover", "hero", ["hero", "image"]),
        ],
      },
      ...previewSectionOrder.map((key) => {
        const baseComponents: StructureComponentItem[] =
          key === "about"
            ? [
                sectionTarget("about-title", "Titre", "about", ["about", "title"]),
                sectionTarget("about-intro", "Description", "about", ["about", "intro"]),
                sectionTarget("about-image", "Image", "about", ["about", "image"]),
                ...highlightTargets,
              ]
            : key === "services"
              ? [
                  sectionTarget("services-title", "Titre", "services", ["services", "title"]),
                  sectionTarget("services-intro", "Intro", "services", ["services", "intro"]),
                  ...serviceTargets,
                ]
              : key === "marketplace"
                ? [
                    sectionTarget("marketplace-title", "Titre", "marketplace", ["marketplace", "title"]),
                    sectionTarget("marketplace-intro", "Intro", "marketplace", ["marketplace", "intro"]),
                  ]
                : [
                    sectionTarget("contact-title", "Titre", "contact", ["contact", "title"]),
                    sectionTarget("contact-intro", "Intro", "contact", ["contact", "intro"]),
                    sectionTarget("contact-coord", "Coordonnees", "contact", ["contact", "email"]),
                    sectionTarget("contact-cta", "CTA", "contact", ["contact", "cta"]),
                  ];
        return {
          id: `home-${key}`,
          label: SECTION_LABEL_BY_KEY[key],
          editableSection: key,
          components: [...baseComponents, ...blockTargets(key)],
        };
      }),
      ...(showHighlightsPreview
        ? ([
            {
              id: "home-testimonials",
              label: "Testimonials",
              editableSection: "testimonials",
              components: [
                sectionTarget("testimonials-title", "Titre", "testimonials", ["testimonials", "title"]),
                ...highlightTargets,
              ],
            },
          ] as StructureSectionItem[])
        : []),
      {
        id: "home-cta",
        label: "CTA global",
        editableSection: "cta",
        components: [
          sectionTarget("cta-title", "Titre", "cta", ["cta", "headline"]),
          sectionTarget("cta-subtitle", "Sous-titre", "cta", ["cta", "subheadline"]),
          sectionTarget("cta-button", "Bouton", "cta", ["cta"]),
        ],
      },
    ];

    const pageSections = (key: SectionOrderKey, label: string): StructureSectionItem[] => [
      {
        id: `${key}-hero`,
        label: `Hero ${label}`,
        editableSection: key,
        components: [
          sectionTarget(`${key}-hero-title`, "Titre", key, [key, "title"]),
          sectionTarget(`${key}-hero-intro`, "Intro", key, [key, "intro"]),
          sectionTarget(`${key}-hero-image`, "Image cover", key, [key, "image"]),
          sectionTarget(`${key}-hero-focal`, "Focal point", key, [key, "imageFocal"]),
        ],
      },
      {
        id: `${key}-content`,
        label: `Contenu ${label}`,
        editableSection: key,
        components: [
          sectionTarget(`${key}-content-title`, "Titre", key, [key, "title"]),
          sectionTarget(`${key}-content-text`, "Texte", key, [key, "intro"]),
          sectionTarget(`${key}-content-image`, "Image", key, [key, "image"]),
          ...blockTargets(key),
        ],
      },
    ];

    return [
      { id: "page-home", label: "Home", sections: homeSections },
      { id: "page-about", label: "A propos", sections: pageSections("about", "A propos") },
      { id: "page-services", label: "Services", sections: pageSections("services", "Services") },
      { id: "page-contact", label: "Contact", sections: pageSections("contact", "Contact") },
      {
        id: "page-marketplace",
        label: "Marketplace",
        sections: pageSections("marketplace", "Marketplace"),
      },
    ];
  }, [previewBlocksBySection, previewSectionOrder, showHighlightsPreview, servicesList, highlightsList]);
  function toggleStructurePage(pageId: string) {
    setOpenStructurePages((prev) => ({ ...prev, [pageId]: !prev[pageId] }));
  }

  function toggleStructureSection(sectionId: string) {
    setOpenStructureSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }

  function selectFromStructure(section: AgencyEditableSectionId, component: StructureComponentItem) {
    const orderKey = sectionToOrderKey(section);
    if (orderKey) ensureSectionVisible(orderKey);
    if (section === "testimonials") setShowHighlightsPreview(true);
    if (component.selectKind === "component" && component.selectPath) {
      selectComponent(component.componentId || component.id, component.selectPath, { focusInspector: true });
      return;
    }
    selectSection(section, { focusInspector: true, path: component.selectPath });
  }

  function toggleElementGroup(groupId: string) {
    setOpenElementGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }

  function ensureSectionVisible(section: SectionOrderKey) {
    if (section === "services") setShowServicesPreview(true);
    if (section === "contact") setShowContactPreview(true);
    if (section === "marketplace") setShowMarketplacePreview(true);
    setSectionOrder((prev) => {
      if (prev.includes(section)) return prev;
      return [...prev, section];
    });
    selectSection(section);
  }

  function applyElementLibraryAction(action: string) {
    if (action === "section-about") {
      ensureSectionVisible("about");
      return;
    }
    if (action === "section-services") {
      ensureSectionVisible("services");
      return;
    }
    if (action === "section-contact") {
      ensureSectionVisible("contact");
      return;
    }
    if (action === "section-marketplace") {
      ensureSectionVisible("marketplace");
      return;
    }
    if (action === "block-text") {
      addNativeStudioBlock("text");
      return;
    }
    if (action === "block-list") {
      addNativeStudioBlock("list");
      return;
    }
    if (action === "block-cta") {
      addNativeStudioBlock("cta");
      return;
    }
    if (action === "gallery-item") {
      addGalleryItem();
      return;
    }
    if (action === "services-item") {
      updateServicesItems((items) => [...items, "Nouveau service"]);
      selectComponent(`services-item-${servicesList.length}`, ["servicesItems", String(servicesList.length)]);
      return;
    }
    if (action === "highlights-item") {
      updateHighlightsItems((items) => [...items, "Nouveau point fort"]);
      selectComponent(`highlight-item-${highlightsList.length}`, ["highlightsItems", String(highlightsList.length)]);
      return;
    }
    if (action === "brand-cta") {
      setCtaLabel("Get in touch");
      setCtaUrl("/contact");
      selectSection("cta");
    }
  }

  const openCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(true);
    setCommandQuery("");
    setCommandActiveIndex(0);
  }, []);

  const closeCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(false);
    setCommandQuery("");
    setCommandActiveIndex(0);
  }, []);

  const commandPaletteItems: CommandPaletteItem[] = [
    {
      id: "preview-real",
      label: "Switch preview to Real",
      hint: "Focus on real website rendering",
      keywords: ["preview", "real", "live", "result"],
      run: () => setPreviewRenderer("real"),
    },
    {
      id: "preview-studio",
      label: "Switch preview to Studio",
      hint: "Edit on the canvas renderer",
      keywords: ["preview", "studio", "canvas", "edit"],
      run: () => setPreviewRenderer("studio"),
    },
    {
      id: "focus-real",
      label: "Focus real preview",
      hint: "Disable compare and fit real zoom",
      keywords: ["focus", "real", "zoom", "compare"],
      run: () => {
        setPreviewRenderer("real");
        setPreviewSplitCompare(false);
        setRealZoomPreset("fit");
      },
    },
    {
      id: "toggle-compare",
      label: previewSplitCompare ? "Disable compare mode" : "Enable compare mode",
      hint: "Toggle draft vs published comparison",
      keywords: ["compare", "draft", "published", "diff"],
      run: () => setPreviewSplitCompare((prev) => !prev),
    },
    {
      id: "add-section-about",
      label: "Add About section",
      hint: "Show and select About section",
      keywords: ["add", "section", "about"],
      run: () => ensureSectionVisible("about"),
    },
    {
      id: "add-section-services",
      label: "Add Services section",
      hint: "Show and select Services section",
      keywords: ["add", "section", "services"],
      run: () => ensureSectionVisible("services"),
    },
    {
      id: "add-section-contact",
      label: "Add Contact section",
      hint: "Show and select Contact section",
      keywords: ["add", "section", "contact"],
      run: () => ensureSectionVisible("contact"),
    },
    {
      id: "add-section-marketplace",
      label: "Add Marketplace section",
      hint: "Show and select Marketplace section",
      keywords: ["add", "section", "marketplace"],
      run: () => ensureSectionVisible("marketplace"),
    },
    {
      id: "insert-service-item",
      label: "Insert service item",
      hint: "Add one service bullet/card",
      keywords: ["insert", "service", "item"],
      run: () => applyElementLibraryAction("services-item"),
    },
    {
      id: "insert-highlight-item",
      label: "Insert highlight item",
      hint: "Add one highlight bullet/card",
      keywords: ["insert", "highlight", "item"],
      run: () => applyElementLibraryAction("highlights-item"),
    },
    {
      id: "insert-gallery-item",
      label: "Insert gallery item",
      hint: "Add one marketplace/gallery card",
      keywords: ["insert", "gallery", "marketplace", "item"],
      run: () => applyElementLibraryAction("gallery-item"),
    },
    {
      id: "go-hero",
      label: "Select Hero section",
      hint: "Jump to Hero properties",
      keywords: ["select", "hero", "section"],
      run: () => selectSection("hero"),
    },
    {
      id: "go-services",
      label: "Select Services section",
      hint: "Jump to Services properties",
      keywords: ["select", "services", "section"],
      run: () => selectSection("services"),
    },
    {
      id: "go-contact",
      label: "Select Contact section",
      hint: "Jump to Contact properties",
      keywords: ["select", "contact", "section"],
      run: () => selectSection("contact"),
    },
    {
      id: "undo",
      label: "Undo",
      hint: "Revert last change",
      keywords: ["undo", "history", "revert"],
      run: () => undoLastChange(),
    },
    {
      id: "redo",
      label: "Redo",
      hint: "Re-apply last undone change",
      keywords: ["redo", "history"],
      run: () => redoLastUndo(),
    },
  ];

  const filteredCommandPaletteItems = (() => {
    const query = commandQuery.trim().toLowerCase();
    if (!query) return commandPaletteItems;
    return commandPaletteItems.filter((item) => {
      if (item.label.toLowerCase().includes(query)) return true;
      if (item.hint.toLowerCase().includes(query)) return true;
      return item.keywords.some((keyword) => keyword.includes(query));
    });
  })();

  const runCommandPaletteItem = useCallback(
    (item: CommandPaletteItem | undefined) => {
      if (!item) return;
      item.run();
      closeCommandPalette();
    },
    [closeCommandPalette]
  );

  useEffect(() => {
    setOpenStructurePages((prev) => {
      const next = { ...prev };
      for (const page of structurePages) {
        if (!(page.id in next)) next[page.id] = page.id === "page-home";
      }
      return next;
    });
    setOpenStructureSections((prev) => {
      const next = { ...prev };
      for (const page of structurePages) {
        for (const section of page.sections) {
          if (!(section.id in next)) next[section.id] = section.id === "home-hero";
        }
      }
      return next;
    });
  }, [structurePages]);
  const enabledPreviewSectionCount = useMemo(() => {
    let count = 1; // about
    if (showServicesPreview) count += 1;
    if (showContactPreview) count += 1;
    if (showMarketplacePreview) count += 1;
    return count;
  }, [showServicesPreview, showContactPreview, showMarketplacePreview]);
  const arabicTranslations = nativeStudio.translations.ar || {};
  const localizedHeroTitle =
    contentLocale === "ar" ? arabicTranslations.hero_title || heroTitle : heroTitle;
  const localizedHeroSubtitle =
    contentLocale === "ar" ? arabicTranslations.hero_subtitle || heroSubtitle : heroSubtitle;
  const localizedTagline =
    contentLocale === "ar" ? arabicTranslations.tagline || tagline : tagline;
  const localizedDescription =
    contentLocale === "ar" ? arabicTranslations.description || description : description;
  const localizedAboutTitle =
    contentLocale === "ar" ? arabicTranslations.about_title || aboutTitle : aboutTitle;
  const localizedCtaLabel =
    contentLocale === "ar" ? arabicTranslations.cta_label || ctaLabel : ctaLabel;
  const localizedMarketplaceTitle =
    contentLocale === "ar"
      ? arabicTranslations.marketplace_title || marketplaceTitle
      : marketplaceTitle;
  const publishDiff = useMemo(
    () =>
      studioSnapshotDiffSummary(
        buildStudioPublishSnapshot(nativeStudio),
        nativeStudio.published_snapshot
      ),
    [nativeStudio]
  );
  const publishActionLabel =
    publishAction === "publish"
      ? "Publier maintenant"
      : publishAction === "draft"
        ? "Enregistrer brouillon"
        : publishAction === "schedule"
          ? "Planifier la publication"
          : "Enregistrer la vitrine";
  const publishStateLabel =
    nativeStudio.publish_state === "published"
      ? "Publie"
      : nativeStudio.publish_state === "scheduled"
        ? "Planifie"
        : "Brouillon";
  const pageContent = nativeStudio.page_content;
  const aboutPageContent = pageContent.about;
  const servicesPageContent = pageContent.services;
  const contactPageContent = pageContent.contact;
  const marketplacePageContent = pageContent.marketplace;
  const galleryItems = useMemo(
    () => nativeStudio.blocks.filter((block) => block.section === "marketplace"),
    [nativeStudio.blocks]
  );
  const selectedArrayPath =
    selection.selectedKind === "component" && selection.selectedPath.length >= 2
      ? `${selection.selectedPath[0]}.${selection.selectedPath[1]}`
      : null;
  const selectedSectionId =
    selection.selectedKind === "section" && INSPECTOR_SECTION_IDS.includes(selection.selectedId as InspectorSectionId)
      ? (selection.selectedId as InspectorSectionId)
      : null;
  const selectedComponentKind = selection.selectedKind === "component" ? selection.selectedPath[0] || "" : "";
  const selectedComponentIndex =
    selection.selectedKind === "component" && selection.selectedPath[1] != null
      ? Number(selection.selectedPath[1])
      : -1;
  const selectedGalleryItem =
    selectedComponentKind === "galleryItems" && selectedComponentIndex >= 0
      ? galleryItems[selectedComponentIndex] || null
      : null;
  const selectedRealPreviewSection = useMemo<AgencyEditableSectionId | null>(() => {
    if (
      selection.selectedKind === "section" &&
      INSPECTOR_SECTION_IDS.includes(selection.selectedId as InspectorSectionId)
    ) {
      return selection.selectedId as AgencyEditableSectionId;
    }
    if (selection.selectedKind !== "component") return null;
    if (selectedComponentKind === "servicesItems") return "services";
    if (selectedComponentKind === "highlightsItems") return "testimonials";
    if (selectedComponentKind === "galleryItems") return "marketplace";
    if (selectedComponentKind === "blocks") {
      const block = nativeStudio.blocks.find((entry) => entry.id === selection.selectedId);
      if (!block) return null;
      if (block.section === "about") return "about";
      if (block.section === "services") return "services";
      if (block.section === "contact") return "contact";
      return "marketplace";
    }
    return null;
  }, [selection, selectedComponentKind, nativeStudio.blocks]);
  const selectedRealPreviewComponentType = useMemo<"text" | "button" | "image" | undefined>(() => {
    if (selection.selectedKind === "section" && selection.selectedId === "cta") return "button";
    if (selection.selectedKind !== "component") return undefined;
    if (selectedComponentKind === "galleryItems") return "image";
    if (selectedComponentKind === "servicesItems" || selectedComponentKind === "highlightsItems") return "text";
    if (selectedComponentKind === "blocks") {
      const block = nativeStudio.blocks.find((entry) => entry.id === selection.selectedId);
      if (!block) return "text";
      if (block.type === "cta") return "button";
      if (block.image_url) return "image";
      return "text";
    }
    return "text";
  }, [selection, selectedComponentKind, nativeStudio.blocks]);
  const selectedRealPreviewPath = useMemo<string | undefined>(() => {
    if (selection.selectedKind === "section") {
      if (selection.selectedPath.length > 0) return selection.selectedPath.join(".");
      if (selection.selectedId === "cta") return "cta";
      return undefined;
    }
    if (selection.selectedKind !== "component") return undefined;
    if (
      (selectedComponentKind === "servicesItems" ||
        selectedComponentKind === "highlightsItems" ||
        selectedComponentKind === "galleryItems") &&
      selectedComponentIndex >= 0
    ) {
      return `${selectedComponentKind}.${selectedComponentIndex}`;
    }
    if (selectedComponentKind === "blocks") {
      return `blocks.${selection.selectedId}`;
    }
    return selection.selectedPath.length > 0 ? selection.selectedPath.join(".") : undefined;
  }, [selection, selectedComponentKind, selectedComponentIndex]);

  const inspectorSchema = useMemo<InspectorSchema | null>(() => {
    const designSystemFields: InspectorFieldSchema[] = [
      { key: "brandPrimaryColor", type: "color", label: "Primary color" },
      { key: "brandSecondaryColor", type: "color", label: "Secondary color" },
      { key: "brandAccentColor", type: "color", label: "Accent color" },
      {
        key: "headingFont",
        type: "select",
        label: "Heading font",
        options: [
          { value: "playfair", label: "Playfair" },
          { value: "montserrat", label: "Montserrat" },
          { value: "lora", label: "Lora" },
        ],
      },
      {
        key: "bodyFont",
        type: "select",
        label: "Body font",
        options: [
          { value: "manrope", label: "Manrope" },
          { value: "inter", label: "Inter" },
          { value: "poppins", label: "Poppins" },
        ],
      },
      {
        key: "shadowIntensity",
        type: "select",
        label: "Shadow intensity",
        options: [
          { value: "soft", label: "Soft" },
          { value: "medium", label: "Medium" },
          { value: "strong", label: "Strong" },
        ],
      },
      {
        key: "motionLevel",
        type: "select",
        label: "Motion",
        options: [
          { value: "none", label: "None" },
          { value: "subtle", label: "Subtle" },
          { value: "rich", label: "Rich" },
        ],
      },
    ];
    const layoutFields: InspectorFieldSchema[] = [
      {
        key: "containerWidth",
        type: "select",
        label: "Container width",
        options: [
          { value: "narrow", label: "Narrow" },
          { value: "normal", label: "Normal" },
          { value: "wide", label: "Wide" },
        ],
      },
      {
        key: "fontSizeScale",
        type: "slider",
        label: `Font size (${previewDevice})`,
        min: 0,
        max: 2,
        step: 1,
        description: "Controls typography scale for the active preview device.",
      },
      {
        key: "sectionSpacingScale",
        type: "slider",
        label: `Section spacing (${previewDevice})`,
        min: 0,
        max: 2,
        step: 1,
      },
      {
        key: "cardRadius",
        type: "select",
        label: "Card radius",
        options: [
          { value: "md", label: "Medium" },
          { value: "xl", label: "Large" },
          { value: "full", label: "Pill" },
        ],
      },
      {
        key: "buttonRadius",
        type: "select",
        label: "Button radius",
        options: [
          { value: "md", label: "Medium" },
          { value: "xl", label: "Large" },
          { value: "full", label: "Pill" },
        ],
      },
    ];

    if (selection.selectedKind === "page") {
      return {
        title: "Page settings",
        groups: [
          {
            label: "Routing & SEO",
            fields: [
              { key: "slug", type: "text", label: "Slug" },
              { key: "seoTitle", type: "text", label: "SEO title" },
              { key: "seoDescription", type: "textarea", label: "SEO description", rows: 4 },
            ],
          },
          {
            label: "Publication",
            fields: [{ key: "publishState", type: "select", label: "Etat", options: [
              { value: "draft", label: "Brouillon" },
              { value: "scheduled", label: "Planifie" },
              { value: "published", label: "Publie" },
            ] }],
          },
          { label: "Design system", fields: designSystemFields },
          { label: "Layout & spacing", fields: layoutFields },
        ],
      };
    }

    if (selectedSectionId === "hero") {
      return {
        title: "Hero",
        groups: [
          {
            label: "Text",
            fields: [
              { key: "headline", type: "text", label: "Headline" },
              { key: "subheadline", type: "text", label: "Subheadline" },
              { key: "description", type: "textarea", label: "Description", rows: 3 },
            ],
          },
          {
            label: "CTA",
            fields: [
              { key: "ctaLabel", type: "text", label: "Button label" },
              { key: "ctaHref", type: "link", label: "Button link" },
            ],
          },
          {
            label: "Media",
            fields: [
              { key: "imageUrl", type: "image", label: "Hero image" },
              { key: "imageAlt", type: "text", label: "Alt text" },
              { key: "imageFocalX", type: "slider", label: "Focal X", min: 0, max: 100, step: 1 },
              { key: "imageFocalY", type: "slider", label: "Focal Y", min: 0, max: 100, step: 1 },
            ],
          },
          {
            label: "Hero style",
            fields: [
              {
                key: "heroVariant",
                type: "select",
                label: "Hero variant",
                options: [
                  { value: "classic", label: "Classic" },
                  { value: "compact", label: "Compact" },
                  { value: "immersive", label: "Immersive" },
                ],
              },
            ],
          },
          { label: "Design system", fields: designSystemFields },
          { label: "Layout & spacing", fields: layoutFields },
        ],
      };
    }

    if (
      selectedSectionId === "about" ||
      selectedSectionId === "services" ||
      selectedSectionId === "contact" ||
      selectedSectionId === "marketplace"
    ) {
      const title = selectedSectionId === "about"
        ? "About section"
        : selectedSectionId === "services"
          ? "Features / Services section"
          : selectedSectionId === "contact"
            ? "Contact section"
            : "Gallery / Marketplace section";
      const sectionFields: InspectorFieldSchema[] = [
        { key: "title", type: "text", label: "Titre" },
        { key: "intro", type: "textarea", label: "Description", rows: 4 },
        { key: "image_url", type: "image", label: "Media picker" },
        { key: "image_alt", type: "text", label: "Image alt" },
        { key: "image_focal_x", type: "slider", label: "Focal X", min: 0, max: 100, step: 1 },
        { key: "image_focal_y", type: "slider", label: "Focal Y", min: 0, max: 100, step: 1 },
      ];
      const groups: InspectorSchema["groups"] = [{ label: "Content", fields: sectionFields }];
      if (selectedSectionId === "services") {
        groups.push({ label: "Features", fields: [{ key: "servicesItems", type: "array", label: "Cards" }] });
      }
      if (selectedSectionId === "marketplace") {
        groups.push({ label: "Gallery", fields: [{ key: "galleryItems", type: "array", label: "Items" }] });
      }
      groups.push({ label: "Design system", fields: designSystemFields });
      groups.push({ label: "Layout & spacing", fields: layoutFields });
      return {
        title,
        groups,
      };
    }

    if (selectedSectionId === "cta") {
      return {
        title: "CTA",
        groups: [
          {
            label: "Action",
            fields: [
              { key: "ctaLabel", type: "text", label: "Label" },
              { key: "ctaHref", type: "link", label: "Lien" },
              {
                key: "ctaStyle",
                type: "select",
                label: "Style",
                options: [
                  { value: "solid", label: "Solid" },
                  { value: "outline", label: "Outline" },
                ],
              },
            ],
          },
          { label: "Design system", fields: designSystemFields },
          { label: "Layout & spacing", fields: layoutFields },
        ],
      };
    }

    if (selectedSectionId === "testimonials") {
      return {
        title: "Testimonials / Highlights",
        groups: [
          { label: "Items", fields: [{ key: "highlightsItems", type: "array", label: "Highlights" }] },
          { label: "Design system", fields: designSystemFields },
          { label: "Layout & spacing", fields: layoutFields },
        ],
      };
    }

    if (selectedComponentKind === "servicesItems" || selectedComponentKind === "highlightsItems") {
      return {
        title: selectedComponentKind === "servicesItems" ? "Feature card" : "Highlight item",
        groups: [
          { label: "Item", fields: [{ key: "label", type: "text", label: "Text" }] },
          { label: "Design system", fields: designSystemFields },
          { label: "Layout & spacing", fields: layoutFields },
        ],
      };
    }

    if (selectedComponentKind === "galleryItems" || selectedComponentKind === "blocks") {
      return {
        title: "Gallery item",
        groups: [
          {
            label: "Content",
            fields: [
              { key: "title", type: "text", label: "Title" },
              { key: "body", type: "textarea", label: "Description", rows: 3 },
              { key: "image_url", type: "image", label: "Image" },
              { key: "image_alt", type: "text", label: "Image alt" },
              { key: "cta_label", type: "text", label: "Button label" },
              { key: "cta_href", type: "link", label: "Button link" },
            ],
          },
          { label: "Design system", fields: designSystemFields },
          { label: "Layout & spacing", fields: layoutFields },
        ],
      };
    }
    return null;
  }, [selection.selectedKind, selectedSectionId, selectedComponentKind, previewDevice]);

  const inspectorValues = useMemo<Record<string, unknown>>(() => {
    const globalDesignValues = {
      brandPrimaryColor,
      brandSecondaryColor,
      brandAccentColor,
      headingFont: nativeStudio.design_system.heading_font,
      bodyFont: nativeStudio.design_system.body_font,
      shadowIntensity: nativeStudio.design_system.shadow_intensity,
      motionLevel: nativeStudio.design_tokens.motion_level,
      containerWidth: nativeStudio.design_tokens.container_width,
      fontSizeScale: scaleStepToIndex(activeResponsiveOverride.typography_scale, TYPOGRAPHY_SCALE_STEPS),
      sectionSpacingScale: scaleStepToIndex(activeResponsiveOverride.section_spacing, SPACING_SCALE_STEPS),
      cardRadius: nativeStudio.card_radius,
      buttonRadius: nativeStudio.button_radius,
    };
    if (selection.selectedKind === "page") {
      return {
        slug,
        seoTitle,
        seoDescription,
        seoKeywords,
        publishState: nativeStudio.publish_state,
        ...globalDesignValues,
      };
    }
    if (selectedSectionId === "hero") {
      return {
        headline: heroTitle,
        subheadline: tagline,
        description: heroSubtitle,
        ctaLabel: ctaLabel,
        ctaHref: ctaUrl,
        imageUrl: coverUrl,
        imageAlt: nativeStudio.hero_image_alt,
        imageFocalX: nativeStudio.hero_image_focal_x,
        imageFocalY: nativeStudio.hero_image_focal_y,
        heroVariant: nativeStudio.hero_variant,
        ...globalDesignValues,
      };
    }
    if (
      selectedSectionId === "about" ||
      selectedSectionId === "services" ||
      selectedSectionId === "contact" ||
      selectedSectionId === "marketplace"
    ) {
      return {
        ...nativeStudio.page_content[selectedSectionId],
        servicesItems: servicesList,
        highlightsItems: highlightsList,
        galleryItems: galleryItems,
        ...globalDesignValues,
      };
    }
    if (selectedSectionId === "cta") {
      return {
        ctaLabel,
        ctaHref: ctaUrl,
        ctaStyle: nativeStudio.cta_style,
        ...globalDesignValues,
      };
    }
    if (selectedSectionId === "testimonials") {
      return {
        highlightsItems: highlightsList,
        ...globalDesignValues,
      };
    }
    if (selectedComponentKind === "servicesItems" && selectedComponentIndex >= 0) {
      return {
        label: servicesList[selectedComponentIndex] || "",
        ...globalDesignValues,
      };
    }
    if (selectedComponentKind === "highlightsItems" && selectedComponentIndex >= 0) {
      return {
        label: highlightsList[selectedComponentIndex] || "",
        ...globalDesignValues,
      };
    }
    if (selectedGalleryItem) {
      return { ...selectedGalleryItem, ...globalDesignValues };
    }
    return {};
  }, [
    selection.selectedKind,
    selectedSectionId,
    selectedComponentKind,
    selectedComponentIndex,
    selectedGalleryItem,
    slug,
    seoTitle,
    seoDescription,
    seoKeywords,
    nativeStudio,
    heroTitle,
    tagline,
    heroSubtitle,
    ctaLabel,
    ctaUrl,
    coverUrl,
    servicesList,
    highlightsList,
    galleryItems,
    brandPrimaryColor,
    brandSecondaryColor,
    brandAccentColor,
    activeResponsiveOverride,
  ]);

  const inspectorBreadcrumbs = useMemo(() => {
    if (selection.selectedKind === "page") return ["Page", "Home"];
    if (selection.selectedKind === "section") {
      return [
        "Page",
        "Home",
        selection.selectedId,
        ...(selection.selectedPath.length > 0 ? [selection.selectedPath.join(".")] : []),
      ];
    }
    return [
      "Page",
      "Home",
      "Component",
      selection.selectedId,
      ...(selection.selectedPath.length > 0 ? [selection.selectedPath.join(".")] : []),
    ];
  }, [selection.selectedKind, selection.selectedId, selection.selectedPath]);

  const seoIssues = useMemo(() => {
    const issues: string[] = [];
    if (!seoTitle.trim()) issues.push("SEO title manquant.");
    if (seoTitle.trim() && (seoTitle.trim().length < 30 || seoTitle.trim().length > 65)) {
      issues.push("SEO title recommande entre 30 et 65 caracteres.");
    }
    if (!seoDescription.trim()) issues.push("SEO description manquante.");
    if (
      seoDescription.trim() &&
      (seoDescription.trim().length < 80 || seoDescription.trim().length > 170)
    ) {
      issues.push("SEO description recommandee entre 80 et 170 caracteres.");
    }
    if (parseLines(seoKeywords).length < 3) {
      issues.push("Ajoutez au moins 3 mots-cles SEO.");
    }
    if (!heroTitle.trim()) issues.push("Hero title manquant.");
    return issues;
  }, [seoTitle, seoDescription, seoKeywords, heroTitle]);
  const linkAuditIssues = useMemo(() => {
    const issues: string[] = [];
    if (!isLikelyHttpUrl(coverUrl)) issues.push("Cover URL invalide.");
    if (!isLikelyHttpUrl(ctaUrl)) issues.push("CTA URL invalide.");
    if (!isLikelyInternalOrHttpUrl(aboutPageContent.image_url)) issues.push("Image page A propos invalide.");
    if (!isLikelyInternalOrHttpUrl(servicesPageContent.image_url)) issues.push("Image page Services invalide.");
    if (!isLikelyInternalOrHttpUrl(contactPageContent.image_url)) issues.push("Image page Contact invalide.");
    if (!isLikelyInternalOrHttpUrl(marketplacePageContent.image_url)) issues.push("Image page Marketplace invalide.");
    if (!isLikelyInternalOrHttpUrl(facebookUrl)) issues.push("Lien Facebook invalide.");
    if (!isLikelyInternalOrHttpUrl(instagramUrl)) issues.push("Lien Instagram invalide.");
    if (!isLikelyInternalOrHttpUrl(tiktokUrl)) issues.push("Lien TikTok invalide.");
    for (const block of nativeStudio.blocks) {
      if (block.type !== "cta" || !block.cta_href) continue;
      if (!isLikelyInternalOrHttpUrl(block.cta_href)) {
        issues.push(`Bloc CTA "${block.title || block.id}" contient un lien invalide.`);
      }
    }
    return issues;
  }, [
    coverUrl,
    ctaUrl,
    aboutPageContent.image_url,
    servicesPageContent.image_url,
    contactPageContent.image_url,
    marketplacePageContent.image_url,
    facebookUrl,
    instagramUrl,
    tiktokUrl,
    nativeStudio.blocks,
  ]);
  const blockingLinkIssues = useMemo(
    () =>
      linkAuditIssues.filter(
        (issue) =>
          !issue.toLowerCase().includes("facebook") &&
          !issue.toLowerCase().includes("instagram") &&
          !issue.toLowerCase().includes("tiktok")
      ),
    [linkAuditIssues]
  );
  const accessibilityIssues = useMemo(() => {
    const issues: string[] = [];
    const ratio = contrastRatio(brandPrimaryColor, brandSecondaryColor);
    if (ratio !== null && ratio < 4.5) {
      issues.push(`Contraste principal faible (${ratio.toFixed(2)}:1).`);
    }
    if (!coverUrl) issues.push("Image cover manquante.");
    if (!logoUrl) issues.push("Logo manquant.");
    if (!heroTitle.trim()) issues.push("H1 hero manquant.");
    if (!ctaLabel.trim()) issues.push("CTA label manquant.");
    if (!ctaUrl.trim()) issues.push("CTA URL manquante.");
    if (!aboutPageContent.image_url) issues.push("Image section A propos manquante.");
    if (!servicesPageContent.image_url && showServicesPreview) issues.push("Image section Services manquante.");
    if (!contactPageContent.image_url && showContactPreview) issues.push("Image section Contact manquante.");
    if (!marketplacePageContent.image_url && showMarketplacePreview) issues.push("Image section Marketplace manquante.");
    return issues;
  }, [
    brandPrimaryColor,
    brandSecondaryColor,
    coverUrl,
    logoUrl,
    heroTitle,
    ctaLabel,
    ctaUrl,
    aboutPageContent.image_url,
    servicesPageContent.image_url,
    showServicesPreview,
    contactPageContent.image_url,
    showContactPreview,
    marketplacePageContent.image_url,
    showMarketplacePreview,
  ]);
  const publishChecklistIssues = useMemo(() => {
    const issues: string[] = [];
    if (!slug || slug.trim().length < 3) issues.push("Slug valide requis.");
    if (seoIssues.length > 0) issues.push("SEO incomplet.");
    if (blockingLinkIssues.length > 0) issues.push("Liens invalides a corriger.");
    if (!heroTitle.trim()) issues.push("Hero title requis.");
    if (!contactPhone.trim() && !contactEmail.trim()) issues.push("Ajoutez un contact (tel ou email).");
    return issues;
  }, [slug, seoIssues, blockingLinkIssues, heroTitle, contactPhone, contactEmail]);

  const snapshotPayload = useMemo(
    () =>
      JSON.stringify({
        slug,
        tagline,
        description,
        coverUrl,
        facebookUrl,
        instagramUrl,
        tiktokUrl,
        whatsapp,
        logoUrl,
        heroTitle,
        heroSubtitle,
        aboutTitle,
        servicesText,
        highlightsText,
        serviceAreas,
        languagesSpoken,
        openingTime,
        closingTime,
        contactEmail,
        contactPhone,
        contactAddress,
        ctaLabel,
        ctaUrl,
        customDomain,
        marketplaceTitle,
        seoTitle,
        seoDescription,
        seoKeywords,
        brandPrimaryColor,
        brandSecondaryColor,
        brandAccentColor,
        selectedThemePreset,
        sectionOrder,
        showServicesPreview,
        showHighlightsPreview,
        showContactPreview,
        showMarketplacePreview,
        nativeStudio,
      }),
    [
      slug,
      tagline,
      description,
      coverUrl,
      facebookUrl,
      instagramUrl,
      tiktokUrl,
      whatsapp,
      logoUrl,
      heroTitle,
      heroSubtitle,
      aboutTitle,
      servicesText,
      highlightsText,
      serviceAreas,
      languagesSpoken,
      openingTime,
      closingTime,
      contactEmail,
      contactPhone,
      contactAddress,
      ctaLabel,
      ctaUrl,
      customDomain,
      marketplaceTitle,
      seoTitle,
      seoDescription,
      seoKeywords,
      brandPrimaryColor,
      brandSecondaryColor,
      brandAccentColor,
      selectedThemePreset,
      sectionOrder,
      showServicesPreview,
      showHighlightsPreview,
      showContactPreview,
      showMarketplacePreview,
      nativeStudio,
    ]
  );

  useEffect(() => {
    if (nativeStudio.blocks.length === 0) {
      if (selectedStudioBlockId !== null) setSelectedStudioBlockId(null);
      return;
    }
    if (!selectedStudioBlockId) {
      setSelectedStudioBlockId(nativeStudio.blocks[0]?.id ?? null);
      return;
    }
    const exists = nativeStudio.blocks.some((block) => block.id === selectedStudioBlockId);
    if (!exists) setSelectedStudioBlockId(nativeStudio.blocks[0]?.id ?? null);
  }, [nativeStudio.blocks, selectedStudioBlockId]);

  useEffect(() => {
    snapshotRef.current = snapshotPayload;
  }, [snapshotPayload]);

  useEffect(() => {
    if (!snapshotPayload) return;
    if (!lastUndoSnapshotRef.current) {
      lastUndoSnapshotRef.current = snapshotPayload;
      return;
    }
    if (applyingUndoRedoRef.current) {
      lastUndoSnapshotRef.current = snapshotPayload;
      applyingUndoRedoRef.current = false;
      return;
    }
    if (lastUndoSnapshotRef.current === snapshotPayload) return;
    const previous = lastUndoSnapshotRef.current;
    setUndoStack((prev) => [previous, ...prev].slice(0, 60));
    setRedoStack([]);
    lastUndoSnapshotRef.current = snapshotPayload;
  }, [snapshotPayload]);

  useEffect(() => {
    setNativeStudio((prev) => ({ ...prev, locale_default: contentLocale }));
  }, [contentLocale]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `agency-builder-history:${initial.agencyEmail || initial.agencyName}`;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as BuilderHistoryEntry[];
      if (!Array.isArray(parsed)) return;
      setHistoryEntries(parsed.slice(0, 5));
    } catch {
      // ignore corrupted local draft history
    }
  }, [initial.agencyEmail, initial.agencyName]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `agency-builder-history:${initial.agencyEmail || initial.agencyName}`;
    const interval = window.setInterval(() => {
      const current = snapshotRef.current;
      if (!current) return;
      if (current === lastAutoHashRef.current) return;
      lastAutoHashRef.current = current;

      const entry: BuilderHistoryEntry = {
        id: `auto-${Date.now().toString(36)}`,
        label: "Autosave",
        savedAt: new Date().toISOString(),
        snapshot: current,
      };

      setHistoryEntries((prev) => {
        const next = [entry, ...prev].slice(0, 5);
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // ignore localStorage write errors
        }
        return next;
      });
      setLastAutoSavedAt(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    }, 15000);

    return () => window.clearInterval(interval);
  }, [initial.agencyEmail, initial.agencyName]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const normalized = normalizeSlug(slug);
    if (normalized.length < 3) return;
    const commentsKey = `agency-collab-comments:${normalized}`;
    try {
      const raw = window.localStorage.getItem(commentsKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Array<{
          id: string;
          section: AgencyEditableSectionId;
          text: string;
          at: number;
        }>;
        if (Array.isArray(parsed)) setCollabComments(parsed.slice(0, 30));
      }
    } catch {
      // ignore invalid comments cache
    }

    const channel = new BroadcastChannel(`agency-editor:${normalized}`);
    collabChannelRef.current = channel;

    const emitPresence = () => {
      channel.postMessage({
        type: "presence",
        id: collabIdRef.current,
        at: Date.now(),
      });
    };

    const onMessage = (
      event: MessageEvent<
        | {
            type?: string;
            id?: string;
            at?: number;
          }
        | {
            type?: string;
            comment?: {
              id: string;
              section: AgencyEditableSectionId;
              text: string;
              at: number;
            };
          }
      >
    ) => {
      const payload = event.data as
        | {
            type?: string;
            id?: string;
            at?: number;
          }
        | {
            type?: string;
            comment?: {
              id: string;
              section: AgencyEditableSectionId;
              text: string;
              at: number;
            };
          };
      if (!payload) return;
      if (payload.type === "presence" && "id" in payload && payload.id && payload.id !== collabIdRef.current) {
        const peerId = String(payload.id);
        const activeAt = Number(payload.at || Date.now());
        setCollabPeers((prev) => {
          const others = prev.filter((entry) => entry.id !== peerId);
          return [{ id: peerId, activeAt }, ...others].slice(0, 12);
        });
        return;
      }
      if (payload.type === "comment" && "comment" in payload && payload.comment) {
        setCollabComments((prev) => [payload.comment!, ...prev].slice(0, 30));
      }
    };

    channel.addEventListener("message", onMessage);
    emitPresence();
    const interval = window.setInterval(() => {
      emitPresence();
      const minActiveAt = Date.now() - 40_000;
      setCollabPeers((prev) => prev.filter((entry) => entry.activeAt >= minActiveAt));
    }, 10_000);

    return () => {
      window.clearInterval(interval);
      channel.removeEventListener("message", onMessage);
      channel.close();
      collabChannelRef.current = null;
      setCollabPeers([]);
    };
  }, [slug]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const normalized = normalizeSlug(slug);
    if (normalized.length < 3) return;
    const commentsKey = `agency-collab-comments:${normalized}`;
    try {
      window.localStorage.setItem(commentsKey, JSON.stringify(collabComments.slice(0, 30)));
    } catch {
      // ignore localStorage quota errors
    }
  }, [slug, collabComments]);

  function applyThemePreset(presetId: (typeof THEME_PRESETS)[number]["id"]) {
    const preset = THEME_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    setSelectedThemePreset(preset.id);
    setBrandPrimaryColor(preset.primary);
    setBrandSecondaryColor(preset.secondary);
    setBrandAccentColor(preset.accent);
  }

  function addCollabComment() {
    const text = collabComment.trim();
    if (!text) return;
    const entry = {
      id: `comment-${Date.now().toString(36)}`,
      section: collabSection,
      text: text.slice(0, 220),
      at: Date.now(),
    };
    setCollabComments((prev) => [entry, ...prev].slice(0, 30));
    collabChannelRef.current?.postMessage({
      type: "comment",
      comment: entry,
    });
    setCollabComment("");
  }

  function applySmartTone(tone: "premium" | "friendly" | "investor") {
    if (tone === "premium") {
      setTagline("Excellence immobiliere et execution haut de gamme.");
      setHeroSubtitle("Des strategies premium pour vendre, louer et investir avec precision.");
      setDescription(
        "Notre agence combine expertise locale, design marketing premium et accompagnement juridique pour accelerer vos transactions."
      );
      return;
    }
    if (tone === "friendly") {
      setTagline("Votre partenaire immobilier de confiance.");
      setHeroSubtitle("Une equipe disponible pour vous guider a chaque etape.");
      setDescription(
        "Nous simplifions votre parcours immobilier avec des conseils clairs, un suivi humain et une communication rapide."
      );
      return;
    }
    setTagline("Decision immobiliere pilotee par la data.");
    setHeroSubtitle("Analyse marche, rendement cible et execution orientee KPI.");
    setDescription(
      "Nous structurons vos acquisitions et arbitrages avec une approche orientee performance, securite et rentabilite."
    );
  }

  function syncArabicFromFrench() {
    setNativeStudio((prev) => ({
      ...prev,
      translations: {
        ...prev.translations,
        ar: {
          ...prev.translations.ar,
          hero_title: heroTitle,
          hero_subtitle: heroSubtitle,
          tagline,
          description,
          about_title: aboutTitle,
          cta_label: ctaLabel,
          marketplace_title: marketplaceTitle,
        },
      },
    }));
    setSuccessMsg("Champs AR synchronises depuis FR.");
  }

  function rollbackToPublishedSnapshot() {
    if (!nativeStudio.published_snapshot) {
      setErrorMsg("Aucune version publiee disponible pour rollback.");
      return;
    }
    const snapshot = nativeStudio.published_snapshot;
    setNativeStudio((prev) => ({
      ...prev,
      hero_variant: snapshot.hero_variant,
      card_density: snapshot.card_density,
      section_surface: snapshot.section_surface,
      cta_style: snapshot.cta_style,
      marketplace_columns: snapshot.marketplace_columns,
      card_radius: snapshot.card_radius,
      button_radius: snapshot.button_radius,
      section_spacing: snapshot.section_spacing,
      design_tokens: snapshot.design_tokens,
      page_content: snapshot.page_content,
      blocks: snapshot.blocks,
      trust_badges: snapshot.trust_badges,
      mobile_conversion_rail: snapshot.mobile_conversion_rail,
      publish_state: "draft",
    }));
    setSuccessMsg("Rollback vers la version publiee applique.");
  }

  function addHistoryEntry(label: string) {
    if (typeof window === "undefined") return;
    const key = `agency-builder-history:${initial.agencyEmail || initial.agencyName}`;
    const entry: BuilderHistoryEntry = {
      id: `${label.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}`,
      label,
      savedAt: new Date().toISOString(),
      snapshot: snapshotRef.current,
    };
    setHistoryEntries((prev) => {
      const next = [entry, ...prev].slice(0, 5);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // ignore localStorage write errors
      }
      return next;
    });
  }

  function applySnapshotString(snapshot: string, successLabel?: string) {
    try {
      const parsed = JSON.parse(snapshot) as Record<string, unknown>;
      setSlug(String(parsed.slug ?? ""));
      setTagline(String(parsed.tagline ?? ""));
      setDescription(String(parsed.description ?? ""));
      setCoverUrl(String(parsed.coverUrl ?? ""));
      setFacebookUrl(String(parsed.facebookUrl ?? ""));
      setInstagramUrl(String(parsed.instagramUrl ?? ""));
      setTiktokUrl(String(parsed.tiktokUrl ?? ""));
      setWhatsapp(String(parsed.whatsapp ?? ""));
      setLogoUrl(String(parsed.logoUrl ?? ""));
      setHeroTitle(String(parsed.heroTitle ?? ""));
      setHeroSubtitle(String(parsed.heroSubtitle ?? ""));
      setAboutTitle(String(parsed.aboutTitle ?? "A propos"));
      setServicesText(String(parsed.servicesText ?? ""));
      setHighlightsText(String(parsed.highlightsText ?? ""));
      setServiceAreas(String(parsed.serviceAreas ?? ""));
      setLanguagesSpoken(String(parsed.languagesSpoken ?? ""));
      setOpeningTime(String(parsed.openingTime ?? "09:00"));
      setClosingTime(String(parsed.closingTime ?? "18:00"));
      setContactEmail(String(parsed.contactEmail ?? ""));
      setContactPhone(String(parsed.contactPhone ?? ""));
      setContactAddress(String(parsed.contactAddress ?? ""));
      setCtaLabel(String(parsed.ctaLabel ?? "Nous contacter"));
      setCtaUrl(String(parsed.ctaUrl ?? ""));
      setCustomDomain(String(parsed.customDomain ?? ""));
      setMarketplaceTitle(String(parsed.marketplaceTitle ?? ""));
      setSeoTitle(String(parsed.seoTitle ?? ""));
      setSeoDescription(String(parsed.seoDescription ?? ""));
      setSeoKeywords(String(parsed.seoKeywords ?? ""));
      setBrandPrimaryColor(String(parsed.brandPrimaryColor ?? "#0f172a"));
      setBrandSecondaryColor(String(parsed.brandSecondaryColor ?? "#f8fafc"));
      setBrandAccentColor(String(parsed.brandAccentColor ?? "#d4af37"));
      setSelectedThemePreset((parsed.selectedThemePreset as (typeof THEME_PRESETS)[number]["id"] | "") || "");
      setSectionOrder(normalizeSectionOrder(parsed.sectionOrder));
      setShowServicesPreview(Boolean(parsed.showServicesPreview));
      setShowHighlightsPreview(Boolean(parsed.showHighlightsPreview));
      setShowContactPreview(Boolean(parsed.showContactPreview));
      setShowMarketplacePreview(Boolean(parsed.showMarketplacePreview));
      setNativeStudio(normalizeAgencyNativeStudioPayload(parsed.nativeStudio));
      if (successLabel) setSuccessMsg(successLabel);
      setErrorMsg(null);
    } catch {
      setErrorMsg("Impossible de restaurer cette version.");
    }
  }

  function restoreHistoryEntry(entry: BuilderHistoryEntry) {
    applySnapshotString(
      entry.snapshot,
      `Version restauree (${new Date(entry.savedAt).toLocaleString("fr-FR")}).`
    );
  }

  function undoLastChange() {
    if (!undoStack.length) return;
    const [target, ...rest] = undoStack;
    applyingUndoRedoRef.current = true;
    setRedoStack((prev) => [snapshotRef.current, ...prev].slice(0, 60));
    setUndoStack(rest);
    applySnapshotString(target, "Annulation appliquee.");
  }

  function redoLastUndo() {
    if (!redoStack.length) return;
    const [target, ...rest] = redoStack;
    applyingUndoRedoRef.current = true;
    setUndoStack((prev) => [snapshotRef.current, ...prev].slice(0, 60));
    setRedoStack(rest);
    applySnapshotString(target, "Retablissement applique.");
  }

  function toggleSidebarPanel(panelKey: SidebarPanelKey) {
    setOpenSidebarPanels((prev) => ({
      ...prev,
      [panelKey]: !prev[panelKey],
    }));
  }

  function setDetailsPanelOpen(panelKey: DetailsPanelKey, isOpen: boolean) {
    setOpenDetailsPanels({
      identity: isOpen && panelKey === "identity",
      content: isOpen && panelKey === "content",
      contact: isOpen && panelKey === "contact",
      branding: isOpen && panelKey === "branding",
    });
  }

  function closeAllDetailsPanels() {
    setOpenDetailsPanels({
      identity: false,
      content: false,
      contact: false,
      branding: false,
    });
    setPreviewEditingSection(null);
  }

  function toggleDetailsPanel(panelKey: DetailsPanelKey) {
    const isCurrentlyOpen = openDetailsPanels[panelKey];
    setDetailsPanelOpen(panelKey, !isCurrentlyOpen);
  }

  function focusDetailsPanel(panelKey: DetailsPanelKey) {
    setDetailsPanelOpen(panelKey, true);
  }

  useEffect(() => {
    if (typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    if (isAnyDetailsModalOpen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isAnyDetailsModalOpen]);

  useEffect(() => {
    if (!isAnyDetailsModalOpen || typeof window === "undefined") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAllDetailsPanels();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isAnyDetailsModalOpen]);

  useEffect(() => {
    if (!isCommandPaletteOpen) return;
    const timeout = window.setTimeout(() => {
      commandInputRef.current?.focus();
      commandInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [isCommandPaletteOpen]);

  useEffect(() => {
    if (!isCommandPaletteOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeCommandPalette();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setCommandActiveIndex((prev) =>
          filteredCommandPaletteItems.length === 0
            ? 0
            : Math.min(filteredCommandPaletteItems.length - 1, prev + 1)
        );
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setCommandActiveIndex((prev) => Math.max(0, prev - 1));
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        runCommandPaletteItem(filteredCommandPaletteItems[commandActiveIndex]);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    isCommandPaletteOpen,
    filteredCommandPaletteItems,
    commandActiveIndex,
    closeCommandPalette,
    runCommandPaletteItem,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const allowedSections: AgencyEditableSectionId[] = [
      "hero",
      "about",
      "services",
      "marketplace",
      "contact",
      "cta",
      "testimonials",
    ];
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const payload = event.data as
        | {
            type?: string;
            section?: string;
            action?: string;
            fromSection?: string;
            selectionKind?: "section" | "component";
            componentType?: "text" | "button" | "image";
            selectKind?: "section" | "component" | "slot";
            selectId?: string;
            selectType?: string;
            selectPath?: string;
            slot?: string;
            openInspector?: boolean;
          }
        | null;
      if (!payload) return;
      if (!payload.section || !allowedSections.includes(payload.section as AgencyEditableSectionId)) {
        return;
      }
      const section = payload.section as AgencyEditableSectionId;
      if (payload.type === "agency-preview-selection") {
        const shouldFocusInspector = payload.openInspector === true;
        const shouldSelectComponent = payload.selectionKind === "component";
        const pathSegments =
          typeof payload.selectPath === "string"
            ? payload.selectPath
                .split(".")
                .map((segment) => segment.trim())
                .filter(Boolean)
            : [];
        let componentSelected = false;

        if (shouldSelectComponent && pathSegments.length > 0) {
          const kind = pathSegments[0];
          const rawIndex = pathSegments[1];
          const parsedIndex = Number(rawIndex);
          const index = Number.isFinite(parsedIndex) ? parsedIndex : -1;

          if (kind === "servicesItems" && index >= 0 && index < servicesList.length) {
            dispatchSelection({
              type: "select-component",
              componentId: `services-item-${index}`,
              path: ["servicesItems", String(index)],
            });
            componentSelected = true;
          } else if (kind === "highlightsItems" && index >= 0 && index < highlightsList.length) {
            dispatchSelection({
              type: "select-component",
              componentId: `highlight-item-${index}`,
              path: ["highlightsItems", String(index)],
            });
            componentSelected = true;
          } else if (kind === "galleryItems" && index >= 0 && index < galleryItems.length) {
            dispatchSelection({
              type: "select-component",
              componentId: galleryItems[index]?.id || payload.selectId || `gallery-item-${index}`,
              path: ["galleryItems", String(index)],
            });
            componentSelected = true;
          } else if (kind === "blocks" && pathSegments[1]) {
            const blockId = pathSegments[1];
            const block = nativeStudio.blocks.find((entry) => entry.id === blockId);
            if (block) {
              dispatchSelection({
                type: "select-component",
                componentId: blockId,
                path: ["blocks", blockId],
              });
              componentSelected = true;
            }
          } else if (
            kind === "hero" ||
            kind === "about" ||
            kind === "services" ||
            kind === "marketplace" ||
            kind === "contact" ||
            kind === "cta" ||
            kind === "testimonials"
          ) {
            dispatchSelection({ type: "select-section", sectionId: kind, path: pathSegments });
            componentSelected = true;
          }
        }

        if (!componentSelected && shouldSelectComponent && payload.componentType === "text") {
          if (section === "services" && servicesList.length > 0) {
            dispatchSelection({
              type: "select-component",
              componentId: "services-item-0",
              path: ["servicesItems", "0"],
            });
            componentSelected = true;
          } else if (section === "testimonials" && highlightsList.length > 0) {
            dispatchSelection({
              type: "select-component",
              componentId: "highlight-item-0",
              path: ["highlightsItems", "0"],
            });
            componentSelected = true;
          } else if (section === "marketplace" && galleryItems.length > 0) {
            dispatchSelection({
              type: "select-component",
              componentId: galleryItems[0]?.id || "gallery-item-0",
              path: ["galleryItems", "0"],
            });
            componentSelected = true;
          }
        }

        if (!componentSelected && shouldSelectComponent && payload.componentType === "image") {
          if (section === "marketplace" && galleryItems.length > 0) {
            dispatchSelection({
              type: "select-component",
              componentId: galleryItems[0]?.id || "gallery-item-0",
              path: ["galleryItems", "0"],
            });
            componentSelected = true;
          }
        }

        if (!componentSelected) {
          dispatchSelection({ type: "select-section", sectionId: section });
        }

        setStyleInspectorSection(section);
        setPreviewEditingSection(null);
        if (shouldFocusInspector && typeof window !== "undefined") {
          if (inspectorFocusTimerRef.current) {
            window.clearTimeout(inspectorFocusTimerRef.current);
            inspectorFocusTimerRef.current = null;
          }
          setIsInspectorFocusedFlash(true);
          window.setTimeout(() => {
            inspectorPanelRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }, 0);
          inspectorFocusTimerRef.current = window.setTimeout(() => {
            setIsInspectorFocusedFlash(false);
            inspectorFocusTimerRef.current = null;
          }, 900);
        }
        return;
      }
      if (payload.type !== "agency-preview-section-action") return;
      const action = (payload.action || "edit") as AgencyPreviewSectionAction;
      const fromSection = payload.fromSection as AgencyEditableSectionId | undefined;
      previewActionRef.current(section, action, fromSection);
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [servicesList, highlightsList, galleryItems, nativeStudio.blocks]);

  const syncRealPreviewSelection = useCallback(() => {
    const frame = realPreviewFrameRef.current;
    if (!frame?.contentWindow || typeof window === "undefined") return;
    frame.contentWindow.postMessage(
      {
        type: "agency-preview-sync-selection",
        section: selectedRealPreviewSection,
        componentType: selectedRealPreviewComponentType,
        selectPath: selectedRealPreviewPath,
      },
      window.location.origin
    );
  }, [selectedRealPreviewSection, selectedRealPreviewComponentType, selectedRealPreviewPath]);

  useEffect(() => {
    syncRealPreviewSelection();
  }, [syncRealPreviewSelection, previewRenderer, previewSplitCompare, previewReloadNonce]);

  useEffect(() => {
    if (!inspectorSchema) {
      setInspectorErrors({});
      return;
    }

    try {
      if (selection.selectedKind === "page") {
        inspectorValidators.page.parse({
          slug,
          seoTitle,
          seoDescription,
        });
      } else if (selectedSectionId === "hero") {
        inspectorValidators.hero.parse({
          headline: heroTitle,
          subheadline: tagline,
          ctaLabel,
          ctaHref: ctaUrl,
          imageUrl: coverUrl,
          imageAlt: nativeStudio.hero_image_alt,
          imageFocalX: nativeStudio.hero_image_focal_x,
          imageFocalY: nativeStudio.hero_image_focal_y,
        });
      } else if (
        selectedSectionId === "about" ||
        selectedSectionId === "services" ||
        selectedSectionId === "contact" ||
        selectedSectionId === "marketplace"
      ) {
        inspectorValidators.section.parse(nativeStudio.page_content[selectedSectionId]);
      } else if (selectedComponentKind === "servicesItems" || selectedComponentKind === "highlightsItems") {
        inspectorValidators.featureItem.parse(inspectorValues);
      } else if (selectedGalleryItem) {
        inspectorValidators.galleryItem.parse({
          title: selectedGalleryItem.title,
          body: selectedGalleryItem.body,
          image_url: selectedGalleryItem.image_url,
          image_alt: selectedGalleryItem.image_alt,
          cta_href: selectedGalleryItem.cta_href,
        });
      }
      setInspectorErrors({});
    } catch (error) {
      if (error && typeof error === "object" && "issues" in error) {
        setInspectorErrors(zodErrorsToMap(error as never));
      }
    }
  }, [
    inspectorSchema,
    selection.selectedKind,
    selectedSectionId,
    selectedComponentKind,
    selectedGalleryItem,
    slug,
    seoTitle,
    seoDescription,
    heroTitle,
    tagline,
    ctaLabel,
    ctaUrl,
    coverUrl,
    nativeStudio.hero_image_alt,
    nativeStudio.hero_image_focal_x,
    nativeStudio.hero_image_focal_y,
    nativeStudio.page_content,
    inspectorValues,
  ]);

  const focusDesignInspectorPanel = useCallback(() => {
    if (typeof window === "undefined") return;
    if (inspectorFocusTimerRef.current) {
      window.clearTimeout(inspectorFocusTimerRef.current);
      inspectorFocusTimerRef.current = null;
    }
    setIsInspectorFocusedFlash(true);
    window.setTimeout(() => {
      inspectorPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
    inspectorFocusTimerRef.current = window.setTimeout(() => {
      setIsInspectorFocusedFlash(false);
      inspectorFocusTimerRef.current = null;
    }, 900);
  }, []);

  function selectSection(
    section: InspectorSectionId,
    options?: { focusInspector?: boolean; path?: string[] }
  ) {
    dispatchSelection({ type: "select-section", sectionId: section, path: options?.path });
    setStyleInspectorSection(section);
    setPreviewEditingSection(null);
    if (options?.focusInspector) {
      focusDesignInspectorPanel();
    }
  }

  function selectComponent(
    componentId: string,
    path: string[],
    options?: { focusInspector?: boolean }
  ) {
    dispatchSelection({ type: "select-component", componentId, path });
    setPreviewEditingSection(null);
    if (options?.focusInspector) {
      focusDesignInspectorPanel();
    }
  }

  function clearCanvasSelection() {
    dispatchSelection({ type: "select-page", pageId: "home" });
    setPreviewEditingSection(null);
  }

  function updateServicesItems(updater: (items: string[]) => string[]) {
    const next = updater([...servicesList]).filter(Boolean).slice(0, 12);
    setServicesText(next.join("\n"));
  }

  function updateHighlightsItems(updater: (items: string[]) => string[]) {
    const next = updater([...highlightsList]).filter(Boolean).slice(0, 12);
    setHighlightsText(next.join("\n"));
  }

  function updateGalleryItemByIndex(index: number, patch: Partial<AgencyNativeStudioBlock>) {
    const item = galleryItems[index];
    if (!item) return;
    updateNativeStudioBlock(item.id, patch);
  }

  function addGalleryItem() {
    const block = createNativeStudioBlock("text", "marketplace");
    block.title = "Nouveau bien";
    block.body = "Description du bien";
    setNativeStudio((prev) => ({ ...prev, blocks: [...prev.blocks, block].slice(0, 24) }));
    selectComponent(block.id, ["galleryItems", String(galleryItems.length)]);
  }

  function moveGalleryItem(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0) return;
    const source = galleryItems[index];
    const target = galleryItems[targetIndex];
    if (!source || !target) return;
    setNativeStudio((prev) => {
      const blocks = [...prev.blocks];
      const from = blocks.findIndex((item) => item.id === source.id);
      const to = blocks.findIndex((item) => item.id === target.id);
      if (from < 0 || to < 0) return prev;
      const [moved] = blocks.splice(from, 1);
      blocks.splice(to, 0, moved);
      return { ...prev, blocks };
    });
  }

  function removeGalleryItem(index: number) {
    const item = galleryItems[index];
    if (!item) return;
    removeNativeStudioBlock(item.id);
    clearCanvasSelection();
  }

  function duplicateGalleryItem(index: number) {
    const item = galleryItems[index];
    if (!item) return;
    const duplicateId = `native-block-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const duplicate: AgencyNativeStudioBlock = {
      ...item,
      id: duplicateId,
      title: item.title ? `${item.title} (copy)` : "Copy",
    };
    setNativeStudio((prev) => {
      const sourceIndex = prev.blocks.findIndex((block) => block.id === item.id);
      if (sourceIndex < 0) return prev;
      const blocks = [...prev.blocks];
      blocks.splice(sourceIndex + 1, 0, duplicate);
      return { ...prev, blocks: blocks.slice(0, 36) };
    });
    selectComponent(duplicateId, ["galleryItems", String(index + 1)]);
  }

  function reorderSectionsByDrag(target: SectionOrderKey) {
    if (!canvasDragState || canvasDragState.kind !== "section") return;
    const source = canvasDragState.section;
    if (source === target) return;
    setSectionOrder((prev) => {
      const next = [...prev];
      const fromIndex = next.indexOf(source);
      const toIndex = next.indexOf(target);
      if (fromIndex < 0 || toIndex < 0) return prev;
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, source);
      return next;
    });
    setCanvasDragState(null);
  }

  function reorderTextItems(
    sourceItems: string[],
    fromIndex: number,
    toIndex: number
  ) {
    const next = [...sourceItems];
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= next.length || toIndex >= next.length) {
      return next;
    }
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved || "");
    return next;
  }

  function reorderGalleryItems(fromIndex: number, toIndex: number) {
    const source = galleryItems[fromIndex];
    const target = galleryItems[toIndex];
    if (!source || !target) return;
    setNativeStudio((prev) => {
      const blocks = [...prev.blocks];
      const sourcePos = blocks.findIndex((item) => item.id === source.id);
      const targetPos = blocks.findIndex((item) => item.id === target.id);
      if (sourcePos < 0 || targetPos < 0) return prev;
      const [moved] = blocks.splice(sourcePos, 1);
      blocks.splice(targetPos, 0, moved);
      return { ...prev, blocks };
    });
  }

  function onCanvasItemDrop(
    kind: Exclude<CanvasDragState["kind"], "section">,
    targetIndex: number
  ) {
    if (!canvasDragState || canvasDragState.kind !== kind) return;
    const fromIndex = canvasDragState.index;
    if (fromIndex === targetIndex) return;
    if (kind === "servicesItems") {
      updateServicesItems((items) => reorderTextItems(items, fromIndex, targetIndex));
      setCanvasDragState(null);
      return;
    }
    if (kind === "highlightsItems") {
      updateHighlightsItems((items) => reorderTextItems(items, fromIndex, targetIndex));
      setCanvasDragState(null);
      return;
    }
    if (kind === "galleryItems") {
      reorderGalleryItems(fromIndex, targetIndex);
      setCanvasDragState(null);
    }
  }

  function handleInspectorArrayAdd(key: string) {
    if (key === "servicesItems") {
      updateServicesItems((items) => [...items, "Nouveau service"]);
      return;
    }
    if (key === "highlightsItems") {
      updateHighlightsItems((items) => [...items, "Nouveau point fort"]);
      return;
    }
    if (key === "galleryItems") {
      addGalleryItem();
    }
  }

  function handleInspectorArrayRemove(key: string, index: number) {
    if (key === "servicesItems") {
      updateServicesItems((items) => items.filter((_, itemIndex) => itemIndex !== index));
      return;
    }
    if (key === "highlightsItems") {
      updateHighlightsItems((items) => items.filter((_, itemIndex) => itemIndex !== index));
      return;
    }
    if (key === "galleryItems") {
      removeGalleryItem(index);
    }
  }

  function handleInspectorArrayMove(key: string, index: number, direction: "up" | "down") {
    const move = (items: string[]) => {
      const next = [...items];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return next;
      const swap = next[target];
      next[target] = next[index] || "";
      next[index] = swap || "";
      return next;
    };
    if (key === "servicesItems") {
      updateServicesItems(move);
      return;
    }
    if (key === "highlightsItems") {
      updateHighlightsItems(move);
      return;
    }
    if (key === "galleryItems") {
      moveGalleryItem(index, direction);
    }
  }

  function handleInspectorArraySelect(key: string, index: number) {
    if (key === "servicesItems") {
      selectComponent(`services-item-${index}`, ["servicesItems", String(index)]);
      return;
    }
    if (key === "highlightsItems") {
      selectComponent(`highlights-item-${index}`, ["highlightsItems", String(index)]);
      return;
    }
    if (key === "galleryItems") {
      const item = galleryItems[index];
      if (!item) return;
      selectComponent(item.id, ["galleryItems", String(index)]);
    }
  }

  function handleInspectorChange(path: string, value: unknown) {
    setInspectorSaveError(null);
    if (path === "brandPrimaryColor") {
      setBrandPrimaryColor(String(value ?? ""));
      return;
    }
    if (path === "brandSecondaryColor") {
      setBrandSecondaryColor(String(value ?? ""));
      return;
    }
    if (path === "brandAccentColor") {
      setBrandAccentColor(String(value ?? ""));
      return;
    }
    if (path === "headingFont") {
      updateNativeStudioDesignSystem(
        "heading_font",
        String(value ?? "playfair") as AgencyNativeStudioPayload["design_system"]["heading_font"]
      );
      return;
    }
    if (path === "bodyFont") {
      updateNativeStudioDesignSystem(
        "body_font",
        String(value ?? "manrope") as AgencyNativeStudioPayload["design_system"]["body_font"]
      );
      return;
    }
    if (path === "shadowIntensity") {
      updateNativeStudioDesignSystem(
        "shadow_intensity",
        String(value ?? "medium") as AgencyNativeStudioPayload["design_system"]["shadow_intensity"]
      );
      return;
    }
    if (path === "motionLevel") {
      updateNativeStudioDesignToken(
        "motion_level",
        String(value ?? "subtle") as AgencyNativeStudioPayload["design_tokens"]["motion_level"]
      );
      return;
    }
    if (path === "containerWidth") {
      updateNativeStudioDesignToken(
        "container_width",
        String(value ?? "normal") as AgencyNativeStudioPayload["design_tokens"]["container_width"]
      );
      return;
    }
    if (path === "fontSizeScale") {
      const step = scaleIndexToStep(
        Number(value ?? 1),
        TYPOGRAPHY_SCALE_STEPS
      ) as AgencyNativeStudioPayload["responsive_overrides"]["mobile"]["typography_scale"];
      updateNativeStudioResponsiveOverride(previewDevice, "typography_scale", step);
      return;
    }
    if (path === "sectionSpacingScale") {
      const step = scaleIndexToStep(
        Number(value ?? 1),
        SPACING_SCALE_STEPS
      ) as AgencyNativeStudioPayload["responsive_overrides"]["mobile"]["section_spacing"];
      updateNativeStudioResponsiveOverride(previewDevice, "section_spacing", step);
      return;
    }
    if (path === "cardRadius") {
      updateNativeStudio(
        "card_radius",
        String(value ?? "xl") as AgencyNativeStudioPayload["card_radius"]
      );
      return;
    }
    if (path === "buttonRadius") {
      updateNativeStudio(
        "button_radius",
        String(value ?? "xl") as AgencyNativeStudioPayload["button_radius"]
      );
      return;
    }
    if (path === "heroVariant") {
      updateNativeStudio(
        "hero_variant",
        String(value ?? "classic") as AgencyNativeStudioPayload["hero_variant"]
      );
      return;
    }
    if (selection.selectedKind === "page") {
      if (path === "slug") setSlug(String(value ?? ""));
      if (path === "seoTitle") setSeoTitle(String(value ?? ""));
      if (path === "seoDescription") setSeoDescription(String(value ?? ""));
      if (path === "publishState") {
        updateNativeStudio(
          "publish_state",
          String(value ?? "draft") as AgencyNativeStudioPayload["publish_state"]
        );
      }
      return;
    }

    if (selectedSectionId === "hero") {
      if (path === "headline") setHeroTitle(String(value ?? ""));
      if (path === "subheadline") setTagline(String(value ?? ""));
      if (path === "description") setHeroSubtitle(String(value ?? ""));
      if (path === "ctaLabel") setCtaLabel(String(value ?? ""));
      if (path === "ctaHref") setCtaUrl(String(value ?? ""));
      if (path === "imageUrl") setCoverUrl(String(value ?? ""));
      if (path === "imageAlt") updateNativeStudio("hero_image_alt", String(value ?? ""));
      if (path === "imageFocalX") updateNativeStudio("hero_image_focal_x", Number(value ?? 50));
      if (path === "imageFocalY") updateNativeStudio("hero_image_focal_y", Number(value ?? 50));
      return;
    }

    if (
      selectedSectionId === "about" ||
      selectedSectionId === "services" ||
      selectedSectionId === "contact" ||
      selectedSectionId === "marketplace"
    ) {
      if (path === "servicesItems" || path === "highlightsItems" || path === "galleryItems") return;
      const currentContent = nativeStudio.page_content[selectedSectionId];
      const nextContent = setByPath(currentContent, path, value) as NativeStudioPageEntry;
      setNativeStudio((prev) => ({
        ...prev,
        page_content: {
          ...prev.page_content,
          [selectedSectionId]: nextContent,
        },
      }));
      return;
    }

    if (selectedSectionId === "cta") {
      if (path === "ctaLabel") setCtaLabel(String(value ?? ""));
      if (path === "ctaHref") setCtaUrl(String(value ?? ""));
      if (path === "ctaStyle") {
        updateNativeStudio("cta_style", String(value) as AgencyNativeStudioPayload["cta_style"]);
      }
      return;
    }

    if (selectedSectionId === "testimonials") return;

    if (selectedComponentKind === "servicesItems" && selectedComponentIndex >= 0) {
      if (path === "label") {
        updateServicesItems((items) =>
          items.map((item, index) => (index === selectedComponentIndex ? String(value ?? "") : item))
        );
      }
      return;
    }

    if (selectedComponentKind === "highlightsItems" && selectedComponentIndex >= 0) {
      if (path === "label") {
        updateHighlightsItems((items) =>
          items.map((item, index) => (index === selectedComponentIndex ? String(value ?? "") : item))
        );
      }
      return;
    }

    if (selectedGalleryItem) {
      updateGalleryItemByIndex(selectedComponentIndex, {
        [path]: typeof value === "string" ? value : String(value ?? ""),
      });
    }
  }

  async function handleInspectorImagePick(path: string, file: File | null) {
    if (!file) return;
    if (selection.selectedKind === "section" && selectedSectionId === "hero" && path === "imageUrl") {
      await onQuickMediaPicked("hero", file);
      return;
    }
    if (
      selection.selectedKind === "section" &&
      (selectedSectionId === "about" ||
        selectedSectionId === "services" ||
        selectedSectionId === "contact" ||
        selectedSectionId === "marketplace") &&
      path === "image_url"
    ) {
      await onQuickMediaPicked(selectedSectionId, file);
      return;
    }
    if (selectedGalleryItem && path === "image_url") {
      setPreviewMediaUploading(true);
      setErrorMsg(null);
      try {
        const url = await uploadCoverFile(file);
        updateGalleryItemByIndex(selectedComponentIndex, { image_url: url });
      } catch (error: unknown) {
        setErrorMsg(error instanceof Error ? error.message : "Upload media impossible.");
      } finally {
        setPreviewMediaUploading(false);
      }
    }
  }

  const persistInspectorDraft = useCallback(async () => {
    const normalizedSlug = normalizeSlug(slug);
    if (normalizedSlug.length < 3) return;
    setIsInspectorSaving(true);
    setInspectorSaveError(null);
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
        custom_domain: toOptional(normalizeCustomDomainInput(customDomain)),
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
        builder_type: "native",
        builder_payload: nativeStudio,
      }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setInspectorSaveError(payload?.error || "Autosave impossible.");
      setIsInspectorSaving(false);
      return;
    }
    setInspectorLastSavedAt(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    if (previewRenderer === "real") {
      const now = Date.now();
      if (now - lastRealPreviewRefreshAtRef.current > 900) {
        lastRealPreviewRefreshAtRef.current = now;
        setPreviewReloadNonce((prev) => prev + 1);
      }
    }
    setIsInspectorSaving(false);
  }, [
    slug,
    tagline,
    description,
    coverUrl,
    facebookUrl,
    instagramUrl,
    tiktokUrl,
    whatsapp,
    heroTitle,
    heroSubtitle,
    aboutTitle,
    servicesList,
    highlightsList,
    serviceAreas,
    languagesSpoken,
    businessHoursPrefix,
    openingTime,
    closingTime,
    contactEmail,
    contactPhone,
    contactAddress,
    ctaLabel,
    ctaUrl,
    customDomain,
    marketplaceTitle,
    seoTitle,
    seoDescription,
    seoKeywords,
    brandPrimaryColor,
    brandSecondaryColor,
    brandAccentColor,
    selectedThemePreset,
    showServicesPreview,
    showHighlightsPreview,
    showContactPreview,
    showMarketplacePreview,
    sectionOrder,
    nativeStudio,
    previewRenderer,
  ]);

  useEffect(() => {
    if (skipNextInspectorAutosaveRef.current) {
      skipNextInspectorAutosaveRef.current = false;
      return;
    }
    const timeout = window.setTimeout(() => {
      void persistInspectorDraft();
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [persistInspectorDraft]);

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as EventTarget | null;
      const targetElement = target instanceof HTMLElement ? target : null;
      const isTypingTarget =
        targetElement instanceof HTMLInputElement ||
        targetElement instanceof HTMLTextAreaElement ||
        targetElement instanceof HTMLSelectElement ||
        Boolean(targetElement?.isContentEditable);
      const key = event.key.toLowerCase();
      const wantsPaletteShortcut = (event.metaKey || event.ctrlKey) && !event.altKey && key === "k";

      if (isCommandPaletteOpen && !wantsPaletteShortcut) return;

      const wantsZoomShortcut = (event.metaKey || event.ctrlKey) && !event.altKey;
      if (wantsZoomShortcut) {
        const toggleCommandPalette = key === "k";
        const applyZoomIn = key === "+" || key === "=" || key === "add";
        const applyZoomOut = key === "-" || key === "_" || key === "subtract";
        const resetZoom = key === "0";

        if (toggleCommandPalette) {
          event.preventDefault();
          if (isCommandPaletteOpen) closeCommandPalette();
          else openCommandPalette();
          return;
        }

        if (applyZoomIn || applyZoomOut || resetZoom) {
          event.preventDefault();
          if (previewRenderer === "real") {
            if (applyZoomIn) setRealZoomPreset((prev) => nudgePreviewZoomPreset(prev, "in"));
            if (applyZoomOut) setRealZoomPreset((prev) => nudgePreviewZoomPreset(prev, "out"));
            if (resetZoom) setRealZoomPreset(100);
          } else {
            if (applyZoomIn) setCanvasZoomPreset((prev) => nudgePreviewZoomPreset(prev, "in"));
            if (applyZoomOut) setCanvasZoomPreset((prev) => nudgePreviewZoomPreset(prev, "out"));
            if (resetZoom) setCanvasZoomPreset(100);
          }
          return;
        }
      }

      const wantsSaveShortcut = (event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "s";
      if (wantsSaveShortcut) {
        event.preventDefault();
        void persistInspectorDraft();
        return;
      }

      if (isTypingTarget) return;

      const wantsDuplicateShortcut =
        (event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "d";
      if (wantsDuplicateShortcut) {
        event.preventDefault();
        if (selection.selectedKind === "section" && selectedSectionId) {
          applyPreviewSectionAction(selectedSectionId, "duplicate");
          return;
        }
        if (selection.selectedKind === "component") {
          if (selectedComponentKind === "servicesItems" && selectedComponentIndex >= 0) {
            updateServicesItems((items) => {
              const source = items[selectedComponentIndex] || "Nouveau service";
              const next = [...items];
              next.splice(selectedComponentIndex + 1, 0, source);
              return next;
            });
            selectComponent(
              `services-item-${selectedComponentIndex + 1}`,
              ["servicesItems", String(selectedComponentIndex + 1)]
            );
            return;
          }
          if (selectedComponentKind === "highlightsItems" && selectedComponentIndex >= 0) {
            updateHighlightsItems((items) => {
              const source = items[selectedComponentIndex] || "Nouveau point fort";
              const next = [...items];
              next.splice(selectedComponentIndex + 1, 0, source);
              return next;
            });
            selectComponent(
              `highlights-item-${selectedComponentIndex + 1}`,
              ["highlightsItems", String(selectedComponentIndex + 1)]
            );
            return;
          }
          if (selectedComponentKind === "galleryItems" && selectedComponentIndex >= 0) {
            duplicateGalleryItem(selectedComponentIndex);
          }
        }
        return;
      }

      const wantsReorderShortcut =
        event.altKey && !event.ctrlKey && !event.metaKey && (event.key === "ArrowUp" || event.key === "ArrowDown");
      if (wantsReorderShortcut) {
        event.preventDefault();
        const direction = event.key === "ArrowUp" ? "up" : "down";
        if (selection.selectedKind === "section" && selectedSectionId) {
          applyPreviewSectionAction(selectedSectionId, direction === "up" ? "move-up" : "move-down");
          return;
        }
        if (selection.selectedKind === "component" && selectedComponentIndex >= 0) {
          if (selectedComponentKind === "servicesItems") {
            handleInspectorArrayMove("servicesItems", selectedComponentIndex, direction);
            return;
          }
          if (selectedComponentKind === "highlightsItems") {
            handleInspectorArrayMove("highlightsItems", selectedComponentIndex, direction);
            return;
          }
          if (selectedComponentKind === "galleryItems") {
            handleInspectorArrayMove("galleryItems", selectedComponentIndex, direction);
          }
        }
        return;
      }

      if (event.key === "Escape") {
        setInlineEditingPath(null);
        clearCanvasSelection();
      }
      if (event.key !== "Delete") return;
      if (selection.selectedKind === "section" && selectedSectionId) {
        const confirmed = window.confirm("Supprimer/reinitialiser cette section ?");
        if (!confirmed) return;
        applyPreviewSectionAction(selectedSectionId, "delete");
        clearCanvasSelection();
        return;
      }
      if (selection.selectedKind === "component") {
        const confirmed = window.confirm("Supprimer cet element ?");
        if (!confirmed) return;
        if (selectedComponentKind === "servicesItems" && selectedComponentIndex >= 0) {
          updateServicesItems((items) => items.filter((_, index) => index !== selectedComponentIndex));
          clearCanvasSelection();
          return;
        }
        if (selectedComponentKind === "highlightsItems" && selectedComponentIndex >= 0) {
          updateHighlightsItems((items) => items.filter((_, index) => index !== selectedComponentIndex));
          clearCanvasSelection();
          return;
        }
        if (selectedComponentKind === "galleryItems" && selectedComponentIndex >= 0) {
          removeGalleryItem(selectedComponentIndex);
          clearCanvasSelection();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    selection.selectedKind,
    selectedSectionId,
    selectedComponentKind,
    selectedComponentIndex,
    previewRenderer,
    isCommandPaletteOpen,
    persistInspectorDraft,
  ]);
  /* eslint-enable react-hooks/exhaustive-deps */

  function updateNativeStudio<K extends keyof AgencyNativeStudioPayload>(
    key: K,
    value: AgencyNativeStudioPayload[K]
  ) {
    setNativeStudio((prev) => ({ ...prev, [key]: value }));
  }

  function updateNativeStudioDesignToken(
    key: keyof AgencyNativeStudioPayload["design_tokens"],
    value: AgencyNativeStudioPayload["design_tokens"][keyof AgencyNativeStudioPayload["design_tokens"]]
  ) {
    setNativeStudio((prev) => ({
      ...prev,
      design_tokens: {
        ...prev.design_tokens,
        [key]: value,
      },
    }));
  }

  function updateNativeStudioDesignSystem(
    key: keyof AgencyNativeStudioPayload["design_system"],
    value: AgencyNativeStudioPayload["design_system"][keyof AgencyNativeStudioPayload["design_system"]]
  ) {
    setNativeStudio((prev) => ({
      ...prev,
      design_system: {
        ...prev.design_system,
        [key]: value,
      },
    }));
  }

  function updateNativeStudioResponsiveOverride(
    device: keyof AgencyNativeStudioPayload["responsive_overrides"],
    key: keyof AgencyNativeStudioPayload["responsive_overrides"]["mobile"],
    value: AgencyNativeStudioPayload["responsive_overrides"]["mobile"][keyof AgencyNativeStudioPayload["responsive_overrides"]["mobile"]]
  ) {
    setNativeStudio((prev) => ({
      ...prev,
      responsive_overrides: {
        ...prev.responsive_overrides,
        [device]: {
          ...prev.responsive_overrides[device],
          [key]: value,
        },
      },
    }));
  }

  function updateTrustBadges(raw: string) {
    const badges = parseLines(raw).slice(0, 10);
    setNativeStudio((prev) => ({ ...prev, trust_badges: badges }));
  }

  function updateArabicTranslation(
    key: keyof AgencyNativeStudioPayload["translations"]["ar"],
    value: string
  ) {
    setNativeStudio((prev) => ({
      ...prev,
      translations: {
        ...prev.translations,
        ar: {
          ...prev.translations.ar,
          [key]: value,
        },
      },
    }));
  }

  function updateNativeStudioPageContent<K extends NativeStudioPageFieldKey>(
    section: NativeStudioPageSection,
    key: K,
    value: AgencyNativeStudioPayload["page_content"][NativeStudioPageSection][K]
  ) {
    setNativeStudio((prev) => ({
      ...prev,
      page_content: {
        ...prev.page_content,
        [section]: {
          ...prev.page_content[section],
          [key]: value,
        },
      },
    }));
  }

  function applySectionPreset(
    section: NativeStudioPageSection,
    presetId: "luxury" | "minimal" | "corporate" | "dark"
  ) {
    const preset = PAGE_SECTION_PRESETS[section].find((item) => item.id === presetId);
    if (!preset) return;
    setNativeStudio((prev) => ({
      ...prev,
      page_content: {
        ...prev.page_content,
        [section]: {
          ...prev.page_content[section],
          title: preset.title,
          intro: preset.intro,
          image_url: preset.image_url,
          image_alt: preset.title,
          image_focal_x: 50,
          image_focal_y: 50,
        },
      },
    }));
  }

  function saveSelectedBlockToLibrary() {
    if (!selectedStudioBlock) return;
    setNativeStudio((prev) => {
      const name = selectedStudioBlock.title || `Bloc ${selectedStudioBlock.type}`;
      const baseId = `lib-${Date.now().toString(36)}`;
      const entry = {
        id: baseId,
        name: name.slice(0, 72),
        block: {
          section: selectedStudioBlock.section,
          type: selectedStudioBlock.type,
          title: selectedStudioBlock.title,
          body: selectedStudioBlock.body,
          image_url: selectedStudioBlock.image_url,
          image_alt: selectedStudioBlock.image_alt,
          cta_label: selectedStudioBlock.cta_label,
          cta_href: selectedStudioBlock.cta_href,
        },
      };
      return {
        ...prev,
        block_library: [entry, ...prev.block_library].slice(0, 40),
      };
    });
  }

  function insertLibraryBlock(libraryId: string) {
    setNativeStudio((prev) => {
      const item = prev.block_library.find((entry) => entry.id === libraryId);
      if (!item) return prev;
      const block = createNativeStudioBlock(item.block.type, item.block.section);
      block.title = item.block.title;
      block.body = item.block.body;
      block.image_url = item.block.image_url;
      block.image_alt = item.block.image_alt;
      block.cta_label = item.block.cta_label;
      block.cta_href = item.block.cta_href;
      return {
        ...prev,
        blocks: [...prev.blocks, block].slice(0, 24),
      };
    });
  }

  function removeLibraryBlock(libraryId: string) {
    setNativeStudio((prev) => ({
      ...prev,
      block_library: prev.block_library.filter((entry) => entry.id !== libraryId),
    }));
  }

  function addNativeStudioBlock(type: AgencyNativeStudioBlockType) {
    const newBlock = createNativeStudioBlock(type);
    setNativeStudio((prev) => ({
      ...prev,
      blocks: [...prev.blocks, newBlock].slice(0, 24),
    }));
    setSelectedStudioBlockId(newBlock.id);
  }

  function updateNativeStudioBlock(
    blockId: string,
    patch: Partial<AgencyNativeStudioBlock>
  ) {
    setNativeStudio((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              ...patch,
            }
          : block
      ),
    }));
  }

  function removeNativeStudioBlock(blockId: string) {
    setNativeStudio((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((block) => block.id !== blockId),
    }));
    setSelectedStudioBlockId((prev) => (prev === blockId ? null : prev));
    setDraggedStudioBlockId((prev) => (prev === blockId ? null : prev));
  }

  function onNativeStudioBlockDrop(targetId: string) {
    if (!draggedStudioBlockId || draggedStudioBlockId === targetId) return;
    setNativeStudio((prev) => {
      const next = [...prev.blocks];
      const from = next.findIndex((item) => item.id === draggedStudioBlockId);
      const to = next.findIndex((item) => item.id === targetId);
      if (from < 0 || to < 0) return prev;
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...prev, blocks: next };
    });
    setDraggedStudioBlockId(null);
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
    setNativeStudio({
      hero_variant: "classic",
      card_density: "comfortable",
      section_surface: "soft",
      cta_style: "solid",
      marketplace_columns: "3",
      card_radius: "xl",
      button_radius: "xl",
      section_spacing: "normal",
      hero_image_alt: heroTitle || initial.agencyName,
      hero_image_focal_x: 50,
      hero_image_focal_y: 50,
      locale_default: "fr",
      locales_enabled: ["fr", "ar"],
      translations: { ar: {} },
      design_tokens: {
        container_width: "normal",
        typography_scale: "md",
        motion_level: "subtle",
      },
      design_system: {
        heading_font: "playfair",
        body_font: "manrope",
        shadow_intensity: "medium",
      },
      responsive_overrides: {
        mobile: { typography_scale: "sm", section_spacing: "compact" },
        tablet: { typography_scale: "md", section_spacing: "normal" },
        desktop: { typography_scale: "lg", section_spacing: "normal" },
      },
      page_content: createDefaultPageContent(),
      trust_badges: [...DEFAULT_TRUST_BADGES],
      mobile_conversion_rail: true,
      block_library: [],
      revisions: [],
      publish_state: "published",
      scheduled_publish_at: "",
      published_snapshot: null,
      scheduled_snapshot: null,
      blocks: [
        {
          id: `native-block-${Date.now().toString(36)}-about`,
          section: "about",
          type: "text",
          title: "A propos de notre agence",
          body: description || "Ajoutez votre proposition de valeur et votre expertise locale.",
          image_url: "",
          image_alt: "",
          cta_label: "",
          cta_href: "",
        },
        {
          id: `native-block-${Date.now().toString(36)}-cta`,
          section: "contact",
          type: "cta",
          title: "Besoin d'un accompagnement rapide ?",
          body: "Contactez-nous et recevez une reponse rapide.",
          image_url: "",
          image_alt: "",
          cta_label: ctaLabel || "Nous contacter",
          cta_href: ctaUrl || "/agence",
        },
      ],
    });
    setSelectedStudioBlockId(null);
  }

  function applyStudioTemplate(templateId: StudioTemplateId) {
    const now = Date.now().toString(36);
    if (templateId === "minimal") {
      setSelectedThemePreset("");
      setBrandPrimaryColor("#111827");
      setBrandSecondaryColor("#f8fafc");
      setBrandAccentColor("#64748b");
      setShowServicesPreview(true);
      setShowHighlightsPreview(false);
      setShowContactPreview(true);
      setShowMarketplacePreview(true);
      setSectionOrder(["about", "services", "marketplace", "contact"]);
      setNativeStudio((prev) => ({
        ...prev,
        hero_variant: "compact",
        card_density: "compact",
        section_surface: "flat",
        cta_style: "outline",
        marketplace_columns: "2",
        card_radius: "md",
        button_radius: "md",
        section_spacing: "compact",
        blocks: [
          {
            id: `native-block-${now}-about`,
            section: "about",
            type: "text",
            title: "Presentation",
            body: "Une vitrine claire, rapide et orientee conversion.",
            image_url: "",
            image_alt: "",
            cta_label: "",
            cta_href: "",
          },
        ],
      }));
      return;
    }

    if (templateId === "corporate") {
      setSelectedThemePreset("");
      setBrandPrimaryColor("#0f172a");
      setBrandSecondaryColor("#f8fafc");
      setBrandAccentColor("#0284c7");
      setShowServicesPreview(true);
      setShowHighlightsPreview(true);
      setShowContactPreview(true);
      setShowMarketplacePreview(true);
      setSectionOrder(["about", "services", "contact", "marketplace"]);
      setNativeStudio((prev) => ({
        ...prev,
        hero_variant: "classic",
        card_density: "comfortable",
        section_surface: "soft",
        cta_style: "solid",
        marketplace_columns: "3",
        card_radius: "xl",
        button_radius: "xl",
        section_spacing: "normal",
        blocks: [
          {
            id: `native-block-${now}-services`,
            section: "services",
            type: "list",
            title: "Methodologie",
            body: "Audit initial\nPlan d'action\nExecution\nSuivi de performance",
            image_url: "",
            image_alt: "",
            cta_label: "",
            cta_href: "",
          },
          {
            id: `native-block-${now}-contact`,
            section: "contact",
            type: "cta",
            title: "Parlons de votre projet",
            body: "Planifiez un premier echange avec notre equipe.",
            image_url: "",
            image_alt: "",
            cta_label: ctaLabel || "Prendre rendez-vous",
            cta_href: ctaUrl || "/contact",
          },
        ],
      }));
      return;
    }

    setSelectedThemePreset("premium");
    setBrandPrimaryColor("#0f172a");
    setBrandSecondaryColor("#f8fafc");
    setBrandAccentColor("#d4af37");
    setShowServicesPreview(true);
    setShowHighlightsPreview(true);
    setShowContactPreview(true);
    setShowMarketplacePreview(true);
    setSectionOrder(["about", "services", "marketplace", "contact"]);
    setNativeStudio((prev) => ({
      ...prev,
      hero_variant: "immersive",
      card_density: "comfortable",
      section_surface: "soft",
      cta_style: "solid",
      marketplace_columns: "3",
      card_radius: "full",
      button_radius: "full",
      section_spacing: "relaxed",
      blocks: [
        {
          id: `native-block-${now}-about`,
          section: "about",
          type: "text",
          title: "Signature premium",
          body: "Un accompagnement haut de gamme pour vos projets immobiliers a forte valeur.",
          image_url: "",
          image_alt: "",
          cta_label: "",
          cta_href: "",
        },
        {
          id: `native-block-${now}-marketplace`,
          section: "marketplace",
          type: "cta",
          title: "Collection de biens exclusifs",
          body: "Decouvrez une selection qualifiee avec accompagnement personnalise.",
          image_url: "",
          image_alt: "",
          cta_label: "Voir le catalogue",
          cta_href: "/biens",
        },
      ],
    }));
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

  function sectionToOrderKey(section: AgencyEditableSectionId): SectionOrderKey | null {
    if (section === "about") return "about";
    if (section === "services") return "services";
    if (section === "contact") return "contact";
    if (section === "marketplace") return "marketplace";
    return null;
  }

  function movePreviewSection(section: AgencyEditableSectionId, direction: "up" | "down") {
    const key = sectionToOrderKey(section);
    if (!key) return;
    setSectionOrder((prev) => {
      const order = PREVIEW_REORDERABLE_SECTIONS.filter((item) => prev.includes(item));
      const currentIndex = order.indexOf(key);
      if (currentIndex < 0) return prev;
      const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (nextIndex < 0 || nextIndex >= order.length) return prev;
      const next = [...order];
      const swap = next[nextIndex];
      next[nextIndex] = key;
      next[currentIndex] = swap;
      return next;
    });
  }

  function reorderPreviewSection(from: AgencyEditableSectionId, to: AgencyEditableSectionId) {
    const fromKey = sectionToOrderKey(from);
    const toKey = sectionToOrderKey(to);
    if (!fromKey || !toKey || fromKey === toKey) return;
    setSectionOrder((prev) => {
      const next = [...prev];
      const fromIndex = next.indexOf(fromKey);
      const toIndex = next.indexOf(toKey);
      if (fromIndex < 0 || toIndex < 0) return prev;
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, fromKey);
      return next;
    });
  }

  function togglePreviewSectionVisibility(section: AgencyEditableSectionId) {
    if (section === "services") {
      setShowServicesPreview((prev) => !prev);
      return;
    }
    if (section === "contact") {
      setShowContactPreview((prev) => !prev);
      return;
    }
    if (section === "marketplace") {
      setShowMarketplacePreview((prev) => !prev);
      return;
    }
    if (section === "testimonials") {
      setShowHighlightsPreview((prev) => !prev);
      return;
    }
    setSuccessMsg(`La section ${PREVIEW_SECTION_LABELS[section]} ne supporte pas hide/show global.`);
  }

  function duplicatePreviewSection(section: AgencyEditableSectionId) {
    const sectionMap: Record<AgencyEditableSectionId, NativeStudioPageSection> = {
      hero: "about",
      about: "about",
      services: "services",
      marketplace: "marketplace",
      contact: "contact",
      cta: "contact",
      testimonials: "services",
    };
    const targetSection = sectionMap[section];
    const block = createNativeStudioBlock(section === "cta" ? "cta" : section === "testimonials" ? "list" : "text", targetSection);
    if (section === "hero") {
      block.title = heroTitle || "Hero";
      block.body = heroSubtitle || tagline || description;
    } else if (section === "cta") {
      block.title = ctaLabel || "CTA";
      block.body = heroSubtitle || "Contactez-nous";
      block.cta_label = ctaLabel || "Nous contacter";
      block.cta_href = ctaUrl || "/contact";
    } else if (section === "testimonials") {
      block.title = "Points forts";
      block.body = highlightsText || "Accompagnement premium\nConseil local\nSuivi juridique";
    } else {
      const content = nativeStudio.page_content[targetSection];
      block.title = content.title || PREVIEW_SECTION_LABELS[section];
      block.body = content.intro || description;
    }
    setNativeStudio((prev) => ({ ...prev, blocks: [block, ...prev.blocks].slice(0, 24) }));
    setSuccessMsg(`Section ${PREVIEW_SECTION_LABELS[section]} dupliquee en bloc editable.`);
  }

  function clearPreviewSection(section: AgencyEditableSectionId) {
    if (section === "hero") {
      setHeroTitle("");
      setHeroSubtitle("");
      updateNativeStudio("hero_image_alt", "");
      return;
    }
    if (section === "cta") {
      setCtaLabel("");
      setCtaUrl("");
      return;
    }
    if (section === "testimonials") {
      setHighlightsText("");
      return;
    }
    const key = sectionToOrderKey(section);
    if (!key) return;
    updateNativeStudioPageContent(key, "title", "");
    updateNativeStudioPageContent(key, "intro", "");
    updateNativeStudioPageContent(key, "image_url", "");
    updateNativeStudioPageContent(key, "image_alt", "");
  }

  function applyPreviewSectionAction(
    section: AgencyEditableSectionId,
    action: AgencyPreviewSectionAction,
    fromSection?: AgencyEditableSectionId
  ) {
    if (action === "edit") {
      selectSection(section);
      return;
    }
    if (action === "style") {
      selectSection(section);
      return;
    }
    if (action === "move-up") {
      movePreviewSection(section, "up");
      return;
    }
    if (action === "move-down") {
      if (fromSection) {
        reorderPreviewSection(fromSection, section);
      } else {
        movePreviewSection(section, "down");
      }
      return;
    }
    if (action === "hide-show") {
      togglePreviewSectionVisibility(section);
      return;
    }
    if (action === "duplicate") {
      duplicatePreviewSection(section);
      return;
    }
    clearPreviewSection(section);
  }
  previewActionRef.current = applyPreviewSectionAction;

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

  async function onQuickMediaPicked(section: AgencyEditableSectionId, file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Format image invalide.");
      return;
    }
    if (file.size > MAX_COVER_FILE_BYTES) {
      setErrorMsg("Image trop volumineuse (max 8 MB).");
      return;
    }

    setPreviewMediaUploading(true);
    setErrorMsg(null);
    try {
      const url = await uploadCoverFile(file);
      if (section === "hero") {
        setCoverUrl(url);
        if (!nativeStudio.hero_image_alt) {
          updateNativeStudio("hero_image_alt", heroTitle || "Hero image");
        }
      } else {
        const mapped = sectionToOrderKey(section);
        if (mapped) {
          updateNativeStudioPageContent(mapped, "image_url", url);
          if (!nativeStudio.page_content[mapped].image_alt) {
            updateNativeStudioPageContent(mapped, "image_alt", PREVIEW_SECTION_LABELS[section]);
          }
        }
      }
      setSuccessMsg("Media mis a jour.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Upload media impossible.");
    } finally {
      setPreviewMediaUploading(false);
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

    const invalidUrl =
      !isLikelyHttpUrl(coverUrl) ||
      !isLikelyHttpUrl(ctaUrl) ||
      !isLikelyInternalOrHttpUrl(aboutPageContent.image_url) ||
      !isLikelyInternalOrHttpUrl(servicesPageContent.image_url) ||
      !isLikelyInternalOrHttpUrl(contactPageContent.image_url) ||
      !isLikelyInternalOrHttpUrl(marketplacePageContent.image_url);
    if (invalidUrl) {
      setErrorMsg("Cover/CTA doivent etre en http(s). Les images pages acceptent /chemin ou http(s).");
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

    if (blockingLinkIssues.length > 0) {
      setErrorMsg(`Audit liens: ${blockingLinkIssues[0]}`);
      return;
    }

    if (publishAction === "publish" && publishChecklistIssues.length > 0) {
      setErrorMsg(`Checklist publication: ${publishChecklistIssues[0]}`);
      return;
    }

    const invalidStudioHref = nativeStudio.blocks.some(
      (block) =>
        block.type === "cta" &&
        block.cta_href &&
        !(
          /^https?:\/\//i.test(block.cta_href) ||
          /^mailto:/i.test(block.cta_href) ||
          /^tel:/i.test(block.cta_href) ||
          /^\//.test(block.cta_href)
        )
    );
    if (invalidStudioHref) {
      setErrorMsg("Lien invalide dans un bloc CTA (utilisez http(s), mailto:, tel: ou /chemin).");
      return;
    }

    if (publishAction === "schedule" && !nativeStudio.scheduled_publish_at) {
      setErrorMsg("Definissez une date/heure de publication planifiee.");
      return;
    }

    const nowIso = new Date().toISOString();
    const currentSnapshot = buildStudioPublishSnapshot(nativeStudio);
    let studioForSave: AgencyNativeStudioPayload = {
      ...nativeStudio,
      revisions: [
        {
          id: `revision-${Date.now().toString(36)}`,
          label:
            publishAction === "publish"
              ? "Publish now"
              : publishAction === "draft"
                ? "Save draft"
                : publishAction === "schedule"
                  ? "Schedule publish"
                  : "Save changes",
          saved_at: nowIso,
          snapshot: currentSnapshot,
        },
        ...nativeStudio.revisions,
      ].slice(0, 24),
    };

    if (publishAction === "draft") {
      studioForSave = {
        ...studioForSave,
        publish_state: "draft",
      };
    } else if (publishAction === "publish") {
      studioForSave = {
        ...studioForSave,
        publish_state: "published",
        scheduled_publish_at: "",
        published_snapshot: currentSnapshot,
        scheduled_snapshot: null,
      };
    } else if (publishAction === "schedule") {
      studioForSave = {
        ...studioForSave,
        publish_state: "scheduled",
        scheduled_snapshot: currentSnapshot,
      };
    }

    const serializedStudio = JSON.stringify(studioForSave);
    if (serializedStudio.length > 10_000) {
      setErrorMsg("La configuration studio est trop volumineuse.");
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
        builder_type: "native",
        builder_payload: studioForSave,
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
    setNativeStudio(studioForSave);
    setSuccessMsg(
      publishAction === "publish"
        ? "Vitrine publiee avec succes."
        : publishAction === "draft"
          ? "Brouillon enregistre."
          : publishAction === "schedule"
            ? "Publication planifiee enregistree."
            : "Vitrine enregistree avec succes."
    );
    addHistoryEntry(
      publishAction === "publish"
        ? "Publish now"
        : publishAction === "draft"
          ? "Save draft"
          : publishAction === "schedule"
            ? "Schedule publish"
            : "Manual save"
    );
    setPublishAction("save");
    router.refresh();
  }

  function readEditableText(event: FocusEvent<HTMLElement>) {
    return String(event.currentTarget.textContent ?? "").replace(/\s+/g, " ").trim();
  }

  function renderPreviewStudioBlock(
    block: AgencyNativeStudioBlock,
    index = -1,
    sectionKey?: SectionOrderKey
  ) {
    const isSelected =
      selection.selectedKind === "component" && selection.selectedId === block.id;
    const blockPath =
      sectionKey === "marketplace"
        ? ["galleryItems", String(index)]
        : ["blocks", block.id];

    return (
      <div
        key={block.id}
        data-section-id={block.section}
        data-item-path={blockPath.join(".")}
        className={`${previewCardClass} relative cursor-pointer transition ${isSelected ? "ring-2 ring-[rgb(var(--navy))]/45" : "hover:ring-1 hover:ring-[rgb(var(--navy))]/25"}`}
        onClick={(event) => {
          event.stopPropagation();
          selectComponent(block.id, blockPath);
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          selectComponent(block.id, blockPath, { focusInspector: true });
        }}
      >
        {block.image_url ? (
          <div className="relative mb-2 h-24 overflow-hidden rounded-lg border border-black/10 bg-slate-100">
            <Image src={block.image_url} alt={block.image_alt || block.title || "Bloc"} fill sizes="480px" className="object-cover" unoptimized />
          </div>
        ) : null}
        <div
          className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/55 outline-none"
          contentEditable={inlineEditingPath === `block.${block.id}.title`}
          suppressContentEditableWarning
          onDoubleClick={(event) => {
            event.stopPropagation();
            selectComponent(block.id, blockPath, { focusInspector: true });
            setInlineEditingPath(`block.${block.id}.title`);
          }}
          onBlur={(event) => {
            updateNativeStudioBlock(block.id, { title: readEditableText(event) });
            setInlineEditingPath(null);
          }}
        >
          {block.title || `Bloc ${block.type}`}
        </div>
        {block.type === "list" ? (
          <ul className="mt-1.5 space-y-1 text-xs">
            {parseLines(block.body).map((line) => (
              <li key={`${block.id}-${line}`} className="flex items-start gap-1.5">
                <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: brandAccentColor }} />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p
            className="mt-1.5 whitespace-pre-line text-xs text-black/70 outline-none"
            contentEditable={inlineEditingPath === `block.${block.id}.body`}
            suppressContentEditableWarning
            onDoubleClick={(event) => {
              event.stopPropagation();
              selectComponent(block.id, blockPath, { focusInspector: true });
              setInlineEditingPath(`block.${block.id}.body`);
            }}
            onBlur={(event) => {
              updateNativeStudioBlock(block.id, { body: readEditableText(event) });
              setInlineEditingPath(null);
            }}
          >
            {block.body || "Ajoutez du contenu."}
          </p>
        )}
        {block.type === "cta" && block.cta_label ? (
          <span className="mt-2 inline-flex rounded-full border border-black/10 bg-white px-2 py-0.5 text-[11px] font-semibold text-[rgb(var(--navy))]">
            {block.cta_label}
          </span>
        ) : null}
      </div>
    );
  }

  function isSectionSelected(section: InspectorSectionId) {
    return selection.selectedKind === "section" && selection.selectedId === section;
  }

  function renderCanvasDragHandle({
    label,
    active,
    onStart,
  }: {
    label: string;
    active: boolean;
    onStart: () => void;
  }) {
    return (
      <button
        type="button"
        draggable
        aria-label={label}
        title={label}
        onDragStart={(event) => {
          event.stopPropagation();
          onStart();
        }}
        onDragEnd={(event) => {
          event.stopPropagation();
          setCanvasDragState(null);
        }}
        className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition ${
          active
            ? "border-[rgb(var(--navy))]/35 bg-[rgb(var(--navy))]/10 text-[rgb(var(--navy))]"
            : "border-black/10 bg-white text-black/55 hover:bg-black/5"
        }`}
      >
        <GripVertical size={12} />
      </button>
    );
  }

  function renderSectionToolbar(section: InspectorSectionId) {
    if (!isSectionSelected(section)) return null;
    return (
      <div className="pointer-events-auto absolute right-2 top-2 z-20 flex items-center gap-1 rounded-md border border-black/10 bg-white/95 p-1 shadow-sm">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            applyPreviewSectionAction(section, "move-up");
          }}
          className="h-6 w-6 rounded border border-black/10 text-[10px] text-black/65 hover:bg-black/5"
          title="Move up"
        >
          Up
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            applyPreviewSectionAction(section, "move-down");
          }}
          className="h-6 w-6 rounded border border-black/10 text-[10px] text-black/65 hover:bg-black/5"
          title="Move down"
        >
          Dn
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            applyPreviewSectionAction(section, "hide-show");
          }}
          className="h-6 rounded border border-black/10 px-1.5 text-[10px] text-black/65 hover:bg-black/5"
          title="Hide/Show"
        >
          Hide
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            applyPreviewSectionAction(section, "duplicate");
          }}
          className="h-6 rounded border border-black/10 px-1.5 text-[10px] text-black/65 hover:bg-black/5"
          title="Duplicate"
        >
          Duplicate
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            applyPreviewSectionAction(section, "delete");
          }}
          className="h-6 rounded border border-red-200 bg-red-50 px-1.5 text-[10px] text-red-600 hover:bg-red-100"
          title="Delete"
        >
          Delete
        </button>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[rgb(var(--brand-bg))] pl-0 pr-[20px] py-10 md:py-14">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[rgb(var(--gold))]/20 blur-3xl" />
        <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-[rgb(var(--navy))]/12 blur-3xl" />
      </div>

      <section className="relative w-full space-y-5">
        <article className="rounded-3xl border border-black/10 bg-white/[0.94] p-5 shadow-[0_10px_24px_rgba(15,23,42,0.08)] md:p-6">
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

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => focusDetailsPanel("identity")}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-xs font-semibold text-[rgb(var(--navy))] transition hover:bg-black/5"
            >
              Identite
            </button>
            <button
              type="button"
              onClick={() => focusDetailsPanel("content")}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-xs font-semibold text-[rgb(var(--navy))] transition hover:bg-black/5"
            >
              Contenu
            </button>
            <button
              type="button"
              onClick={() => focusDetailsPanel("contact")}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-xs font-semibold text-[rgb(var(--navy))] transition hover:bg-black/5"
            >
              Contact
            </button>
            <button
              type="button"
              onClick={() => focusDetailsPanel("branding")}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-xs font-semibold text-[rgb(var(--navy))] transition hover:bg-black/5"
            >
              Branding & SEO
            </button>
          </div>
        </article>

        <div className="space-y-5">
        <form onSubmit={handleSubmit} className="space-y-5 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
          <article
            id="details-identity"
            className="hidden"
          >
            <button
              type="button"
              onClick={() => toggleDetailsPanel("identity")}
              className="flex w-full items-center justify-between gap-2 text-left"
              aria-expanded={openDetailsPanels.identity}
            >
              <h2 className="inline-flex items-center gap-2 text-base font-bold text-[rgb(var(--navy))]">
                <Settings2 size={16} />
                Identite vitrine
              </h2>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-white text-sm font-bold text-[rgb(var(--navy))]">
                {openDetailsPanels.identity ? "-" : "+"}
              </span>
            </button>
            <p className="mt-1.5 text-xs text-black/55">
              Nom, slug, hero et assets visuels de votre marque.
            </p>
            {openDetailsPanels.identity && typeof document !== "undefined" ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/60 backdrop-blur-[2px] p-4 md:p-8"
              onClick={() => setDetailsPanelOpen("identity", false)}
            >
            <div
              className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl border border-black/10 bg-white p-5 shadow-[0_24px_48px_rgba(15,23,42,0.2)] md:p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-black/10 pb-3">
                <div className="text-sm font-bold text-[rgb(var(--navy))]">Identite vitrine</div>
                <button
                  type="button"
                  onClick={() => setDetailsPanelOpen("identity", false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white text-[rgb(var(--navy))] hover:bg-black/5"
                  aria-label="Fermer"
                >
                  <X size={14} />
                </button>
              </div>
            <div className="grid gap-4">
              <div className={DETAILS_BLOCK_CLASS}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className={DETAILS_BLOCK_TITLE_CLASS}>Informations principales</div>
                  <div className="rounded-full border border-black/10 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/55">
                    Identite
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
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
                </div>
              </div>

              <div className={DETAILS_BLOCK_CLASS}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className={DETAILS_BLOCK_TITLE_CLASS}>Image cover et logo</div>
                  <div className="rounded-full border border-black/10 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/55">
                    Media
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-black/50">
                  Ajoutez des visuels de haute qualite pour une vitrine plus premium.
                </p>

                <div className="mt-3 grid gap-3 lg:grid-cols-[1.25fr_0.75fr]">
                  <div
                    onDragOver={onCoverDragOver}
                    onDragLeave={onCoverDragLeave}
                    onDrop={onCoverDrop}
                    className={`rounded-2xl border bg-white p-3.5 transition ${
                      coverDragActive
                        ? "border-[rgb(var(--navy))]/45 ring-4 ring-[rgb(var(--gold))]/16"
                        : "border-[rgb(var(--navy))]/14"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/55">Cover</div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${coverUrl ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {coverUrl ? "Configure" : "A ajouter"}
                      </span>
                    </div>

                    <div className="mt-2.5 relative h-40 w-full overflow-hidden rounded-xl border border-[rgb(var(--navy))]/14 bg-slate-50">
                      {coverUrl ? (
                        <Image
                          src={coverUrl}
                          alt="Cover preview"
                          fill
                          sizes="640px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-black/35">
                          <ImagePlus size={26} />
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
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
                    <p className="mt-2 text-xs text-black/50">
                      PNG/JPG/WEBP - max 8 MB. Recommande: format paysage 1600x900.
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
                    className={`rounded-2xl border bg-white p-3.5 transition ${
                      logoDragActive
                        ? "border-[rgb(var(--navy))]/45 ring-4 ring-[rgb(var(--gold))]/16"
                        : "border-[rgb(var(--navy))]/14"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/55">Logo</div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${logoUrl ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {logoUrl ? "Configure" : "A ajouter"}
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-center rounded-xl border border-[rgb(var(--navy))]/14 bg-slate-50 p-4">
                      <div className="relative h-28 w-28 overflow-hidden rounded-xl border border-[rgb(var(--navy))]/14 bg-white">
                        {logoUrl ? (
                          <Image
                            src={logoUrl}
                            alt="Logo preview"
                            fill
                            sizes="112px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-black/35">
                            <Building2 size={22} />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
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
                        ? "Logo detecte et enregistre."
                        : "Ajoutez votre logo (max 6 MB). Recommande: 600x600."}
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
            </div>
            </div>
            , document.body) : null}
          </article>

          <article
            id="details-content"
            className="hidden"
          >
            <button
              type="button"
              onClick={() => toggleDetailsPanel("content")}
              className="flex w-full items-center justify-between gap-2 text-left"
              aria-expanded={openDetailsPanels.content}
            >
              <h2 className="inline-flex items-center gap-2 text-base font-bold text-[rgb(var(--navy))]">
                <Megaphone size={16} />
                Contenu et positionnement
              </h2>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-white text-sm font-bold text-[rgb(var(--navy))]">
                {openDetailsPanels.content ? "-" : "+"}
              </span>
            </button>
            <p className="mt-1.5 text-xs text-black/55">
              Description, services, points forts et horaires.
            </p>
            {openDetailsPanels.content && typeof document !== "undefined" ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/60 backdrop-blur-[2px] p-4 md:p-8"
              onClick={() => setDetailsPanelOpen("content", false)}
            >
            <div
              className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl border border-black/10 bg-white p-5 shadow-[0_24px_48px_rgba(15,23,42,0.2)] md:p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-black/10 pb-3">
                <div className="text-sm font-bold text-[rgb(var(--navy))]">Contenu et positionnement</div>
                <button
                  type="button"
                  onClick={() => setDetailsPanelOpen("content", false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white text-[rgb(var(--navy))] hover:bg-black/5"
                  aria-label="Fermer"
                >
                  <X size={14} />
                </button>
              </div>
            <div className="grid gap-4">
              <div className={DETAILS_BLOCK_CLASS}>
                <div className={DETAILS_BLOCK_TITLE_CLASS}>Narratif agence</div>
                <label className="mt-2 block space-y-1.5 text-sm">
                  <span className={PREMIUM_LABEL_CLASS}>Description agence *</span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className={PREMIUM_TEXTAREA_CLASS}
                  />
                </label>
              </div>

              <div className={DETAILS_BLOCK_CLASS}>
                <div className={DETAILS_BLOCK_TITLE_CLASS}>Contenu statique des pages</div>
                <p className="mt-1 text-xs text-black/55">
                  Ajoutez un titre, un texte et une image immobiliere pour chaque page publique.
                </p>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  {([
                    { key: "about", label: "Page A propos" },
                    { key: "services", label: "Page Services" },
                    { key: "contact", label: "Page Contact" },
                    { key: "marketplace", label: "Page Marketplace" },
                  ] as const).map((entry) => (
                    <div key={entry.key} className="rounded-2xl border border-black/10 bg-white p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/55">
                        {entry.label}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {PAGE_SECTION_PRESETS[entry.key].map((preset) => (
                          <button
                            key={`${entry.key}-${preset.id}`}
                            type="button"
                            onClick={() => applySectionPreset(entry.key, preset.id)}
                            className="inline-flex h-7 items-center rounded-full border border-black/10 bg-white px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--navy))] hover:bg-black/5"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                      <div className="mt-2 space-y-2">
                        <label className="space-y-1.5 text-sm">
                          <span className={PREMIUM_LABEL_CLASS}>Titre</span>
                          <input
                            type="text"
                            value={nativeStudio.page_content[entry.key].title}
                            onChange={(event) =>
                              updateNativeStudioPageContent(entry.key, "title", event.target.value)
                            }
                            className={PREMIUM_INPUT_CLASS}
                          />
                        </label>
                        <label className="space-y-1.5 text-sm">
                          <span className={PREMIUM_LABEL_CLASS}>Texte d&apos;introduction</span>
                          <textarea
                            value={nativeStudio.page_content[entry.key].intro}
                            onChange={(event) =>
                              updateNativeStudioPageContent(entry.key, "intro", event.target.value)
                            }
                            rows={3}
                            className={PREMIUM_TEXTAREA_CLASS}
                          />
                        </label>
                        <label className="space-y-1.5 text-sm">
                          <span className={PREMIUM_LABEL_CLASS}>Image URL (http(s) ou /uploads/...)</span>
                          <input
                            type="text"
                            value={nativeStudio.page_content[entry.key].image_url}
                            onChange={(event) =>
                              updateNativeStudioPageContent(entry.key, "image_url", event.target.value)
                            }
                            placeholder="https://..."
                            className={PREMIUM_INPUT_CLASS}
                          />
                        </label>
                        <label className="space-y-1.5 text-sm">
                          <span className={PREMIUM_LABEL_CLASS}>Image alt</span>
                          <input
                            type="text"
                            value={nativeStudio.page_content[entry.key].image_alt}
                            onChange={(event) =>
                              updateNativeStudioPageContent(entry.key, "image_alt", event.target.value)
                            }
                            className={PREMIUM_INPUT_CLASS}
                          />
                        </label>
                        <div className="grid gap-2 md:grid-cols-2">
                          <label className="space-y-1 text-xs">
                            <span className={PREMIUM_LABEL_CLASS}>Focal X ({nativeStudio.page_content[entry.key].image_focal_x}%)</span>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={1}
                              value={nativeStudio.page_content[entry.key].image_focal_x}
                              onChange={(event) =>
                                updateNativeStudioPageContent(entry.key, "image_focal_x", Number(event.target.value))
                              }
                              className="w-full"
                            />
                          </label>
                          <label className="space-y-1 text-xs">
                            <span className={PREMIUM_LABEL_CLASS}>Focal Y ({nativeStudio.page_content[entry.key].image_focal_y}%)</span>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={1}
                              value={nativeStudio.page_content[entry.key].image_focal_y}
                              onChange={(event) =>
                                updateNativeStudioPageContent(entry.key, "image_focal_y", Number(event.target.value))
                              }
                              className="w-full"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className={DETAILS_BLOCK_CLASS}>
                  <div className={DETAILS_BLOCK_TITLE_CLASS}>Services</div>
                  <label className="mt-2 block space-y-1.5 text-sm">
                    <span className={PREMIUM_LABEL_CLASS}>Services (une ligne = un service)</span>
                    <textarea
                      value={servicesText}
                      onChange={(e) => setServicesText(e.target.value)}
                      rows={6}
                      placeholder={"Vente immobiliere\nLocation longue duree\nGestion locative"}
                      className={PREMIUM_TEXTAREA_CLASS}
                    />
                  </label>
                </div>

                <div className={DETAILS_BLOCK_CLASS}>
                  <div className={DETAILS_BLOCK_TITLE_CLASS}>Points forts</div>
                  <label className="mt-2 block space-y-1.5 text-sm">
                    <span className={PREMIUM_LABEL_CLASS}>Points forts (une ligne = un point fort)</span>
                    <textarea
                      value={highlightsText}
                      onChange={(e) => setHighlightsText(e.target.value)}
                      rows={6}
                      placeholder={"Accompagnement notarial\nEstimation gratuite\nSuivi digital"}
                      className={PREMIUM_TEXTAREA_CLASS}
                    />
                  </label>
                </div>
              </div>

              <div className={DETAILS_BLOCK_CLASS}>
                <div className={DETAILS_BLOCK_TITLE_CLASS}>Zones et langues</div>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
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
                </div>
              </div>

              <div className={DETAILS_BLOCK_CLASS}>
                <div className={DETAILS_BLOCK_TITLE_CLASS}>Horaires</div>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
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
              </div>
            </div>
            </div>
            </div>
            , document.body) : null}
          </article>

          <article
            id="details-contact"
            className="hidden"
          >
            <button
              type="button"
              onClick={() => toggleDetailsPanel("contact")}
              className="flex w-full items-center justify-between gap-2 text-left"
              aria-expanded={openDetailsPanels.contact}
            >
              <h2 className="inline-flex items-center gap-2 text-base font-bold text-[rgb(var(--navy))]">
                <Phone size={16} />
                Contact, conversion et reseaux
              </h2>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-white text-sm font-bold text-[rgb(var(--navy))]">
                {openDetailsPanels.contact ? "-" : "+"}
              </span>
            </button>
            <p className="mt-1.5 text-xs text-black/55">
              Coordonnees, CTA, domaine et reseaux sociaux.
            </p>
            {openDetailsPanels.contact && typeof document !== "undefined" ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/60 backdrop-blur-[2px] p-4 md:p-8"
              onClick={() => setDetailsPanelOpen("contact", false)}
            >
            <div
              className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl border border-black/10 bg-white p-5 shadow-[0_24px_48px_rgba(15,23,42,0.2)] md:p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-black/10 pb-3">
                <div className="text-sm font-bold text-[rgb(var(--navy))]">Contact, conversion et reseaux</div>
                <button
                  type="button"
                  onClick={() => setDetailsPanelOpen("contact", false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white text-[rgb(var(--navy))] hover:bg-black/5"
                  aria-label="Fermer"
                >
                  <X size={14} />
                </button>
              </div>
            <div className="grid gap-4">
              <div className={DETAILS_BLOCK_CLASS}>
                <div className={DETAILS_BLOCK_TITLE_CLASS}>Coordonnees principales</div>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
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
                </div>
              </div>

              <div className={DETAILS_BLOCK_CLASS}>
                <div className={DETAILS_BLOCK_TITLE_CLASS}>Conversion et domaine</div>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
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
                </div>
              </div>

              <div className={DETAILS_BLOCK_CLASS}>
                <div className={DETAILS_BLOCK_TITLE_CLASS}>Reseaux sociaux</div>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
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

                  <label className="space-y-1.5 text-sm md:col-span-2">
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
              </div>
            </div>
            </div>
            </div>
            , document.body) : null}
          </article>

          <article
            id="details-branding"
            className="hidden"
          >
            <button
              type="button"
              onClick={() => toggleDetailsPanel("branding")}
              className="flex w-full items-center justify-between gap-2 text-left"
              aria-expanded={openDetailsPanels.branding}
            >
              <h2 className="inline-flex items-center gap-2 text-base font-bold text-[rgb(var(--navy))]">
                <Palette size={16} />
                Branding et SEO
              </h2>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-white text-sm font-bold text-[rgb(var(--navy))]">
                {openDetailsPanels.branding ? "-" : "+"}
              </span>
            </button>
            <p className="mt-1.5 text-xs text-black/55">
              Couleurs de marque et referencement.
            </p>
            {openDetailsPanels.branding && typeof document !== "undefined" ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/60 backdrop-blur-[2px] p-4 md:p-8"
              onClick={() => setDetailsPanelOpen("branding", false)}
            >
            <div
              className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl border border-black/10 bg-white p-5 shadow-[0_24px_48px_rgba(15,23,42,0.2)] md:p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-black/10 pb-3">
                <div className="text-sm font-bold text-[rgb(var(--navy))]">Branding et SEO</div>
                <button
                  type="button"
                  onClick={() => setDetailsPanelOpen("branding", false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white text-[rgb(var(--navy))] hover:bg-black/5"
                  aria-label="Fermer"
                >
                  <X size={14} />
                </button>
              </div>
            <div className="grid gap-4">
              <div className={DETAILS_BLOCK_CLASS}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className={DETAILS_BLOCK_TITLE_CLASS}>Palette visuelle</div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: brandPrimaryColor }} />
                    <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: brandSecondaryColor }} />
                    <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: brandAccentColor }} />
                  </div>
                </div>

                <div className="mt-2 grid gap-3 md:grid-cols-3">
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
                </div>
              </div>

              <div className={DETAILS_BLOCK_CLASS}>
                <div className={DETAILS_BLOCK_TITLE_CLASS}>SEO</div>
                <div className="mt-2 grid gap-3">
                  <label className="space-y-1.5 text-sm">
                    <span className={PREMIUM_LABEL_CLASS}>SEO title</span>
                    <input
                      type="text"
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      className={PREMIUM_INPUT_CLASS}
                    />
                  </label>

                  <label className="space-y-1.5 text-sm">
                    <span className={PREMIUM_LABEL_CLASS}>SEO description</span>
                    <textarea
                      value={seoDescription}
                      onChange={(e) => setSeoDescription(e.target.value)}
                      rows={3}
                      className={PREMIUM_TEXTAREA_CLASS}
                    />
                  </label>

                  <label className="space-y-1.5 text-sm">
                    <span className={PREMIUM_LABEL_CLASS}>SEO keywords (separes par virgule)</span>
                    <input
                      type="text"
                      value={seoKeywords}
                      onChange={(e) => setSeoKeywords(e.target.value)}
                      className={PREMIUM_INPUT_CLASS}
                    />
                  </label>
                </div>
                {seoIssues.length > 0 ? (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-amber-700">SEO health</div>
                    <ul className="mt-1 space-y-0.5 text-xs text-amber-700">
                      {seoIssues.slice(0, 4).map((issue) => (
                        <li key={issue}>- {issue}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    SEO health: OK.
                  </div>
                )}
              </div>

              <div className={DETAILS_BLOCK_CLASS}>
                <div className={DETAILS_BLOCK_TITLE_CLASS}>Trust badges</div>
                <label className="mt-2 block space-y-1.5 text-sm">
                  <span className={PREMIUM_LABEL_CLASS}>Badges de confiance (une ligne = un badge)</span>
                  <textarea
                    value={nativeStudio.trust_badges.join("\n")}
                    onChange={(event) => updateTrustBadges(event.target.value)}
                    rows={4}
                    className={PREMIUM_TEXTAREA_CLASS}
                  />
                </label>
                <p className="mt-1.5 text-xs text-black/55">
                  Ces badges apparaissent sous le hero pour renforcer la credibilite.
                </p>
              </div>

              <div className={DETAILS_BLOCK_CLASS}>
                <div className={DETAILS_BLOCK_TITLE_CLASS}>Multilingue (FR / AR)</div>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
                  <label className="space-y-1.5 text-sm md:col-span-2">
                    <span className={PREMIUM_LABEL_CLASS}>Hero title (AR)</span>
                    <input
                      type="text"
                      value={nativeStudio.translations.ar.hero_title || ""}
                      onChange={(e) => updateArabicTranslation("hero_title", e.target.value)}
                      placeholder="????? ??????"
                      className={PREMIUM_INPUT_CLASS}
                    />
                  </label>
                  <label className="space-y-1.5 text-sm md:col-span-2">
                    <span className={PREMIUM_LABEL_CLASS}>Hero subtitle (AR)</span>
                    <textarea
                      value={nativeStudio.translations.ar.hero_subtitle || ""}
                      onChange={(e) => updateArabicTranslation("hero_subtitle", e.target.value)}
                      rows={2}
                      className={PREMIUM_TEXTAREA_CLASS}
                    />
                  </label>
                  <label className="space-y-1.5 text-sm">
                    <span className={PREMIUM_LABEL_CLASS}>Tagline (AR)</span>
                    <input
                      type="text"
                      value={nativeStudio.translations.ar.tagline || ""}
                      onChange={(e) => updateArabicTranslation("tagline", e.target.value)}
                      className={PREMIUM_INPUT_CLASS}
                    />
                  </label>
                  <label className="space-y-1.5 text-sm">
                    <span className={PREMIUM_LABEL_CLASS}>CTA label (AR)</span>
                    <input
                      type="text"
                      value={nativeStudio.translations.ar.cta_label || ""}
                      onChange={(e) => updateArabicTranslation("cta_label", e.target.value)}
                      className={PREMIUM_INPUT_CLASS}
                    />
                  </label>
                  <label className="space-y-1.5 text-sm md:col-span-2">
                    <span className={PREMIUM_LABEL_CLASS}>Description (AR)</span>
                    <textarea
                      value={nativeStudio.translations.ar.description || ""}
                      onChange={(e) => updateArabicTranslation("description", e.target.value)}
                      rows={3}
                      className={PREMIUM_TEXTAREA_CLASS}
                    />
                  </label>
                </div>
              </div>
            </div>
            </div>
            </div>
            , document.body) : null}
          </article>

          {previewEditingSection && typeof document !== "undefined"
            ? createPortal(
                <div
                  className="fixed inset-0 z-[10000] flex items-start justify-center bg-black/60 p-4 backdrop-blur-[2px] md:p-8"
                  onClick={() => setPreviewEditingSection(null)}
                >
                  <div
                    className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl border border-black/10 bg-white p-5 shadow-[0_24px_48px_rgba(15,23,42,0.2)] md:p-6"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3 border-b border-black/10 pb-3">
                      <div className="text-sm font-bold text-[rgb(var(--navy))]">
                        Quick edit: {PREVIEW_SECTION_LABELS[previewEditingSection]}
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreviewEditingSection(null)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white text-[rgb(var(--navy))] hover:bg-black/5"
                        aria-label="Fermer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="mb-3 inline-flex rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-[rgb(var(--navy))]">
                      Content
                    </div>

                    <div className="grid gap-4">
                      {previewQuickTab === "content" && previewEditingSection === "hero" ? (
                        <div className={DETAILS_BLOCK_CLASS}>
                          <div className={DETAILS_BLOCK_TITLE_CLASS}>Hero</div>
                          <div className="mt-2 grid gap-3">
                            <label className="space-y-1.5 text-sm">
                              <span className={PREMIUM_LABEL_CLASS}>Titre hero</span>
                              <input
                                type="text"
                                value={heroTitle}
                                onChange={(event) => setHeroTitle(event.target.value)}
                                className={PREMIUM_INPUT_CLASS}
                              />
                            </label>
                            <label className="space-y-1.5 text-sm">
                              <span className={PREMIUM_LABEL_CLASS}>Sous-titre hero</span>
                              <input
                                type="text"
                                value={heroSubtitle}
                                onChange={(event) => setHeroSubtitle(event.target.value)}
                                className={PREMIUM_INPUT_CLASS}
                              />
                            </label>
                            <label className="space-y-1.5 text-sm">
                              <span className={PREMIUM_LABEL_CLASS}>Image cover</span>
                              <input
                                type="text"
                                value={coverUrl}
                                onChange={(event) => setCoverUrl(event.target.value)}
                                placeholder="https://... ou /uploads/..."
                                className={PREMIUM_INPUT_CLASS}
                              />
                            </label>
                            <label className="space-y-1.5 text-sm">
                              <span className={PREMIUM_LABEL_CLASS}>Image alt</span>
                              <input
                                type="text"
                                value={nativeStudio.hero_image_alt}
                                onChange={(event) => updateNativeStudio("hero_image_alt", event.target.value)}
                                className={PREMIUM_INPUT_CLASS}
                              />
                            </label>
                            <div className="grid gap-2 md:grid-cols-2">
                              <label className="space-y-1 text-xs">
                                <span className={PREMIUM_LABEL_CLASS}>
                                  Focal X ({nativeStudio.hero_image_focal_x}%)
                                </span>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  step={1}
                                  value={nativeStudio.hero_image_focal_x}
                                  onChange={(event) =>
                                    updateNativeStudio("hero_image_focal_x", Number(event.target.value))
                                  }
                                  className="w-full"
                                />
                              </label>
                              <label className="space-y-1 text-xs">
                                <span className={PREMIUM_LABEL_CLASS}>
                                  Focal Y ({nativeStudio.hero_image_focal_y}%)
                                </span>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  step={1}
                                  value={nativeStudio.hero_image_focal_y}
                                  onChange={(event) =>
                                    updateNativeStudio("hero_image_focal_y", Number(event.target.value))
                                  }
                                  className="w-full"
                                />
                              </label>
                            </div>
                            <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-3 text-xs font-semibold text-[rgb(var(--navy))] hover:bg-black/5">
                              {previewMediaUploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                              Upload image
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(event) =>
                                  onQuickMediaPicked("hero", event.target.files?.[0] ?? null)
                                }
                              />
                            </label>
                          </div>
                        </div>
                      ) : null}

                      {previewQuickTab === "content" &&
                      (previewEditingSection === "about" ||
                        previewEditingSection === "services" ||
                        previewEditingSection === "contact" ||
                        previewEditingSection === "marketplace") ? (
                        <div className={DETAILS_BLOCK_CLASS}>
                          <div className={DETAILS_BLOCK_TITLE_CLASS}>Contenu section</div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {PAGE_SECTION_PRESETS[previewEditingSection].map((preset) => (
                              <button
                                key={`quick-${previewEditingSection}-${preset.id}`}
                                type="button"
                                onClick={() => applySectionPreset(previewEditingSection, preset.id)}
                                className="inline-flex h-7 items-center rounded-full border border-black/10 bg-white px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--navy))] hover:bg-black/5"
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                          <div className="mt-2 grid gap-3">
                            <label className="space-y-1.5 text-sm">
                              <span className={PREMIUM_LABEL_CLASS}>Titre</span>
                              <input
                                type="text"
                                value={nativeStudio.page_content[previewEditingSection].title}
                                onChange={(event) =>
                                  updateNativeStudioPageContent(
                                    previewEditingSection,
                                    "title",
                                    event.target.value
                                  )
                                }
                                className={PREMIUM_INPUT_CLASS}
                              />
                            </label>
                            <label className="space-y-1.5 text-sm">
                              <span className={PREMIUM_LABEL_CLASS}>Texte</span>
                              <textarea
                                value={nativeStudio.page_content[previewEditingSection].intro}
                                onChange={(event) =>
                                  updateNativeStudioPageContent(
                                    previewEditingSection,
                                    "intro",
                                    event.target.value
                                  )
                                }
                                rows={4}
                                className={PREMIUM_TEXTAREA_CLASS}
                              />
                            </label>
                            <label className="space-y-1.5 text-sm">
                              <span className={PREMIUM_LABEL_CLASS}>Image URL</span>
                              <input
                                type="text"
                                value={nativeStudio.page_content[previewEditingSection].image_url}
                                onChange={(event) =>
                                  updateNativeStudioPageContent(
                                    previewEditingSection,
                                    "image_url",
                                    event.target.value
                                  )
                                }
                                className={PREMIUM_INPUT_CLASS}
                              />
                            </label>
                            <label className="space-y-1.5 text-sm">
                              <span className={PREMIUM_LABEL_CLASS}>Image alt</span>
                              <input
                                type="text"
                                value={nativeStudio.page_content[previewEditingSection].image_alt}
                                onChange={(event) =>
                                  updateNativeStudioPageContent(
                                    previewEditingSection,
                                    "image_alt",
                                    event.target.value
                                  )
                                }
                                className={PREMIUM_INPUT_CLASS}
                              />
                            </label>
                            <div className="grid gap-2 md:grid-cols-2">
                              <label className="space-y-1 text-xs">
                                <span className={PREMIUM_LABEL_CLASS}>
                                  Focal X ({nativeStudio.page_content[previewEditingSection].image_focal_x}%)
                                </span>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  step={1}
                                  value={nativeStudio.page_content[previewEditingSection].image_focal_x}
                                  onChange={(event) =>
                                    updateNativeStudioPageContent(
                                      previewEditingSection,
                                      "image_focal_x",
                                      Number(event.target.value)
                                    )
                                  }
                                  className="w-full"
                                />
                              </label>
                              <label className="space-y-1 text-xs">
                                <span className={PREMIUM_LABEL_CLASS}>
                                  Focal Y ({nativeStudio.page_content[previewEditingSection].image_focal_y}%)
                                </span>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  step={1}
                                  value={nativeStudio.page_content[previewEditingSection].image_focal_y}
                                  onChange={(event) =>
                                    updateNativeStudioPageContent(
                                      previewEditingSection,
                                      "image_focal_y",
                                      Number(event.target.value)
                                    )
                                  }
                                  className="w-full"
                                />
                              </label>
                            </div>
                            <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-3 text-xs font-semibold text-[rgb(var(--navy))] hover:bg-black/5">
                              {previewMediaUploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                              Upload image
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(event) =>
                                  onQuickMediaPicked(
                                    previewEditingSection,
                                    event.target.files?.[0] ?? null
                                  )
                                }
                              />
                            </label>
                          </div>
                        </div>
                      ) : null}

                      {previewQuickTab === "content" && previewEditingSection === "cta" ? (
                        <div className={DETAILS_BLOCK_CLASS}>
                          <div className={DETAILS_BLOCK_TITLE_CLASS}>CTA</div>
                          <div className="mt-2 grid gap-3 md:grid-cols-2">
                            <label className="space-y-1.5 text-sm">
                              <span className={PREMIUM_LABEL_CLASS}>Label CTA</span>
                              <input
                                type="text"
                                value={ctaLabel}
                                onChange={(event) => setCtaLabel(event.target.value)}
                                className={PREMIUM_INPUT_CLASS}
                              />
                            </label>
                            <label className="space-y-1.5 text-sm">
                              <span className={PREMIUM_LABEL_CLASS}>URL CTA</span>
                              <input
                                type="text"
                                value={ctaUrl}
                                onChange={(event) => setCtaUrl(event.target.value)}
                                className={PREMIUM_INPUT_CLASS}
                              />
                            </label>
                          </div>
                        </div>
                      ) : null}

                      {previewQuickTab === "content" && previewEditingSection === "testimonials" ? (
                        <div className={DETAILS_BLOCK_CLASS}>
                          <div className={DETAILS_BLOCK_TITLE_CLASS}>Testimonials / points forts</div>
                          <label className="mt-2 block space-y-1.5 text-sm">
                            <span className={PREMIUM_LABEL_CLASS}>Une ligne = un point fort</span>
                            <textarea
                              value={highlightsText}
                              onChange={(event) => setHighlightsText(event.target.value)}
                              rows={5}
                              className={PREMIUM_TEXTAREA_CLASS}
                            />
                          </label>
                        </div>
                      ) : null}

                      {false ? (
                      <div className={DETAILS_BLOCK_CLASS}>
                        <div className={DETAILS_BLOCK_TITLE_CLASS}>Style rapide</div>
                        <div className="mt-2 grid gap-3 md:grid-cols-3">
                          <label className="space-y-1.5 text-sm">
                            <span className={PREMIUM_LABEL_CLASS}>Primaire</span>
                            <input
                              type="color"
                              value={brandPrimaryColor}
                              onChange={(event) => setBrandPrimaryColor(event.target.value)}
                              className={PREMIUM_COLOR_CLASS}
                            />
                          </label>
                          <label className="space-y-1.5 text-sm">
                            <span className={PREMIUM_LABEL_CLASS}>Secondaire</span>
                            <input
                              type="color"
                              value={brandSecondaryColor}
                              onChange={(event) => setBrandSecondaryColor(event.target.value)}
                              className={PREMIUM_COLOR_CLASS}
                            />
                          </label>
                          <label className="space-y-1.5 text-sm">
                            <span className={PREMIUM_LABEL_CLASS}>Accent</span>
                            <input
                              type="color"
                              value={brandAccentColor}
                              onChange={(event) => setBrandAccentColor(event.target.value)}
                              className={PREMIUM_COLOR_CLASS}
                            />
                          </label>
                          <label className="space-y-1.5 text-sm md:col-span-3">
                            <span className={PREMIUM_LABEL_CLASS}>Typographie globale</span>
                            <select
                              value={nativeStudio.design_tokens.typography_scale}
                              onChange={(event) =>
                                updateNativeStudioDesignToken(
                                  "typography_scale",
                                  event.target.value as AgencyNativeStudioPayload["design_tokens"]["typography_scale"]
                                )
                              }
                              className="h-11 w-full rounded-2xl border border-[rgb(var(--navy))]/14 bg-white px-3.5 text-sm font-medium text-black/80 outline-none focus:border-[rgb(var(--navy))]/45"
                            >
                              <option value="sm">Compact</option>
                              <option value="md">Normal</option>
                              <option value="lg">Large</option>
                            </select>
                          </label>
                          <label className="space-y-1.5 text-sm">
                            <span className={PREMIUM_LABEL_CLASS}>Espacement sections</span>
                            <select
                              value={nativeStudio.section_spacing}
                              onChange={(event) =>
                                updateNativeStudio(
                                  "section_spacing",
                                  event.target.value as AgencyNativeStudioPayload["section_spacing"]
                                )
                              }
                              className="h-11 w-full rounded-2xl border border-[rgb(var(--navy))]/14 bg-white px-3.5 text-sm font-medium text-black/80 outline-none focus:border-[rgb(var(--navy))]/45"
                            >
                              <option value="compact">Compact</option>
                              <option value="normal">Normal</option>
                              <option value="relaxed">Relaxed</option>
                            </select>
                          </label>
                          <label className="space-y-1.5 text-sm">
                            <span className={PREMIUM_LABEL_CLASS}>Rayon cartes</span>
                            <select
                              value={nativeStudio.card_radius}
                              onChange={(event) =>
                                updateNativeStudio(
                                  "card_radius",
                                  event.target.value as AgencyNativeStudioPayload["card_radius"]
                                )
                              }
                              className="h-11 w-full rounded-2xl border border-[rgb(var(--navy))]/14 bg-white px-3.5 text-sm font-medium text-black/80 outline-none focus:border-[rgb(var(--navy))]/45"
                            >
                              <option value="md">Medium</option>
                              <option value="xl">Large</option>
                              <option value="full">Full</option>
                            </select>
                          </label>
                          <label className="space-y-1.5 text-sm">
                            <span className={PREMIUM_LABEL_CLASS}>Rayon boutons</span>
                            <select
                              value={nativeStudio.button_radius}
                              onChange={(event) =>
                                updateNativeStudio(
                                  "button_radius",
                                  event.target.value as AgencyNativeStudioPayload["button_radius"]
                                )
                              }
                              className="h-11 w-full rounded-2xl border border-[rgb(var(--navy))]/14 bg-white px-3.5 text-sm font-medium text-black/80 outline-none focus:border-[rgb(var(--navy))]/45"
                            >
                              <option value="md">Medium</option>
                              <option value="xl">Large</option>
                              <option value="full">Full</option>
                            </select>
                          </label>
                          <label className="space-y-1.5 text-sm">
                            <span className={PREMIUM_LABEL_CLASS}>Police titres</span>
                            <select
                              value={nativeStudio.design_system.heading_font}
                              onChange={(event) =>
                                updateNativeStudioDesignSystem(
                                  "heading_font",
                                  event.target.value as AgencyNativeStudioPayload["design_system"]["heading_font"]
                                )
                              }
                              className="h-11 w-full rounded-2xl border border-[rgb(var(--navy))]/14 bg-white px-3.5 text-sm font-medium text-black/80 outline-none focus:border-[rgb(var(--navy))]/45"
                            >
                              <option value="playfair">Playfair</option>
                              <option value="montserrat">Montserrat</option>
                              <option value="lora">Lora</option>
                            </select>
                          </label>
                          <label className="space-y-1.5 text-sm">
                            <span className={PREMIUM_LABEL_CLASS}>Police texte</span>
                            <select
                              value={nativeStudio.design_system.body_font}
                              onChange={(event) =>
                                updateNativeStudioDesignSystem(
                                  "body_font",
                                  event.target.value as AgencyNativeStudioPayload["design_system"]["body_font"]
                                )
                              }
                              className="h-11 w-full rounded-2xl border border-[rgb(var(--navy))]/14 bg-white px-3.5 text-sm font-medium text-black/80 outline-none focus:border-[rgb(var(--navy))]/45"
                            >
                              <option value="manrope">Manrope</option>
                              <option value="inter">Inter</option>
                              <option value="poppins">Poppins</option>
                            </select>
                          </label>
                          <label className="space-y-1.5 text-sm">
                            <span className={PREMIUM_LABEL_CLASS}>Ombres cartes</span>
                            <select
                              value={nativeStudio.design_system.shadow_intensity}
                              onChange={(event) =>
                                updateNativeStudioDesignSystem(
                                  "shadow_intensity",
                                  event.target.value as AgencyNativeStudioPayload["design_system"]["shadow_intensity"]
                                )
                              }
                              className="h-11 w-full rounded-2xl border border-[rgb(var(--navy))]/14 bg-white px-3.5 text-sm font-medium text-black/80 outline-none focus:border-[rgb(var(--navy))]/45"
                            >
                              <option value="soft">Soft</option>
                              <option value="medium">Medium</option>
                              <option value="strong">Strong</option>
                            </select>
                          </label>
                          <div className="space-y-2 text-sm md:col-span-3">
                            <span className={PREMIUM_LABEL_CLASS}>Responsive par device</span>
                            <div className="grid gap-2 md:grid-cols-3">
                              {([
                                ["mobile", "Mobile"],
                                ["tablet", "Tablet"],
                                ["desktop", "Desktop"],
                              ] as const).map(([deviceKey, deviceLabel]) => (
                                <div key={`quick-style-${deviceKey}`} className="rounded-2xl border border-black/10 bg-white p-2.5">
                                  <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-black/55">
                                    {deviceLabel}
                                  </div>
                                  <label className="mt-2 block space-y-1">
                                    <span className="text-[10px] text-black/55">Typographie</span>
                                    <select
                                      value={nativeStudio.responsive_overrides[deviceKey].typography_scale}
                                      onChange={(event) =>
                                        updateNativeStudioResponsiveOverride(
                                          deviceKey,
                                          "typography_scale",
                                          event.target.value as AgencyNativeStudioPayload["responsive_overrides"]["mobile"]["typography_scale"]
                                        )
                                      }
                                      className="h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs font-medium text-[rgb(var(--navy))] outline-none focus:border-[rgb(var(--navy))]/35"
                                    >
                                      <option value="sm">Compact</option>
                                      <option value="md">Normal</option>
                                      <option value="lg">Large</option>
                                    </select>
                                  </label>
                                  <label className="mt-2 block space-y-1">
                                    <span className="text-[10px] text-black/55">Spacing</span>
                                    <select
                                      value={nativeStudio.responsive_overrides[deviceKey].section_spacing}
                                      onChange={(event) =>
                                        updateNativeStudioResponsiveOverride(
                                          deviceKey,
                                          "section_spacing",
                                          event.target.value as AgencyNativeStudioPayload["responsive_overrides"]["mobile"]["section_spacing"]
                                        )
                                      }
                                      className="h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs font-medium text-[rgb(var(--navy))] outline-none focus:border-[rgb(var(--navy))]/35"
                                    >
                                      <option value="compact">Compact</option>
                                      <option value="normal">Normal</option>
                                      <option value="relaxed">Relaxed</option>
                                    </select>
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      ) : null}

                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewEditingSection(null)}
                          className="inline-flex h-10 items-center rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
                        >
                          Fermer
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewReloadNonce((prev) => prev + 1)}
                          className="inline-flex h-10 items-center rounded-xl bg-[rgb(var(--navy))] px-4 text-sm font-semibold text-white hover:opacity-95"
                        >
                          Reload preview
                        </button>
                      </div>
                    </div>
                  </div>
                </div>,
                document.body
              )
            : null}

          {isCommandPaletteOpen && typeof document !== "undefined"
            ? createPortal(
                <div
                  className="fixed inset-0 z-[11000] flex items-start justify-center bg-black/45 p-4 backdrop-blur-[2px] md:p-10"
                  onClick={() => closeCommandPalette()}
                >
                  <div
                    className="w-full max-w-2xl rounded-2xl border border-black/10 bg-white p-3 shadow-[0_24px_48px_rgba(15,23,42,0.2)]"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-black/55">
                        Command palette
                      </div>
                      <div className="text-[10px] text-black/45">Ctrl/Cmd + K</div>
                    </div>
                    <input
                      ref={commandInputRef}
                      type="text"
                      value={commandQuery}
                      onChange={(event) => {
                        setCommandQuery(event.target.value);
                        setCommandActiveIndex(0);
                      }}
                      placeholder="Search actions: save, add section, preview..."
                      className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-[rgb(var(--navy))] outline-none focus:border-[rgb(var(--navy))]/40"
                    />
                    <div className="mt-2 max-h-[50vh] overflow-y-auto rounded-xl border border-black/10 bg-slate-50/70 p-1.5">
                      {filteredCommandPaletteItems.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-black/15 bg-white px-3 py-2 text-xs text-black/55">
                          No matching action.
                        </div>
                      ) : (
                        filteredCommandPaletteItems.slice(0, 16).map((item, index) => (
                          <button
                            key={item.id}
                            type="button"
                            onMouseEnter={() => setCommandActiveIndex(index)}
                            onClick={() => runCommandPaletteItem(item)}
                            className={`flex w-full items-start justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition ${
                              index === commandActiveIndex
                                ? "border-[rgb(var(--navy))]/35 bg-[rgb(var(--navy))]/5"
                                : "border-transparent bg-white hover:border-black/10"
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-[rgb(var(--navy))]">
                                {item.label}
                              </span>
                              <span className="block truncate text-[11px] text-black/55">{item.hint}</span>
                            </span>
                            <span className="rounded-md border border-black/10 bg-white px-2 py-0.5 text-[10px] text-black/45">
                              Enter
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                    <div className="mt-2 text-[10px] text-black/50">
                      Enter to run, Esc to close, Arrow keys to navigate.
                    </div>
                  </div>
                </div>,
                document.body
              )
            : null}

          {errorMsg ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMsg}</div> : null}
          {successMsg ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMsg}</div> : null}

          <article className="hidden">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/55">Publication</div>
              <span className="rounded-full border border-black/10 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/60">
                Etat: {publishStateLabel}
              </span>
            </div>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-[11px] text-black/55">Action a l&apos;enregistrement</span>
                <select
                  value={publishAction}
                  onChange={(event) => setPublishAction(event.target.value as PublicationAction)}
                  className="h-10 w-full rounded-xl border border-black/10 bg-white px-2.5 text-xs font-semibold text-[rgb(var(--navy))] outline-none focus:border-[rgb(var(--navy))]/40"
                >
                  <option value="save">Save changes</option>
                  <option value="draft">Save as draft</option>
                  <option value="publish">Publish now</option>
                  <option value="schedule">Schedule publish</option>
                </select>
              </label>
              {publishAction === "schedule" ? (
                <label className="space-y-1">
                  <span className="text-[11px] text-black/55">Date de publication</span>
                  <input
                    type="datetime-local"
                    value={isoToDatetimeLocal(nativeStudio.scheduled_publish_at)}
                    onChange={(event) =>
                      updateNativeStudio("scheduled_publish_at", datetimeLocalToIso(event.target.value))
                    }
                    className="h-10 w-full rounded-xl border border-black/10 bg-white px-2.5 text-xs font-semibold text-[rgb(var(--navy))] outline-none focus:border-[rgb(var(--navy))]/40"
                  />
                </label>
              ) : (
                <div className="rounded-xl border border-black/10 bg-slate-50 px-3 py-2 text-[11px] text-black/60">
                  {nativeStudio.publish_state === "published"
                    ? "Version live active."
                    : nativeStudio.publish_state === "scheduled"
                      ? "Une publication planifiee est preparee."
                      : "Mode brouillon actif."}
                </div>
              )}
            </div>
            <div className="mt-2 rounded-xl border border-black/10 bg-white px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-black/50">Diff vs publication</div>
              <div className="mt-1 text-[11px] text-black/70">{publishDiff.slice(0, 3).join(" - ")}</div>
            </div>
            <div className="mt-2 rounded-xl border border-black/10 bg-white px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-black/50">Checklist publication</div>
              {publishChecklistIssues.length === 0 ? (
                <p className="mt-1 text-[11px] text-emerald-700">Tous les controles sont valides.</p>
              ) : (
                <ul className="mt-1 space-y-0.5 text-[11px] text-amber-700">
                  {publishChecklistIssues.slice(0, 4).map((issue) => (
                    <li key={issue}>- {issue}</li>
                  ))}
                </ul>
              )}
            </div>
          </article>

          <div className="hidden">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[rgb(var(--navy))] px-4 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Building2 size={15} />}
              {publishActionLabel}
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

        <aside className={`space-y-4 transition ${isAnyDetailsModalOpen ? "pointer-events-none invisible" : ""}`}>
          <div className="grid items-start gap-4 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
          <article
            ref={inspectorPanelRef}
            className={`rounded-3xl border border-black/10 bg-white/92 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.08)] transition xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto md:p-5 ${
              isInspectorFocusedFlash ? "ring-2 ring-[rgb(var(--gold))]/45" : ""
            }`}
          >
            <div className="rounded-2xl border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
                  <Building2 size={13} />
                  Builder workspace
                </div>
                <button
                  type="button"
                  onClick={autoGenerateSlug}
                  className="inline-flex h-7 items-center rounded-md border border-black/10 bg-white px-2 text-[10px] font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
                >
                  Quick setup
                </button>
              </div>
              <p className="mt-2.5 text-xs text-black/65">
                Structure, elements and CMS-inspired controls.
              </p>
              <div className="mt-3 inline-flex w-full rounded-lg border border-black/10 bg-white p-1 text-[10px] font-semibold uppercase tracking-[0.08em]">
                {([
                  ["structure", "Structure"],
                  ["elements", "Elements"],
                  ["cms", "CMS"],
                ] as const).map(([key, label]) => (
                  <button
                    key={`builder-tab-${key}`}
                    type="button"
                    onClick={() => setLeftBuilderTab(key)}
                    className={`flex-1 rounded-md px-2 py-1 transition ${
                      leftBuilderTab === key
                        ? "bg-[rgb(var(--navy))] text-white"
                        : "text-[rgb(var(--navy))] hover:bg-black/5"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3.5 space-y-3">
              {leftBuilderTab === "structure"
                ? structurePages.map((page) => (
                <section key={page.id} className="overflow-hidden rounded-2xl border border-black/10 bg-white">
                  <button
                    type="button"
                    onClick={() => toggleStructurePage(page.id)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-slate-50"
                    aria-expanded={openStructurePages[page.id] === true}
                  >
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/55">
                        {page.label}
                      </div>
                      <div className="text-[10px] text-black/45">{page.sections.length} sections</div>
                    </div>
                    <div className="inline-flex items-center gap-1">
                      <span className="rounded-full border border-black/10 bg-white px-2 py-0.5 text-[10px] font-semibold text-black/60">
                        {page.sections.reduce((count, section) => count + section.components.length, 0)} comp
                      </span>
                      {openStructurePages[page.id] ? (
                        <ChevronDown size={14} className="text-black/45" />
                      ) : (
                        <ChevronRight size={14} className="text-black/45" />
                      )}
                    </div>
                  </button>

                  {openStructurePages[page.id] ? (
                    <div className="space-y-2 border-t border-black/10 bg-slate-50/70 p-2.5">
                      {page.sections.map((section) => (
                        <div key={section.id} className="overflow-hidden rounded-xl border border-black/10 bg-white">
                          <div className="flex items-center gap-1.5 px-2.5 py-2">
                            <button
                              type="button"
                              onClick={() => toggleStructureSection(section.id)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-black/10 bg-white text-black/50 hover:bg-slate-100"
                              aria-expanded={openStructureSections[section.id] === true}
                            >
                              {openStructureSections[section.id] ? (
                                <ChevronDown size={12} />
                              ) : (
                                <ChevronRight size={12} />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => selectSection(section.editableSection, { focusInspector: true })}
                              className="min-w-0 flex-1 truncate text-left text-[11px] font-semibold text-[rgb(var(--navy))] hover:underline"
                            >
                              {section.label}
                            </button>
                            <button
                              type="button"
                              onClick={() => previewActionRef.current(section.editableSection, "style")}
                              className="inline-flex h-7 items-center rounded-md border border-black/10 bg-white px-2 text-[10px] font-semibold text-black/60 hover:bg-slate-100"
                            >
                              Style
                            </button>
                          </div>

                          {openStructureSections[section.id] ? (
                            <div className="space-y-1 border-t border-black/10 bg-slate-50 px-2.5 py-2">
                              {section.components.map((component) => (
                                (() => {
                                  const pathKey = component.selectPath?.join(".");
                                  const isActive =
                                    component.selectKind === "component"
                                      ? selection.selectedKind === "component" &&
                                        ((component.componentId && selection.selectedId === component.componentId) ||
                                          (pathKey && selection.selectedPath.join(".") === pathKey))
                                      : selection.selectedKind === "section" &&
                                        selection.selectedId === section.editableSection &&
                                        Boolean(pathKey) &&
                                        selection.selectedPath.join(".") === pathKey;
                                  return (
                                    <button
                                      key={`${section.id}-${component.id}`}
                                      type="button"
                                      onClick={() => selectFromStructure(section.editableSection, component)}
                                      className={`flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-[10px] transition ${
                                        isActive
                                          ? "border-[rgb(var(--navy))]/35 bg-[rgb(var(--navy))]/10 text-[rgb(var(--navy))]"
                                          : "border-black/10 bg-white text-black/65 hover:border-[rgb(var(--navy))]/20 hover:bg-white/90"
                                      }`}
                                    >
                                      <span
                                        className={`inline-block h-1.5 w-1.5 rounded-full ${
                                          isActive ? "bg-[rgb(var(--navy))]" : "bg-black/35"
                                        }`}
                                      />
                                      <span className="truncate">{component.label}</span>
                                      <span className="ml-auto rounded-full border border-black/10 bg-white px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] text-black/45">
                                        {component.selectKind}
                                      </span>
                                    </button>
                                  );
                                })()
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>
              ))
                : null}

              {leftBuilderTab === "elements" ? (
                <>
                  <section className="rounded-2xl border border-black/10 bg-white p-2.5">
                    <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-black/55">
                      Section templates
                    </div>
                    <div className="mt-2 grid gap-2">
                      {STUDIO_TEMPLATE_OPTIONS.map((template) => (
                        <button
                          key={`elements-template-${template.id}`}
                          type="button"
                          onClick={() => applyStudioTemplate(template.id)}
                          className="rounded-xl border border-black/10 bg-white p-2 text-left transition hover:border-[rgb(var(--navy))]/25 hover:bg-slate-50"
                        >
                          <div
                            className="h-14 rounded-lg border border-white/25"
                            style={{ background: template.preview }}
                          />
                          <div className="mt-1.5 flex items-center justify-between gap-2">
                            <div className="text-[11px] font-semibold text-[rgb(var(--navy))]">
                              {template.label}
                            </div>
                            <span className="rounded-full border border-black/10 bg-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-black/55">
                              Apply
                            </span>
                          </div>
                          <p className="mt-1 text-[10px] text-black/55">{template.subtitle}</p>
                        </button>
                      ))}
                    </div>
                  </section>

                  {ELEMENT_LIBRARY_GROUPS.map((group) => (
                    <section key={group.id} className="overflow-hidden rounded-2xl border border-black/10 bg-white">
                      <button
                        type="button"
                        onClick={() => toggleElementGroup(group.id)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50"
                      >
                        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/55">
                          {group.title}
                        </span>
                        {openElementGroups[group.id] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </button>
                      {openElementGroups[group.id] ? (
                        <div className="space-y-1 border-t border-black/10 bg-slate-50 p-2">
                          {group.items.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => applyElementLibraryAction(item.action)}
                              className="flex w-full items-center justify-between rounded-md border border-black/10 bg-white px-2 py-1.5 text-left text-[11px] text-[rgb(var(--navy))] hover:bg-black/5"
                            >
                              <span>{item.label}</span>
                              <span className="text-[10px] text-black/45">+</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </section>
                  ))}
                </>
              ) : null}

              {leftBuilderTab === "cms" ? (
                <section className="space-y-2">
                  <div className="rounded-2xl border border-black/10 bg-white p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/55">Collection lists</div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                      <div className="rounded-lg border border-black/10 bg-slate-50 px-2 py-1.5 text-black/70">
                        Services: {servicesList.length}
                      </div>
                      <div className="rounded-lg border border-black/10 bg-slate-50 px-2 py-1.5 text-black/70">
                        Highlights: {highlightsList.length}
                      </div>
                      <div className="rounded-lg border border-black/10 bg-slate-50 px-2 py-1.5 text-black/70">
                        Gallery: {galleryItems.length}
                      </div>
                      <div className="rounded-lg border border-black/10 bg-slate-50 px-2 py-1.5 text-black/70">
                        Blocks: {nativeStudio.blocks.length}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-black/10 bg-white p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/55">Quick content actions</div>
                    <div className="mt-2 grid gap-1.5">
                      <button
                        type="button"
                        onClick={() => applyStudioTemplate("luxury")}
                        className="rounded-md border border-black/10 bg-white px-2 py-1.5 text-left text-[11px] text-[rgb(var(--navy))] hover:bg-black/5"
                      >
                        Apply luxury starter
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          applySmartTone("premium");
                          syncArabicFromFrench();
                        }}
                        className="rounded-md border border-black/10 bg-white px-2 py-1.5 text-left text-[11px] text-[rgb(var(--navy))] hover:bg-black/5"
                      >
                        Generate premium copy
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeftBuilderTab("elements")}
                        className="rounded-md border border-black/10 bg-white px-2 py-1.5 text-left text-[11px] text-[rgb(var(--navy))] hover:bg-black/5"
                      >
                        Open elements library
                      </button>
                    </div>
                  </div>
                </section>
              ) : null}
            </div>
          </article>
          {!previewAsVisitor ? (
          <article className="hidden">
            <div className="rounded-2xl border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] p-3.5">
              <div className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
                <SlidersHorizontal size={13} />
                Studio controls
              </div>
              <p className="mt-2.5 text-xs text-black/65">
                Panneau de design: theme, structure et visibilite des sections.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em]">
                <span className="rounded-full border border-black/10 bg-white px-2 py-1 text-black/60">
                  {nativeStudio.blocks.length} blocs
                </span>
                <span className="rounded-full border border-black/10 bg-white px-2 py-1 text-black/60">
                  {enabledPreviewSectionCount} sections actives
                </span>
                <span className="rounded-full border border-black/10 bg-white px-2 py-1 text-black/60">
                  {previewDevice}
                </span>
              </div>
            </div>

            <div className="mt-3.5 space-y-3.5">
              <section className="rounded-2xl border border-black/10 bg-white p-3">
                <button
                  type="button"
                  onClick={() => toggleSidebarPanel("theme")}
                  className="flex w-full items-center justify-between gap-2 text-left"
                  aria-expanded={openSidebarPanels.theme}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/55">Theme</div>
                  <div className="text-[10px] text-black/45">
                    Palette rapide {openSidebarPanels.theme ? "[-]" : "[+]"}
                  </div>
                </button>
                {openSidebarPanels.theme ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {THEME_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyThemePreset(preset.id)}
                        className={`inline-flex h-8 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition ${
                          selectedThemePreset === preset.id
                            ? "border-[rgb(var(--navy))]/35 bg-[rgb(var(--navy))] text-white shadow-sm"
                            : "border-black/10 bg-white text-[rgb(var(--navy))] hover:bg-black/5"
                        }`}
                      >
                        <span className="inline-flex h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: preset.accent }} />
                        {preset.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </section>

              <section className="rounded-2xl border border-black/10 bg-white p-3">
                <button
                  type="button"
                  onClick={() => toggleSidebarPanel("layout")}
                  className="flex w-full items-center justify-between gap-2 text-left"
                  aria-expanded={openSidebarPanels.layout}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/55">Studio layout</div>
                  <div className="text-[10px] text-black/45">
                    Structure globale {openSidebarPanels.layout ? "[-]" : "[+]"}
                  </div>
                </button>
                {openSidebarPanels.layout ? (
                  <div className="mt-2.5 space-y-2.5">
                  <div>
                    <div className="text-[11px] text-black/55">Hero</div>
                    <div className="mt-1 inline-flex rounded-xl border border-black/10 bg-white p-1 text-xs">
                      {[
                        ["compact", "Compact"],
                        ["classic", "Classic"],
                        ["immersive", "Immersive"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            updateNativeStudio(
                              "hero_variant",
                              value as AgencyNativeStudioPayload["hero_variant"]
                            )
                          }
                          className={`rounded-lg px-2.5 py-1.5 font-semibold transition ${
                            nativeStudio.hero_variant === value
                              ? "bg-[rgb(var(--navy))] text-white"
                              : "text-[rgb(var(--navy))] hover:bg-black/5"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1">
                      <span className="text-[11px] text-black/55">Densite</span>
                      <select
                        value={nativeStudio.card_density}
                        onChange={(e) =>
                          updateNativeStudio(
                            "card_density",
                            e.target.value as AgencyNativeStudioPayload["card_density"]
                          )
                        }
                        className="h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs font-medium text-[rgb(var(--navy))] outline-none focus:border-[rgb(var(--navy))]/35"
                      >
                        <option value="comfortable">Confort</option>
                        <option value="compact">Compact</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] text-black/55">Surface</span>
                      <select
                        value={nativeStudio.section_surface}
                        onChange={(e) =>
                          updateNativeStudio(
                            "section_surface",
                            e.target.value as AgencyNativeStudioPayload["section_surface"]
                          )
                        }
                        className="h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs font-medium text-[rgb(var(--navy))] outline-none focus:border-[rgb(var(--navy))]/35"
                      >
                        <option value="soft">Soft card</option>
                        <option value="flat">Flat</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] text-black/55">CTA</span>
                      <select
                        value={nativeStudio.cta_style}
                        onChange={(e) =>
                          updateNativeStudio(
                            "cta_style",
                            e.target.value as AgencyNativeStudioPayload["cta_style"]
                          )
                        }
                        className="h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs font-medium text-[rgb(var(--navy))] outline-none focus:border-[rgb(var(--navy))]/35"
                      >
                        <option value="solid">Solid</option>
                        <option value="outline">Outline</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] text-black/55">Colonnes biens</span>
                      <select
                        value={nativeStudio.marketplace_columns}
                        onChange={(e) =>
                          updateNativeStudio(
                            "marketplace_columns",
                            e.target.value as AgencyNativeStudioPayload["marketplace_columns"]
                          )
                        }
                        className="h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs font-medium text-[rgb(var(--navy))] outline-none focus:border-[rgb(var(--navy))]/35"
                      >
                        <option value="2">2</option>
                        <option value="3">3</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] text-black/55">Rayon cartes</span>
                      <select
                        value={nativeStudio.card_radius}
                        onChange={(e) =>
                          updateNativeStudio(
                            "card_radius",
                            e.target.value as AgencyNativeStudioPayload["card_radius"]
                          )
                        }
                        className="h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs font-medium text-[rgb(var(--navy))] outline-none focus:border-[rgb(var(--navy))]/35"
                      >
                        <option value="md">Medium</option>
                        <option value="xl">Large</option>
                        <option value="full">Full</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] text-black/55">Rayon boutons</span>
                      <select
                        value={nativeStudio.button_radius}
                        onChange={(e) =>
                          updateNativeStudio(
                            "button_radius",
                            e.target.value as AgencyNativeStudioPayload["button_radius"]
                          )
                        }
                        className="h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs font-medium text-[rgb(var(--navy))] outline-none focus:border-[rgb(var(--navy))]/35"
                      >
                        <option value="md">Medium</option>
                        <option value="xl">Large</option>
                        <option value="full">Full</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] text-black/55">Espacement sections</span>
                      <select
                        value={nativeStudio.section_spacing}
                        onChange={(e) =>
                          updateNativeStudio(
                            "section_spacing",
                            e.target.value as AgencyNativeStudioPayload["section_spacing"]
                          )
                        }
                        className="h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs font-medium text-[rgb(var(--navy))] outline-none focus:border-[rgb(var(--navy))]/35"
                      >
                        <option value="compact">Compact</option>
                        <option value="normal">Normal</option>
                        <option value="relaxed">Relaxed</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] text-black/55">Largeur contenu</span>
                      <select
                        value={nativeStudio.design_tokens.container_width}
                        onChange={(e) =>
                          updateNativeStudioDesignToken(
                            "container_width",
                            e.target.value as AgencyNativeStudioPayload["design_tokens"]["container_width"]
                          )
                        }
                        className="h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs font-medium text-[rgb(var(--navy))] outline-none focus:border-[rgb(var(--navy))]/35"
                      >
                        <option value="narrow">Narrow</option>
                        <option value="normal">Normal</option>
                        <option value="wide">Wide</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] text-black/55">Typographie</span>
                      <select
                        value={nativeStudio.design_tokens.typography_scale}
                        onChange={(e) =>
                          updateNativeStudioDesignToken(
                            "typography_scale",
                            e.target.value as AgencyNativeStudioPayload["design_tokens"]["typography_scale"]
                          )
                        }
                        className="h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs font-medium text-[rgb(var(--navy))] outline-none focus:border-[rgb(var(--navy))]/35"
                      >
                        <option value="sm">Compact</option>
                        <option value="md">Normal</option>
                        <option value="lg">Large</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] text-black/55">Animations</span>
                      <select
                        value={nativeStudio.design_tokens.motion_level}
                        onChange={(e) =>
                          updateNativeStudioDesignToken(
                            "motion_level",
                            e.target.value as AgencyNativeStudioPayload["design_tokens"]["motion_level"]
                          )
                        }
                        className="h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs font-medium text-[rgb(var(--navy))] outline-none focus:border-[rgb(var(--navy))]/35"
                      >
                        <option value="none">Aucune</option>
                        <option value="subtle">Subtle</option>
                        <option value="rich">Rich</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] text-black/55">Mobile conversion rail</span>
                      <select
                        value={nativeStudio.mobile_conversion_rail ? "on" : "off"}
                        onChange={(e) => updateNativeStudio("mobile_conversion_rail", e.target.value === "on")}
                        className="h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs font-medium text-[rgb(var(--navy))] outline-none focus:border-[rgb(var(--navy))]/35"
                      >
                        <option value="on">Active</option>
                        <option value="off">Inactive</option>
                      </select>
                    </label>
                  </div>

                  <div className="rounded-xl border border-black/10 bg-slate-50 p-2.5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/55">
                      Design system
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label className="space-y-1">
                        <span className="text-[11px] text-black/55">Police titres</span>
                        <select
                          value={nativeStudio.design_system.heading_font}
                          onChange={(event) =>
                            updateNativeStudioDesignSystem(
                              "heading_font",
                              event.target.value as AgencyNativeStudioPayload["design_system"]["heading_font"]
                            )
                          }
                          className="h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs font-medium text-[rgb(var(--navy))] outline-none focus:border-[rgb(var(--navy))]/35"
                        >
                          <option value="playfair">Playfair</option>
                          <option value="montserrat">Montserrat</option>
                          <option value="lora">Lora</option>
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-[11px] text-black/55">Police texte</span>
                        <select
                          value={nativeStudio.design_system.body_font}
                          onChange={(event) =>
                            updateNativeStudioDesignSystem(
                              "body_font",
                              event.target.value as AgencyNativeStudioPayload["design_system"]["body_font"]
                            )
                          }
                          className="h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs font-medium text-[rgb(var(--navy))] outline-none focus:border-[rgb(var(--navy))]/35"
                        >
                          <option value="manrope">Manrope</option>
                          <option value="inter">Inter</option>
                          <option value="poppins">Poppins</option>
                        </select>
                      </label>
                      <label className="space-y-1 col-span-2">
                        <span className="text-[11px] text-black/55">Ombres cartes</span>
                        <select
                          value={nativeStudio.design_system.shadow_intensity}
                          onChange={(event) =>
                            updateNativeStudioDesignSystem(
                              "shadow_intensity",
                              event.target.value as AgencyNativeStudioPayload["design_system"]["shadow_intensity"]
                            )
                          }
                          className="h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs font-medium text-[rgb(var(--navy))] outline-none focus:border-[rgb(var(--navy))]/35"
                        >
                          <option value="soft">Soft</option>
                          <option value="medium">Medium</option>
                          <option value="strong">Strong</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="rounded-xl border border-black/10 bg-slate-50 p-2.5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/55">
                      Responsive overrides
                    </div>
                    <p className="mt-1 text-[10px] text-black/55">
                      Controlez la typo et l&apos;espacement par device.
                    </p>
                    <div className="mt-2 grid gap-2">
                      {([
                        ["mobile", "Mobile"],
                        ["tablet", "Tablet"],
                        ["desktop", "Desktop"],
                      ] as const).map(([deviceKey, deviceLabel]) => (
                        <div
                          key={`layout-responsive-${deviceKey}`}
                          className="rounded-lg border border-black/10 bg-white p-2"
                        >
                          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-black/55">
                            {deviceLabel}
                          </div>
                          <div className="mt-1.5 grid grid-cols-2 gap-2">
                            <label className="space-y-1">
                              <span className="text-[10px] text-black/55">Typo</span>
                              <select
                                value={nativeStudio.responsive_overrides[deviceKey].typography_scale}
                                onChange={(event) =>
                                  updateNativeStudioResponsiveOverride(
                                    deviceKey,
                                    "typography_scale",
                                    event.target.value as AgencyNativeStudioPayload["responsive_overrides"]["mobile"]["typography_scale"]
                                  )
                                }
                                className="h-8 w-full rounded-md border border-black/10 bg-white px-2 text-[11px] font-medium text-[rgb(var(--navy))] outline-none focus:border-[rgb(var(--navy))]/35"
                              >
                                <option value="sm">Compact</option>
                                <option value="md">Normal</option>
                                <option value="lg">Large</option>
                              </select>
                            </label>
                            <label className="space-y-1">
                              <span className="text-[10px] text-black/55">Spacing</span>
                              <select
                                value={nativeStudio.responsive_overrides[deviceKey].section_spacing}
                                onChange={(event) =>
                                  updateNativeStudioResponsiveOverride(
                                    deviceKey,
                                    "section_spacing",
                                    event.target.value as AgencyNativeStudioPayload["responsive_overrides"]["mobile"]["section_spacing"]
                                  )
                                }
                                className="h-8 w-full rounded-md border border-black/10 bg-white px-2 text-[11px] font-medium text-[rgb(var(--navy))] outline-none focus:border-[rgb(var(--navy))]/35"
                              >
                                <option value="compact">Compact</option>
                                <option value="normal">Normal</option>
                                <option value="relaxed">Relaxed</option>
                              </select>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                ) : null}
              </section>

              <section className="rounded-2xl border border-black/10 bg-white p-3">
                <button
                  type="button"
                  onClick={() => toggleSidebarPanel("blocks")}
                  className="flex w-full items-center justify-between gap-2 text-left"
                  aria-expanded={openSidebarPanels.blocks}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/55">Studio blocks</div>
                  <div className="text-[10px] text-black/45">
                    Contenu personnalise {openSidebarPanels.blocks ? "[-]" : "[+]"}
                  </div>
                </button>
                {openSidebarPanels.blocks ? (
                  <div className="mt-2.5 space-y-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {STUDIO_BLOCK_TYPE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => addNativeStudioBlock(option.value)}
                        className="inline-flex h-8 items-center rounded-lg border border-black/10 bg-white px-2.5 text-[11px] font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
                      >
                        + {option.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={saveSelectedBlockToLibrary}
                      disabled={!selectedStudioBlock}
                      className="inline-flex h-8 items-center rounded-lg border border-black/10 bg-white px-2.5 text-[11px] font-semibold text-[rgb(var(--navy))] hover:bg-black/5 disabled:opacity-50"
                    >
                      Sauver en library
                    </button>
                  </div>

                  <div className="rounded-xl border border-black/10 bg-white p-2.5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/55">
                      Reusable block library
                    </div>
                    {nativeStudio.block_library.length === 0 ? (
                      <p className="mt-1.5 text-[11px] text-black/50">Sauvez un bloc pour le reutiliser sur d&apos;autres pages.</p>
                    ) : (
                      <div className="mt-2 space-y-1.5">
                        {nativeStudio.block_library.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-2 py-1.5"
                          >
                            <div className="min-w-0 flex-1 truncate text-[11px] font-medium text-[rgb(var(--navy))]">
                              {entry.name}
                              <span className="ml-1 text-[10px] uppercase tracking-wide text-black/45">
                                {entry.block.section}/{entry.block.type}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => insertLibraryBlock(entry.id)}
                              className="inline-flex h-7 items-center rounded-md border border-black/10 bg-white px-2 text-[10px] font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
                            >
                              Inserer
                            </button>
                            <button
                              type="button"
                              onClick={() => removeLibraryBlock(entry.id)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                              aria-label="Supprimer modele"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {nativeStudio.blocks.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-black/15 bg-white px-2.5 py-2 text-[11px] text-black/55">
                      Aucun bloc custom. Ajoutez un bloc puis glissez-deposez pour reordonner.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {nativeStudio.blocks.map((block) => (
                        <div
                          key={block.id}
                          draggable
                          onDragStart={() => setDraggedStudioBlockId(block.id)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => onNativeStudioBlockDrop(block.id)}
                          onDragEnd={() => setDraggedStudioBlockId(null)}
                          className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs ${
                            selectedStudioBlockId === block.id
                              ? "border-[rgb(var(--navy))]/35 bg-[rgb(var(--navy))]/8"
                              : "border-black/10 bg-white"
                          }`}
                        >
                          <GripVertical size={13} className="shrink-0 text-black/45" />
                          <button
                            type="button"
                            onClick={() => setSelectedStudioBlockId(block.id)}
                            className="min-w-0 flex-1 truncate text-left font-medium text-[rgb(var(--navy))]"
                          >
                            {block.title || "Sans titre"}
                            <span className="ml-1 text-[10px] uppercase tracking-wide text-black/45">
                              {block.section} / {block.type}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeNativeStudioBlock(block.id)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                            aria-label="Supprimer bloc"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedStudioBlock ? (
                    <div className="space-y-2 rounded-xl border border-black/10 bg-white p-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <label className="space-y-1">
                          <span className="text-[11px] text-black/55">Type</span>
                          <select
                            value={selectedStudioBlock.type}
                            onChange={(e) =>
                              updateNativeStudioBlock(selectedStudioBlock.id, {
                                type: e.target.value as AgencyNativeStudioBlockType,
                              })
                            }
                            className="h-8 w-full rounded-md border border-black/10 bg-white px-2 text-[11px] font-medium text-[rgb(var(--navy))]"
                          >
                            {STUDIO_BLOCK_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-1">
                          <span className="text-[11px] text-black/55">Section</span>
                          <select
                            value={selectedStudioBlock.section}
                            onChange={(e) =>
                              updateNativeStudioBlock(selectedStudioBlock.id, {
                                section: e.target.value as StudioBlockSection,
                              })
                            }
                            className="h-8 w-full rounded-md border border-black/10 bg-white px-2 text-[11px] font-medium text-[rgb(var(--navy))]"
                          >
                            {STUDIO_BLOCK_SECTION_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <label className="space-y-1">
                        <span className="text-[11px] text-black/55">Titre</span>
                        <input
                          type="text"
                          value={selectedStudioBlock.title}
                          onChange={(e) =>
                            updateNativeStudioBlock(selectedStudioBlock.id, {
                              title: e.target.value.slice(0, 80),
                            })
                          }
                          className="h-8 w-full rounded-md border border-black/10 bg-white px-2 text-[11px] font-medium text-[rgb(var(--navy))]"
                        />
                      </label>

                      <label className="space-y-1">
                        <span className="text-[11px] text-black/55">
                          {selectedStudioBlock.type === "list" ? "Elements (1 ligne = 1 item)" : "Contenu"}
                        </span>
                        <textarea
                          value={selectedStudioBlock.body}
                          onChange={(e) =>
                            updateNativeStudioBlock(selectedStudioBlock.id, {
                              body: e.target.value.slice(0, 1200),
                            })
                          }
                          rows={selectedStudioBlock.type === "list" ? 5 : 3}
                          className="w-full rounded-md border border-black/10 bg-white px-2 py-1.5 text-[11px] text-[rgb(var(--navy))]"
                        />
                      </label>

                      {selectedStudioBlock.type === "cta" ? (
                        <div className="grid grid-cols-2 gap-2">
                          <label className="space-y-1">
                            <span className="text-[11px] text-black/55">Label CTA</span>
                            <input
                              type="text"
                              value={selectedStudioBlock.cta_label}
                              onChange={(e) =>
                                updateNativeStudioBlock(selectedStudioBlock.id, {
                                  cta_label: e.target.value.slice(0, 60),
                                })
                              }
                              className="h-8 w-full rounded-md border border-black/10 bg-white px-2 text-[11px] font-medium text-[rgb(var(--navy))]"
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-[11px] text-black/55">Lien CTA</span>
                            <input
                              type="text"
                              value={selectedStudioBlock.cta_href}
                              onChange={(e) =>
                                updateNativeStudioBlock(selectedStudioBlock.id, {
                                  cta_href: e.target.value.slice(0, 300),
                                })
                              }
                              placeholder="https://... ou /contact"
                              className="h-8 w-full rounded-md border border-black/10 bg-white px-2 text-[11px] font-medium text-[rgb(var(--navy))]"
                            />
                          </label>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                ) : null}
              </section>

              <section className="rounded-2xl border border-black/10 bg-white p-3">
                <button
                  type="button"
                  onClick={() => toggleSidebarPanel("previewMode")}
                  className="flex w-full items-center justify-between gap-2 text-left"
                  aria-expanded={openSidebarPanels.previewMode}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/55">Preview mode</div>
                  <div className="text-[10px] text-black/45">
                    Simulation d&apos;ecran {openSidebarPanels.previewMode ? "[-]" : "[+]"}
                  </div>
                </button>
                {openSidebarPanels.previewMode ? (
                  <div className="mt-2 space-y-2">
                    <div className="inline-flex rounded-xl border border-black/10 bg-white p-1">
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
                        onClick={() => setPreviewDevice("tablet")}
                        className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          previewDevice === "tablet" ? "bg-[rgb(var(--navy))] text-white" : "text-[rgb(var(--navy))] hover:bg-black/5"
                        }`}
                      >
                        Tablet
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
                    <div className="inline-flex rounded-xl border border-black/10 bg-white p-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setPreviewAsVisitor(false)}
                        className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                          !previewAsVisitor ? "bg-[rgb(var(--navy))] text-white" : "text-[rgb(var(--navy))] hover:bg-black/5"
                        }`}
                      >
                        Studio
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewAsVisitor(true)}
                        className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                          previewAsVisitor ? "bg-[rgb(var(--navy))] text-white" : "text-[rgb(var(--navy))] hover:bg-black/5"
                        }`}
                      >
                        Visitor
                      </button>
                    </div>
                    <div className="inline-flex rounded-xl border border-black/10 bg-white p-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setContentLocale("fr")}
                        className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                          contentLocale === "fr" ? "bg-[rgb(var(--navy))] text-white" : "text-[rgb(var(--navy))] hover:bg-black/5"
                        }`}
                      >
                        FR
                      </button>
                      <button
                        type="button"
                        onClick={() => setContentLocale("ar")}
                        className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                          contentLocale === "ar" ? "bg-[rgb(var(--navy))] text-white" : "text-[rgb(var(--navy))] hover:bg-black/5"
                        }`}
                      >
                        AR
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="rounded-2xl border border-black/10 bg-white p-3">
                <button
                  type="button"
                  onClick={() => toggleSidebarPanel("sections")}
                  className="flex w-full items-center justify-between gap-2 text-left"
                  aria-expanded={openSidebarPanels.sections}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/55">Sections visibles</div>
                  <div className="text-[10px] text-black/45">
                    Activer/desactiver {openSidebarPanels.sections ? "[-]" : "[+]"}
                  </div>
                </button>
                {openSidebarPanels.sections ? (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-black/75">
                    <label className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={showServicesPreview}
                        onChange={(e) => setShowServicesPreview(e.target.checked)}
                        className="h-3.5 w-3.5 accent-[rgb(var(--navy))]"
                      />
                      Services
                    </label>
                    <label className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={showHighlightsPreview}
                        onChange={(e) => setShowHighlightsPreview(e.target.checked)}
                        className="h-3.5 w-3.5 accent-[rgb(var(--navy))]"
                      />
                      Points forts
                    </label>
                    <label className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={showContactPreview}
                        onChange={(e) => setShowContactPreview(e.target.checked)}
                        className="h-3.5 w-3.5 accent-[rgb(var(--navy))]"
                      />
                      Contact
                    </label>
                    <label className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={showMarketplacePreview}
                        onChange={(e) => setShowMarketplacePreview(e.target.checked)}
                        className="h-3.5 w-3.5 accent-[rgb(var(--navy))]"
                      />
                      Marketplace
                    </label>
                  </div>
                ) : null}
              </section>

              <section className="rounded-2xl border border-black/10 bg-white p-3">
                <button
                  type="button"
                  onClick={() => toggleSidebarPanel("order")}
                  className="flex w-full items-center justify-between gap-2 text-left"
                  aria-expanded={openSidebarPanels.order}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/55">
                    Ordre des sections
                  </div>
                  <div className="text-[10px] text-black/45">
                    Glisser-deposer {openSidebarPanels.order ? "[-]" : "[+]"}
                  </div>
                </button>
                {openSidebarPanels.order ? (
                  <>
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
                  </>
                ) : null}
              </section>

              <section className="rounded-2xl border border-black/10 bg-white p-3">
                <button
                  type="button"
                  onClick={() => toggleSidebarPanel("actions")}
                  className="flex w-full items-center justify-between gap-2 text-left"
                  aria-expanded={openSidebarPanels.actions}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/55">Actions</div>
                  <div className="text-[10px] text-black/45">
                    Raccourcis {openSidebarPanels.actions ? "[-]" : "[+]"}
                  </div>
                </button>
                {openSidebarPanels.actions ? (
                  <div className="mt-2 space-y-2">
                    <button
                      type="button"
                      onClick={applyBuilderDefaults}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[rgb(var(--navy))]/15 bg-white px-3.5 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--navy))] transition hover:bg-black/5"
                    >
                      <WandSparkles size={14} />
                      Appliquer defaults intelligents
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={undoLastChange}
                        disabled={!undoStack.length}
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-black/10 bg-white px-2 text-[11px] font-semibold text-[rgb(var(--navy))] hover:bg-black/5 disabled:opacity-40"
                      >
                        Undo ({undoStack.length})
                      </button>
                      <button
                        type="button"
                        onClick={redoLastUndo}
                        disabled={!redoStack.length}
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-black/10 bg-white px-2 text-[11px] font-semibold text-[rgb(var(--navy))] hover:bg-black/5 disabled:opacity-40"
                      >
                        Redo ({redoStack.length})
                      </button>
                    </div>

                    <div className="rounded-xl border border-black/10 bg-white p-2.5">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/55">
                        Templates
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {STUDIO_TEMPLATE_OPTIONS.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => applyStudioTemplate(template.id)}
                            className="inline-flex h-8 items-center rounded-lg border border-black/10 bg-white px-2.5 text-[11px] font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
                          >
                            {template.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-black/10 bg-white p-2.5">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/55">
                        AI helpers
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => applySmartTone("premium")}
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-black/10 bg-white px-2 text-[10px] font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
                        >
                          Premium tone
                        </button>
                        <button
                          type="button"
                          onClick={() => applySmartTone("friendly")}
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-black/10 bg-white px-2 text-[10px] font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
                        >
                          Friendly tone
                        </button>
                        <button
                          type="button"
                          onClick={() => applySmartTone("investor")}
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-black/10 bg-white px-2 text-[10px] font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
                        >
                          Investor tone
                        </button>
                      </div>
                      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={syncArabicFromFrench}
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-black/10 bg-white px-2 text-[10px] font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
                        >
                          Sync FR - AR
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            applySectionPreset("about", "luxury");
                            applySectionPreset("services", "corporate");
                            applySectionPreset("contact", "minimal");
                            applySectionPreset("marketplace", "luxury");
                          }}
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-black/10 bg-white px-2 text-[10px] font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
                        >
                          Generate variants
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-black/10 bg-white p-2.5">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/55">
                        SEO health
                      </div>
                      <p className={`mt-1 text-[11px] ${seoIssues.length === 0 ? "text-emerald-700" : "text-amber-700"}`}>
                        {seoIssues.length === 0 ? "Aucun point bloquant." : `${seoIssues.length} point(s) a corriger.`}
                      </p>
                    </div>

                    <div className="rounded-xl border border-black/10 bg-white p-2.5">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/55">
                        Link audit
                      </div>
                      <p className={`mt-1 text-[11px] ${linkAuditIssues.length === 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        {linkAuditIssues.length === 0 ? "Tous les liens sont valides." : `${linkAuditIssues.length} lien(s) invalide(s).`}
                      </p>
                    </div>

                    <div className="rounded-xl border border-black/10 bg-white p-2.5">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/55">
                        Accessibility
                      </div>
                      <p
                        className={`mt-1 text-[11px] ${
                          accessibilityIssues.length === 0 ? "text-emerald-700" : "text-amber-700"
                        }`}
                      >
                        {accessibilityIssues.length === 0
                          ? "Aucun point a11y critique."
                          : `${accessibilityIssues.length} point(s) a ameliorer.`}
                      </p>
                      {accessibilityIssues.length > 0 ? (
                        <ul className="mt-1 space-y-0.5 text-[10px] text-amber-700">
                          {accessibilityIssues.slice(0, 4).map((issue) => (
                            <li key={issue}>- {issue}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>

                    <div className="rounded-xl border border-black/10 bg-white p-2.5">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/55">
                        Collaboration
                      </div>
                      <p className="mt-1 text-[11px] text-black/65">
                        Editeurs actifs: {collabPeers.length + 1}
                      </p>
                      <div className="mt-2 grid gap-1.5">
                        <select
                          value={collabSection}
                          onChange={(event) => setCollabSection(event.target.value as AgencyEditableSectionId)}
                          className="h-8 rounded-lg border border-black/10 bg-white px-2 text-[11px] text-[rgb(var(--navy))]"
                        >
                          {Object.entries(PREVIEW_SECTION_LABELS).map(([id, name]) => (
                            <option key={id} value={id}>
                              {name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={collabComment}
                          onChange={(event) => setCollabComment(event.target.value)}
                          placeholder="Ajouter un commentaire..."
                          className="h-8 rounded-lg border border-black/10 bg-white px-2 text-[11px] text-[rgb(var(--navy))]"
                        />
                        <button
                          type="button"
                          onClick={addCollabComment}
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-black/10 bg-white px-2 text-[10px] font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
                        >
                          Publier
                        </button>
                      </div>
                      {collabComments.length > 0 ? (
                        <div className="mt-2 max-h-28 space-y-1 overflow-y-auto rounded-lg border border-black/10 bg-slate-50 p-1.5">
                          {collabComments.slice(0, 6).map((comment) => (
                            <div key={comment.id} className="rounded-md border border-black/10 bg-white px-2 py-1">
                              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-black/50">
                                {PREVIEW_SECTION_LABELS[comment.section]}
                              </div>
                              <div className="text-[11px] text-black/75">{comment.text}</div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-xl border border-black/10 bg-white p-2.5">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/55">
                        Publish workflow
                      </div>
                      <p
                        className={`mt-1 text-[11px] ${
                          publishChecklistIssues.length === 0 ? "text-emerald-700" : "text-amber-700"
                        }`}
                      >
                        {publishChecklistIssues.length === 0
                          ? "Checklist publication OK."
                          : `${publishChecklistIssues.length} verification(s) en attente.`}
                      </p>
                      <div className="mt-1 text-[10px] text-black/55">
                        Staging URL: {canPublish ? publicHref : "Slug requis"}
                      </div>
                      <button
                        type="button"
                        onClick={rollbackToPublishedSnapshot}
                        className="mt-2 inline-flex h-8 w-full items-center justify-center rounded-lg border border-black/10 bg-white px-2 text-[10px] font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
                      >
                        Rollback vers version publiee
                      </button>
                    </div>

                    <div className="rounded-xl border border-black/10 bg-white p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/55">
                          History
                        </div>
                        <button
                          type="button"
                          onClick={() => addHistoryEntry("Manual snapshot")}
                          className="inline-flex h-7 items-center rounded-lg border border-black/10 px-2 text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--navy))] hover:bg-black/5"
                        >
                          Snapshot
                        </button>
                      </div>
                      <p className="mt-1 text-[10px] text-black/50">
                        {lastAutoSavedAt ? `Autosave: ${lastAutoSavedAt}` : "Autosave actif (15s)."}
                      </p>
                      <div className="mt-2 space-y-1.5">
                        {historyEntries.length === 0 ? (
                          <p className="text-[11px] text-black/50">Aucune version enregistree.</p>
                        ) : (
                          historyEntries.map((entry) => (
                            <button
                              key={entry.id}
                              type="button"
                              onClick={() => restoreHistoryEntry(entry)}
                              className="flex w-full items-center justify-between rounded-lg border border-black/10 bg-white px-2 py-1.5 text-left text-[11px] text-[rgb(var(--navy))] hover:bg-black/5"
                            >
                              <span>{entry.label}</span>
                              <span className="text-black/45">{new Date(entry.savedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>
            </div>
          </article>
          ) : null}

          <article className="rounded-3xl border border-black/10 bg-white/88 p-5 shadow-sm md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
                <Eye size={13} />
                Live preview
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="inline-flex rounded-lg border border-black/10 bg-white p-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setPreviewRenderer("real")}
                    className={`rounded-md px-2.5 py-1 font-semibold transition ${
                      previewRenderer === "real"
                        ? "bg-[rgb(var(--navy))] text-white"
                        : "text-[rgb(var(--navy))] hover:bg-black/5"
                    }`}
                  >
                    Real
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewRenderer("studio")}
                    className={`rounded-md px-2.5 py-1 font-semibold transition ${
                      previewRenderer === "studio"
                        ? "bg-[rgb(var(--navy))] text-white"
                        : "text-[rgb(var(--navy))] hover:bg-black/5"
                    }`}
                  >
                    Studio
                  </button>
                </div>
                {previewRenderer === "studio" ? (
                  <div className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-white p-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--navy))]">
                    {(["fit", 30, 50, 75, 100, 125] as const).map((preset) => (
                      <button
                        key={`zoom-preset-studio-${preset}`}
                        type="button"
                        onClick={() => setCanvasZoomPreset(preset)}
                        className={`rounded-md px-2 py-1 transition ${
                          canvasZoomPreset === preset
                            ? "bg-[rgb(var(--navy))] text-white"
                            : "hover:bg-black/5"
                        }`}
                      >
                        {preset === "fit" ? "Fit" : `${preset}%`}
                      </button>
                    ))}
                    <span className="rounded-md border border-black/10 bg-white px-2 py-1 text-[9px] text-black/55">
                      {canvasZoomLabel}
                    </span>
                  </div>
                ) : null}
                {previewRenderer === "real" ? (
                  <div className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-white p-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--navy))]">
                    {(["fit", 30, 50, 75, 100, 125] as const).map((preset) => (
                      <button
                        key={`zoom-preset-real-${preset}`}
                        type="button"
                        onClick={() => setRealZoomPreset(preset)}
                        className={`rounded-md px-2 py-1 transition ${
                          realZoomPreset === preset
                            ? "bg-[rgb(var(--navy))] text-white"
                            : "hover:bg-black/5"
                        }`}
                      >
                        {preset === "fit" ? "Fit" : `${preset}%`}
                      </button>
                    ))}
                    <span className="rounded-md border border-black/10 bg-white px-2 py-1 text-[9px] text-black/55">
                      {realZoomLabel}
                    </span>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => setPreviewAsVisitor((prev) => !prev)}
                  className="inline-flex h-8 items-center rounded-lg border border-black/10 bg-white px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--navy))] hover:bg-black/5"
                >
                  {previewAsVisitor ? "Edit mode" : "Visitor mode"}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewReloadNonce((prev) => prev + 1)}
                  className="inline-flex h-8 items-center rounded-lg border border-black/10 bg-white px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--navy))] hover:bg-black/5"
                >
                  Reload
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewSplitCompare((prev) => !prev)}
                  className={`inline-flex h-8 items-center rounded-lg border px-3 text-[11px] font-semibold uppercase tracking-[0.08em] ${
                    previewSplitCompare
                      ? "border-[rgb(var(--navy))]/35 bg-[rgb(var(--navy))] text-white"
                      : "border-black/10 bg-white text-[rgb(var(--navy))] hover:bg-black/5"
                  }`}
                >
                  Compare
                </button>
                {previewRenderer === "real" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewSplitCompare(false);
                      setRealZoomPreset("fit");
                    }}
                    className="inline-flex h-8 items-center rounded-lg border border-black/10 bg-white px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--navy))] hover:bg-black/5"
                  >
                    Focus real
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => openCommandPalette()}
                  className="inline-flex h-8 items-center rounded-lg border border-black/10 bg-white px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--navy))] hover:bg-black/5"
                >
                  Command
                </button>
              </div>
            </div>

            <div
              className={`mt-4 ${
                previewRenderer === "real"
                  ? previewDevice === "mobile"
                    ? "mx-auto max-w-[360px]"
                    : previewDevice === "tablet"
                      ? "mx-auto max-w-[860px]"
                      : ""
                  : ""
              }`}
            >
              <div className="overflow-hidden rounded-2xl border border-black/10 shadow-[0_12px_28px_rgba(15,23,42,0.14)]">
                {previewRenderer === "real" ? (
                  <div ref={realViewportRef} className="overflow-auto bg-slate-50/60">
                    <div className="mx-auto min-w-fit bg-white" style={{ width: `${canvasBaseWidth}px`, zoom: realZoomScale }}>
                      <div className="space-y-2 bg-white p-2.5">
                        <p className="text-[11px] text-black/60">
                          Apercu reel de votre vitrine. Enregistrez les changements puis cliquez sur Reload.
                        </p>
                        <div className="text-[10px] text-black/50">
                          Raccourcis zoom: Ctrl/Cmd +, Ctrl/Cmd -, Ctrl/Cmd 0
                        </div>
                        {canPublish ? (
                          previewSplitCompare ? (
                            <div className="grid gap-2 lg:grid-cols-2">
                              <iframe
                                ref={realPreviewFrameRef}
                                title="Apercu reel vitrine"
                                src={previewFrameSrc}
                                onLoad={() => syncRealPreviewSelection()}
                                className="h-[calc(100vh-8rem)] w-full rounded-xl border border-black/10 bg-white"
                              />
                              <div className="h-[calc(100vh-8rem)] overflow-y-auto rounded-xl border border-black/10 bg-slate-50 p-3">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/55">
                                  Draft vs Published
                                </div>
                                <div className="mt-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-[11px] text-black/70">
                                  Etat draft: {publishStateLabel}
                                </div>
                                <ul className="mt-2 space-y-1.5 text-[11px] text-black/75">
                                  {publishDiff.map((item) => (
                                    <li
                                      key={item}
                                      className="rounded-md border border-black/10 bg-white px-2.5 py-1.5"
                                    >
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                                <div className="mt-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-[10px] text-black/55">
                                  Utilisez Save draft pour tester vos changements, puis Publish now apres validation.
                                </div>
                              </div>
                            </div>
                          ) : (
                            <iframe
                              ref={realPreviewFrameRef}
                              title="Apercu reel vitrine"
                              src={previewFrameSrc}
                              onLoad={() => syncRealPreviewSelection()}
                              className="h-[calc(100vh-8rem)] w-full rounded-xl border border-black/10 bg-white"
                            />
                          )
                        ) : (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                            Definissez un slug valide (min 3 caracteres) pour afficher l&apos;apercu reel.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div ref={canvasViewportRef} className="overflow-auto bg-slate-50/60">
                    <div className="mx-auto min-w-fit" style={{ width: `${canvasBaseWidth}px`, zoom: canvasZoomScale }}>
                <div className="border-b border-black/10 bg-white/90 px-3 py-2 backdrop-blur">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/60">
                      <span>Home</span>
                      <ChevronRight size={11} />
                      <span>
                        {selection.selectedKind === "page"
                          ? "Page"
                          : selection.selectedKind === "section"
                            ? `Section: ${selection.selectedId}`
                            : `Item: ${selection.selectedId}`}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={undoLastChange}
                        className="inline-flex h-7 items-center rounded-md border border-black/10 bg-white px-2 text-[10px] font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
                      >
                        Undo
                      </button>
                      <button
                        type="button"
                        onClick={redoLastUndo}
                        className="inline-flex h-7 items-center rounded-md border border-black/10 bg-white px-2 text-[10px] font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
                      >
                        Redo
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeftBuilderTab("elements")}
                        className="inline-flex h-7 items-center rounded-md border border-black/10 bg-white px-2 text-[10px] font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
                      >
                        + Insert
                      </button>
                    </div>
                  </div>
                </div>
                <div className="border-b border-black/10 bg-white/80 px-4 py-2.5 backdrop-blur">
                  <div className="flex flex-wrap gap-1.5">
                    {previewSectionOrder.map((key) => (
                      <span
                        key={`preview-nav-${key}`}
                        className="inline-flex rounded-full border border-black/10 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/60"
                      >
                        {SECTION_LABEL_BY_KEY[key]}
                      </span>
                    ))}
                  </div>
                </div>

                <div
                  className="max-h-[calc(100vh-8rem)] overflow-y-auto [&_h1]:[font-family:var(--preview-heading-font)] [&_h2]:[font-family:var(--preview-heading-font)] [&_h3]:[font-family:var(--preview-heading-font)]"
                  style={{
                    backgroundColor: brandSecondaryColor,
                    fontFamily: previewBodyFontFamily,
                    ["--preview-heading-font" as string]: previewHeadingFontFamily,
                  }}
                  onClick={(event) => {
                    if (event.target === event.currentTarget) clearCanvasSelection();
                  }}
                >
                  <div
                    className={`relative ${previewHeroHeightClass} cursor-pointer transition ${
                      isSectionSelected("hero") ? "ring-2 ring-[rgb(var(--navy))]/45" : "hover:ring-1 hover:ring-[rgb(var(--navy))]/25"
                    }`}
                    data-section-id="hero"
                    onClick={(event) => {
                      event.stopPropagation();
                      selectSection("hero");
                    }}
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      selectSection("hero", { focusInspector: true });
                    }}
                  >
                    {renderSectionToolbar("hero")}
                    {coverUrl ? (
                      <Image
                        src={coverUrl}
                        alt={nativeStudio.hero_image_alt || "Cover preview"}
                        fill
                        sizes="1200px"
                        className="object-cover"
                        style={{
                          objectPosition: `${nativeStudio.hero_image_focal_x}% ${nativeStudio.hero_image_focal_y}%`,
                        }}
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-100" />
                    )}
                    <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${brandPrimaryColor}99 0%, ${brandPrimaryColor}d9 100%)` }} />
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <div className="text-xs uppercase tracking-[0.12em] text-white/75">{localizedAboutTitle || "A propos"}</div>
                      <h2
                        className="mt-1 text-lg font-extrabold outline-none"
                        contentEditable={inlineEditingPath === "hero.headline"}
                        suppressContentEditableWarning
                        onClick={(event) => event.stopPropagation()}
                        onDoubleClick={(event) => {
                          event.stopPropagation();
                          selectSection("hero", { focusInspector: true });
                          setInlineEditingPath("hero.headline");
                        }}
                        onBlur={(event) => {
                          setHeroTitle(readEditableText(event));
                          setInlineEditingPath(null);
                        }}
                      >
                        {localizedHeroTitle || initial.agencyName}
                      </h2>
                      <div
                        className="mt-1 text-xs text-white/85 outline-none"
                        contentEditable={inlineEditingPath === "hero.subheadline"}
                        suppressContentEditableWarning
                        onClick={(event) => event.stopPropagation()}
                        onDoubleClick={(event) => {
                          event.stopPropagation();
                          selectSection("hero", { focusInspector: true });
                          setInlineEditingPath("hero.subheadline");
                        }}
                        onBlur={(event) => {
                          setTagline(readEditableText(event));
                          setInlineEditingPath(null);
                        }}
                      >
                        {localizedTagline || "Votre partenaire immobilier"}
                      </div>
                    </div>
                  </div>

                  <div className={`${previewSectionSpacingClass} ${previewTypographyClass} p-4 text-black/80`}>
                    {previewSectionOrder.map((sectionKey) => {
                      if (sectionKey === "about") {
                        return (
                          <section
                            key={sectionKey}
                            className={`relative space-y-2.5 rounded-xl p-1.5 transition ${
                              isSectionSelected("about") ? "ring-2 ring-[rgb(var(--navy))]/45" : "hover:ring-1 hover:ring-[rgb(var(--navy))]/25"
                            }`}
                            data-section-id="about"
                            onDragOver={(event) => {
                              if (canvasDragState?.kind === "section") event.preventDefault();
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              reorderSectionsByDrag("about");
                            }}
                            onClick={(event) => {
                              event.stopPropagation();
                              selectSection("about");
                            }}
                            onDoubleClick={(event) => {
                              event.stopPropagation();
                              selectSection("about", { focusInspector: true });
                            }}
                          >
                            {renderSectionToolbar("about")}
                            <div className="flex items-center gap-2">
                              {renderCanvasDragHandle({
                                label: "Drag about section",
                                active: canvasDragState?.kind === "section" && canvasDragState.section === "about",
                                onStart: () => setCanvasDragState({ kind: "section", section: "about" }),
                              })}
                              <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/55">
                                {SECTION_LABEL_BY_KEY[sectionKey]}
                              </div>
                            </div>
                            <div className={previewCardClass}>
                              {aboutPageContent.image_url ? (
                                <div className="relative mb-2 h-24 w-full overflow-hidden rounded-xl border border-black/10 bg-slate-100">
                                  <Image
                                    src={aboutPageContent.image_url}
                                    alt={aboutPageContent.image_alt || aboutPageContent.title || "A propos"}
                                    fill
                                    sizes="600px"
                                    className="object-cover"
                                    style={{
                                      objectPosition: `${aboutPageContent.image_focal_x}% ${aboutPageContent.image_focal_y}%`,
                                    }}
                                    unoptimized
                                  />
                                </div>
                              ) : null}
                              <div
                                className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/55 outline-none"
                                contentEditable={inlineEditingPath === "about.title"}
                                suppressContentEditableWarning
                                onClick={(event) => event.stopPropagation()}
                                onDoubleClick={(event) => {
                                  event.stopPropagation();
                                  selectSection("about", { focusInspector: true });
                                  setInlineEditingPath("about.title");
                                }}
                                onBlur={(event) => {
                                  updateNativeStudioPageContent("about", "title", readEditableText(event));
                                  setInlineEditingPath(null);
                                }}
                              >
                                {aboutPageContent.title || "A propos"}
                              </div>
                              <p
                                className="whitespace-pre-line text-xs text-black/75 outline-none"
                                contentEditable={inlineEditingPath === "about.intro"}
                                suppressContentEditableWarning
                                onClick={(event) => event.stopPropagation()}
                                onDoubleClick={(event) => {
                                  event.stopPropagation();
                                  selectSection("about", { focusInspector: true });
                                  setInlineEditingPath("about.intro");
                                }}
                                onBlur={(event) => {
                                  updateNativeStudioPageContent("about", "intro", readEditableText(event));
                                  setInlineEditingPath(null);
                                }}
                              >
                                {aboutPageContent.intro ||
                                  localizedDescription ||
                                  "Ajoutez une description pour afficher votre positionnement."}
                              </p>
                              {localizedHeroSubtitle ? <p className="mt-2 text-[11px] text-black/60">{localizedHeroSubtitle}</p> : null}
                            </div>
                            {previewBlocksBySection.about.map((block, index) =>
                              renderPreviewStudioBlock(block, index, "about")
                            )}
                          </section>
                        );
                      }

                      if (sectionKey === "services") {
                        return (
                          <section
                            key={sectionKey}
                            className={`relative space-y-2.5 rounded-xl p-1.5 transition ${
                              isSectionSelected("services") ? "ring-2 ring-[rgb(var(--navy))]/45" : "hover:ring-1 hover:ring-[rgb(var(--navy))]/25"
                            }`}
                            data-section-id="services"
                            onDragOver={(event) => {
                              if (canvasDragState?.kind === "section") event.preventDefault();
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              reorderSectionsByDrag("services");
                            }}
                            onClick={(event) => {
                              event.stopPropagation();
                              selectSection("services");
                            }}
                            onDoubleClick={(event) => {
                              event.stopPropagation();
                              selectSection("services", { focusInspector: true });
                            }}
                          >
                            {renderSectionToolbar("services")}
                            <div className="flex items-center gap-2">
                              {renderCanvasDragHandle({
                                label: "Drag services section",
                                active: canvasDragState?.kind === "section" && canvasDragState.section === "services",
                                onStart: () => setCanvasDragState({ kind: "section", section: "services" }),
                              })}
                              <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/55">
                                {SECTION_LABEL_BY_KEY[sectionKey]}
                              </div>
                            </div>
                            <div className={previewCardClass}>
                              {servicesPageContent.image_url ? (
                                <div className="relative mb-2 h-24 w-full overflow-hidden rounded-xl border border-black/10 bg-slate-100">
                                  <Image
                                    src={servicesPageContent.image_url}
                                    alt={servicesPageContent.image_alt || servicesPageContent.title || "Services"}
                                    fill
                                    sizes="600px"
                                    className="object-cover"
                                    style={{
                                      objectPosition: `${servicesPageContent.image_focal_x}% ${servicesPageContent.image_focal_y}%`,
                                    }}
                                    unoptimized
                                  />
                                </div>
                              ) : null}
                              <div
                                className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/55 outline-none"
                                contentEditable={inlineEditingPath === "services.title"}
                                suppressContentEditableWarning
                                onClick={(event) => event.stopPropagation()}
                                onDoubleClick={(event) => {
                                  event.stopPropagation();
                                  selectSection("services", { focusInspector: true });
                                  setInlineEditingPath("services.title");
                                }}
                                onBlur={(event) => {
                                  updateNativeStudioPageContent("services", "title", readEditableText(event));
                                  setInlineEditingPath(null);
                                }}
                              >
                                {servicesPageContent.title || "Services"}
                              </div>
                              <p
                                className="mt-1 text-xs text-black/70 outline-none"
                                contentEditable={inlineEditingPath === "services.intro"}
                                suppressContentEditableWarning
                                onClick={(event) => event.stopPropagation()}
                                onDoubleClick={(event) => {
                                  event.stopPropagation();
                                  selectSection("services", { focusInspector: true });
                                  setInlineEditingPath("services.intro");
                                }}
                                onBlur={(event) => {
                                  updateNativeStudioPageContent("services", "intro", readEditableText(event));
                                  setInlineEditingPath(null);
                                }}
                              >
                                {servicesPageContent.intro}
                              </p>
                              {servicesList.length > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {servicesList.map((item, index) => (
                                    <div
                                      key={`${item}-${index}`}
                                      data-item-path={`servicesItems.${index}`}
                                      onDragOver={(event) => {
                                        if (canvasDragState?.kind === "servicesItems") event.preventDefault();
                                      }}
                                      onDrop={(event) => {
                                        event.preventDefault();
                                        onCanvasItemDrop("servicesItems", index);
                                      }}
                                      className={`inline-flex items-center gap-1 rounded-full border px-1 py-0.5 ${
                                        selectedArrayPath === `servicesItems.${index}`
                                          ? "border-[rgb(var(--navy))]/35 bg-[rgb(var(--navy))]/10 text-[rgb(var(--navy))]"
                                          : canvasDragState?.kind === "servicesItems" && canvasDragState.index === index
                                            ? "border-[rgb(var(--navy))]/35 bg-[rgb(var(--navy))]/5"
                                            : "border-black/10 bg-white"
                                      }`}
                                    >
                                      {renderCanvasDragHandle({
                                        label: `Drag service item ${index + 1}`,
                                        active: canvasDragState?.kind === "servicesItems" && canvasDragState.index === index,
                                        onStart: () => setCanvasDragState({ kind: "servicesItems", index }),
                                      })}
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          selectComponent(`services-item-${index}`, ["servicesItems", String(index)]);
                                        }}
                                        onDoubleClick={(event) => {
                                          event.stopPropagation();
                                          selectComponent(
                                            `services-item-${index}`,
                                            ["servicesItems", String(index)],
                                            { focusInspector: true }
                                          );
                                        }}
                                        className="text-[11px]"
                                      >
                                        {item}
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-black/60">Ajoutez des services pour alimenter cette section.</p>
                              )}
                            </div>
                            {showHighlightsPreview ? (
                              <div
                                className={`${previewCardClass} relative cursor-pointer transition ${
                                  isSectionSelected("testimonials") ? "ring-2 ring-[rgb(var(--navy))]/45" : "hover:ring-1 hover:ring-[rgb(var(--navy))]/25"
                                }`}
                                data-section-id="testimonials"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  selectSection("testimonials");
                                }}
                                onDoubleClick={(event) => {
                                  event.stopPropagation();
                                  selectSection("testimonials", { focusInspector: true });
                                }}
                              >
                                {renderSectionToolbar("testimonials")}
                                <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/55">Points forts</div>
                                {highlightsList.length > 0 ? (
                                  <ul className="mt-1.5 space-y-1 text-xs">
                                    {highlightsList.map((item, index) => (
                                      <li
                                        key={`${item}-${index}`}
                                        data-item-path={`highlightsItems.${index}`}
                                        onDragOver={(event) => {
                                          if (canvasDragState?.kind === "highlightsItems") event.preventDefault();
                                        }}
                                        onDrop={(event) => {
                                          event.preventDefault();
                                          onCanvasItemDrop("highlightsItems", index);
                                        }}
                                        className={`flex cursor-pointer items-start gap-1.5 rounded px-1 py-0.5 ${
                                          selectedArrayPath === `highlightsItems.${index}`
                                            ? "bg-[rgb(var(--navy))]/10"
                                            : canvasDragState?.kind === "highlightsItems" && canvasDragState.index === index
                                              ? "bg-[rgb(var(--navy))]/5"
                                              : ""
                                        }`}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          selectComponent(`highlight-item-${index}`, ["highlightsItems", String(index)]);
                                        }}
                                        onDoubleClick={(event) => {
                                          event.stopPropagation();
                                          selectComponent(
                                            `highlight-item-${index}`,
                                            ["highlightsItems", String(index)],
                                            { focusInspector: true }
                                          );
                                        }}
                                      >
                                        {renderCanvasDragHandle({
                                          label: `Drag highlight item ${index + 1}`,
                                          active: canvasDragState?.kind === "highlightsItems" && canvasDragState.index === index,
                                          onStart: () => setCanvasDragState({ kind: "highlightsItems", index }),
                                        })}
                                        <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: brandAccentColor }} />
                                        <span>{item}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="mt-1.5 text-xs text-black/60">Ajoutez des points forts pour enrichir la page.</p>
                                )}
                              </div>
                            ) : null}
                            {previewBlocksBySection.services.map((block, index) =>
                              renderPreviewStudioBlock(block, index, "services")
                            )}
                          </section>
                        );
                      }

                      if (sectionKey === "marketplace") {
                        return (
                          <section
                            key={sectionKey}
                            className={`relative space-y-2.5 rounded-xl p-1.5 transition ${
                              isSectionSelected("marketplace") ? "ring-2 ring-[rgb(var(--navy))]/45" : "hover:ring-1 hover:ring-[rgb(var(--navy))]/25"
                            }`}
                            data-section-id="marketplace"
                            onDragOver={(event) => {
                              if (canvasDragState?.kind === "section") event.preventDefault();
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              reorderSectionsByDrag("marketplace");
                            }}
                            onClick={(event) => {
                              event.stopPropagation();
                              selectSection("marketplace");
                            }}
                            onDoubleClick={(event) => {
                              event.stopPropagation();
                              selectSection("marketplace", { focusInspector: true });
                            }}
                          >
                            {renderSectionToolbar("marketplace")}
                            <div className="flex items-center gap-2">
                              {renderCanvasDragHandle({
                                label: "Drag marketplace section",
                                active: canvasDragState?.kind === "section" && canvasDragState.section === "marketplace",
                                onStart: () => setCanvasDragState({ kind: "section", section: "marketplace" }),
                              })}
                              <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/55">
                                {SECTION_LABEL_BY_KEY[sectionKey]}
                              </div>
                            </div>
                            <div className={previewCardClass}>
                              {marketplacePageContent.image_url ? (
                                <div className="relative mb-2 h-24 w-full overflow-hidden rounded-xl border border-black/10 bg-slate-100">
                                  <Image
                                    src={marketplacePageContent.image_url}
                                    alt={
                                      marketplacePageContent.image_alt ||
                                      marketplacePageContent.title ||
                                      "Marketplace"
                                    }
                                    fill
                                    sizes="600px"
                                    className="object-cover"
                                    style={{
                                      objectPosition: `${marketplacePageContent.image_focal_x}% ${marketplacePageContent.image_focal_y}%`,
                                    }}
                                    unoptimized
                                  />
                                </div>
                              ) : null}
                              <div
                                className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/55 outline-none"
                                contentEditable={inlineEditingPath === "marketplace.title"}
                                suppressContentEditableWarning
                                onClick={(event) => event.stopPropagation()}
                                onDoubleClick={(event) => {
                                  event.stopPropagation();
                                  selectSection("marketplace", { focusInspector: true });
                                  setInlineEditingPath("marketplace.title");
                                }}
                                onBlur={(event) => {
                                  updateNativeStudioPageContent("marketplace", "title", readEditableText(event));
                                  setInlineEditingPath(null);
                                }}
                              >
                                {marketplacePageContent.title || localizedMarketplaceTitle || "Nos biens"}
                              </div>
                              <p
                                className="mt-1 text-xs text-black/70 outline-none"
                                contentEditable={inlineEditingPath === "marketplace.intro"}
                                suppressContentEditableWarning
                                onClick={(event) => event.stopPropagation()}
                                onDoubleClick={(event) => {
                                  event.stopPropagation();
                                  selectSection("marketplace", { focusInspector: true });
                                  setInlineEditingPath("marketplace.intro");
                                }}
                                onBlur={(event) => {
                                  updateNativeStudioPageContent("marketplace", "intro", readEditableText(event));
                                  setInlineEditingPath(null);
                                }}
                              >
                                {marketplacePageContent.intro}
                              </p>
                              <div className={`mt-2 grid ${previewMarketplaceGridClass} gap-2`}>
                                {(galleryItems.length > 0 ? galleryItems : [
                                  { id: "mock-1", title: "Appartement T3 - Oran", body: "", image_url: "", image_alt: "", cta_label: "", cta_href: "", type: "text", section: "marketplace" as const },
                                  { id: "mock-2", title: "Villa - Bir El Djir", body: "", image_url: "", image_alt: "", cta_label: "", cta_href: "", type: "text", section: "marketplace" as const },
                                ]).map((item, index) => (
                                  <button
                                    key={item.id}
                                    type="button"
                                    data-item-path={`galleryItems.${index}`}
                                    onDragOver={(event) => {
                                      if (canvasDragState?.kind === "galleryItems") event.preventDefault();
                                    }}
                                    onDrop={(event) => {
                                      event.preventDefault();
                                      onCanvasItemDrop("galleryItems", index);
                                    }}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      if (galleryItems.length > 0) {
                                        selectComponent(item.id, ["galleryItems", String(index)]);
                                      }
                                    }}
                                    onDoubleClick={(event) => {
                                      event.stopPropagation();
                                      if (galleryItems.length > 0) {
                                        selectComponent(item.id, ["galleryItems", String(index)], {
                                          focusInspector: true,
                                        });
                                      }
                                    }}
                                    className={`relative overflow-hidden rounded-lg border bg-white text-left text-xs ${
                                      selectedArrayPath === `galleryItems.${index}`
                                        ? "border-[rgb(var(--navy))]/35 ring-1 ring-[rgb(var(--navy))]/35"
                                        : canvasDragState?.kind === "galleryItems" && canvasDragState.index === index
                                          ? "border-[rgb(var(--navy))]/35"
                                          : "border-black/10"
                                    }`}
                                  >
                                    {galleryItems.length > 0 ? (
                                      <div className="absolute right-1 top-1 z-10">
                                        {renderCanvasDragHandle({
                                          label: `Drag gallery item ${index + 1}`,
                                          active: canvasDragState?.kind === "galleryItems" && canvasDragState.index === index,
                                          onStart: () => setCanvasDragState({ kind: "galleryItems", index }),
                                        })}
                                      </div>
                                    ) : null}
                                    {item.image_url ? (
                                      <div className="relative h-16 w-full bg-slate-100">
                                        <Image src={item.image_url} alt={item.image_alt || item.title} fill sizes="240px" className="object-cover" unoptimized />
                                      </div>
                                    ) : null}
                                    <div className="p-2">{item.title || `Item ${index + 1}`}</div>
                                  </button>
                                ))}
                              </div>
                            </div>
                            {previewBlocksBySection.marketplace.map((block, index) =>
                              renderPreviewStudioBlock(block, index, "marketplace")
                            )}
                          </section>
                        );
                      }

                      return (
                        <section
                          key={sectionKey}
                          className={`relative space-y-2.5 rounded-xl p-1.5 transition ${
                            isSectionSelected("contact") ? "ring-2 ring-[rgb(var(--navy))]/45" : "hover:ring-1 hover:ring-[rgb(var(--navy))]/25"
                          }`}
                          data-section-id="contact"
                          onDragOver={(event) => {
                            if (canvasDragState?.kind === "section") event.preventDefault();
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            reorderSectionsByDrag("contact");
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            selectSection("contact");
                          }}
                          onDoubleClick={(event) => {
                            event.stopPropagation();
                            selectSection("contact", { focusInspector: true });
                          }}
                        >
                          {renderSectionToolbar("contact")}
                          <div className="flex items-center gap-2">
                            {renderCanvasDragHandle({
                              label: "Drag contact section",
                              active: canvasDragState?.kind === "section" && canvasDragState.section === "contact",
                              onStart: () => setCanvasDragState({ kind: "section", section: "contact" }),
                            })}
                            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/55">
                              {SECTION_LABEL_BY_KEY[sectionKey]}
                            </div>
                          </div>
                          <div className={`${previewCardClass} text-xs`}>
                            {contactPageContent.image_url ? (
                              <div className="relative mb-2 h-24 w-full overflow-hidden rounded-xl border border-black/10 bg-slate-100">
                                <Image
                                  src={contactPageContent.image_url}
                                  alt={contactPageContent.image_alt || contactPageContent.title || "Contact"}
                                  fill
                                  sizes="600px"
                                  className="object-cover"
                                  style={{
                                    objectPosition: `${contactPageContent.image_focal_x}% ${contactPageContent.image_focal_y}%`,
                                  }}
                                  unoptimized
                                />
                              </div>
                            ) : null}
                            <div
                              className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/55 outline-none"
                              contentEditable={inlineEditingPath === "contact.title"}
                              suppressContentEditableWarning
                              onClick={(event) => event.stopPropagation()}
                              onDoubleClick={(event) => {
                                event.stopPropagation();
                                selectSection("contact", { focusInspector: true });
                                setInlineEditingPath("contact.title");
                              }}
                              onBlur={(event) => {
                                updateNativeStudioPageContent("contact", "title", readEditableText(event));
                                setInlineEditingPath(null);
                              }}
                            >
                              {contactPageContent.title || "Contact"}
                            </div>
                            <p
                              className="mb-2 mt-1 text-xs text-black/70 outline-none"
                              contentEditable={inlineEditingPath === "contact.intro"}
                              suppressContentEditableWarning
                              onClick={(event) => event.stopPropagation()}
                              onDoubleClick={(event) => {
                                event.stopPropagation();
                                selectSection("contact", { focusInspector: true });
                                setInlineEditingPath("contact.intro");
                              }}
                              onBlur={(event) => {
                                updateNativeStudioPageContent("contact", "intro", readEditableText(event));
                                setInlineEditingPath(null);
                              }}
                            >
                              {contactPageContent.intro}
                            </p>
                            <div>{contactPhone || initial.agencyPhone}</div>
                            <div>{contactEmail || initial.agencyEmail}</div>
                            <div>{contactAddress || "Adresse a renseigner"}</div>
                            <div>{businessHoursLabel || "09:00-18:00"}</div>
                          </div>
                          {previewBlocksBySection.contact.map((block, index) =>
                            renderPreviewStudioBlock(block, index, "contact")
                          )}
                        </section>
                      );
                    })}

                    <button
                      type="button"
                      data-section-id="cta"
                      onClick={(event) => {
                        event.stopPropagation();
                        selectSection("cta");
                      }}
                      onDoubleClick={(event) => {
                        event.stopPropagation();
                        selectSection("cta", { focusInspector: true });
                      }}
                      className={`relative inline-flex h-9 w-full items-center justify-center px-3 text-xs font-bold transition ${previewButtonRadiusClass} ${
                        nativeStudio.cta_style === "outline"
                          ? "border-2 bg-transparent"
                          : ""
                      } ${isSectionSelected("cta") ? "ring-2 ring-[rgb(var(--navy))]/45" : "hover:ring-1 hover:ring-[rgb(var(--navy))]/25"}`}
                      style={
                        nativeStudio.cta_style === "outline"
                          ? { borderColor: brandAccentColor, color: brandPrimaryColor }
                          : { backgroundColor: brandAccentColor, color: "#0f172a" }
                      }
                    >
                      <span
                        contentEditable={inlineEditingPath === "cta.label"}
                        suppressContentEditableWarning
                        onClick={(event) => event.stopPropagation()}
                        onDoubleClick={(event) => {
                          event.stopPropagation();
                          selectSection("cta", { focusInspector: true });
                          setInlineEditingPath("cta.label");
                        }}
                        onBlur={(event) => {
                          setCtaLabel(readEditableText(event));
                          setInlineEditingPath(null);
                        }}
                      >
                        {localizedCtaLabel || "Nous contacter"}
                      </span>
                    </button>

                    <div className="sticky bottom-3 z-30 mt-3 flex justify-center">
                      <div className="inline-flex items-center gap-1 rounded-xl border border-black/10 bg-white/95 p-1 shadow-sm backdrop-blur">
                        <button
                          type="button"
                          onClick={() => setPreviewDevice("desktop")}
                          className={`inline-flex h-7 items-center rounded-md px-2 text-[10px] font-semibold ${
                            previewDevice === "desktop" ? "bg-[rgb(var(--navy))] text-white" : "text-[rgb(var(--navy))] hover:bg-black/5"
                          }`}
                        >
                          Desktop
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewDevice("tablet")}
                          className={`inline-flex h-7 items-center rounded-md px-2 text-[10px] font-semibold ${
                            previewDevice === "tablet" ? "bg-[rgb(var(--navy))] text-white" : "text-[rgb(var(--navy))] hover:bg-black/5"
                          }`}
                        >
                          Tablet
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewDevice("mobile")}
                          className={`inline-flex h-7 items-center rounded-md px-2 text-[10px] font-semibold ${
                            previewDevice === "mobile" ? "bg-[rgb(var(--navy))] text-white" : "text-[rgb(var(--navy))] hover:bg-black/5"
                          }`}
                        >
                          Mobile
                        </button>
                        <span className="mx-1 h-5 w-px bg-black/10" />
                        <button
                          type="button"
                          onClick={() => setCanvasZoomPreset("fit")}
                          className={`inline-flex h-7 items-center rounded-md px-2 text-[10px] font-semibold ${
                            canvasZoomPreset === "fit" ? "bg-[rgb(var(--navy))] text-white" : "text-[rgb(var(--navy))] hover:bg-black/5"
                          }`}
                        >
                          Fit
                        </button>
                        {[30, 50, 75, 100].map((preset) => (
                          <button
                            key={`canvas-footer-zoom-${preset}`}
                            type="button"
                            onClick={() => setCanvasZoomPreset(preset as PreviewZoomPreset)}
                            className={`inline-flex h-7 items-center rounded-md px-2 text-[10px] font-semibold ${
                              canvasZoomPreset === preset
                                ? "bg-[rgb(var(--navy))] text-white"
                                : "text-[rgb(var(--navy))] hover:bg-black/5"
                            }`}
                          >
                            {preset}%
                          </button>
                        ))}
                        <span className="rounded-md border border-black/10 px-1.5 py-0.5 text-[9px] font-semibold text-black/55">
                          {canvasZoomLabel}
                        </span>
                        <span className="mx-1 h-5 w-px bg-black/10" />
                        <button
                          type="button"
                          onClick={undoLastChange}
                          className="inline-flex h-7 items-center rounded-md px-2 text-[10px] font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
                        >
                          Undo
                        </button>
                        <button
                          type="button"
                          onClick={redoLastUndo}
                          className="inline-flex h-7 items-center rounded-md px-2 text-[10px] font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
                        >
                          Redo
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-black/10 bg-white/92 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.08)] xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto md:p-5">
            <div className="rounded-2xl border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] p-3.5">
              <div className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
                <Palette size={13} />
                Design inspector
              </div>
              <p className="mt-2.5 text-xs text-black/65">
                Tous les outils de style, details visuels et controles responsives.
              </p>
            </div>

            <div className="mt-3 space-y-3">
              <PropertyPanel
                schema={inspectorSchema}
                values={inspectorValues}
                errors={inspectorErrors}
                breadcrumbs={inspectorBreadcrumbs}
                saving={isInspectorSaving}
                onChange={handleInspectorChange}
                onImagePick={handleInspectorImagePick}
                onArrayAdd={handleInspectorArrayAdd}
                onArrayRemove={handleInspectorArrayRemove}
                onArrayMove={handleInspectorArrayMove}
                onArraySelect={handleInspectorArraySelect}
                selectedArrayPath={selectedArrayPath}
                arrayItemLabel={(key, item, index) => {
                  if (key === "galleryItems" && item && typeof item === "object" && "title" in item) {
                    return String((item as { title?: string }).title || `Item ${index + 1}`);
                  }
                  return typeof item === "string" ? item : `Item ${index + 1}`;
                }}
                actions={
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedSectionId) clearPreviewSection(selectedSectionId);
                      }}
                      className="inline-flex h-8 items-center rounded-lg border border-black/10 bg-white px-2.5 text-[10px] font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
                    >
                      Reset to defaults
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedSectionId) applyPreviewSectionAction(selectedSectionId, "duplicate");
                      }}
                      className="inline-flex h-8 items-center rounded-lg border border-black/10 bg-white px-2.5 text-[10px] font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
                    >
                      Duplicate section
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedSectionId) {
                          applyPreviewSectionAction(selectedSectionId, "delete");
                          clearCanvasSelection();
                        }
                      }}
                      className="inline-flex h-8 items-center rounded-lg border border-red-200 bg-red-50 px-2.5 text-[10px] font-semibold text-red-700 hover:bg-red-100"
                    >
                      Delete section
                    </button>
                  </div>
                }
              />

              {inspectorSaveError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
                  {inspectorSaveError}
                </div>
              ) : null}

              <section className="rounded-2xl border border-black/10 bg-white p-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/55">Shortcuts</div>
                <div className="mt-1.5 space-y-1 text-[11px] text-black/65">
                  <div><span className="font-semibold text-[rgb(var(--navy))]">Ctrl/Cmd + K</span> command palette</div>
                  <div><span className="font-semibold text-[rgb(var(--navy))]">Ctrl/Cmd + S</span> save now</div>
                  <div><span className="font-semibold text-[rgb(var(--navy))]">Ctrl/Cmd + D</span> duplicate selected section/item</div>
                  <div><span className="font-semibold text-[rgb(var(--navy))]">Alt + ↑/↓</span> move selected section/item</div>
                  <div><span className="font-semibold text-[rgb(var(--navy))]">Ctrl/Cmd +/-/0</span> zoom active preview</div>
                  <div><span className="font-semibold text-[rgb(var(--navy))]">Esc</span> clear selection</div>
                  <div><span className="font-semibold text-[rgb(var(--navy))]">Del</span> delete selected section/item</div>
                  <div><span className="font-semibold text-[rgb(var(--navy))]">Drag handles</span> reorder sections/items</div>
                  <div>{inspectorLastSavedAt ? `Last autosave: ${inspectorLastSavedAt}` : "Autosave enabled (700ms)"}</div>
                </div>
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => void persistInspectorDraft()}
                    disabled={isInspectorSaving}
                    className="inline-flex h-8 items-center rounded-lg border border-black/10 bg-white px-2.5 text-[10px] font-semibold text-[rgb(var(--navy))] hover:bg-black/5 disabled:opacity-50"
                  >
                    {isInspectorSaving ? "Saving..." : "Save now"}
                  </button>
                </div>
              </section>
            </div>
          </article>
          </div>
        </aside>
        </div>
      </section>
    </main>
  );
}

