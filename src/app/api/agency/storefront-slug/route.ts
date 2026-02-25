import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

function toText(value: unknown) {
  return String(value ?? "").trim();
}

function isMissingStorefrontTable(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("agency_storefronts") && (m.includes("does not exist") || m.includes("relation"));
}

function buildSuggestion(base: string, reserved: Set<string>) {
  const root = base || "agence";
  if (!reserved.has(root)) return root;

  for (let i = 1; i <= 200; i += 1) {
    const candidate = `${root}-${i}`.slice(0, 80);
    if (!reserved.has(candidate)) return candidate;
  }

  const random = Math.floor(100 + Math.random() * 900);
  return `${root}-${random}`.slice(0, 80);
}

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const requested = normalizeStorefrontSlug(url.searchParams.get("slug") || "");
    if (!requested || requested.length < 3) {
      return NextResponse.json(
        { error: "Slug invalide. Utilisez au moins 3 caracteres." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) return NextResponse.json({ error: userError.message }, { status: 401 });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const currentMeta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const currentType = toText(currentMeta.account_type).toLowerCase();
    if (currentType !== "agency") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = supabaseAdmin();
    const reserved = new Set<string>();
    let takenByOther = false;

    const storefronts = await admin
      .from("agency_storefronts")
      .select("agency_user_id, slug");

    if (storefronts.error && !isMissingStorefrontTable(storefronts.error.message)) {
      return NextResponse.json({ error: storefronts.error.message }, { status: 500 });
    }

    if (!storefronts.error) {
      for (const row of storefronts.data ?? []) {
        const slug = normalizeStorefrontSlug(toText((row as { slug?: string }).slug));
        if (!slug) continue;
        reserved.add(slug);
        const ownerId = toText((row as { agency_user_id?: string }).agency_user_id);
        if (ownerId && ownerId !== user.id && slug === requested) takenByOther = true;
      }
    }

    // Fallback for agencies that still only have metadata slug/name.
    if (!takenByOther) {
      const { data, error } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      for (const row of data.users ?? []) {
        const meta = (row.user_metadata ?? {}) as Record<string, unknown>;
        if (toText(meta.account_type).toLowerCase() !== "agency") continue;

        const explicit = normalizeStorefrontSlug(toText(meta.agency_storefront_slug));
        const fallback = normalizeStorefrontSlug(toText(meta.agency_name || row.email || ""));

        if (explicit) reserved.add(explicit);
        if (fallback) reserved.add(fallback);

        if (row.id === user.id) continue;
        if (requested === explicit || requested === fallback) {
          takenByOther = true;
        }
      }
    }

    if (takenByOther) {
      return NextResponse.json({
        available: false,
        normalizedSlug: requested,
        suggestion: buildSuggestion(requested, reserved),
      });
    }

    return NextResponse.json({
      available: true,
      normalizedSlug: requested,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "slug_check_failed" },
      { status: 500 }
    );
  }
}
