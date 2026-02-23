import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isBackofficeAccount } from "@/lib/account-type";

type PropertySnapshot = {
  ref: string;
  title: string | null;
  location: string | null;
  price: string | null;
  location_type: string | null;
};

function isMissingLocationTypeColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("location_type") && (m.includes("does not exist") || m.includes("column"));
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toOptionalLang(value: unknown): "fr" | "ar" {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "ar" ? "ar" : "fr";
}

function normalizePhone(value: string | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits || null;
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function inferUserName(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
} | null) {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const candidate = [
    meta.full_name,
    meta.name,
    meta.username,
    meta.agency_name,
  ]
    .map((x) => String(x ?? "").trim())
    .find(Boolean);
  return candidate || null;
}

function inferUserPhone(user: {
  phone?: string | null;
  user_metadata?: Record<string, unknown> | null;
} | null) {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const candidate = [
    meta.phone,
    meta.agency_phone,
    user.phone,
  ]
    .map((x) => String(x ?? "").trim())
    .find(Boolean);
  return normalizePhone(candidate ?? null);
}

async function loadPropertySnapshot(
  supabase: Awaited<ReturnType<typeof createClient>>,
  propertyRef: string
): Promise<PropertySnapshot | null> {
  const rich = await supabase
    .from("properties")
    .select("ref, title, location, price, location_type")
    .eq("ref", propertyRef)
    .maybeSingle();

  if (!rich.error) {
    return (rich.data as PropertySnapshot | null) ?? null;
  }

  if (!isMissingLocationTypeColumn(rich.error.message)) {
    throw new Error(rich.error.message);
  }

  const fallback = await supabase
    .from("properties")
    .select("ref, title, location, price")
    .eq("ref", propertyRef)
    .maybeSingle();

  if (fallback.error) {
    throw new Error(fallback.error.message);
  }
  if (!fallback.data) return null;

  const row = fallback.data as Omit<PropertySnapshot, "location_type">;
  return {
    ...row,
    location_type: null,
  };
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const body = await req.json().catch(() => ({}));

  const propertyRef = toOptionalString(body.property_ref);
  const checkInDate = toOptionalString(body.check_in_date);
  const checkOutDate = toOptionalString(body.check_out_date);
  const reservationOption = toOptionalString(body.reservation_option);
  const reservationOptionLabel = toOptionalString(body.reservation_option_label);
  const message = toOptionalString(body.message);
  const lang = toOptionalLang(body.lang);

  if (!propertyRef) {
    return NextResponse.json({ error: "property_ref is required" }, { status: 400 });
  }
  if (!checkInDate || !isIsoDate(checkInDate)) {
    return NextResponse.json({ error: "check_in_date must be YYYY-MM-DD" }, { status: 400 });
  }
  if (!checkOutDate || !isIsoDate(checkOutDate)) {
    return NextResponse.json({ error: "check_out_date must be YYYY-MM-DD" }, { status: 400 });
  }
  if (checkOutDate <= checkInDate) {
    return NextResponse.json({ error: "check_out_date must be after check_in_date" }, { status: 400 });
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  if (checkInDate < todayIso) {
    return NextResponse.json({ error: "check_in_date cannot be in the past" }, { status: 400 });
  }

  let property: PropertySnapshot | null = null;
  try {
    property = await loadPropertySnapshot(supabase, propertyRef);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "property_lookup_failed";
    return NextResponse.json({ error: reason }, { status: 400 });
  }

  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (isBackofficeAccount(user)) {
    return NextResponse.json(
      { error: "Agency/admin accounts cannot create customer reservations." },
      { status: 403 }
    );
  }

  const payload = {
    status: "new" as const,
    source: "property_details",
    lang,
    property_ref: property.ref,
    property_title: property.title,
    property_location: property.location,
    property_price: property.price,
    location_type: property.location_type,
    reservation_option: reservationOption,
    reservation_option_label: reservationOptionLabel,
    check_in_date: checkInDate,
    check_out_date: checkOutDate,
    customer_user_id: user?.id ?? null,
    customer_name: toOptionalString(body.customer_name) ?? inferUserName(user),
    customer_phone: normalizePhone(toOptionalString(body.customer_phone) ?? inferUserPhone(user)),
    customer_email: toOptionalString(body.customer_email) ?? toOptionalString(user?.email),
    message,
  };

  const { data, error } = await supabase
    .from("short_stay_reservations")
    .insert(payload)
    .select("id, status, check_in_date, check_out_date, nights")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message || "reservation_insert_failed" }, { status: 400 });
  }

  return NextResponse.json({
    id: data.id,
    status: data.status,
    check_in_date: data.check_in_date,
    check_out_date: data.check_out_date,
    nights: data.nights,
  });
}
