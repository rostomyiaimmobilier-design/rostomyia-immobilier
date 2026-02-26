import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type StorefrontPayload = {
  slug: string;
  tagline?: string | null;
  description?: string | null;
  cover_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  whatsapp?: string | null;
  is_enabled?: boolean;
  hero_title?: string | null;
  hero_subtitle?: string | null;
  about_title?: string | null;
  services?: unknown;
  highlights?: unknown;
  service_areas?: string | null;
  languages_spoken?: string | null;
  business_hours?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_address?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  marketplace_title?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string | null;
  brand_primary_color?: string | null;
  brand_secondary_color?: string | null;
  brand_accent_color?: string | null;
  theme_preset?: string | null;
  show_services_section?: boolean;
  show_highlights_section?: boolean;
  show_contact_section?: boolean;
  show_marketplace_section?: boolean;
  section_order?: unknown;
  custom_domain?: string | null;
  custom_domain_status?: string | null;
  builder_type?: string | null;
  builder_payload?: unknown;
};

function normalizeStorefrontSlug(input: string) {
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

function toOptionalText(value: unknown) {
  const v = String(value ?? "").trim();
  return v || null;
}

function toOptionalUrl(value: unknown) {
  const v = String(value ?? "").trim();
  if (!v) return null;
  return /^https?:\/\//i.test(v) ? v : null;
}

function toOptionalImageUrl(value: unknown) {
  const v = String(value ?? "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (/^\//.test(v)) return v;
  return "";
}

function toPercent(value: unknown, fallback = 50) {
  const n = Number(String(value ?? "").trim());
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function toTagList(value: unknown, limit = 10) {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,]/g)
      : [];
  const unique = new Set<string>();
  const out: string[] = [];
  for (const item of source) {
    const cleaned = String(item ?? "").replace(/\s+/g, " ").trim().slice(0, 72);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (unique.has(key)) continue;
    unique.add(key);
    out.push(cleaned);
    if (out.length >= limit) break;
  }
  return out;
}

function normalizeNativeStudioBlocksForRoute(value: unknown) {
  const blocksRaw = Array.isArray(value) ? value : [];
  const blocks: Array<Record<string, unknown>> = [];
  const usedIds = new Set<string>();

  for (let index = 0; index < blocksRaw.length; index += 1) {
    if (blocks.length >= 24) break;
    const item = blocksRaw[index];
    if (typeof item !== "object" || item === null || Array.isArray(item)) continue;
    const block = item as Record<string, unknown>;

    const baseId =
      String(block.id ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || `native-block-${index + 1}`;
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);

    const sectionRaw = String(block.section ?? "").trim().toLowerCase();
    const section =
      sectionRaw === "services" || sectionRaw === "contact" || sectionRaw === "marketplace"
        ? sectionRaw
        : "about";

    const typeRaw = String(block.type ?? "").trim().toLowerCase();
    const type = typeRaw === "list" || typeRaw === "cta" ? typeRaw : "text";

    const title = String(block.title ?? "").trim().slice(0, 80);
    const body = String(block.body ?? "").trim().slice(0, 1200);
    const imageUrlRaw = String(block.image_url ?? "").trim();
    const image_url = /^https?:\/\//i.test(imageUrlRaw) || /^\//.test(imageUrlRaw) ? imageUrlRaw : "";
    const image_alt = String(block.image_alt ?? "").trim().slice(0, 140);
    const cta_label = String(block.cta_label ?? "").trim().slice(0, 60);
    const ctaHrefRaw = String(block.cta_href ?? "").trim();
    const cta_href =
      /^https?:\/\//i.test(ctaHrefRaw) ||
      /^mailto:/i.test(ctaHrefRaw) ||
      /^tel:/i.test(ctaHrefRaw) ||
      /^\//.test(ctaHrefRaw)
        ? ctaHrefRaw
        : "";

    blocks.push({
      id,
      section,
      type,
      title,
      body,
      image_url,
      image_alt,
      cta_label,
      cta_href,
    });
  }

  return blocks;
}

function toOptionalEmail(value: unknown) {
  const v = String(value ?? "").trim();
  if (!v) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v.toLowerCase() : null;
}

function toOptionalHexColor(value: unknown) {
  const v = String(value ?? "").trim();
  if (!v) return null;
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : null;
}

function toOptionalThemePreset(value: unknown) {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v) return null;
  if (v === "premium" || v === "sunset" || v === "emerald") return v;
  return null;
}

