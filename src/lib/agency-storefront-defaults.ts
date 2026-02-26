import { normalizeAgencyNativeStudioPayload } from "@/lib/agency-storefront-puck";
import { supabaseAdmin } from "@/lib/supabase/admin";

type AgencyLikeUser = {
  id: string;
  email?: string | null;
  phone?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

function toText(value: unknown) {
  return String(value ?? "").trim();
}

function toOptionalText(value: unknown) {
  const text = toText(value);
  return text || null;
}

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

function isMissingStorefrontTable(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("agency_storefronts") && (m.includes("does not exist") || m.includes("relation"));
}

function isMissingStorefrontColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("agency_storefronts") && m.includes("column");
}

function toList(value: unknown, fallback: string[]) {
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
    if (out.length >= 12) break;
  }

  return out.length > 0 ? out : fallback;
}

async function findAvailableSlug(baseSlug: string, userId: string) {
  const admin = supabaseAdmin();
  const root = baseSlug || `agency-${userId.slice(0, 8)}`;

  for (let index = 0; index <= 200; index += 1) {
    const candidate = index === 0 ? root : `${root}-${index}`.slice(0, 80);
    const query = await admin
      .from("agency_storefronts")
      .select("agency_user_id")
      .eq("slug", candidate)
      .maybeSingle();

    if (query.error) {
      throw query.error;
    }

    const owner = toText((query.data as { agency_user_id?: string } | null)?.agency_user_id);
    if (!owner || owner === userId) return candidate;
  }

  return `${root}-${Math.floor(100 + Math.random() * 900)}`.slice(0, 80);
}

export async function ensureAgencyStorefrontForUser(
  user: AgencyLikeUser
): Promise<{ slug: string | null; created: boolean; skipped: boolean }> {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const accountType = toText(meta.account_type).toLowerCase();
  if (accountType !== "agency") {
    return { slug: null, created: false, skipped: true };
  }

  const admin = supabaseAdmin();
  const existing = await admin
    .from("agency_storefronts")
    .select("slug")
    .eq("agency_user_id", user.id)
    .maybeSingle();

  if (existing.error) {
    if (
      isMissingStorefrontTable(existing.error.message) ||
      isMissingStorefrontColumn(existing.error.message)
    ) {
      return { slug: null, created: false, skipped: true };
    }
    throw new Error(existing.error.message);
  }

  const existingSlug = toText((existing.data as { slug?: string | null } | null)?.slug);
  if (existingSlug) {
    return { slug: existingSlug, created: false, skipped: false };
  }

  const agencyName = toText(meta.agency_name || user.email || "Agence");
  const agencyCity = toText(meta.agency_city);
  const tagline = toText(meta.agency_tagline || (agencyCity ? `Agence immobiliere a ${agencyCity}` : ""));
  const description = toText(
    meta.agency_description ||
      `Bienvenue chez ${agencyName}. Nous vous accompagnons dans la vente, la location et l'investissement immobilier.`
  );
  const phone = toText(meta.agency_phone || meta.phone || user.phone);
  const email = toText(user.email);
  const serviceAreas = toText(meta.agency_service_areas || meta.service_areas);
  const services = toList(meta.agency_services, [
    "Vente immobiliere",
    "Location immobiliere",
    "Conseil et accompagnement",
  ]);
  const highlights = toList(meta.agency_highlights, [
    "Conseillers experts",
    "Accompagnement personnalise",
    "Disponibilite rapide",
  ]);

  const preferredSlug = normalizeSlug(
    toText(meta.agency_storefront_slug || meta.agency_name || user.email || `agency-${user.id.slice(0, 8)}`)
  );
  const slug = await findAvailableSlug(preferredSlug, user.id);

  const now = new Date().toISOString();
  const builderPayload = normalizeAgencyNativeStudioPayload(meta.agency_builder_payload);

  const createResult = await admin.from("agency_storefronts").upsert(
    {
      agency_user_id: user.id,
      slug,
      tagline: toOptionalText(tagline),
      description: toOptionalText(description),
      cover_url: toOptionalText(meta.agency_cover_url),
      facebook_url: toOptionalText(meta.agency_facebook_url),
      instagram_url: toOptionalText(meta.agency_instagram_url),
      tiktok_url: toOptionalText(meta.agency_tiktok_url),
      whatsapp: toOptionalText(meta.agency_whatsapp || phone),
      is_enabled: true,
      completed_at: now,
      hero_title: toOptionalText(meta.agency_hero_title || agencyName),
      hero_subtitle: toOptionalText(meta.agency_hero_subtitle || tagline),
      about_title: toOptionalText(meta.agency_about_title || "A propos"),
      services,
      highlights,
      service_areas: toOptionalText(serviceAreas),
      languages_spoken: toOptionalText(meta.agency_languages_spoken),
      business_hours: toOptionalText(meta.agency_business_hours || "Dimanche - Jeudi: 09:00-18:00"),
      contact_email: toOptionalText(meta.agency_contact_email || email),
      contact_phone: toOptionalText(phone),
      contact_address: toOptionalText(meta.agency_address),
      cta_label: toOptionalText(meta.agency_cta_label || "Nous contacter"),
      cta_url: toOptionalText(meta.agency_cta_url),
      marketplace_title: toOptionalText(meta.agency_marketplace_title || "Marketplace des biens"),
      seo_title: toOptionalText(meta.agency_seo_title || `${agencyName} | Agence immobiliere`),
      seo_description: toOptionalText(meta.agency_seo_description || tagline || description),
      seo_keywords: toOptionalText(meta.agency_seo_keywords || "agence immobiliere, immobilier, vente, location"),
      brand_primary_color: "#0f172a",
      brand_secondary_color: "#f8fafc",
      brand_accent_color: "#d4af37",
      theme_preset: "premium",
      show_services_section: true,
      show_highlights_section: true,
      show_contact_section: true,
      show_marketplace_section: true,
      section_order: ["about", "services", "contact", "marketplace"],
      builder_type: "native",
      builder_payload: builderPayload,
    },
    { onConflict: "agency_user_id" }
  );

  if (createResult.error) {
    if (
      isMissingStorefrontTable(createResult.error.message) ||
      isMissingStorefrontColumn(createResult.error.message)
    ) {
      return { slug: null, created: false, skipped: true };
    }
    throw new Error(createResult.error.message);
  }

  return { slug, created: true, skipped: false };
}

