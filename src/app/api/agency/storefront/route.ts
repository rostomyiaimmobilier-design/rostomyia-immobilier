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
        "La structure agency_storefronts est incomplete. Lancez les migrations 2026-02-25-add-agency-storefronts.sql, 2026-02-25-enhance-agency-storefronts-wizard-fields.sql, 2026-02-25-add-agency-storefront-builder-settings.sql et 2026-02-25-enhance-agency-storefront-builder-next.sql.",
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
      facebook_url: toOptionalUrl(body.facebook_url),
      instagram_url: toOptionalUrl(body.instagram_url),
      tiktok_url: toOptionalUrl(body.tiktok_url),
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
