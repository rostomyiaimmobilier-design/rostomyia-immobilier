import { supabaseAdmin } from "@/lib/supabase/admin";
import { propertyImageUrl } from "@/lib/property-image-url";
import {
  normalizeAgencyNativeStudioPayload,
  type AgencyNativeStudioPayload,
  type AgencyNativeStudioSnapshot,
} from "@/lib/agency-storefront-puck";

type AgencyUser = {
  id: string;
  email: string | null;
  phone: string | null;
  user_metadata?: Record<string, unknown> | null;
};

type StorefrontRow = {
  agency_user_id: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  cover_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  whatsapp: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  about_title: string | null;
  services: unknown;
  highlights: unknown;
  service_areas: string | null;
  languages_spoken: string | null;
  business_hours: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_address: string | null;
  cta_label: string | null;
  cta_url: string | null;
  marketplace_title: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  custom_domain: string | null;
  custom_domain_status: string | null;
  brand_primary_color: string | null;
  brand_secondary_color: string | null;
  brand_accent_color: string | null;
  section_order: unknown;
  show_services_section: boolean | null;
  show_highlights_section: boolean | null;
  show_contact_section: boolean | null;
  show_marketplace_section: boolean | null;
  builder_type: string | null;
  builder_payload: unknown;
  is_enabled: boolean;
};

type LeadRow = {
  id: string;
  title: string | null;
  property_type: string | null;
  transaction_type: string | null;
  location_type: string | null;
  commune: string | null;
  district: string | null;
  address: string | null;
  city: string | null;
  price: number | null;
  surface: number | null;
  rooms: number | null;
  baths: number | null;
  photo_links: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
};

type PropertyRow = {
  id: string;
  ref: string | null;
  title: string | null;
  type: string | null;
  category: string | null;
  location: string | null;
  price: string | number | null;
  beds: number | null;
  baths: number | null;
  area: number | null;
  owner_lead_id: string | null;
  property_images: Array<{
    path: string | null;
    sort: number | null;
    is_cover: boolean | null;
  }> | null;
};

const AGENCY_DEPOSIT_INTENTS = [
  "agency_deposit",
  "depot_tiers",
  "third_party_upload",
  "third_party",
] as const;

export type AgencyMarketplaceItem = {
  id: string;
  ref: string;
  title: string;
  transaction: string;
  location: string;
  price: string;
  area: string;
  beds: string;
  baths: string;
  imageUrl: string;
};

export type AgencyStorefrontData = {
  slug: string;
  agencyName: string;
  agencyInitials: string;
  agencyTagline: string;
  agencyDescription: string;
  heroTitle: string;
  heroSubtitle: string;
  aboutTitle: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  customDomain: string;
  customDomainStatus: string;
  services: string[];
  highlights: string[];
  serviceAreas: string;
  languagesSpoken: string;
  businessHours: string;
  contactEmail: string;
  contactPhone: string;
  agencyWhatsapp: string;
  agencyAddress: string;
  agencyCity: string;
  agencyWebsite: string;
  ctaLabel: string;
  ctaHref: string;
  whatsappHref: string;
  logoUrl: string;
  coverUrl: string;
  socialLinks: Array<{ href: string; label: string }>;
  brandPrimaryColor: string;
  brandSecondaryColor: string;
  brandAccentColor: string;
  showServicesSection: boolean;
  showHighlightsSection: boolean;
  showContactSection: boolean;
  showMarketplaceSection: boolean;
  sectionOrder: Array<"about" | "services" | "contact" | "marketplace">;
  builderType: "native" | "puck" | "webstudio";
  builderPayload: unknown;
  nativeStudio: AgencyNativeStudioPayload;
  marketplaceTitle: string;
  marketplace: AgencyMarketplaceItem[];
};

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeDigits(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

function toText(value: unknown) {
  return String(value ?? "").trim();
}

function toOptionalText(value: unknown) {
  const v = String(value ?? "").trim();
  return v || null;
}

function toTextArray(value: unknown) {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,]/g)
      : [];
  const unique = new Set<string>();
  const out: string[] = [];
  for (const item of source) {
    const cleaned = String(item ?? "").replace(/\s+/g, " ").trim();
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (unique.has(key)) continue;
    unique.add(key);
    out.push(cleaned);
  }
  return out;
}

