import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const TEST_AGENCY_EMAIL = process.env.TEST_AGENCY_EMAIL || "agency.test@rostomyia.dev";
const TEST_AGENCY_PASSWORD = process.env.TEST_AGENCY_PASSWORD || "Agency123456!";
const TEST_AGENCY_NAME = process.env.TEST_AGENCY_NAME || "Agence Test Rostomyia";

function normalizeFold(input: string | null | undefined) {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function toSlug(input: string) {
  return normalizeFold(input)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

async function findUserByEmail(email: string) {
  const admin = supabaseAdmin();
  let page = 1;
  const perPage = 200;

  while (page <= 25) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users ?? [];
    const found = users.find((item) => String(item.email ?? "").trim().toLowerCase() === email);
    if (found) return found;
    if (users.length < perPage) break;
    page += 1;
  }

  return null;
}

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Disabled in production." }, { status: 403 });
  }

  try {
    const admin = supabaseAdmin();
    const email = TEST_AGENCY_EMAIL.trim().toLowerCase();
    const password = TEST_AGENCY_PASSWORD;
    const now = new Date().toISOString();

    const meta: Record<string, unknown> = {
      account_type: "agency",
      agency_status: "active",
      agency_status_updated_at: now,
      agency_activated_at: now,
      profile_completed_at: now,
      agency_name: TEST_AGENCY_NAME,
      agency_manager_name: "Responsable Test",
      agency_phone: "0555000000",
      agency_whatsapp: "0555000000",
      agency_city: "Oran",
      agency_address: "Bir El Djir - Belgaid",
      agency_service_areas: "Bir El Djir, Oran",
      agency_years_experience: 3,
      agency_website: "https://example.com",
      full_name: "Responsable Test",
      phone: "0555000000",
      city: "Oran",
      address: "Bir El Djir - Belgaid",
      company_name: TEST_AGENCY_NAME,
      service_areas: "Bir El Djir, Oran",
      years_experience: 3,
      agency_seeded_test_account: true,
    };

    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: meta,
    });

    let userId = created.data.user?.id ?? null;
    if (created.error) {
      const message = String(created.error.message || "").toLowerCase();
      const isDuplicate =
        message.includes("already") ||
        message.includes("duplicate") ||
        message.includes("users_email_partial_key");

      if (!isDuplicate) {
        return NextResponse.json({ ok: false, step: "create_user", error: created.error.message }, { status: 400 });
      }

      const existing = await findUserByEmail(email);
      if (!existing) {
        return NextResponse.json({ ok: false, step: "find_existing", error: "Existing user not found." }, { status: 404 });
      }

      userId = existing.id;
      const mergedMeta = {
        ...((existing.user_metadata ?? {}) as Record<string, unknown>),
        ...meta,
      };

      const updated = await admin.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
        user_metadata: mergedMeta,
      });

      if (updated.error) {
        return NextResponse.json({ ok: false, step: "update_existing", error: updated.error.message }, { status: 400 });
      }
    }

    if (!userId) {
      return NextResponse.json({ ok: false, error: "User id missing after create/update." }, { status: 400 });
    }

    const profileUpsert = await admin
      .from("profiles")
      .upsert({ id: userId, email, is_admin: false }, { onConflict: "id" });

    const profileError = profileUpsert.error?.message ?? null;

    const storefrontSlug = `${toSlug(TEST_AGENCY_NAME)}-test`;
    const storefrontInsert = await admin.from("agency_storefronts").upsert(
      {
        agency_user_id: userId,
        slug: storefrontSlug || `agency-${userId.slice(0, 8)}`,
        tagline: "Compte test valide pour onboarding",
        description: "Compte agence seed pour valider les parcours apres inscription.",
        is_enabled: true,
        completed_at: now,
      },
      { onConflict: "agency_user_id" }
    );

    const storefrontError = storefrontInsert.error?.message ?? null;

    return NextResponse.json({
      ok: true,
      email,
      password,
      userId,
      profileError,
      storefrontError,
      note: "Use these credentials on /agency/login.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
