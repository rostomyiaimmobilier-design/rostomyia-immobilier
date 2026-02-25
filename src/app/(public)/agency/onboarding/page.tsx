import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import AgencyOnboardingClient from "./AgencyOnboardingClient";

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

function toText(value: unknown) {
  return String(value ?? "").trim();
}

function toListLines(value: unknown) {
  const items = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,]/g)
      : [];

  const seen = new Set<string>();
  const clean: string[] = [];
  for (const item of items) {
    const v = String(item ?? "").replace(/\s+/g, " ").trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    clean.push(v);
  }
  return clean.join("\n");
}

function isMissingStorefrontTable(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("agency_storefronts") && (m.includes("does not exist") || m.includes("relation"));
}

function isMissingStorefrontColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("agency_storefronts") && m.includes("column");
}

function resolveLogoUrl(meta: Record<string, unknown>) {
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
    const clean = raw.replace(/^\/+/, "");
    return `${base}/storage/v1/object/public/property-images/${clean}`;
  }

  return "";
}

export const dynamic = "force-dynamic";

export default async function AgencyOnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/agency/login");

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  if (toText(meta.account_type).toLowerCase() !== "agency") redirect("/agency/login");

  const admin = supabaseAdmin();
  const extendedSelect =
    "slug, tagline, description, cover_url, facebook_url, instagram_url, tiktok_url, whatsapp, is_enabled, hero_title, hero_subtitle, about_title, services, highlights, service_areas, languages_spoken, business_hours, contact_email, contact_phone, contact_address, cta_label, cta_url, marketplace_title, seo_title, seo_description, seo_keywords, brand_primary_color, brand_secondary_color, brand_accent_color, theme_preset, show_services_section, show_highlights_section, show_contact_section, show_marketplace_section, section_order, custom_domain, custom_domain_status";
  const legacySelect =
    "slug, tagline, description, cover_url, facebook_url, instagram_url, tiktok_url, whatsapp, is_enabled";

  let storefrontResult = await admin
    .from("agency_storefronts")
    .select(extendedSelect)
    .eq("agency_user_id", user.id)
    .maybeSingle();

  if (storefrontResult.error && isMissingStorefrontColumn(storefrontResult.error.message)) {
    storefrontResult = await admin
      .from("agency_storefronts")
      .select(legacySelect)
      .eq("agency_user_id", user.id)
      .maybeSingle();
  }

  if (storefrontResult.error && !isMissingStorefrontTable(storefrontResult.error.message)) {
    throw new Error(storefrontResult.error.message);
  }

  const storefront = (storefrontResult.data ?? null) as
    | {
        slug?: string | null;
        tagline?: string | null;
        description?: string | null;
        cover_url?: string | null;
        facebook_url?: string | null;
        instagram_url?: string | null;
        tiktok_url?: string | null;
        whatsapp?: string | null;
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
        show_services_section?: boolean | null;
        show_highlights_section?: boolean | null;
        show_contact_section?: boolean | null;
        show_marketplace_section?: boolean | null;
        section_order?: unknown;
        custom_domain?: string | null;
        custom_domain_status?: string | null;
      }
    | null;

  const agencyName = toText(meta.agency_name || user.email || "Agence");
  const slug = normalizeSlug(
    toText(storefront?.slug) || toText(meta.agency_storefront_slug) || toText(meta.agency_name) || toText(user.email)
  );

  return (
    <AgencyOnboardingClient
      initial={{
        agencyName,
        agencyPhone: toText(meta.agency_phone || meta.phone || user.phone),
        agencyEmail: toText(user.email),
        agencyStatus: toText(meta.agency_status || "pending"),
        slug,
        tagline: toText(storefront?.tagline || meta.agency_tagline),
        description: toText(storefront?.description || meta.agency_description),
        coverUrl: toText(storefront?.cover_url || meta.agency_cover_url),
        facebookUrl: toText(storefront?.facebook_url || meta.agency_facebook_url),
        instagramUrl: toText(storefront?.instagram_url || meta.agency_instagram_url),
        tiktokUrl: toText(storefront?.tiktok_url || meta.agency_tiktok_url),
        whatsapp: toText(storefront?.whatsapp || meta.agency_whatsapp || meta.agency_phone || user.phone),
        logoUrl: resolveLogoUrl(meta),
        heroTitle: toText(storefront?.hero_title || meta.agency_hero_title),
        heroSubtitle: toText(storefront?.hero_subtitle || meta.agency_hero_subtitle),
        aboutTitle: toText(storefront?.about_title || meta.agency_about_title),
        servicesText: toListLines(storefront?.services || meta.agency_services),
        highlightsText: toListLines(storefront?.highlights || meta.agency_highlights),
        serviceAreas: toText(storefront?.service_areas || meta.agency_service_areas),
        languagesSpoken: toText(storefront?.languages_spoken || meta.agency_languages_spoken),
        businessHours: toText(storefront?.business_hours || meta.agency_business_hours),
        contactEmail: toText(storefront?.contact_email || meta.agency_contact_email || user.email),
        contactPhone: toText(storefront?.contact_phone || meta.agency_phone || meta.phone || user.phone),
        contactAddress: toText(storefront?.contact_address || meta.agency_address),
        ctaLabel: toText(storefront?.cta_label || meta.agency_cta_label),
        ctaUrl: toText(storefront?.cta_url || meta.agency_cta_url),
        marketplaceTitle: toText(storefront?.marketplace_title || meta.agency_marketplace_title),
        seoTitle: toText(storefront?.seo_title || meta.agency_seo_title),
        seoDescription: toText(storefront?.seo_description || meta.agency_seo_description),
        seoKeywords: toText(storefront?.seo_keywords || meta.agency_seo_keywords),
        brandPrimaryColor: toText(storefront?.brand_primary_color) || "#0f172a",
        brandSecondaryColor: toText(storefront?.brand_secondary_color) || "#f8fafc",
        brandAccentColor: toText(storefront?.brand_accent_color) || "#d4af37",
        themePreset: toText(storefront?.theme_preset),
        showServicesSection: storefront?.show_services_section ?? true,
        showHighlightsSection: storefront?.show_highlights_section ?? true,
        showContactSection: storefront?.show_contact_section ?? true,
        showMarketplaceSection: storefront?.show_marketplace_section ?? true,
        sectionOrder: Array.isArray(storefront?.section_order)
          ? storefront?.section_order.map((x) => String(x))
          : ["about", "services", "contact", "marketplace"],
        customDomain: toText(storefront?.custom_domain),
        customDomainStatus: toText(storefront?.custom_domain_status || "unverified"),
      }}
    />
  );
}