function toSectionOrder(value: unknown) {
  const allowed = ["about", "services", "contact", "marketplace"] as const;
  const parsed = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,\n]/g)
      : [];

  const unique = new Set<string>();
  const normalized: string[] = [];
  for (const item of parsed) {
    const key = String(item ?? "").trim().toLowerCase();
    if (!allowed.includes(key as (typeof allowed)[number])) continue;
    if (unique.has(key)) continue;
    unique.add(key);
    normalized.push(key);
  }

  for (const key of allowed) {
    if (!unique.has(key)) normalized.push(key);
  }

  return normalized;
}

function toOptionalDomain(value: unknown) {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");

  if (!raw) return null;
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(raw)) return null;
  return raw;
}

function toOptionalDomainStatus(value: unknown) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (raw === "unverified" || raw === "pending_dns" || raw === "verified" || raw === "error") return raw;
  return null;
}

function toOptionalBuilderType(value: unknown) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (raw === "native" || raw === "puck" || raw === "webstudio") return raw;
  return null;
}

function toOptionalPuckPayload(value: unknown) {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) return null;
  const parsed = value as { content?: unknown };
  if (!Array.isArray(parsed.content)) return null;
  return value as Record<string, unknown>;
}

function toOptionalWebstudioPayload(value: unknown) {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) return null;

  const payload = value as {
    builder_url?: unknown;
    published_url?: unknown;
    site_name?: unknown;
    embed?: unknown;
  };

  const builderUrlRaw = String(payload.builder_url ?? "").trim();
  const publishedUrlRaw = String(payload.published_url ?? "").trim();
  const siteNameRaw = String(payload.site_name ?? "").trim();
  const embed = payload.embed !== false;

  const builder_url = builderUrlRaw ? toOptionalUrl(builderUrlRaw) : null;
  const published_url = publishedUrlRaw ? toOptionalUrl(publishedUrlRaw) : null;
  const site_name = siteNameRaw || null;

  if (builderUrlRaw && !builder_url) return null;
  if (publishedUrlRaw && !published_url) return null;

  return {
    builder_url,
    published_url,
    site_name,
    embed,
  } as Record<string, unknown>;
}

