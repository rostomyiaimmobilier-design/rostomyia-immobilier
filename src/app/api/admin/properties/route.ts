import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function isMissingLocationTypeColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("location_type") && (m.includes("does not exist") || m.includes("column"));
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
  };

  let { data, error } = await supabase
    .from("properties")
    .insert(payload)
    .select("id, ref")
    .single();

  if (error && isMissingLocationTypeColumn(error.message)) {
    const legacyPayload = { ...payload };
    delete (legacyPayload as { location_type?: string | null }).location_type;
    const fallback = await supabase
      .from("properties")
      .insert(legacyPayload)
      .select("id, ref")
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Insert failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({ id: data.id, ref: data.ref });
}
