"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function isMissingLocationTypeColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("location_type") && (m.includes("does not exist") || m.includes("column"));
}

type Payload = {
  ref: string;
  title: string;
  type: "Vente" | "Location";
  locationType?: string;
  price: string;
  location: string;
  beds: number;
  baths: number;
  area: number;
  description: string;
  imageUrls: string[]; // simple v1
};

export async function createProperty(payload: Payload) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const insertPayload = {
    ref: payload.ref,
    title: payload.title,
    type: payload.type,
    location_type: payload.locationType ?? null,
    price: payload.price,
    location: payload.location,
    beds: payload.beds,
    baths: payload.baths,
    area: payload.area,
    description: payload.description,
  };

  let { data: prop, error } = await supabase
    .from("properties")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error && isMissingLocationTypeColumn(error.message)) {
    const legacyPayload = { ...insertPayload };
    delete (legacyPayload as { location_type?: string | null }).location_type;
    const fallback = await supabase
      .from("properties")
      .insert(legacyPayload)
      .select("id")
      .single();
    prop = fallback.data;
    error = fallback.error;
  }

  if (error) {
    return { ok: false as const, message: error.message };
  }

  if (payload.imageUrls.length) {
    const rows = payload.imageUrls.map((url, idx) => ({
      property_id: prop.id,
      url,
      sort: idx,
    }));

    const imgRes = await supabase.from("property_images").insert(rows);
    if (imgRes.error) {
      return { ok: false as const, message: imgRes.error.message };
    }
  }

  return { ok: true as const };
}