function toColor(value: unknown, fallback: string) {
  const v = String(value ?? "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toLowerCase();
  return fallback;
}

function normalizeSectionOrder(value: unknown): Array<"about" | "services" | "contact" | "marketplace"> {
  const allowed = ["about", "services", "contact", "marketplace"] as const;
  const parsed = Array.isArray(value) ? value : [];
  const unique = new Set<(typeof allowed)[number]>();
  const out: Array<(typeof allowed)[number]> = [];

  for (const item of parsed) {
    const key = String(item ?? "").trim().toLowerCase();
    if (!allowed.includes(key as (typeof allowed)[number])) continue;
    if (unique.has(key as (typeof allowed)[number])) continue;
    unique.add(key as (typeof allowed)[number]);
    out.push(key as (typeof allowed)[number]);
  }

  for (const key of allowed) {
    if (!unique.has(key)) out.push(key);
  }

  return out;
}

function toSlug(input: string) {
  return normalizeText(input)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function normalizeBuilderType(value: unknown): "native" | "puck" | "webstudio" {
  const normalized = normalizeText(value);
  if (normalized === "puck") return "puck";
  if (normalized === "webstudio") return "webstudio";
  return "native";
}

function parseDateMs(value: string) {
  const t = Date.parse(String(value || "").trim());
  return Number.isFinite(t) ? t : null;
}

function applySnapshotToStudio(
  studio: AgencyNativeStudioPayload,
  snapshot: AgencyNativeStudioSnapshot
): AgencyNativeStudioPayload {
  return {
    ...studio,
    hero_variant: snapshot.hero_variant,
    hero_image_alt: snapshot.hero_image_alt,
    hero_image_focal_x: snapshot.hero_image_focal_x,
    hero_image_focal_y: snapshot.hero_image_focal_y,
    card_density: snapshot.card_density,
    section_surface: snapshot.section_surface,
    cta_style: snapshot.cta_style,
    marketplace_columns: snapshot.marketplace_columns,
    card_radius: snapshot.card_radius,
    button_radius: snapshot.button_radius,
    section_spacing: snapshot.section_spacing,
    design_tokens: snapshot.design_tokens,
    design_system: snapshot.design_system,
    responsive_overrides: snapshot.responsive_overrides,
    page_content: snapshot.page_content,
    blocks: snapshot.blocks,
    trust_badges: snapshot.trust_badges,
    mobile_conversion_rail: snapshot.mobile_conversion_rail,
  };
}

function resolvePublishedNativeStudio(studio: AgencyNativeStudioPayload): AgencyNativeStudioPayload {
  if (studio.publish_state === "published") return studio;
  if (studio.publish_state === "draft") {
    if (studio.published_snapshot) return applySnapshotToStudio(studio, studio.published_snapshot);
    return studio;
  }

  const scheduledAt = parseDateMs(studio.scheduled_publish_at);
  if (!scheduledAt) {
    return studio.published_snapshot ? applySnapshotToStudio(studio, studio.published_snapshot) : studio;
  }
  if (Date.now() < scheduledAt) {
    return studio.published_snapshot ? applySnapshotToStudio(studio, studio.published_snapshot) : studio;
  }
  if (studio.scheduled_snapshot) return applySnapshotToStudio(studio, studio.scheduled_snapshot);
  return studio;
}

function formatPrice(value: string | number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${new Intl.NumberFormat("fr-FR").format(value)} DZD`;
  }
  const n = Number(String(value ?? "").replace(/[^\d]/g, ""));
  if (Number.isFinite(n) && n > 0) return `${new Intl.NumberFormat("fr-FR").format(n)} DZD`;
  return "-";
}

function parsePhotoLinks(value: string | null | undefined) {
  return String(value ?? "")
    .split(/[\n,\s]+/g)
    .map((item) => item.trim())
    .filter((item) => /^https?:\/\//i.test(item));
}

function resolveAgencyLogoUrl(meta: Record<string, unknown>) {
  const candidates = [
    toText(meta.agency_logo_url),
    toText(meta.logo_url),
    toText(meta.avatar_url),
    toText(meta.agency_logo_path),
  ].filter(Boolean);

  for (const raw of candidates) {
    if (/^https?:\/\//i.test(raw)) return raw;
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!base) continue;
    return `${base}/storage/v1/object/public/property-images/${raw.replace(/^\/+/, "")}`;
  }

  return "";
}

function resolveAgencyCoverUrl(meta: Record<string, unknown>) {
  const value = toText(meta.agency_cover_url);
  if (/^https?:\/\//i.test(value)) return value;
  return "";
}

function initials(input: string) {
  const parts = String(input).trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (!parts.length) return "AG";
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "AG";
}

function leadLocation(lead: LeadRow) {
  const values = [lead.address, lead.district, lead.commune, lead.city]
    .map((value) => toOptionalText(value))
    .filter((value): value is string => Boolean(value));
  if (!values.length) return "-";
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const v of values) {
    const k = normalizeText(v);
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(v);
  }
  return unique.join(" - ");
}

function pickPropertyCoverPath(property: PropertyRow) {
  const images = Array.isArray(property.property_images) ? property.property_images : [];
  if (!images.length) return null;
  const cover = images.find((image) => image?.is_cover && image?.path);
  if (cover?.path) return cover.path;
  const sorted = [...images].sort((a, b) => (a?.sort ?? 9999) - (b?.sort ?? 9999));
  return sorted[0]?.path ?? null;
}

function isMissingColumnError(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("column") && m.includes("does not exist");
}

function isMissingOwnerLeadIdColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("owner_lead_id") && (m.includes("does not exist") || m.includes("column"));
}

function isMissingStorefrontTable(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("agency_storefronts") && (m.includes("does not exist") || m.includes("relation"));
}

function isMissingStorefrontColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("agency_storefronts") && m.includes("column");
}

async function findAgencyBySlug(
  slug: string
): Promise<{ agency: AgencyUser; storefront: StorefrontRow | null } | null> {
  const admin = supabaseAdmin();
  const normalized = toSlug(slug);
  if (!normalized) return null;

  const extendedSelect =
    "agency_user_id, slug, tagline, description, cover_url, facebook_url, instagram_url, tiktok_url, whatsapp, hero_title, hero_subtitle, about_title, services, highlights, service_areas, languages_spoken, business_hours, contact_email, contact_phone, contact_address, cta_label, cta_url, marketplace_title, seo_title, seo_description, seo_keywords, custom_domain, custom_domain_status, brand_primary_color, brand_secondary_color, brand_accent_color, section_order, show_services_section, show_highlights_section, show_contact_section, show_marketplace_section, builder_type, builder_payload, is_enabled";
  const legacySelect =
    "agency_user_id, slug, tagline, description, cover_url, facebook_url, instagram_url, tiktok_url, whatsapp, is_enabled";

  let storefrontResult = await admin
    .from("agency_storefronts")
    .select(extendedSelect)
    .eq("slug", normalized)
    .eq("is_enabled", true)
    .maybeSingle();

  if (storefrontResult.error && isMissingStorefrontColumn(storefrontResult.error.message)) {
    storefrontResult = await admin
      .from("agency_storefronts")
      .select(legacySelect)
      .eq("slug", normalized)
      .eq("is_enabled", true)
      .maybeSingle();
  }

  if (storefrontResult.error && !isMissingStorefrontTable(storefrontResult.error.message)) {
    throw new Error(storefrontResult.error.message);
  }

  if (!storefrontResult.error && storefrontResult.data) {
    const storefront = storefrontResult.data as StorefrontRow;
    const userResult = await admin.auth.admin.getUserById(storefront.agency_user_id);
    if (userResult.error) throw new Error(userResult.error.message);

    const found = userResult.data.user;
    if (!found) return null;
    const meta = (found.user_metadata ?? {}) as Record<string, unknown>;
    const status = normalizeText(meta.agency_status || "pending");
    if (normalizeText(meta.account_type) !== "agency" || status === "suspended") return null;

    return {
      agency: {
        id: found.id,
        email: found.email ?? null,
        phone: found.phone ?? null,
        user_metadata: (found.user_metadata ?? null) as Record<string, unknown>,
      },
      storefront,
    };
  }

  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw new Error(error.message);

  const agencies = (data.users ?? []).filter((user) => {
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    return normalizeText(meta.account_type) === "agency";
  });

  for (const user of agencies) {
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const status = normalizeText(meta.agency_status || "pending");
    if (status === "suspended") continue;
    const explicit = toSlug(toText(meta.agency_storefront_slug));
    if (normalized !== explicit) continue;

    return {
      agency: {
        id: user.id,
        email: user.email ?? null,
        phone: user.phone ?? null,
        user_metadata: (user.user_metadata ?? null) as Record<string, unknown>,
      },
      storefront: null,
    };
  }

  for (const user of agencies) {
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const status = normalizeText(meta.agency_status || "pending");
    if (status === "suspended") continue;
    const fallback = toSlug(toText(meta.agency_name || user.email || ""));
    if (normalized !== fallback) continue;

    return {
      agency: {
        id: user.id,
        email: user.email ?? null,
        phone: user.phone ?? null,
        user_metadata: (user.user_metadata ?? null) as Record<string, unknown>,
      },
      storefront: null,
    };
  }

  return null;
}

async function loadMarketplace(
  agencyName: string,
  agencyEmail: string,
  agencyPhone: string
): Promise<AgencyMarketplaceItem[]> {
  const admin = supabaseAdmin();
  const leadSelect = `
    id,
    title,
    property_type,
    transaction_type,
    location_type,
    commune,
    district,
    address,
    city,
    price,
    surface,
    rooms,
    baths,
    photo_links,
    name,
    phone,
    email
  `;

  const leadsResult = await admin
    .from("owner_leads")
    .select(leadSelect)
    .in("intent", [...AGENCY_DEPOSIT_INTENTS])
    .eq("status", "validated")
    .order("created_at", { ascending: false })
    .limit(600);

  if (leadsResult.error && !isMissingColumnError(leadsResult.error.message)) {
    throw new Error(leadsResult.error.message);
  }

  const leads = ((leadsResult.data ?? []) as LeadRow[]).filter((lead) => {
    const leadEmail = normalizeText(lead.email);
    const leadPhone = normalizeDigits(lead.phone);
    const leadName = normalizeText(lead.name);
    const agencyEmailNorm = normalizeText(agencyEmail);
    const agencyPhoneNorm = normalizeDigits(agencyPhone);
    const agencyNameNorm = normalizeText(agencyName);
    if (agencyEmailNorm && leadEmail && leadEmail === agencyEmailNorm) return true;
    if (agencyPhoneNorm && leadPhone && leadPhone === agencyPhoneNorm) return true;
    if (agencyNameNorm && leadName && leadName === agencyNameNorm) return true;
    return false;
  });

  const leadIds = leads.map((lead) => lead.id);
  let properties: PropertyRow[] = [];

  if (leadIds.length > 0) {
    const propertiesResult = await admin
      .from("properties")
      .select(
        `
        id,
        ref,
        title,
        type,
        category,
        location,
        price,
        beds,
        baths,
        area,
        owner_lead_id,
        property_images (
          path,
          sort,
          is_cover
        )
      `
      )
      .in("owner_lead_id", leadIds)
      .order("created_at", { ascending: false })
      .limit(600);

    if (!propertiesResult.error) {
      properties = (propertiesResult.data ?? []) as PropertyRow[];
    } else if (!isMissingOwnerLeadIdColumn(propertiesResult.error.message)) {
      throw new Error(propertiesResult.error.message);
    }
  }

  if (properties.length > 0) {
    return properties.map((property) => {
      const coverPath = pickPropertyCoverPath(property);
      return {
        id: property.id,
        ref: toText(property.ref),
        title: toText(property.title || property.category || "Bien immobilier"),
        transaction: toText(property.type),
        location: toText(property.location),
        price: formatPrice(property.price),
        area: typeof property.area === "number" ? `${property.area} m2` : "-",
        beds: typeof property.beds === "number" ? String(property.beds) : "-",
        baths: typeof property.baths === "number" ? String(property.baths) : "-",
        imageUrl: coverPath ? propertyImageUrl(coverPath, { width: 960, quality: 72, format: "webp" }) : "",
      };
    });
  }

  return leads.map((lead) => {
    const cover = parsePhotoLinks(lead.photo_links)[0] ?? "";
    return {
      id: lead.id,
      ref: "",
      title: toText(lead.title || lead.property_type || "Bien immobilier"),
      transaction: toText(lead.transaction_type || lead.location_type),
      location: leadLocation(lead),
      price: formatPrice(lead.price),
      area: typeof lead.surface === "number" ? `${lead.surface} m2` : "-",
      beds: typeof lead.rooms === "number" ? String(lead.rooms) : "-",
      baths: typeof lead.baths === "number" ? String(lead.baths) : "-",
      imageUrl: cover,
    };
  });
}

export async function getAgencyStorefrontData(
  slug: string,
  options: { includeMarketplace?: boolean; locale?: "fr" | "ar" } = {}
): Promise<AgencyStorefrontData | null> {
  const resolved = await findAgencyBySlug(slug);
  if (!resolved) return null;

  const agency = resolved.agency;
  const storefront = resolved.storefront;
  const meta = (agency.user_metadata ?? {}) as Record<string, unknown>;

  const agencyName = toText(meta.agency_name || agency.email || "Agence");
  const agencyEmail = toText(agency.email);
  const agencyPhone = toText(meta.agency_phone || meta.phone || agency.phone);
  const agencyWhatsapp = toText(storefront?.whatsapp || meta.agency_whatsapp || agencyPhone);
  const agencyAddress = toText(storefront?.contact_address || meta.agency_address);
  const agencyCity = toText(meta.agency_city);
  const agencyWebsite = toText(meta.agency_website);
  const agencyTagline = toText(storefront?.tagline || meta.agency_tagline);
  const agencyDescription = toText(storefront?.description || meta.agency_description);
  const heroTitle = toText(storefront?.hero_title || agencyName);
  const heroSubtitle = toText(storefront?.hero_subtitle);
  const aboutTitle = toText(storefront?.about_title || "A propos");
  const seoTitle = toText(storefront?.seo_title || `${agencyName} | Agence immobiliere`);
  const seoDescription = toText(
    storefront?.seo_description ||
      agencyTagline ||
      agencyDescription ||
      `${agencyName} - services immobiliers, vente, location et accompagnement.`
  );
  const seoKeywords = toText(storefront?.seo_keywords || "agence immobiliere, immobilier, vente, location");
  const customDomain = toText(storefront?.custom_domain);
  const customDomainStatus = toText(storefront?.custom_domain_status || "unverified");
  const services = toTextArray(storefront?.services || meta.agency_services);
  const highlights = toTextArray(storefront?.highlights || meta.agency_highlights);
  const serviceAreas = toText(storefront?.service_areas || meta.agency_service_areas);
  const languagesSpoken = toText(storefront?.languages_spoken || meta.agency_languages_spoken);
  const businessHours = toText(storefront?.business_hours || meta.agency_business_hours);
  const contactEmail = toText(storefront?.contact_email || agencyEmail);
  const contactPhone = toText(storefront?.contact_phone || agencyPhone);
  const ctaLabel = toText(storefront?.cta_label || "Nous contacter");
  const ctaUrl = toText(storefront?.cta_url);
  const marketplaceTitle = toText(storefront?.marketplace_title || "Marketplace des biens");
  const logoUrl = resolveAgencyLogoUrl(meta);
  const coverUrl = toText(storefront?.cover_url || resolveAgencyCoverUrl(meta));
  const facebookUrl = toText(storefront?.facebook_url || meta.agency_facebook_url);
  const instagramUrl = toText(storefront?.instagram_url || meta.agency_instagram_url);
  const tiktokUrl = toText(storefront?.tiktok_url || meta.agency_tiktok_url);
  const brandPrimaryColor = toColor(storefront?.brand_primary_color, "#0f172a");
  const brandSecondaryColor = toColor(storefront?.brand_secondary_color, "#f8fafc");
  const brandAccentColor = toColor(storefront?.brand_accent_color, "#d4af37");
  const showServicesSection = storefront?.show_services_section ?? true;
  const showHighlightsSection = storefront?.show_highlights_section ?? true;
  const showContactSection = storefront?.show_contact_section ?? true;
  const showMarketplaceSection = storefront?.show_marketplace_section ?? true;
  const sectionOrder = normalizeSectionOrder(storefront?.section_order);
  const builderType = normalizeBuilderType(storefront?.builder_type);
  const builderPayload = storefront?.builder_payload ?? null;
  const nativeStudio = resolvePublishedNativeStudio(normalizeAgencyNativeStudioPayload(builderPayload));
  const locale = options.locale === "ar" ? "ar" : "fr";
  const arTranslations = nativeStudio.translations?.ar ?? {};
  const localizedHeroTitle =
    locale === "ar" ? toText(arTranslations.hero_title || heroTitle) : heroTitle;
  const localizedHeroSubtitle =
    locale === "ar" ? toText(arTranslations.hero_subtitle || heroSubtitle) : heroSubtitle;
  const localizedTagline =
    locale === "ar" ? toText(arTranslations.tagline || agencyTagline) : agencyTagline;
  const localizedDescription =
    locale === "ar" ? toText(arTranslations.description || agencyDescription) : agencyDescription;
  const localizedAboutTitle =
    locale === "ar" ? toText(arTranslations.about_title || aboutTitle) : aboutTitle;
  const localizedCtaLabel =
    locale === "ar" ? toText(arTranslations.cta_label || ctaLabel) : ctaLabel;
  const localizedMarketplaceTitle =
    locale === "ar" ? toText(arTranslations.marketplace_title || marketplaceTitle) : marketplaceTitle;
  const agencyInitials = initials(agencyName);

  const socialLinks = [
    { href: facebookUrl, label: "Facebook" },
    { href: instagramUrl, label: "Instagram" },
    { href: tiktokUrl, label: "TikTok" },
  ];

  const whatsappDigits = normalizeDigits(agencyWhatsapp);
  const whatsappHref = whatsappDigits
    ? `https://wa.me/${encodeURIComponent(whatsappDigits)}`
    : "";
  const ctaHref = /^https?:\/\//i.test(ctaUrl)
    ? ctaUrl
    : whatsappHref || (contactPhone ? `tel:${contactPhone}` : "");

  const marketplace = options.includeMarketplace
    ? await loadMarketplace(agencyName, agencyEmail, agencyPhone)
    : [];

  return {
    slug: toSlug(slug),
    agencyName,
    agencyInitials,
    agencyTagline: localizedTagline,
    agencyDescription: localizedDescription,
    heroTitle: localizedHeroTitle,
    heroSubtitle: localizedHeroSubtitle,
    aboutTitle: localizedAboutTitle,
    seoTitle,
    seoDescription,
    seoKeywords,
    customDomain,
    customDomainStatus,
    services,
    highlights,
    serviceAreas,
    languagesSpoken,
    businessHours,
    contactEmail,
    contactPhone,
    agencyWhatsapp,
    agencyAddress,
    agencyCity,
    agencyWebsite,
    ctaLabel: localizedCtaLabel,
    ctaHref,
    whatsappHref,
    logoUrl,
    coverUrl,
    socialLinks,
    brandPrimaryColor,
    brandSecondaryColor,
    brandAccentColor,
    showServicesSection,
    showHighlightsSection,
    showContactSection,
    showMarketplaceSection,
    sectionOrder,
    builderType,
    builderPayload,
    nativeStudio,
    marketplaceTitle: localizedMarketplaceTitle,
    marketplace,
  };
}
