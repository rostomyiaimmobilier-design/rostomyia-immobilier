import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasAdminAccess } from "@/lib/admin-auth";

type ViewingRequestPayload = {
  property_ref: string | null;
  name: string | null;
  phone: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  message: string | null;
  lang: "fr" | "ar";
  status: "new";
};

function toOptionalString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function toLang(value: unknown): "fr" | "ar" {
  return String(value ?? "").trim().toLowerCase() === "ar" ? "ar" : "fr";
}

function isFutureOrTodayDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const picked = new Date(`${value}T00:00:00`);
  return Number.isFinite(picked.getTime()) && picked >= today;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const body = await req.json().catch(() => ({}));

  const payload: ViewingRequestPayload = {
    property_ref: toOptionalString(body.property_ref),
    name: toOptionalString(body.name),
    phone: toOptionalString(body.phone),
    preferred_date: toOptionalString(body.preferred_date),
    preferred_time: toOptionalString(body.preferred_time),
    message: toOptionalString(body.message),
    lang: toLang(body.lang),
    status: "new",
  };

  if (!payload.name) {
    return NextResponse.json({ error: "Le nom est obligatoire." }, { status: 400 });
  }
  if (!payload.phone || !/^[+\d\s().-]{8,20}$/.test(payload.phone)) {
    return NextResponse.json({ error: "Numero de telephone invalide." }, { status: 400 });
  }
  if (payload.preferred_date && !isFutureOrTodayDate(payload.preferred_date)) {
    return NextResponse.json(
      { error: "La date doit etre aujourd'hui ou plus tard." },
      { status: 400 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const isAdmin = await hasAdminAccess(supabase, user);
    if (isAdmin) {
      return NextResponse.json(
        { error: "Ce compte ne peut pas envoyer de demandes client." },
        { status: 403 }
      );
    }
  }

  const { error } = await supabase.from("viewing_requests").insert(payload);
  if (error) {
    return NextResponse.json(
      { error: error.message || "Erreur: impossible d'envoyer." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
