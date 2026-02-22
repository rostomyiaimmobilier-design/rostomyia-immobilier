import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertPropertySemanticIndex } from "@/lib/semantic-search";

function isMissingLocationTypeColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("location_type") && (m.includes("does not exist") || m.includes("column"));
}

function isMissingAmenitiesColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("amenities") && (m.includes("does not exist") || m.includes("column"));
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

function toOptionalStringArray(value: unknown): string[] | null {
  if (value == null) return null;
  if (!Array.isArray(value)) return null;

  const cleaned = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  return Array.from(new Set(cleaned));
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
    amenities: toOptionalStringArray(body.amenities),
  };

  const attemptPayloads = [
    payload,
    (() => {
      const next = { ...payload };
      delete (next as { location_type?: string | null }).location_type;
      return next;
    })(),
    (() => {
      const next = { ...payload };
      delete (next as { amenities?: string[] | null }).amenities;
      return next;
    })(),
    (() => {
      const next = { ...payload };
      delete (next as { location_type?: string | null }).location_type;
      delete (next as { amenities?: string[] | null }).amenities;
      return next;
    })(),
  ];

  let data: { id: string; ref: string } | null = null;
  let error: { message?: string } | null = null;

  for (let i = 0; i < attemptPayloads.length; i += 1) {
    const attempt = await supabase
      .from("properties")
      .update(attemptPayloads[i])
      .eq("id", id)
      .select("id, ref")
      .single();

    data = attempt.data as { id: string; ref: string } | null;
    error = attempt.error;

    if (!error) break;
    const canRetry =
      isMissingLocationTypeColumn(error.message) ||
      isMissingAmenitiesColumn(error.message);
    if (!canRetry) break;
  }

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Update failed" }, { status: 400 });
  }

  await Promise.race([
    upsertPropertySemanticIndex({
      id: data.id,
      ref: data.ref,
      title: payload.title ?? null,
      type: payload.type ?? null,
      locationType: payload.location_type ?? null,
      category: payload.category ?? null,
      location: payload.location ?? null,
      description: payload.description ?? null,
      price: payload.price ?? null,
      beds: payload.beds,
      baths: payload.baths,
      area: payload.area,
      amenities: payload.amenities ?? null,
    }).catch(() => false),
    new Promise((resolve) => setTimeout(resolve, 2_500)),
  ]);

  return NextResponse.json({ id: data.id, ref: data.ref });
}
