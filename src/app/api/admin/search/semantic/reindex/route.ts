import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hasAdminAccess } from "@/lib/admin-auth";
import { isCronSecretValid } from "@/lib/cron-auth";
import { upsertPropertySemanticIndex } from "@/lib/semantic-search";

type PropertyRow = {
  id: string;
  ref: string;
  title: string | null;
  type: string | null;
  location_type: string | null;
  category: string | null;
  location: string | null;
  description: string | null;
  price: string | null;
  beds: number | null;
  baths: number | null;
  area: number | null;
  amenities?: string[] | null;
};

export async function POST(request: Request) {
  const hasSecretAccess = isCronSecretValid(request);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !hasSecretAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user) {
    const isAdmin = await hasAdminAccess(supabase, user);
    if (!isAdmin && !hasSecretAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 400 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const payload = (body ?? {}) as { limit?: number; offset?: number };
  const limit = Math.max(1, Math.min(200, Number(payload.limit ?? 80)));
  const offset = Math.max(0, Number(payload.offset ?? 0));

  let admin;
  try {
    admin = supabaseAdmin();
  } catch {
    return NextResponse.json({ error: "Missing Supabase service role key" }, { status: 500 });
  }

  const { data, error } = await admin
    .from("properties")
    .select(
      "id, ref, title, type, location_type, category, location, description, price, beds, baths, area, amenities"
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = (data ?? []) as PropertyRow[];
  let indexed = 0;
  let failed = 0;

  for (const row of rows) {
    const ok = await upsertPropertySemanticIndex({
      id: row.id,
      ref: row.ref,
      title: row.title,
      type: row.type,
      locationType: row.location_type,
      category: row.category,
      location: row.location,
      description: row.description,
      price: row.price,
      beds: row.beds,
      baths: row.baths,
      area: row.area,
      amenities: row.amenities ?? null,
    });

    if (ok) indexed += 1;
    else failed += 1;
  }

  return NextResponse.json({
    ok: true,
    authSource: hasSecretAccess ? "secret" : "admin_session",
    processed: rows.length,
    indexed,
    failed,
    nextOffset: offset + rows.length,
    hasMore: rows.length === limit,
  });
}