function toOptionalNativeStudioPayload(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) return null;

  const payload = value as {
    hero_variant?: unknown;
    card_density?: unknown;
    section_surface?: unknown;
    cta_style?: unknown;
    marketplace_columns?: unknown;
    card_radius?: unknown;
    button_radius?: unknown;
    section_spacing?: unknown;
    hero_image_alt?: unknown;
    hero_image_focal_x?: unknown;
    hero_image_focal_y?: unknown;
    design_system?: unknown;
    responsive_overrides?: unknown;
    locale_default?: unknown;
    locales_enabled?: unknown;
    translations?: unknown;
    page_content?: unknown;
    design_tokens?: unknown;
    trust_badges?: unknown;
    mobile_conversion_rail?: unknown;
    block_library?: unknown;
    revisions?: unknown;
    publish_state?: unknown;
    scheduled_publish_at?: unknown;
    published_snapshot?: unknown;
    scheduled_snapshot?: unknown;
    blocks?: unknown;
  };

  const defaultPageContent = {
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
  } as const;

  const pageContentRaw =
    payload.page_content && typeof payload.page_content === "object" && !Array.isArray(payload.page_content)
      ? (payload.page_content as Record<string, unknown>)
      : {};
  const parsePageContent = (section: keyof typeof defaultPageContent) => {
    const sectionRaw =
      pageContentRaw[section] &&
      typeof pageContentRaw[section] === "object" &&
      !Array.isArray(pageContentRaw[section])
        ? (pageContentRaw[section] as Record<string, unknown>)
        : {};
    const fallback = defaultPageContent[section];
    const imageUrl = toOptionalImageUrl(sectionRaw.image_url);
    return {
      title: String(sectionRaw.title ?? fallback.title).trim().slice(0, 120),
      intro: String(sectionRaw.intro ?? fallback.intro).trim().slice(0, 520),
      image_url: imageUrl || fallback.image_url,
      image_alt: String(sectionRaw.image_alt ?? fallback.image_alt).trim().slice(0, 140),
      image_focal_x: toPercent(sectionRaw.image_focal_x, fallback.image_focal_x),
      image_focal_y: toPercent(sectionRaw.image_focal_y, fallback.image_focal_y),
    };
  };

  const designTokensRaw =
    payload.design_tokens && typeof payload.design_tokens === "object" && !Array.isArray(payload.design_tokens)
      ? (payload.design_tokens as Record<string, unknown>)
      : {};
  const design_tokens = {
    container_width:
      String(designTokensRaw.container_width ?? "").trim().toLowerCase() === "narrow"
        ? "narrow"
        : String(designTokensRaw.container_width ?? "").trim().toLowerCase() === "wide"
          ? "wide"
          : "normal",
    typography_scale:
      String(designTokensRaw.typography_scale ?? "").trim().toLowerCase() === "sm"
        ? "sm"
        : String(designTokensRaw.typography_scale ?? "").trim().toLowerCase() === "lg"
          ? "lg"
          : "md",
    motion_level:
      String(designTokensRaw.motion_level ?? "").trim().toLowerCase() === "none"
        ? "none"
        : String(designTokensRaw.motion_level ?? "").trim().toLowerCase() === "rich"
          ? "rich"
          : "subtle",
  } as const;
  const designSystemRaw =
    payload.design_system && typeof payload.design_system === "object" && !Array.isArray(payload.design_system)
      ? (payload.design_system as Record<string, unknown>)
      : {};
  const parseDesignSystem = (source: Record<string, unknown>) => ({
    heading_font:
      String(source.heading_font ?? "").trim().toLowerCase() === "montserrat"
        ? "montserrat"
        : String(source.heading_font ?? "").trim().toLowerCase() === "lora"
          ? "lora"
          : "playfair",
    body_font:
      String(source.body_font ?? "").trim().toLowerCase() === "inter"
        ? "inter"
        : String(source.body_font ?? "").trim().toLowerCase() === "poppins"
          ? "poppins"
          : "manrope",
    shadow_intensity:
      String(source.shadow_intensity ?? "").trim().toLowerCase() === "soft"
        ? "soft"
        : String(source.shadow_intensity ?? "").trim().toLowerCase() === "strong"
          ? "strong"
          : "medium",
  } as const);
  const design_system = parseDesignSystem(designSystemRaw);
  const responsiveRaw =
    payload.responsive_overrides &&
    typeof payload.responsive_overrides === "object" &&
    !Array.isArray(payload.responsive_overrides)
      ? (payload.responsive_overrides as Record<string, unknown>)
      : {};
  const parseResponsiveSetting = (
    source: Record<string, unknown>,
    key: "mobile" | "tablet" | "desktop",
    fallbackScale: "sm" | "md" | "lg",
    fallbackSpacing: "compact" | "normal" | "relaxed"
  ) => {
    const row = source[key] && typeof source[key] === "object" && !Array.isArray(source[key])
      ? (source[key] as Record<string, unknown>)
        : {};
    return {
      typography_scale:
        String(row.typography_scale ?? "").trim().toLowerCase() === "sm"
          ? "sm"
          : String(row.typography_scale ?? "").trim().toLowerCase() === "md"
            ? "md"
          : String(row.typography_scale ?? "").trim().toLowerCase() === "lg"
            ? "lg"
            : fallbackScale,
      section_spacing:
        String(row.section_spacing ?? "").trim().toLowerCase() === "compact"
          ? "compact"
          : String(row.section_spacing ?? "").trim().toLowerCase() === "relaxed"
            ? "relaxed"
            : fallbackSpacing,
    } as const;
  };
  const parseResponsiveOverrides = (source: Record<string, unknown>) =>
    ({
      mobile: parseResponsiveSetting(source, "mobile", "sm", "compact"),
      tablet: parseResponsiveSetting(source, "tablet", "md", "normal"),
      desktop: parseResponsiveSetting(source, "desktop", "lg", "normal"),
    } as const);
  const responsive_overrides = parseResponsiveOverrides(responsiveRaw);
  const trust_badges = toTagList(payload.trust_badges);
  const mobile_conversion_rail = payload.mobile_conversion_rail !== false;
  const publish_state_raw = String(payload.publish_state ?? "").trim().toLowerCase();
  const publish_state =
    publish_state_raw === "draft" || publish_state_raw === "scheduled" ? publish_state_raw : "published";
  const scheduled_publish_at = String(payload.scheduled_publish_at ?? "").trim().slice(0, 40);

  const normalizeSnapshot = (input: unknown): Record<string, unknown> | null => {
    if (!input || typeof input !== "object" || Array.isArray(input)) return null;
    const raw = input as Record<string, unknown>;
    const snapshotTokensRaw =
      raw.design_tokens && typeof raw.design_tokens === "object" && !Array.isArray(raw.design_tokens)
        ? (raw.design_tokens as Record<string, unknown>)
        : {};
    const snapshotDesignTokens = {
      container_width:
        String(snapshotTokensRaw.container_width ?? "").trim().toLowerCase() === "narrow"
          ? "narrow"
          : String(snapshotTokensRaw.container_width ?? "").trim().toLowerCase() === "wide"
            ? "wide"
            : "normal",
      typography_scale:
        String(snapshotTokensRaw.typography_scale ?? "").trim().toLowerCase() === "sm"
          ? "sm"
          : String(snapshotTokensRaw.typography_scale ?? "").trim().toLowerCase() === "lg"
            ? "lg"
            : "md",
      motion_level:
        String(snapshotTokensRaw.motion_level ?? "").trim().toLowerCase() === "none"
          ? "none"
          : String(snapshotTokensRaw.motion_level ?? "").trim().toLowerCase() === "rich"
            ? "rich"
            : "subtle",
    } as const;
    const snapshotDesignSystemRaw =
      raw.design_system && typeof raw.design_system === "object" && !Array.isArray(raw.design_system)
        ? (raw.design_system as Record<string, unknown>)
        : {};
    const snapshotResponsiveRaw =
      raw.responsive_overrides &&
      typeof raw.responsive_overrides === "object" &&
      !Array.isArray(raw.responsive_overrides)
        ? (raw.responsive_overrides as Record<string, unknown>)
        : {};

    const snapshotPageContentRaw =
      raw.page_content && typeof raw.page_content === "object" && !Array.isArray(raw.page_content)
        ? (raw.page_content as Record<string, unknown>)
        : {};
    const parseSnapshotPage = (section: keyof typeof defaultPageContent) => {
      const sectionRaw =
        snapshotPageContentRaw[section] &&
        typeof snapshotPageContentRaw[section] === "object" &&
        !Array.isArray(snapshotPageContentRaw[section])
          ? (snapshotPageContentRaw[section] as Record<string, unknown>)
          : {};
      const fallback = defaultPageContent[section];
      const imageUrl = toOptionalImageUrl(sectionRaw.image_url);
      return {
        title: String(sectionRaw.title ?? fallback.title).trim().slice(0, 120),
        intro: String(sectionRaw.intro ?? fallback.intro).trim().slice(0, 520),
        image_url: imageUrl || fallback.image_url,
        image_alt: String(sectionRaw.image_alt ?? fallback.image_alt).trim().slice(0, 140),
        image_focal_x: toPercent(sectionRaw.image_focal_x, fallback.image_focal_x),
        image_focal_y: toPercent(sectionRaw.image_focal_y, fallback.image_focal_y),
      };
    };

    return {
      hero_variant:
        String(raw.hero_variant ?? "").trim().toLowerCase() === "compact"
          ? "compact"
          : String(raw.hero_variant ?? "").trim().toLowerCase() === "immersive"
            ? "immersive"
            : "classic",
      card_density: String(raw.card_density ?? "").trim().toLowerCase() === "compact" ? "compact" : "comfortable",
      section_surface: String(raw.section_surface ?? "").trim().toLowerCase() === "flat" ? "flat" : "soft",
      cta_style: String(raw.cta_style ?? "").trim().toLowerCase() === "outline" ? "outline" : "solid",
      marketplace_columns: String(raw.marketplace_columns ?? "").trim() === "2" ? "2" : "3",
      card_radius:
        String(raw.card_radius ?? "").trim().toLowerCase() === "md"
          ? "md"
          : String(raw.card_radius ?? "").trim().toLowerCase() === "full"
            ? "full"
            : "xl",
      button_radius:
        String(raw.button_radius ?? "").trim().toLowerCase() === "md"
          ? "md"
          : String(raw.button_radius ?? "").trim().toLowerCase() === "full"
            ? "full"
            : "xl",
      section_spacing:
        String(raw.section_spacing ?? "").trim().toLowerCase() === "compact"
          ? "compact"
          : String(raw.section_spacing ?? "").trim().toLowerCase() === "relaxed"
            ? "relaxed"
            : "normal",
      hero_image_alt: String(raw.hero_image_alt ?? "").trim().slice(0, 140),
      hero_image_focal_x: toPercent(raw.hero_image_focal_x, 50),
      hero_image_focal_y: toPercent(raw.hero_image_focal_y, 50),
      design_tokens: snapshotDesignTokens,
      design_system: parseDesignSystem(snapshotDesignSystemRaw),
      responsive_overrides: parseResponsiveOverrides(snapshotResponsiveRaw),
      page_content: {
        about: parseSnapshotPage("about"),
        services: parseSnapshotPage("services"),
        contact: parseSnapshotPage("contact"),
        marketplace: parseSnapshotPage("marketplace"),
      },
      blocks: normalizeNativeStudioBlocksForRoute(raw.blocks),
      trust_badges: toTagList(raw.trust_badges),
      mobile_conversion_rail: raw.mobile_conversion_rail !== false,
    } as Record<string, unknown>;
  };
  const published_snapshot = normalizeSnapshot(payload.published_snapshot);
  const scheduled_snapshot = normalizeSnapshot(payload.scheduled_snapshot);

  const blockLibraryRaw = Array.isArray(payload.block_library) ? payload.block_library : [];
  const block_library: Array<Record<string, unknown>> = [];
  const usedLibraryIds = new Set<string>();
  for (let index = 0; index < blockLibraryRaw.length; index += 1) {
    if (block_library.length >= 40) break;
    const item = blockLibraryRaw[index];
    if (typeof item !== "object" || item === null || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const baseId =
      String(row.id ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || `library-${index + 1}`;
    let id = baseId;
    let suffix = 2;
    while (usedLibraryIds.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    usedLibraryIds.add(id);
    const blockSource =
      row.block && typeof row.block === "object" && !Array.isArray(row.block)
        ? (row.block as Record<string, unknown>)
        : row;
    const block = normalizeNativeStudioBlocksForRoute([{ ...blockSource, id: `lib-block-${index + 1}` }])[0] ?? null;
    if (!block) continue;
    block_library.push({
      id,
      name: String(row.name ?? "Modele bloc").trim().slice(0, 72),
      block: {
        section: block.section,
        type: block.type,
        title: block.title,
        body: block.body,
        image_url: block.image_url,
        image_alt: block.image_alt,
        cta_label: block.cta_label,
        cta_href: block.cta_href,
      },
    });
  }

  const revisionsRaw = Array.isArray(payload.revisions) ? payload.revisions : [];
  const revisions: Array<Record<string, unknown>> = [];
  const usedRevisionIds = new Set<string>();
  for (let index = 0; index < revisionsRaw.length; index += 1) {
    if (revisions.length >= 24) break;
    const item = revisionsRaw[index];
    if (typeof item !== "object" || item === null || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const snapshot = normalizeSnapshot(row.snapshot);
    if (!snapshot) continue;
    const baseId =
      String(row.id ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || `revision-${index + 1}`;
    let id = baseId;
    let suffix = 2;
    while (usedRevisionIds.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    usedRevisionIds.add(id);
    revisions.push({
      id,
      label: String(row.label ?? "Revision").trim().slice(0, 64),
      saved_at: String(row.saved_at ?? new Date(0).toISOString()).trim().slice(0, 40),
      snapshot,
    });
  }

  const heroVariantRaw = String(payload.hero_variant ?? "").trim().toLowerCase();
  const cardDensityRaw = String(payload.card_density ?? "").trim().toLowerCase();
  const sectionSurfaceRaw = String(payload.section_surface ?? "").trim().toLowerCase();
  const ctaStyleRaw = String(payload.cta_style ?? "").trim().toLowerCase();
  const marketplaceColumnsRaw = String(payload.marketplace_columns ?? "").trim();
  const cardRadiusRaw = String(payload.card_radius ?? "").trim().toLowerCase();
  const buttonRadiusRaw = String(payload.button_radius ?? "").trim().toLowerCase();
  const sectionSpacingRaw = String(payload.section_spacing ?? "").trim().toLowerCase();
  const localeDefaultRaw = String(payload.locale_default ?? "").trim().toLowerCase();
  const localesEnabledRaw = Array.isArray(payload.locales_enabled) ? payload.locales_enabled : [];
  const locales_enabled: Array<"fr" | "ar"> = [];
  for (const locale of localesEnabledRaw) {
    const key = String(locale ?? "").trim().toLowerCase();
    if ((key === "fr" || key === "ar") && !locales_enabled.includes(key as "fr" | "ar")) {
      locales_enabled.push(key as "fr" | "ar");
    }
  }
  if (locales_enabled.length === 0) locales_enabled.push("fr", "ar");
  const translationsRaw =
    payload.translations && typeof payload.translations === "object" && !Array.isArray(payload.translations)
      ? (payload.translations as Record<string, unknown>)
      : {};
  const arRaw =
    translationsRaw.ar && typeof translationsRaw.ar === "object" && !Array.isArray(translationsRaw.ar)
      ? (translationsRaw.ar as Record<string, unknown>)
      : {};
  const blocks = normalizeNativeStudioBlocksForRoute(payload.blocks);

  return {
    hero_variant:
      heroVariantRaw === "compact" || heroVariantRaw === "immersive" ? heroVariantRaw : "classic",
    card_density: cardDensityRaw === "compact" ? "compact" : "comfortable",
    section_surface: sectionSurfaceRaw === "flat" ? "flat" : "soft",
    cta_style: ctaStyleRaw === "outline" ? "outline" : "solid",
    marketplace_columns: marketplaceColumnsRaw === "2" ? "2" : "3",
    card_radius:
      cardRadiusRaw === "md" || cardRadiusRaw === "full" ? cardRadiusRaw : "xl",
    button_radius:
      buttonRadiusRaw === "md" || buttonRadiusRaw === "full" ? buttonRadiusRaw : "xl",
    section_spacing:
      sectionSpacingRaw === "compact" || sectionSpacingRaw === "relaxed" ? sectionSpacingRaw : "normal",
    hero_image_alt: String(payload.hero_image_alt ?? "").trim().slice(0, 140),
    hero_image_focal_x: toPercent(payload.hero_image_focal_x, 50),
    hero_image_focal_y: toPercent(payload.hero_image_focal_y, 50),
    design_system,
    responsive_overrides,
    locale_default: localeDefaultRaw === "ar" ? "ar" : "fr",
    locales_enabled,
    translations: {
      ar: {
        hero_title: String(arRaw.hero_title ?? "").trim().slice(0, 120),
        hero_subtitle: String(arRaw.hero_subtitle ?? "").trim().slice(0, 220),
        tagline: String(arRaw.tagline ?? "").trim().slice(0, 180),
        description: String(arRaw.description ?? "").trim().slice(0, 1200),
        about_title: String(arRaw.about_title ?? "").trim().slice(0, 80),
        cta_label: String(arRaw.cta_label ?? "").trim().slice(0, 60),
        marketplace_title: String(arRaw.marketplace_title ?? "").trim().slice(0, 120),
      },
    },
    design_tokens,
    page_content: {
      about: parsePageContent("about"),
      services: parsePageContent("services"),
      contact: parsePageContent("contact"),
      marketplace: parsePageContent("marketplace"),
    },
    trust_badges: trust_badges.length > 0 ? trust_badges : [
      "Conseillers verifies",
      "Dossiers juridiquement controles",
      "Accompagnement bancaire et notarial",
    ],
    mobile_conversion_rail,
    block_library,
    revisions,
    publish_state,
    scheduled_publish_at,
    published_snapshot,
    scheduled_snapshot,
    blocks,
  } as Record<string, unknown>;
}

function toStringArray(value: unknown, maxItems = 12, maxLength = 72) {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,]/g)
      : [];

  const unique = new Set<string>();
  const out: string[] = [];

  for (const item of source) {
    const cleaned = String(item ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (unique.has(key)) continue;
    unique.add(key);
    out.push(cleaned);
    if (out.length >= maxItems) break;
  }

  return out;
}

function isMissingStorefrontTable(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("agency_storefronts") && (m.includes("does not exist") || m.includes("relation"));
}

function isMissingStorefrontColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return (
    m.includes("agency_storefronts") &&
    (m.includes("column") || m.includes("could not find the") || m.includes("schema cache"))
  );
}

function isAgencyUser(user: { user_metadata?: Record<string, unknown> | null } | null) {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  return String(meta.account_type ?? "").toLowerCase().trim() === "agency";
}

function missingStructureResponse() {
  return NextResponse.json(
    {
      error:
        "La structure agency_storefronts est incomplete. Lancez les migrations 2026-02-25-add-agency-storefronts.sql, 2026-02-25-enhance-agency-storefronts-wizard-fields.sql, 2026-02-25-add-agency-storefront-builder-settings.sql, 2026-02-25-enhance-agency-storefront-builder-next.sql et 2026-02-25-allow-webstudio-builder-type.sql.",
    },
    { status: 400 }
  );
}

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) return NextResponse.json({ error: userError.message }, { status: 401 });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAgencyUser(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = (await req.json().catch(() => null)) as StorefrontPayload | null;
    if (!body) return NextResponse.json({ error: "Invalid payload." }, { status: 400 });

    const slug = normalizeStorefrontSlug(body.slug || "");
    if (slug.length < 3) {
      return NextResponse.json(
        { error: "Slug invalide. Utilisez au moins 3 caracteres." },
        { status: 400 }
      );
    }

    const invalidColor = [
      ["brand_primary_color", body.brand_primary_color],
      ["brand_secondary_color", body.brand_secondary_color],
      ["brand_accent_color", body.brand_accent_color],
    ].find(([, value]) => {
      const raw = String(value ?? "").trim();
      return raw.length > 0 && toOptionalHexColor(value) === null;
    });

    if (invalidColor) {
      return NextResponse.json(
        { error: `Couleur invalide pour ${invalidColor[0]}. Utilisez le format #RRGGBB.` },
        { status: 400 }
      );
    }

    if (String(body.contact_email ?? "").trim() && !toOptionalEmail(body.contact_email)) {
      return NextResponse.json({ error: "Email de contact invalide." }, { status: 400 });
    }

    if (String(body.cta_url ?? "").trim() && !toOptionalUrl(body.cta_url)) {
      return NextResponse.json({ error: "Lien CTA invalide (http/https requis)." }, { status: 400 });
    }

    if (String(body.custom_domain ?? "").trim() && !toOptionalDomain(body.custom_domain)) {
      return NextResponse.json({ error: "Domaine personnalise invalide." }, { status: 400 });
    }

    const normalizedBuilderType = toOptionalBuilderType(body.builder_type);
    if (String(body.builder_type ?? "").trim() && !normalizedBuilderType) {
      return NextResponse.json(
        { error: "builder_type invalide. Valeurs attendues: native, webstudio (legacy: puck)." },
        { status: 400 }
      );
    }

    const effectiveBuilderType = normalizedBuilderType ?? "native";
    const normalizedBuilderPayload =
      effectiveBuilderType === "puck"
        ? toOptionalPuckPayload(body.builder_payload)
        : effectiveBuilderType === "webstudio"
          ? toOptionalWebstudioPayload(body.builder_payload)
          : toOptionalNativeStudioPayload(body.builder_payload);

    if (body.builder_payload != null) {
      if (effectiveBuilderType === "puck" && !normalizedBuilderPayload) {
        return NextResponse.json(
          { error: "builder_payload invalide. Une structure Puck valide est attendue." },
          { status: 400 }
        );
      }
      if (effectiveBuilderType === "webstudio" && !normalizedBuilderPayload) {
        return NextResponse.json(
          {
            error:
              "builder_payload webstudio invalide. Utilisez builder_url/published_url en http(s).",
          },
          { status: 400 }
        );
      }
      if (effectiveBuilderType === "native" && !normalizedBuilderPayload) {
        return NextResponse.json(
          {
            error:
              "builder_payload natif invalide. Utilisez hero_variant, card_density, section_surface, cta_style, marketplace_columns.",
          },
          { status: 400 }
        );
      }
    }

    if (normalizedBuilderPayload) {
      const serialized = JSON.stringify(normalizedBuilderPayload);
      if (serialized.length > 300_000) {
        return NextResponse.json(
          { error: "builder_payload trop volumineux (max 300 KB)." },
          { status: 400 }
        );
      }
    }

    const admin = supabaseAdmin();

    const taken = await admin
      .from("agency_storefronts")
      .select("agency_user_id")
      .eq("slug", slug)
      .neq("agency_user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (taken.error) {
      if (isMissingStorefrontTable(taken.error.message) || isMissingStorefrontColumn(taken.error.message)) {
        return missingStructureResponse();
      }
      return NextResponse.json({ error: taken.error.message }, { status: 400 });
    }

    if (taken.data) {
      return NextResponse.json({ error: "Ce slug est deja utilise." }, { status: 409 });
    }

    const normalizedCustomDomain = toOptionalDomain(body.custom_domain);
    if (normalizedCustomDomain) {
      const existingDomain = await admin
        .from("agency_storefronts")
        .select("agency_user_id")
        .ilike("custom_domain", normalizedCustomDomain)
        .neq("agency_user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (existingDomain.error) {
        if (
          isMissingStorefrontTable(existingDomain.error.message) ||
          isMissingStorefrontColumn(existingDomain.error.message)
        ) {
          return missingStructureResponse();
        }
        return NextResponse.json({ error: existingDomain.error.message }, { status: 400 });
      }

      if (existingDomain.data) {
        return NextResponse.json({ error: "Ce domaine est deja utilise." }, { status: 409 });
      }
    }

    const now = new Date().toISOString();
    const row: Record<string, unknown> = {
      agency_user_id: user.id,
      slug,
      tagline: toOptionalText(body.tagline),
      description: toOptionalText(body.description),
      cover_url: toOptionalUrl(body.cover_url),
      facebook_url: toOptionalText(body.facebook_url),
      instagram_url: toOptionalText(body.instagram_url),
      tiktok_url: toOptionalText(body.tiktok_url),
      whatsapp: toOptionalText(body.whatsapp),
      is_enabled: body.is_enabled ?? true,
      completed_at: now,
    };

    if ("hero_title" in body) row.hero_title = toOptionalText(body.hero_title);
    if ("hero_subtitle" in body) row.hero_subtitle = toOptionalText(body.hero_subtitle);
    if ("about_title" in body) row.about_title = toOptionalText(body.about_title);
    if ("services" in body) row.services = toStringArray(body.services);
    if ("highlights" in body) row.highlights = toStringArray(body.highlights);
    if ("service_areas" in body) row.service_areas = toOptionalText(body.service_areas);
    if ("languages_spoken" in body) row.languages_spoken = toOptionalText(body.languages_spoken);
    if ("business_hours" in body) row.business_hours = toOptionalText(body.business_hours);
    if ("contact_email" in body) row.contact_email = toOptionalEmail(body.contact_email);
    if ("contact_phone" in body) row.contact_phone = toOptionalText(body.contact_phone);
    if ("contact_address" in body) row.contact_address = toOptionalText(body.contact_address);
    if ("cta_label" in body) row.cta_label = toOptionalText(body.cta_label);
    if ("cta_url" in body) row.cta_url = toOptionalUrl(body.cta_url);
    if ("marketplace_title" in body) row.marketplace_title = toOptionalText(body.marketplace_title);
    if ("seo_title" in body) row.seo_title = toOptionalText(body.seo_title);
    if ("seo_description" in body) row.seo_description = toOptionalText(body.seo_description);
    if ("seo_keywords" in body) row.seo_keywords = toOptionalText(body.seo_keywords);
    if ("brand_primary_color" in body) row.brand_primary_color = toOptionalHexColor(body.brand_primary_color);
    if ("brand_secondary_color" in body) {
      row.brand_secondary_color = toOptionalHexColor(body.brand_secondary_color);
    }
    if ("brand_accent_color" in body) row.brand_accent_color = toOptionalHexColor(body.brand_accent_color);
    if ("theme_preset" in body) row.theme_preset = toOptionalThemePreset(body.theme_preset);
    if ("show_services_section" in body) row.show_services_section = Boolean(body.show_services_section);
    if ("show_highlights_section" in body) row.show_highlights_section = Boolean(body.show_highlights_section);
    if ("show_contact_section" in body) row.show_contact_section = Boolean(body.show_contact_section);
    if ("show_marketplace_section" in body) {
      row.show_marketplace_section = Boolean(body.show_marketplace_section);
    }
    if ("section_order" in body) row.section_order = toSectionOrder(body.section_order);
    if ("custom_domain" in body) {
      row.custom_domain = normalizedCustomDomain;
      if (!normalizedCustomDomain) {
        row.custom_domain_status = "unverified";
        row.custom_domain_verified_at = null;
      } else if (!("custom_domain_status" in body)) {
        row.custom_domain_status = "pending_dns";
        row.custom_domain_verified_at = null;
      }
    }
    if ("custom_domain_status" in body) {
      const normalizedStatus = toOptionalDomainStatus(body.custom_domain_status);
      if (normalizedStatus) {
        row.custom_domain_status = normalizedStatus;
        row.custom_domain_verified_at = normalizedStatus === "verified" ? now : null;
      }
    }
    if ("builder_type" in body) row.builder_type = effectiveBuilderType;
    if ("builder_payload" in body) {
      row.builder_payload = normalizedBuilderPayload;
    }

    const upsert = await admin
      .from("agency_storefronts")
      .upsert(row, { onConflict: "agency_user_id" })
      .select("*")
      .single();

    if (upsert.error) {
      if (isMissingStorefrontTable(upsert.error.message) || isMissingStorefrontColumn(upsert.error.message)) {
        return missingStructureResponse();
      }
      return NextResponse.json({ error: upsert.error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, storefront: upsert.data });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "storefront_save_failed" },
      { status: 500 }
    );
  }
}
