import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hasAdminAccess } from "@/lib/admin-auth";
import { notifyAdminEvent } from "@/lib/admin-notifications";

type StorefrontLeadPayload = {
  slug: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  message: string | null;
  source_path: string | null;
};

function toOptionalText(value: unknown) {
  const s = String(value ?? "").trim();
  return s || null;
}

function toOptionalEmail(value: unknown) {
  const email = String(value ?? "").trim().toLowerCase();
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function toSlug(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function toOptionalPhone(value: unknown) {
  const phone = String(value ?? "").trim();
  if (!phone) return null;
  return /^[+\d\s().-]{8,20}$/.test(phone) ? phone : null;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const payload: StorefrontLeadPayload = {
    slug: toOptionalText(body.slug),
    name: toOptionalText(body.name),
    phone: toOptionalPhone(body.phone),
    email: toOptionalEmail(body.email),
    message: toOptionalText(body.message),
    source_path: toOptionalText(body.source_path),
  };

  const slug = toSlug(payload.slug);
  if (!slug) {
    return NextResponse.json({ error: "Slug agence invalide." }, { status: 400 });
  }
  if (!payload.name) {
    return NextResponse.json({ error: "Le nom est obligatoire." }, { status: 400 });
  }
  if (!payload.phone && !payload.email) {
    return NextResponse.json({ error: "Telephone ou email requis." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const isAdmin = await hasAdminAccess(supabase, user);
    if (isAdmin) {
      return NextResponse.json(
        { error: "Les comptes backoffice ne peuvent pas envoyer de demandes client." },
        { status: 403 }
      );
    }
  }

  const admin = supabaseAdmin();
  const storefront = await admin
    .from("agency_storefronts")
    .select("agency_user_id, slug")
    .eq("slug", slug)
    .eq("is_enabled", true)
    .maybeSingle();

  if (storefront.error) {
    return NextResponse.json({ error: storefront.error.message }, { status: 400 });
  }
  if (!storefront.data) {
    return NextResponse.json({ error: "Agence introuvable." }, { status: 404 });
  }

  const inserted = await admin
    .from("agency_storefront_leads")
    .insert({
      agency_user_id: storefront.data.agency_user_id,
      storefront_slug: storefront.data.slug,
      source_path: payload.source_path,
      customer_name: payload.name,
      customer_phone: payload.phone,
      customer_email: payload.email,
      customer_message: payload.message,
      status: "new",
    })
    .select("id")
    .single();

  if (inserted.error) {
    return NextResponse.json({ error: inserted.error.message }, { status: 400 });
  }

  await notifyAdminEvent({
    eventType: "agency_storefront_lead_new",
    title: "Nouveau lead vitrine agence",
    body: `${payload.name} (${storefront.data.slug})`,
    href: "/admin/protected/notifications",
    iconKey: "users",
    entityTable: "agency_storefront_leads",
    entityId: inserted.data.id,
    metadata: {
      storefront_slug: storefront.data.slug,
      customer_name: payload.name,
      customer_phone: payload.phone,
      customer_email: payload.email,
    },
    dedupeSeconds: 1,
  });

  return NextResponse.json({ ok: true, id: inserted.data.id });
}
