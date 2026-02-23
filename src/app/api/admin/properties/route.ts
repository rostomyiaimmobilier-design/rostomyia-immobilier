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

function isMissingUploadedByTeamColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("uploaded_byteam") && (m.includes("does not exist") || m.includes("column"));
}

function isMissingOwnerLeadIdColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("owner_lead_id") && (m.includes("does not exist") || m.includes("column"));
}

function isMissingOwnerPhoneColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("owner_phone") && (m.includes("does not exist") || m.includes("column"));
}

function toOptionalBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return null;
}

function isAgencyUser(user: {
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
} | null): boolean {
  if (!user) return false;
  const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;

  const roleValues = [
    userMeta.account_type,
    userMeta.role,
    appMeta.account_type,
    appMeta.role,
  ]
    .map((value) => String(value ?? "").toLowerCase().trim())
    .filter(Boolean);
  if (roleValues.includes("agency")) return true;

  const appRoles = appMeta.roles;
  if (Array.isArray(appRoles)) {
    return appRoles.some((value) => String(value ?? "").toLowerCase().trim() === "agency");
  }

  return false;
}

function toOptionalUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toOptionalDigitsString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  return digits || null;
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const body = await req.json();
  const explicitUploadedByTeam = toOptionalBoolean(body.uploaded_byteam);
  const ownerLeadId = toOptionalUuid(body.owner_lead_id);
  const hasOwnerLeadSource = !!ownerLeadId;
  const uploadedByTeam =
    explicitUploadedByTeam ??
    (hasOwnerLeadSource || isAgencyUser(user) ? false : true);

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
    owner_phone: toOptionalDigitsString(body.owner_phone),
    amenities: toOptionalStringArray(body.amenities),
    uploaded_byteam: uploadedByTeam,
    owner_lead_id: ownerLeadId,
  };

  let data: { id: string; ref: string } | null = null;
  let error: { message?: string } | null = null;
  const attemptPayload: Record<string, unknown> = { ...payload };

  for (let i = 0; i < 10; i += 1) {
    const attempt = await supabase
      .from("properties")
      .insert(attemptPayload)
      .select("id, ref")
      .single();

    data = attempt.data as { id: string; ref: string } | null;
    error = attempt.error;

    if (!error) break;
    let changed = false;
    if (isMissingLocationTypeColumn(error.message) && "location_type" in attemptPayload) {
      delete attemptPayload.location_type;
      changed = true;
    }
    if (isMissingAmenitiesColumn(error.message) && "amenities" in attemptPayload) {
      delete attemptPayload.amenities;
      changed = true;
    }
    if (isMissingUploadedByTeamColumn(error.message) && "uploaded_byteam" in attemptPayload) {
      delete attemptPayload.uploaded_byteam;
      changed = true;
    }
    if (isMissingOwnerLeadIdColumn(error.message) && "owner_lead_id" in attemptPayload) {
      delete attemptPayload.owner_lead_id;
      changed = true;
    }
    if (isMissingOwnerPhoneColumn(error.message) && "owner_phone" in attemptPayload) {
      delete attemptPayload.owner_phone;
      changed = true;
    }
    if (!changed) break;
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
