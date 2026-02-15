"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type Payload = {
  ref: string;
  title: string;
  type: "Vente" | "Location";
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

  const { data: prop, error } = await supabase
    .from("properties")
    .insert({
      ref: payload.ref,
      title: payload.title,
      type: payload.type,
      price: payload.price,
      location: payload.location,
      beds: payload.beds,
      baths: payload.baths,
      area: payload.area,
      description: payload.description,
    })
    .select("id")
    .single();

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
