import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasAdminWriteAccess } from "@/lib/admin-auth";
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

function toOptionalNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

  const canWrite = await hasAdminWriteAccess(supabase, user);
  if (!canWrite) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const title = toOptionalString(body.title);
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const type = body.type === "Vente" ? "Vente" : "Location";
  const locationType = toOptionalString(body.location_type) ?? (type === "Vente" ? "vente" : "location");
  const uploadedByTeam = toOptionalBoolean(body.uploaded_byteam);
  const ownerLeadId = toOptionalString(body.owner_lead_id);

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
    ...(body.owner_phone !== undefined ? { owner_phone: toOptionalDigitsString(body.owner_phone) } : {}),
    ...(uploadedByTeam !== null ? { uploaded_byteam: uploadedByTeam } : {}),
    ...(body.owner_lead_id !== undefined ? { owner_lead_id: ownerLeadId } : {}),
  };

  let data: { id: string; ref: string } | null = null;
  let error: { message?: string } | null = null;
  const attemptPayload: Record<string, unknown> = { ...payload };

  for (let i = 0; i < 10; i += 1) {
    const attempt = await supabase
      .from("properties")
      .update(attemptPayload)
      .eq("id", id)
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
      return NextResponse.json(
        {
          error:
            "La colonne owner_phone est absente. Lancez la migration 2026-02-22-add-owner-phone-to-properties.sql puis reessayez.",
        },
        { status: 400 }
      );
    }
    if (!changed) break;
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
