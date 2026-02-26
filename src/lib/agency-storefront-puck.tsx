import type { Config, Data } from "@puckeditor/core";

export type AgencyBuilderType = "native" | "puck" | "webstudio";
export type AgencyPuckData = Data;
export type AgencyStorefrontPage = "overview" | "about" | "services" | "contact" | "marketplace";
export type AgencyPuckTarget = "all" | Exclude<AgencyStorefrontPage, "overview">;
export type AgencyNativeStudioSection = Exclude<AgencyStorefrontPage, "overview">;
export type AgencyNativeStudioBlockType = "text" | "list" | "cta";
export type AgencyNativeStudioDesignTokens = {
  container_width: "narrow" | "normal" | "wide";
  typography_scale: "sm" | "md" | "lg";
  motion_level: "none" | "subtle" | "rich";
};
export type AgencyNativeStudioDesignSystem = {
  heading_font: "playfair" | "montserrat" | "lora";
  body_font: "manrope" | "inter" | "poppins";
  shadow_intensity: "soft" | "medium" | "strong";
};
export type AgencyNativeStudioResponsiveSetting = {
  typography_scale: "sm" | "md" | "lg";
  section_spacing: "compact" | "normal" | "relaxed";
  body_font_size_px: number;
  heading_font_size_px: number;
};
export type AgencyNativeStudioResponsiveOverrides = {
  mobile: AgencyNativeStudioResponsiveSetting;
  tablet: AgencyNativeStudioResponsiveSetting;
  desktop: AgencyNativeStudioResponsiveSetting;
};
export type AgencyNativeStudioPageContent = Record<
  AgencyNativeStudioSection,
  {
    title: string;
    intro: string;
    image_url: string;
    image_alt: string;
    image_focal_x: number;
    image_focal_y: number;
    background_mode: "none" | "solid" | "gradient";
    background_color: string;
    background_gradient_from: string;
    background_gradient_to: string;
    background_gradient_angle: number;
  }
>;
export type AgencyNativeStudioBlock = {
  id: string;
  section: AgencyNativeStudioSection;
  type: AgencyNativeStudioBlockType;
  title: string;
  body: string;
  image_url: string;
  image_alt: string;
  cta_label: string;
  cta_href: string;
};
export type AgencyNativeStudioSnapshot = {
  hero_variant: "classic" | "compact" | "immersive";
  card_density: "comfortable" | "compact";
  section_surface: "soft" | "flat";
  cta_style: "solid" | "outline";
  marketplace_columns: "2" | "3";
  card_radius: "md" | "xl" | "full";
  button_radius: "md" | "xl" | "full";
  section_spacing: "compact" | "normal" | "relaxed";
  hero_image_alt: string;
  hero_image_focal_x: number;
  hero_image_focal_y: number;
  design_tokens: AgencyNativeStudioDesignTokens;
  design_system: AgencyNativeStudioDesignSystem;
  responsive_overrides: AgencyNativeStudioResponsiveOverrides;
  page_content: AgencyNativeStudioPageContent;
  blocks: AgencyNativeStudioBlock[];
  trust_badges: string[];
  mobile_conversion_rail: boolean;
};
export type AgencyNativeStudioBlockLibraryItem = {
  id: string;
  name: string;
  block: Omit<AgencyNativeStudioBlock, "id">;
};
export type AgencyNativeStudioRevision = {
  id: string;
  label: string;
  saved_at: string;
  snapshot: AgencyNativeStudioSnapshot;
};
export type AgencyWebstudioPayload = {
  builder_url: string;
  published_url: string;
  site_name: string;
  embed: boolean;
};
export type AgencyNativeStudioPayload = {
  hero_variant: "classic" | "compact" | "immersive";
  card_density: "comfortable" | "compact";
  section_surface: "soft" | "flat";
  cta_style: "solid" | "outline";
  marketplace_columns: "2" | "3";
  card_radius: "md" | "xl" | "full";
  button_radius: "md" | "xl" | "full";
  section_spacing: "compact" | "normal" | "relaxed";
  hero_image_alt: string;
  hero_image_focal_x: number;
  hero_image_focal_y: number;
  locale_default: "fr" | "ar";
  locales_enabled: Array<"fr" | "ar">;
  translations: {
    ar: Partial<{
      hero_title: string;
      hero_subtitle: string;
      tagline: string;
      description: string;
      about_title: string;
      cta_label: string;
      marketplace_title: string;
    }>;
  };
  design_tokens: AgencyNativeStudioDesignTokens;
  design_system: AgencyNativeStudioDesignSystem;
  responsive_overrides: AgencyNativeStudioResponsiveOverrides;
  page_content: AgencyNativeStudioPageContent;
  trust_badges: string[];
  mobile_conversion_rail: boolean;
  block_library: AgencyNativeStudioBlockLibraryItem[];
  revisions: AgencyNativeStudioRevision[];
  publish_state: "published" | "draft" | "scheduled";
  scheduled_publish_at: string;
  published_snapshot: AgencyNativeStudioSnapshot | null;
  scheduled_snapshot: AgencyNativeStudioSnapshot | null;
  blocks: AgencyNativeStudioBlock[];
};

export type AgencyPuckSeed = {
  agencyName: string;
  tagline: string;
  description: string;
  heroTitle: string;
  heroSubtitle: string;
  aboutTitle: string;
  servicesText: string;
  highlightsText: string;
  contactPhone: string;
  contactEmail: string;
  contactAddress: string;
  ctaLabel: string;
  ctaUrl: string;
  marketplaceTitle: string;
  coverUrl: string;
};

const PAGE_OPTIONS = [
  { label: "Toutes les pages", value: "all" },
  { label: "A propos", value: "about" },
  { label: "Services", value: "services" },
  { label: "Contact", value: "contact" },
  { label: "Marketplace", value: "marketplace" },
] as const;

