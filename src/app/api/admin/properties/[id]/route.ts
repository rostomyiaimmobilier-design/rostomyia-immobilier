import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function isMissingLocationTypeColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("location_type") && (m.includes("does not exist") || m.includes("column"));
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toOptionalNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing property id" }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const title = toOptionalString(body.title);
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const type = body.type === "Vente" ? "Vente" : "Location";
  const locationType = toOptionalString(body.location_type) ?? (type === "Vente" ? "vente" : "location");

  const payload = {
    title,
    type,
    location_type: locationType,
    category: toOptionalString(body.category),
    apartment_type: toOptionalString(body.apartment_type),
    price: toOptionalString(body.price),
    location: toOptionalString(body.location),
    beds: toOptionalNumber(body.beds),
    baths: toOptionalNumber(body.baths),
    area: toOptionalNumber(body.area),
    description: toOptionalString(body.description),
  };

  let { data, error } = await supabase
    .from("properties")
    .update(payload)
    .eq("id", id)
    .select("id, ref")
    .single();

  if (error && isMissingLocationTypeColumn(error.message)) {
    const legacyPayload = { ...payload };
    delete (legacyPayload as { location_type?: string | null }).location_type;

    const fallback = await supabase
      .from("properties")
      .update(legacyPayload)
      .eq("id", id)
      .select("id, ref")
      .single();

    data = fallback.data;
    error = fallback.error;
  }

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Update failed" }, { status: 400 });
  }

  return NextResponse.json({ id: data.id, ref: data.ref });
}
