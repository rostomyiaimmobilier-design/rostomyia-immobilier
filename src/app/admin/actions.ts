"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function isMissingLocationTypeColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("location_type") && (m.includes("does not exist") || m.includes("column"));
}

function isMissingUploadedByTeamColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("uploaded_byteam") && (m.includes("does not exist") || m.includes("column"));
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
    uploaded_byteam: true,
    price: payload.price,
    location: payload.location,
    beds: payload.beds,
    baths: payload.baths,
    area: payload.area,
    description: payload.description,
  };

  const attemptPayloads = [
    insertPayload,
    (() => {
      const next = { ...insertPayload };
      delete (next as { location_type?: string | null }).location_type;
      return next;
    })(),
    (() => {
      const next = { ...insertPayload };
      delete (next as { uploaded_byteam?: boolean }).uploaded_byteam;
      return next;
    })(),
    (() => {
      const next = { ...insertPayload };
      delete (next as { uploaded_byteam?: boolean }).uploaded_byteam;
      delete (next as { location_type?: string | null }).location_type;
      return next;
    })(),
  ];

  let prop: { id: string } | null = null;
  let error: { message?: string } | null = null;

  for (let i = 0; i < attemptPayloads.length; i += 1) {
    const attempt = await supabase
      .from("properties")
      .insert(attemptPayloads[i])
      .select("id")
      .single();
    prop = (attempt.data as { id: string } | null) ?? null;
    error = attempt.error;
    if (!error) break;
    const canRetry =
      isMissingLocationTypeColumn(error.message) ||
      isMissingUploadedByTeamColumn(error.message);
    if (!canRetry) break;
  }

  if (error) {
    return { ok: false as const, message: error.message };
  }
  if (!prop?.id) {
    return { ok: false as const, message: "Property creation failed: missing id." };
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
