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

function toOptionalStringArray(value: unknown): string[] | null {
  if (value == null) return null;
  if (!Array.isArray(value)) return null;

  const cleaned = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  return Array.from(new Set(cleaned));
}

export async function POST(req: Request) {
  const supabase = await createClient();

  const body = await req.json();

  const payload = {
    ref: body.ref,
    title: body.title,
    type: body.type ?? null,
    location_type: body.location_type ?? null,
    category: body.category ?? null,
    apartment_type: body.apartment_type ?? null,
    price: body.price ?? null,
    location: body.location ?? null,
    beds: body.beds ?? null,
    baths: body.baths ?? null,
    area: body.area ?? null,
    description: body.description ?? null,
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
      .insert(attemptPayloads[i])
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
    return NextResponse.json(
      { error: error?.message ?? "Insert failed" },
      { status: 400 }
    );
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
      beds: typeof payload.beds === "number" ? payload.beds : null,
      baths: typeof payload.baths === "number" ? payload.baths : null,
      area: typeof payload.area === "number" ? payload.area : null,
      amenities: payload.amenities ?? null,
    }).catch(() => false),
    new Promise((resolve) => setTimeout(resolve, 2_500)),
  ]);

  return NextResponse.json({ id: data.id, ref: data.ref });
}