function pageField() {
  return {
    type: "select",
    label: "Afficher sur",
    options: PAGE_OPTIONS,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toText(value: unknown) {
  return String(value ?? "").trim();
}

function toSafeHref(value: unknown) {
  const href = toText(value);
  if (!href) return "";
  if (/^https?:\/\//i.test(href)) return href;
  if (/^mailto:/i.test(href)) return href;
  if (/^tel:/i.test(href)) return href;
  if (/^\//.test(href)) return href;
  return "";
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const normalized = toText(value).toLowerCase() as T;
  return allowed.includes(normalized) ? normalized : fallback;
}

function toHexColor(value: unknown, fallback: string) {
  const raw = toText(value).toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(raw)) return raw;
  return fallback;
}

function toRgba(hex: string, alpha: number) {
  const clean = toHexColor(hex, "#0f172a").slice(1);
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  const a = Number.isFinite(alpha) ? Math.min(1, Math.max(0, alpha)) : 1;
  return `rgba(${r},${g},${b},${a})`;
}

function alignClass(value: unknown) {
  return pick(value, ["left", "center"] as const, "left") === "center"
    ? "items-center text-center"
    : "items-start text-left";
}

function widthClass(value: unknown) {
  const width = pick(value, ["narrow", "normal", "wide"] as const, "normal");
  if (width === "narrow") return "max-w-2xl";
  if (width === "wide") return "max-w-none";
  return "max-w-4xl";
}

function padClass(value: unknown) {
  const pad = pick(value, ["sm", "md", "lg"] as const, "md");
  if (pad === "sm") return "p-4 md:p-5";
  if (pad === "lg") return "p-8 md:p-10";
  return "p-6 md:p-8";
}

function surfaceClass(value: unknown) {
  const surface = pick(value, ["plain", "card", "tinted", "dark"] as const, "card");
  if (surface === "plain") return "border-transparent bg-transparent shadow-none";
  if (surface === "tinted") return "border border-black/10 bg-slate-50/90 shadow-sm";
  if (surface === "dark") return "border border-slate-800 bg-slate-900 shadow-sm";
  return "border border-black/10 bg-white/90 shadow-sm";
}

function titleClassForSurface(value: unknown) {
  return pick(value, ["plain", "card", "tinted", "dark"] as const, "card") === "dark"
    ? "text-white"
    : "text-slate-900";
}

function bodyClassForSurface(value: unknown) {
  return pick(value, ["plain", "card", "tinted", "dark"] as const, "card") === "dark"
    ? "text-white/85"
    : "text-black/75";
}

function heroHeightClass(value: unknown) {
  const h = pick(value, ["compact", "comfortable", "immersive"] as const, "comfortable");
  if (h === "compact") return "min-h-[220px]";
  if (h === "immersive") return "min-h-[420px]";
  return "min-h-[320px]";
}

function heroRadiusClass(value: unknown) {
  const r = pick(value, ["none", "soft", "round"] as const, "round");
  if (r === "none") return "rounded-none";
  if (r === "soft") return "rounded-2xl";
  return "rounded-3xl";
}

function numberOfColumnsClass(value: unknown) {
  const cols = pick(value, ["1", "2", "3", "4"] as const, "3");
  if (cols === "1") return "grid-cols-1";
  if (cols === "2") return "grid-cols-1 md:grid-cols-2";
  if (cols === "4") return "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4";
  return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
}

function normalizeAgencyPuckTarget(value: unknown): AgencyPuckTarget {
  const normalized = toText(value).toLowerCase();
  if (normalized === "about") return "about";
  if (normalized === "services") return "services";
  if (normalized === "contact") return "contact";
  if (normalized === "marketplace") return "marketplace";
  return "all";
}

function toLineList(value: unknown, limit = 8) {
  const items = toText(value)
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
    if (out.length >= limit) break;
  }
  return out;
}

function toMetrics(value: unknown, limit = 6) {
  const out: Array<{ label: string; value: string }> = [];
  for (const line of toLineList(value, limit * 2)) {
    const [left, ...rest] = line.split(":");
    if (!left || rest.length === 0) continue;
    const label = left.trim();
    const metricValue = rest.join(":").trim();
    if (!label || !metricValue) continue;
    out.push({ label, value: metricValue });
    if (out.length >= limit) break;
  }
  return out;
}

function createPuckItemId(type: string, index: number) {
  const safeType = toText(type).toLowerCase().replace(/[^a-z0-9]+/g, "-") || "block";
  return `puck-${safeType}-${index + 1}`;
}

function normalizeNativeStudioSection(value: unknown): AgencyNativeStudioSection {
  const normalized = toText(value).toLowerCase();
  if (normalized === "services") return "services";
  if (normalized === "contact") return "contact";
  if (normalized === "marketplace") return "marketplace";
  return "about";
}

function normalizeNativeStudioBlockType(value: unknown): AgencyNativeStudioBlockType {
  const normalized = toText(value).toLowerCase();
  if (normalized === "list") return "list";
  if (normalized === "cta") return "cta";
  return "text";
}

function normalizeNativeStudioCtaHref(value: unknown) {
  const href = toText(value);
  if (!href) return "";
  if (/^https?:\/\//i.test(href)) return href;
  if (/^mailto:/i.test(href)) return href;
  if (/^tel:/i.test(href)) return href;
  if (/^\//.test(href)) return href;
  return "";
}

function normalizeNativeStudioImageUrl(value: unknown) {
  const href = toText(value);
  if (!href) return "";
  if (/^https?:\/\//i.test(href)) return href;
  if (/^\//.test(href)) return href;
  return "";
}

function normalizePercent(value: unknown, fallback = 50) {
  const n = Number(String(value ?? "").trim());
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function normalizeAngle(value: unknown, fallback = 135) {
  const n = Number(String(value ?? "").trim());
  if (!Number.isFinite(n)) return fallback;
  return Math.min(360, Math.max(0, Math.round(n)));
}

function normalizeFontPx(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(String(value ?? "").trim());
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function toTagList(value: unknown, limit = 8) {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,]/g)
      : [];
  const unique = new Set<string>();
  const out: string[] = [];
  for (const item of source) {
    const cleaned = toText(item).replace(/\s+/g, " ").slice(0, 72);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (unique.has(key)) continue;
    unique.add(key);
    out.push(cleaned);
    if (out.length >= limit) break;
  }
  return out;
}

const DEFAULT_NATIVE_STUDIO_PAGE_CONTENT: AgencyNativeStudioPageContent = {
  about: {
    title: "Notre expertise immobiliere",
    intro:
      "Une equipe locale dediee a la vente, la location et l'accompagnement notarial avec un suivi transparent de chaque dossier.",
    image_url:
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1600&q=80",
    image_alt: "Facade d'une agence immobiliere premium",
    image_focal_x: 50,
    image_focal_y: 50,
    background_mode: "none",
    background_color: "#ffffff",
    background_gradient_from: "#f8fafc",
    background_gradient_to: "#e2e8f0",
    background_gradient_angle: 135,
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
    background_mode: "none",
    background_color: "#ffffff",
    background_gradient_from: "#f8fafc",
    background_gradient_to: "#e2e8f0",
    background_gradient_angle: 135,
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
    background_mode: "none",
    background_color: "#ffffff",
    background_gradient_from: "#f8fafc",
    background_gradient_to: "#e2e8f0",
    background_gradient_angle: 135,
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
    background_mode: "none",
    background_color: "#ffffff",
    background_gradient_from: "#f8fafc",
    background_gradient_to: "#e2e8f0",
    background_gradient_angle: 135,
  },
};

const DEFAULT_NATIVE_STUDIO_DESIGN_TOKENS: AgencyNativeStudioDesignTokens = {
  container_width: "normal",
  typography_scale: "md",
  motion_level: "subtle",
};
const DEFAULT_NATIVE_STUDIO_DESIGN_SYSTEM: AgencyNativeStudioDesignSystem = {
  heading_font: "playfair",
  body_font: "manrope",
  shadow_intensity: "medium",
};
const DEFAULT_NATIVE_STUDIO_RESPONSIVE_OVERRIDES: AgencyNativeStudioResponsiveOverrides = {
  mobile: { typography_scale: "sm", section_spacing: "compact", body_font_size_px: 14, heading_font_size_px: 26 },
  tablet: { typography_scale: "md", section_spacing: "normal", body_font_size_px: 15, heading_font_size_px: 30 },
  desktop: { typography_scale: "lg", section_spacing: "normal", body_font_size_px: 16, heading_font_size_px: 34 },
};

const DEFAULT_NATIVE_STUDIO_TRUST_BADGES = [
  "Conseillers verifies",
  "Dossiers juridiquement controles",
  "Accompagnement bancaire et notarial",
];

function normalizeNativeStudioPageContent(value: unknown): AgencyNativeStudioPageContent {
  const source = isRecord(value) ? value : {};
  const out = {} as AgencyNativeStudioPageContent;
  const sections: AgencyNativeStudioSection[] = ["about", "services", "contact", "marketplace"];

  for (const section of sections) {
    const raw = isRecord(source[section]) ? source[section] : {};
    const imageUrlRaw = normalizeNativeStudioImageUrl(raw.image_url);
    out[section] = {
      title: toText(raw.title || DEFAULT_NATIVE_STUDIO_PAGE_CONTENT[section].title).slice(0, 120),
      intro: toText(raw.intro || DEFAULT_NATIVE_STUDIO_PAGE_CONTENT[section].intro).slice(0, 520),
      image_url: imageUrlRaw || DEFAULT_NATIVE_STUDIO_PAGE_CONTENT[section].image_url,
      image_alt: toText(raw.image_alt || DEFAULT_NATIVE_STUDIO_PAGE_CONTENT[section].image_alt).slice(0, 140),
      image_focal_x: normalizePercent(raw.image_focal_x, DEFAULT_NATIVE_STUDIO_PAGE_CONTENT[section].image_focal_x),
      image_focal_y: normalizePercent(raw.image_focal_y, DEFAULT_NATIVE_STUDIO_PAGE_CONTENT[section].image_focal_y),
      background_mode: pick(
        raw.background_mode,
        ["none", "solid", "gradient"] as const,
        DEFAULT_NATIVE_STUDIO_PAGE_CONTENT[section].background_mode
      ),
      background_color: toHexColor(
        raw.background_color,
        DEFAULT_NATIVE_STUDIO_PAGE_CONTENT[section].background_color
      ),
      background_gradient_from: toHexColor(
        raw.background_gradient_from,
        DEFAULT_NATIVE_STUDIO_PAGE_CONTENT[section].background_gradient_from
      ),
      background_gradient_to: toHexColor(
        raw.background_gradient_to,
        DEFAULT_NATIVE_STUDIO_PAGE_CONTENT[section].background_gradient_to
      ),
      background_gradient_angle: normalizeAngle(
        raw.background_gradient_angle,
        DEFAULT_NATIVE_STUDIO_PAGE_CONTENT[section].background_gradient_angle
      ),
    };
  }

  return out;
}

function normalizeNativeStudioDesignTokens(value: unknown): AgencyNativeStudioDesignTokens {
  const input = isRecord(value) ? value : {};
  return {
    container_width: pick(
      input.container_width,
      ["narrow", "normal", "wide"] as const,
      DEFAULT_NATIVE_STUDIO_DESIGN_TOKENS.container_width
    ),
    typography_scale: pick(
      input.typography_scale,
      ["sm", "md", "lg"] as const,
      DEFAULT_NATIVE_STUDIO_DESIGN_TOKENS.typography_scale
    ),
    motion_level: pick(
      input.motion_level,
      ["none", "subtle", "rich"] as const,
      DEFAULT_NATIVE_STUDIO_DESIGN_TOKENS.motion_level
    ),
  };
}

function normalizeNativeStudioDesignSystem(value: unknown): AgencyNativeStudioDesignSystem {
  const input = isRecord(value) ? value : {};
  return {
    heading_font: pick(
      input.heading_font,
      ["playfair", "montserrat", "lora"] as const,
      DEFAULT_NATIVE_STUDIO_DESIGN_SYSTEM.heading_font
    ),
    body_font: pick(
      input.body_font,
      ["manrope", "inter", "poppins"] as const,
      DEFAULT_NATIVE_STUDIO_DESIGN_SYSTEM.body_font
    ),
    shadow_intensity: pick(
      input.shadow_intensity,
      ["soft", "medium", "strong"] as const,
      DEFAULT_NATIVE_STUDIO_DESIGN_SYSTEM.shadow_intensity
    ),
  };
}

function normalizeResponsiveSetting(value: unknown, fallback: AgencyNativeStudioResponsiveSetting) {
  const input = isRecord(value) ? value : {};
  return {
    typography_scale: pick(input.typography_scale, ["sm", "md", "lg"] as const, fallback.typography_scale),
    section_spacing: pick(
      input.section_spacing,
      ["compact", "normal", "relaxed"] as const,
      fallback.section_spacing
    ),
    body_font_size_px: normalizeFontPx(input.body_font_size_px, fallback.body_font_size_px, 12, 22),
    heading_font_size_px: normalizeFontPx(input.heading_font_size_px, fallback.heading_font_size_px, 20, 64),
  };
}

function normalizeNativeStudioResponsiveOverrides(value: unknown): AgencyNativeStudioResponsiveOverrides {
  const input = isRecord(value) ? value : {};
  return {
    mobile: normalizeResponsiveSetting(input.mobile, DEFAULT_NATIVE_STUDIO_RESPONSIVE_OVERRIDES.mobile),
    tablet: normalizeResponsiveSetting(input.tablet, DEFAULT_NATIVE_STUDIO_RESPONSIVE_OVERRIDES.tablet),
    desktop: normalizeResponsiveSetting(input.desktop, DEFAULT_NATIVE_STUDIO_RESPONSIVE_OVERRIDES.desktop),
  };
}

function normalizeNativeStudioSnapshot(value: unknown): AgencyNativeStudioSnapshot | null {
  const input = isRecord(value) ? value : null;
  if (!input) return null;
  return {
    hero_variant: pick(input.hero_variant, ["classic", "compact", "immersive"] as const, "classic"),
    card_density: pick(input.card_density, ["comfortable", "compact"] as const, "comfortable"),
    section_surface: pick(input.section_surface, ["soft", "flat"] as const, "soft"),
    cta_style: pick(input.cta_style, ["solid", "outline"] as const, "solid"),
    marketplace_columns: pick(input.marketplace_columns, ["2", "3"] as const, "3"),
    card_radius: pick(input.card_radius, ["md", "xl", "full"] as const, "xl"),
    button_radius: pick(input.button_radius, ["md", "xl", "full"] as const, "xl"),
    section_spacing: pick(input.section_spacing, ["compact", "normal", "relaxed"] as const, "normal"),
    hero_image_alt: toText(input.hero_image_alt).slice(0, 140),
    hero_image_focal_x: normalizePercent(input.hero_image_focal_x, 50),
    hero_image_focal_y: normalizePercent(input.hero_image_focal_y, 50),
    design_tokens: normalizeNativeStudioDesignTokens(input.design_tokens),
    design_system: normalizeNativeStudioDesignSystem(input.design_system),
    responsive_overrides: normalizeNativeStudioResponsiveOverrides(input.responsive_overrides),
    page_content: normalizeNativeStudioPageContent(input.page_content),
    blocks: normalizeNativeStudioBlocks(input.blocks),
    trust_badges: toTagList(input.trust_badges, 10),
    mobile_conversion_rail: input.mobile_conversion_rail !== false,
  };
}

function normalizeNativeStudioBlockLibrary(value: unknown): AgencyNativeStudioBlockLibraryItem[] {
  const source = Array.isArray(value) ? value : [];
  const out: AgencyNativeStudioBlockLibraryItem[] = [];
  const used = new Set<string>();

  for (let index = 0; index < source.length; index += 1) {
    if (out.length >= 40) break;
    const item = source[index];
    if (!isRecord(item)) continue;
    const baseId =
      toText(item.id)
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || `library-${index + 1}`;
    let id = baseId;
    let suffix = 2;
    while (used.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    used.add(id);

    const name = toText(item.name || "Modele bloc").slice(0, 72);
    const blockSource = isRecord(item.block) ? item.block : item;
    const normalizedBlock = normalizeNativeStudioBlocks([{ ...blockSource, id: `block-${index + 1}` }])[0];
    if (!normalizedBlock) continue;
    const { section, type, title, body, image_url, image_alt, cta_label, cta_href } = normalizedBlock;
    out.push({
      id,
      name,
      block: { section, type, title, body, image_url, image_alt, cta_label, cta_href },
    });
  }

  return out;
}

function normalizeNativeStudioRevisions(value: unknown): AgencyNativeStudioRevision[] {
  const source = Array.isArray(value) ? value : [];
  const out: AgencyNativeStudioRevision[] = [];
  const used = new Set<string>();

  for (let index = 0; index < source.length; index += 1) {
    if (out.length >= 24) break;
    const item = source[index];
    if (!isRecord(item)) continue;
    const snapshot = normalizeNativeStudioSnapshot(item.snapshot);
    if (!snapshot) continue;
    const baseId =
      toText(item.id)
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || `revision-${index + 1}`;
    let id = baseId;
    let suffix = 2;
    while (used.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    used.add(id);

    out.push({
      id,
      label: toText(item.label || "Revision").slice(0, 64),
      saved_at: toText(item.saved_at || new Date(0).toISOString()),
      snapshot,
    });
  }

  return out;
}

function normalizeNativeStudioBlocks(value: unknown) {
  const source = Array.isArray(value) ? value : [];
  const out: AgencyNativeStudioBlock[] = [];
  const used = new Set<string>();

  for (let index = 0; index < source.length; index += 1) {
    if (out.length >= 24) break;
    const item = source[index];
    if (!isRecord(item)) continue;

    const baseId =
      toText(item.id)
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || `native-block-${index + 1}`;
    let id = baseId;
    let suffix = 2;
    while (used.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    used.add(id);

    out.push({
      id,
      section: normalizeNativeStudioSection(item.section),
      type: normalizeNativeStudioBlockType(item.type),
      title: toText(item.title).slice(0, 80),
      body: toText(item.body).slice(0, 1200),
      image_url: normalizeNativeStudioImageUrl(item.image_url),
      image_alt: toText(item.image_alt).slice(0, 140),
      cta_label: toText(item.cta_label).slice(0, 60),
      cta_href: normalizeNativeStudioCtaHref(item.cta_href),
    });
  }

  return out;
}

export function normalizeAgencyWebstudioPayload(value: unknown): AgencyWebstudioPayload {
  const input = isRecord(value) ? value : {};
  const builder_url = toSafeHref(input.builder_url);
  const published_url = toSafeHref(input.published_url);
  const site_name = toText(input.site_name);
  const embed = input.embed !== false;
  return { builder_url, published_url, site_name, embed };
}

export function normalizeAgencyNativeStudioPayload(value: unknown): AgencyNativeStudioPayload {
  const input = isRecord(value) ? value : {};
  const localesRaw = Array.isArray(input.locales_enabled) ? input.locales_enabled : [];
  const localesEnabled: Array<"fr" | "ar"> = [];
  for (const locale of localesRaw) {
    const key = toText(locale).toLowerCase();
    if ((key === "fr" || key === "ar") && !localesEnabled.includes(key as "fr" | "ar")) {
      localesEnabled.push(key as "fr" | "ar");
    }
  }
  if (localesEnabled.length === 0) localesEnabled.push("fr", "ar");
  const translationsRaw = isRecord(input.translations) ? input.translations : {};
  const arRaw = isRecord(translationsRaw.ar) ? translationsRaw.ar : {};
  const ar = {
    hero_title: toText(arRaw.hero_title).slice(0, 120),
    hero_subtitle: toText(arRaw.hero_subtitle).slice(0, 220),
    tagline: toText(arRaw.tagline).slice(0, 180),
    description: toText(arRaw.description).slice(0, 1200),
    about_title: toText(arRaw.about_title).slice(0, 80),
    cta_label: toText(arRaw.cta_label).slice(0, 60),
    marketplace_title: toText(arRaw.marketplace_title).slice(0, 120),
  };
  const trustBadges = toTagList(input.trust_badges, 10);
  const publishedSnapshot = normalizeNativeStudioSnapshot(input.published_snapshot);
  const scheduledSnapshot = normalizeNativeStudioSnapshot(input.scheduled_snapshot);
  const publishState = pick(input.publish_state, ["published", "draft", "scheduled"] as const, "published");
  const scheduledPublishAt = toText(input.scheduled_publish_at).slice(0, 40);
  return {
    hero_variant: pick(input.hero_variant, ["classic", "compact", "immersive"] as const, "classic"),
    card_density: pick(input.card_density, ["comfortable", "compact"] as const, "comfortable"),
    section_surface: pick(input.section_surface, ["soft", "flat"] as const, "soft"),
    cta_style: pick(input.cta_style, ["solid", "outline"] as const, "solid"),
    marketplace_columns: pick(input.marketplace_columns, ["2", "3"] as const, "3"),
    card_radius: pick(input.card_radius, ["md", "xl", "full"] as const, "xl"),
    button_radius: pick(input.button_radius, ["md", "xl", "full"] as const, "xl"),
    section_spacing: pick(input.section_spacing, ["compact", "normal", "relaxed"] as const, "normal"),
    hero_image_alt: toText(input.hero_image_alt).slice(0, 140),
    hero_image_focal_x: normalizePercent(input.hero_image_focal_x, 50),
    hero_image_focal_y: normalizePercent(input.hero_image_focal_y, 50),
    locale_default: pick(input.locale_default, ["fr", "ar"] as const, "fr"),
    locales_enabled: localesEnabled,
    translations: {
      ar,
    },
    design_tokens: normalizeNativeStudioDesignTokens(input.design_tokens),
    design_system: normalizeNativeStudioDesignSystem(input.design_system),
    responsive_overrides: normalizeNativeStudioResponsiveOverrides(input.responsive_overrides),
    page_content: normalizeNativeStudioPageContent(input.page_content),
    trust_badges: trustBadges.length > 0 ? trustBadges : DEFAULT_NATIVE_STUDIO_TRUST_BADGES,
    mobile_conversion_rail: input.mobile_conversion_rail !== false,
    block_library: normalizeNativeStudioBlockLibrary(input.block_library),
    revisions: normalizeNativeStudioRevisions(input.revisions),
    publish_state: publishState,
    scheduled_publish_at: scheduledPublishAt,
    published_snapshot: publishedSnapshot,
    scheduled_snapshot: scheduledSnapshot,
    blocks: normalizeNativeStudioBlocks(input.blocks),
  };
}

export function normalizeAgencyBuilderType(value: unknown): AgencyBuilderType {
  const normalized = toText(value).toLowerCase();
  if (normalized === "puck") return "puck";
  if (normalized === "webstudio") return "webstudio";
  return "native";
}

export function normalizeAgencyPuckData(value: unknown): AgencyPuckData | null {
  if (!isRecord(value)) return null;
  const contentRaw = Array.isArray(value.content) ? value.content : [];
  const content = contentRaw
    .map((item, index) => {
      if (!isRecord(item)) return null;
      const type = toText(item.type);
      if (!type) return null;
      const propsRaw = isRecord(item.props) ? item.props : {};
      const props = {
        ...propsRaw,
        id: toText(propsRaw.id) || createPuckItemId(type, index),
      };
      return { ...item, type, props };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const root = isRecord(value.root) ? value.root : {};
  return {
    root: root as AgencyPuckData["root"],
    content: content as AgencyPuckData["content"],
  };
}

export function filterAgencyPuckDataByPage(data: AgencyPuckData, page: AgencyStorefrontPage): AgencyPuckData {
  if (page === "overview") return data;
  const filtered = (Array.isArray(data.content) ? data.content : []).filter((item) => {
    if (!isRecord(item)) return false;
    const props = isRecord(item.props) ? item.props : {};
    const target = normalizeAgencyPuckTarget(props.page);
    return target === "all" || target === page;
  });
  return { ...data, content: filtered as AgencyPuckData["content"] };
}

export function buildInitialAgencyPuckData(seed: AgencyPuckSeed): AgencyPuckData {
  return {
    root: { props: {} },
    content: [
      {
        type: "HeroBlock",
        props: {
          id: createPuckItemId("HeroBlock", 0),
          page: "all",
          title: toText(seed.heroTitle || seed.agencyName),
          subtitle: toText(seed.heroSubtitle),
          tagline: toText(seed.tagline),
          align: "left",
          height: "comfortable",
          radius: "round",
          backgroundUrl: toText(seed.coverUrl),
          backgroundColor: "#0f172a",
          overlayStrength: "medium",
          textColor: "#ffffff",
          ctaLabel: toText(seed.ctaLabel || "Nous contacter"),
          ctaHref: toText(seed.ctaUrl),
          ctaStyle: "solid",
        },
      },
      {
        type: "TextBlock",
        props: {
          id: createPuckItemId("TextBlock", 1),
          page: "about",
          title: toText(seed.aboutTitle || "A propos"),
          body: toText(seed.description),
          align: "left",
          width: "normal",
          padding: "md",
          surface: "card",
          accentColor: "#0f172a",
          showDivider: "yes",
        },
      },
      {
        type: "ListBlock",
        props: {
          id: createPuckItemId("ListBlock", 2),
          page: "services",
          title: "Services",
          items: toText(seed.servicesText),
          variant: "check",
          columns: "2",
          markerColor: "#0f172a",
          surface: "card",
          align: "left",
        },
      },
      {
        type: "ContactBlock",
        props: {
          id: createPuckItemId("ContactBlock", 3),
          page: "contact",
          title: "Contact agence",
          subtitle: "Reponse rapide par telephone, WhatsApp ou email.",
          phone: toText(seed.contactPhone),
          email: toText(seed.contactEmail),
          address: toText(seed.contactAddress),
          layout: "grid",
          surface: "card",
          accentColor: "#0f172a",
          actionLabel: toText(seed.ctaLabel || "Nous contacter"),
          actionHref: toText(seed.ctaUrl),
        },
      },
      {
        type: "StatsBlock",
        props: {
          id: createPuckItemId("StatsBlock", 4),
          page: "marketplace",
          title: "Pourquoi nous choisir",
          metrics: "+120:Biens traites\n98%:Clients satisfaits\n7j/7:Disponibilite",
          layout: "cards",
          columns: "3",
          surface: "tinted",
          accentColor: "#d4af37",
        },
      },
      {
        type: "CtaBlock",
        props: {
          id: createPuckItemId("CtaBlock", 5),
          page: "marketplace",
          title: toText(seed.marketplaceTitle || "Marketplace des biens"),
          body: "Decouvrez nos derniers biens valides et contactez-nous pour une visite.",
          label: "Voir le marketplace",
          href: "/biens",
          align: "left",
          theme: "gradient",
          backgroundColor: "#0f172a",
          textColor: "#ffffff",
          buttonStyle: "solid",
          buttonColor: "#ffffff",
          padding: "md",
        },
      },
    ],
  };
}

export const agencyStorefrontPuckConfig = {
  components: {
    HeroBlock: {
      label: "Hero",
      fields: {
        page: pageField(),
        title: { type: "text", label: "Titre" },
        subtitle: { type: "textarea", label: "Sous-titre" },
        tagline: { type: "text", label: "Slogan" },
        align: { type: "select", label: "Alignement", options: [{ label: "Gauche", value: "left" }, { label: "Centre", value: "center" }] },
        height: { type: "select", label: "Hauteur", options: [{ label: "Compact", value: "compact" }, { label: "Confort", value: "comfortable" }, { label: "Immersif", value: "immersive" }] },
        radius: { type: "select", label: "Coins", options: [{ label: "Ronds", value: "round" }, { label: "Doux", value: "soft" }, { label: "Aucun", value: "none" }] },
        backgroundUrl: { type: "text", label: "Image de fond (URL)" },
        backgroundColor: { type: "text", label: "Couleur fond (#RRGGBB)" },
        overlayStrength: { type: "select", label: "Intensite overlay", options: [{ label: "Faible", value: "soft" }, { label: "Moyenne", value: "medium" }, { label: "Forte", value: "strong" }] },
        textColor: { type: "text", label: "Couleur texte (#RRGGBB)" },
        ctaLabel: { type: "text", label: "Label CTA" },
        ctaHref: { type: "text", label: "Lien CTA" },
        ctaStyle: { type: "select", label: "Style CTA", options: [{ label: "Solide", value: "solid" }, { label: "Contour", value: "outline" }, { label: "Ghost", value: "ghost" }] },
      },
      render: ({ title, subtitle, tagline, align, height, radius, backgroundUrl, backgroundColor, overlayStrength, textColor, ctaLabel, ctaHref, ctaStyle }: {
        title?: string;
        subtitle?: string;
        tagline?: string;
        align?: string;
        height?: string;
        radius?: string;
        backgroundUrl?: string;
        backgroundColor?: string;
        overlayStrength?: string;
        textColor?: string;
        ctaLabel?: string;
        ctaHref?: string;
        ctaStyle?: string;
      }) => {
        const href = toSafeHref(ctaHref);
        const overlay = pick(overlayStrength, ["soft", "medium", "strong"] as const, "medium");
        const overlayAlpha = overlay === "soft" ? 0.42 : overlay === "strong" ? 0.78 : 0.62;
        const bg = toHexColor(backgroundColor, "#0f172a");
        const fg = toHexColor(textColor, "#ffffff");
        const hasBg = /^https?:\/\//i.test(toText(backgroundUrl));
        const buttonStyle = pick(ctaStyle, ["solid", "outline", "ghost"] as const, "solid");
        const buttonClass = buttonStyle === "outline" ? "border border-white/70 bg-transparent text-white" : buttonStyle === "ghost" ? "border border-transparent bg-white/15 text-white" : "border border-transparent bg-white text-slate-900";
        return (
          <section className={`relative overflow-hidden border border-black/10 ${heroRadiusClass(radius)} ${heroHeightClass(height)} ${padClass("md")}`} style={{ background: hasBg ? `linear-gradient(140deg,${toRgba(bg, overlayAlpha)},${toRgba(bg, Math.min(1, overlayAlpha + 0.12))}),url("${toText(backgroundUrl)}") center/cover` : `linear-gradient(140deg,${toRgba(bg, 1)},${toRgba(bg, 0.92)})`, color: fg }}>
            <div className={`flex h-full w-full flex-col justify-end gap-2 ${alignClass(align)}`}>
              <p className="text-xs uppercase tracking-[0.12em] opacity-80">{toText(tagline) || "Vitrine agence"}</p>
              <h2 className="text-2xl font-extrabold md:text-4xl">{toText(title) || "Titre hero"}</h2>
              {toText(subtitle) ? <p className="max-w-2xl text-sm opacity-90 md:text-base">{toText(subtitle)}</p> : null}
              {href ? (
                <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined} className={`mt-4 inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold ${buttonClass}`}>
                  {toText(ctaLabel) || "Nous contacter"}
                </a>
              ) : null}
            </div>
          </section>
        );
      },
    },
    TextBlock: {
      label: "Texte",
      fields: {
        page: pageField(),
        title: { type: "text", label: "Titre" },
        body: { type: "textarea", label: "Texte" },
        align: { type: "select", label: "Alignement", options: [{ label: "Gauche", value: "left" }, { label: "Centre", value: "center" }] },
        width: { type: "select", label: "Largeur", options: [{ label: "Etroite", value: "narrow" }, { label: "Normale", value: "normal" }, { label: "Large", value: "wide" }] },
        padding: { type: "select", label: "Espacement", options: [{ label: "Petit", value: "sm" }, { label: "Moyen", value: "md" }, { label: "Large", value: "lg" }] },
        surface: { type: "select", label: "Surface", options: [{ label: "Carte", value: "card" }, { label: "Teinte", value: "tinted" }, { label: "Pleine", value: "plain" }, { label: "Sombre", value: "dark" }] },
        accentColor: { type: "text", label: "Couleur accent (#RRGGBB)" },
        showDivider: { type: "select", label: "Separateur", options: [{ label: "Oui", value: "yes" }, { label: "Non", value: "no" }] },
      },
      render: ({ title, body, align, width, padding, surface, accentColor, showDivider }: { title?: string; body?: string; align?: string; width?: string; padding?: string; surface?: string; accentColor?: string; showDivider?: string }) => {
        const dividerOn = pick(showDivider, ["yes", "no"] as const, "yes") === "yes";
        const accent = toHexColor(accentColor, "#0f172a");
        return (
          <article className={`rounded-3xl ${surfaceClass(surface)} ${padClass(padding)}`}>
            <div className={`${widthClass(width)} ${alignClass(align)} gap-3`}>
              {toText(title) ? <h3 className={`text-2xl font-bold ${titleClassForSurface(surface)}`}>{toText(title)}</h3> : null}
              {dividerOn ? <span className="h-1 w-16 rounded-full" style={{ backgroundColor: accent }} /> : null}
              <p className={`whitespace-pre-line text-sm leading-relaxed md:text-base ${bodyClassForSurface(surface)}`}>{toText(body) || "Texte de section"}</p>
            </div>
          </article>
        );
      },
    },
    ListBlock: {
      label: "Liste",
      fields: {
        page: pageField(),
        title: { type: "text", label: "Titre" },
        items: { type: "textarea", label: "Elements (1 ligne = 1 element)" },
        variant: { type: "select", label: "Style liste", options: [{ label: "Puces", value: "bullet" }, { label: "Check", value: "check" }, { label: "Chips", value: "chips" }] },
        columns: { type: "select", label: "Colonnes", options: [{ label: "1", value: "1" }, { label: "2", value: "2" }, { label: "3", value: "3" }] },
        markerColor: { type: "text", label: "Couleur marqueur (#RRGGBB)" },
        surface: { type: "select", label: "Surface", options: [{ label: "Carte", value: "card" }, { label: "Teinte", value: "tinted" }, { label: "Pleine", value: "plain" }, { label: "Sombre", value: "dark" }] },
        align: { type: "select", label: "Alignement", options: [{ label: "Gauche", value: "left" }, { label: "Centre", value: "center" }] },
      },
      render: ({ title, items, variant, columns, markerColor, surface, align }: { title?: string; items?: string; variant?: string; columns?: string; markerColor?: string; surface?: string; align?: string }) => {
        const lines = toLineList(items, 18);
        const listStyle = pick(variant, ["bullet", "check", "chips"] as const, "bullet");
        const marker = toHexColor(markerColor, "#0f172a");
        return (
          <article className={`rounded-3xl ${surfaceClass(surface)} ${padClass("md")}`}>
            <div className={`space-y-4 ${alignClass(align)}`}>
              <h3 className={`text-xl font-bold ${titleClassForSurface(surface)}`}>{toText(title) || "Liste"}</h3>
              {lines.length === 0 ? (
                <p className={`text-sm ${bodyClassForSurface(surface)}`}>Ajoutez des elements dans le panneau de droite.</p>
              ) : listStyle === "chips" ? (
                <div className="flex flex-wrap gap-2">
                  {lines.map((item) => (
                    <span key={item} className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: toRgba(marker, 0.35), backgroundColor: toRgba(marker, 0.12) }}>
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <ul className={`grid gap-2 text-sm ${numberOfColumnsClass(columns)} ${bodyClassForSurface(surface)}`}>
                  {lines.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      {listStyle === "check" ? <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold" style={{ backgroundColor: toRgba(marker, 0.16), color: marker }}>✓</span> : <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: marker }} />}
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </article>
        );
      },
    },
    ContactBlock: {
      label: "Contact",
      fields: {
        page: pageField(),
        title: { type: "text", label: "Titre" },
        subtitle: { type: "textarea", label: "Sous-titre" },
        phone: { type: "text", label: "Telephone" },
        email: { type: "text", label: "Email" },
        whatsapp: { type: "text", label: "WhatsApp" },
        address: { type: "text", label: "Adresse" },
        hours: { type: "text", label: "Horaires" },
        layout: { type: "select", label: "Disposition", options: [{ label: "Grille", value: "grid" }, { label: "Pile", value: "stack" }, { label: "Chips", value: "chips" }] },
        surface: { type: "select", label: "Surface", options: [{ label: "Carte", value: "card" }, { label: "Teinte", value: "tinted" }, { label: "Sombre", value: "dark" }] },
        accentColor: { type: "text", label: "Couleur accent (#RRGGBB)" },
        actionLabel: { type: "text", label: "Label bouton" },
        actionHref: { type: "text", label: "Lien bouton" },
      },
      render: ({ title, subtitle, phone, email, whatsapp, address, hours, layout, surface, accentColor, actionLabel, actionHref }: { title?: string; subtitle?: string; phone?: string; email?: string; whatsapp?: string; address?: string; hours?: string; layout?: string; surface?: string; accentColor?: string; actionLabel?: string; actionHref?: string }) => {
        const accent = toHexColor(accentColor, "#0f172a");
        const mode = pick(layout, ["grid", "stack", "chips"] as const, "grid");
        const action = toSafeHref(actionHref);
        const items = [toText(phone) ? `Telephone: ${toText(phone)}` : "", toText(email) ? `Email: ${toText(email)}` : "", toText(whatsapp) ? `WhatsApp: ${toText(whatsapp)}` : "", toText(address) ? `Adresse: ${toText(address)}` : "", toText(hours) ? `Horaires: ${toText(hours)}` : ""].filter(Boolean);
        return (
          <article className={`rounded-3xl ${surfaceClass(surface)} ${padClass("md")}`}>
            <div className="space-y-3">
              <h3 className={`text-xl font-bold ${titleClassForSurface(surface)}`}>{toText(title) || "Contact"}</h3>
              {toText(subtitle) ? <p className={`text-sm ${bodyClassForSurface(surface)}`}>{toText(subtitle)}</p> : null}
              {mode === "chips" ? (
                <div className="flex flex-wrap gap-2">
                  {items.map((item) => (
                    <span key={item} className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: toRgba(accent, 0.35), backgroundColor: toRgba(accent, 0.12) }}>
                      {item}
                    </span>
                  ))}
                </div>
              ) : mode === "stack" ? (
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item} className={`rounded-xl border border-black/10 px-3 py-2 text-sm ${bodyClassForSurface(surface)}`}>{item}</div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {items.map((item) => (
                    <div key={item} className={`rounded-xl border border-black/10 px-3 py-2 text-sm ${bodyClassForSurface(surface)}`}>{item}</div>
                  ))}
                </div>
              )}
              {action ? (
                <a href={action} target={action.startsWith("http") ? "_blank" : undefined} rel={action.startsWith("http") ? "noreferrer" : undefined} className="inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold text-white" style={{ backgroundColor: accent }}>
                  {toText(actionLabel) || "Nous contacter"}
                </a>
              ) : null}
            </div>
          </article>
        );
      },
    },
    StatsBlock: {
      label: "Statistiques",
      fields: {
        page: pageField(),
        title: { type: "text", label: "Titre" },
        metrics: { type: "textarea", label: "Metriques (Label:Valeur par ligne)" },
        layout: { type: "select", label: "Disposition", options: [{ label: "Cartes", value: "cards" }, { label: "Inline", value: "inline" }] },
        columns: { type: "select", label: "Colonnes", options: [{ label: "2", value: "2" }, { label: "3", value: "3" }, { label: "4", value: "4" }] },
        surface: { type: "select", label: "Surface", options: [{ label: "Carte", value: "card" }, { label: "Teinte", value: "tinted" }, { label: "Sombre", value: "dark" }] },
        accentColor: { type: "text", label: "Couleur accent (#RRGGBB)" },
      },
      render: ({ title, metrics, layout, columns, surface, accentColor }: { title?: string; metrics?: string; layout?: string; columns?: string; surface?: string; accentColor?: string }) => {
        const parsed = toMetrics(metrics, 8);
        const mode = pick(layout, ["cards", "inline"] as const, "cards");
        const accent = toHexColor(accentColor, "#d4af37");
        return (
          <article className={`rounded-3xl ${surfaceClass(surface)} ${padClass("md")}`}>
            <div className="space-y-4">
              <h3 className={`text-xl font-bold ${titleClassForSurface(surface)}`}>{toText(title) || "Statistiques"}</h3>
              {parsed.length === 0 ? (
                <p className={`text-sm ${bodyClassForSurface(surface)}`}>Ajoutez des metriques au format Label:Valeur.</p>
              ) : mode === "inline" ? (
                <div className="flex flex-wrap gap-2">
                  {parsed.map((metric) => (
                    <span key={`${metric.label}-${metric.value}`} className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: toRgba(accent, 0.35), backgroundColor: toRgba(accent, 0.12) }}>
                      <strong>{metric.value}</strong>
                      <span>{metric.label}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <div className={`grid gap-2 ${numberOfColumnsClass(columns)}`}>
                  {parsed.map((metric) => (
                    <div key={`${metric.label}-${metric.value}`} className="rounded-xl border border-black/10 bg-white/70 px-3 py-3">
                      <div className="text-lg font-extrabold" style={{ color: accent }}>{metric.value}</div>
                      <div className="text-xs text-black/65">{metric.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </article>
        );
      },
    },
    CtaBlock: {
      label: "Call to action",
      fields: {
        page: pageField(),
        title: { type: "text", label: "Titre" },
        body: { type: "textarea", label: "Texte" },
        label: { type: "text", label: "Label bouton" },
        href: { type: "text", label: "Lien bouton" },
        align: { type: "select", label: "Alignement", options: [{ label: "Gauche", value: "left" }, { label: "Centre", value: "center" }] },
        theme: { type: "select", label: "Theme", options: [{ label: "Navy", value: "navy" }, { label: "Clair", value: "light" }, { label: "Gradient", value: "gradient" }, { label: "Custom", value: "custom" }] },
        backgroundColor: { type: "text", label: "Fond custom (#RRGGBB)" },
        textColor: { type: "text", label: "Texte custom (#RRGGBB)" },
        buttonStyle: { type: "select", label: "Style bouton", options: [{ label: "Solide", value: "solid" }, { label: "Contour", value: "outline" }, { label: "Ghost", value: "ghost" }] },
        buttonColor: { type: "text", label: "Couleur bouton (#RRGGBB)" },
        padding: { type: "select", label: "Espacement", options: [{ label: "Petit", value: "sm" }, { label: "Moyen", value: "md" }, { label: "Large", value: "lg" }] },
      },
      render: ({ title, body, label, href, align, theme, backgroundColor, textColor, buttonStyle, buttonColor, padding }: { title?: string; body?: string; label?: string; href?: string; align?: string; theme?: string; backgroundColor?: string; textColor?: string; buttonStyle?: string; buttonColor?: string; padding?: string }) => {
        const safeHref = toSafeHref(href);
        const selectedTheme = pick(theme, ["navy", "light", "gradient", "custom"] as const, "navy");
        const bg = toHexColor(backgroundColor, "#0f172a");
        const fg = toHexColor(textColor, "#ffffff");
        const btnColor = toHexColor(buttonColor, "#ffffff");
        const btnMode = pick(buttonStyle, ["solid", "outline", "ghost"] as const, "solid");
        const style = selectedTheme === "light"
          ? { background: "#ffffff", color: "#0f172a", borderColor: "rgba(15,23,42,0.14)" }
          : selectedTheme === "gradient"
            ? { background: "linear-gradient(135deg,#0f172a,#1e293b,#334155)", color: "#ffffff", borderColor: "rgba(15,23,42,0.08)" }
            : selectedTheme === "custom"
              ? { background: bg, color: fg, borderColor: "transparent" }
              : { background: "#0f172a", color: "#ffffff", borderColor: "transparent" };
        return (
          <section className={`rounded-3xl border ${padClass(padding)}`} style={style}>
            <div className={`space-y-3 ${alignClass(align)}`}>
              <h3 className="text-2xl font-bold">{toText(title) || "Section CTA"}</h3>
              {toText(body) ? <p className="max-w-3xl text-sm opacity-90 md:text-base">{toText(body)}</p> : null}
              {safeHref ? (
                <a href={safeHref} target={safeHref.startsWith("http") ? "_blank" : undefined} rel={safeHref.startsWith("http") ? "noreferrer" : undefined} className={`mt-2 inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold ${btnMode === "outline" ? "border bg-transparent" : btnMode === "ghost" ? "border border-transparent bg-black/10" : "border border-transparent"}`} style={{ color: btnMode === "solid" ? "#0f172a" : btnColor, backgroundColor: btnMode === "solid" ? btnColor : "transparent", borderColor: btnMode === "outline" ? btnColor : "transparent" }}>
                  {toText(label) || "En savoir plus"}
                </a>
              ) : null}
            </div>
          </section>
        );
      },
    },
  },
} as unknown as Config;
