"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { upsertPropertySemanticIndex } from "@/lib/semantic-search";
import { createClient } from "@/lib/supabase/server";

function isMissingValidationColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  const missingColumn = m.includes("column") && m.includes("does not exist");
  const touchesValidationFields =
    m.includes("validation_note") || m.includes("validated_at") || m.includes("validated_by");
  return missingColumn && touchesValidationFields;
}

function isMissingAnyColumnError(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("column") && m.includes("does not exist");
}

function isMissingSpecificColumn(message: string | undefined, column: string) {
  const m = (message || "").toLowerCase();
  return m.includes(column.toLowerCase()) && m.includes("column") && m.includes("does not exist");
}

function isMissingOwnerLeadIdColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("owner_lead_id") && (m.includes("does not exist") || m.includes("column"));
}

function isMissingOwnerPhoneColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("owner_phone") && (m.includes("does not exist") || m.includes("column"));
}

function isMissingOwnerLeadEmailColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("email") && (m.includes("does not exist") || m.includes("column"));
}

function isMissingOwnerLeadWhatsappColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("whatsapp") && (m.includes("does not exist") || m.includes("column"));
}

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

function isMissingSortColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("sort") && (m.includes("does not exist") || m.includes("column"));
}

function isMissingIsCoverColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("is_cover") && (m.includes("does not exist") || m.includes("column"));
}

function isMissingPropertyImagesTable(message: string | undefined) {
  const m = String(message ?? "").toLowerCase();
  return m.includes("property_images") && (m.includes("does not exist") || m.includes("relation"));
}

function isMissingAgencyVisitNotificationsTable(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("agency_visit_notifications") && m.includes("does not exist");
}

type ViewingRequestForNotification = {
  id: string;
  status: string | null;
  property_ref: string | null;
  name: string | null;
  phone: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  message: string | null;
};

type PropertyForNotification = {
  ref: string;
  title: string | null;
  location: string | null;
  price: string | null;
  owner_phone: string | null;
  uploaded_byteam: boolean | null;
  owner_lead_id: string | null;
};

type OwnerLeadContact = {
  name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
};

type OwnerLeadForPublish = {
  id: string;
  title: string | null;
  property_type: string | null;
  transaction_type: string | null;
  location_type: string | null;
  address: string | null;
  district: string | null;
  commune: string | null;
  city: string | null;
  price: number | null;
  surface: number | null;
  rooms: number | null;
  baths: number | null;
  phone: string | null;
  photo_links?: string | null;
  message: string | null;
  amenities?: string[] | null;
};

function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function toOptionalDigits(value: string | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits || null;
}

function buildLocationFromLead(lead: OwnerLeadForPublish) {
  const parts = [lead.address, lead.district, lead.commune, lead.city]
    .map((item) => toOptionalString(item))
    .filter((item): item is string => Boolean(item));
  return parts.length ? parts.join(" - ") : null;
}

function normalizeTransactionType(value: string | null | undefined) {
  const raw = normalizeText(value);
  if (!raw) return "vente";
  if (raw === "vente" || raw === "sale") return "vente";
  if (raw === "par_mois" || raw === "par mois" || raw === "location" || raw === "rent") return "par_mois";
  if (raw === "six_mois" || raw === "six mois" || raw === "6 mois") return "six_mois";
  if (raw === "douze_mois" || raw === "douze mois" || raw === "12 mois") return "douze_mois";
  if (raw === "par_nuit" || raw === "par nuit") return "par_nuit";
  if (raw === "court_sejour" || raw === "court sejour") return "court_sejour";
  return raw;
}

function normalizeCategory(value: string | null | undefined) {
  const raw = normalizeText(value);
  if (!raw) return null;
  if (raw.includes("appartement")) return "appartement";
  if (raw.includes("villa")) return "villa";
  if (raw.includes("terrain")) return "terrain";
  if (raw.includes("local")) return "local";
  if (raw.includes("bureau")) return "bureau";
  return null;
}

function fallbackTitle(lead: OwnerLeadForPublish) {
  const category = normalizeCategory(lead.property_type);
  const categoryLabel =
    category === "appartement"
      ? "Appartement"
      : category === "villa"
        ? "Villa"
        : category === "terrain"
          ? "Terrain"
          : category === "local"
            ? "Local"
            : category === "bureau"
              ? "Bureau"
              : "Bien immobilier";
  const place = toOptionalString(lead.district) ?? toOptionalString(lead.commune) ?? "Oran";
  return `${categoryLabel} - ${place}`;
}

function isDuplicateRefError(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("duplicate key") && m.includes("ref");
}

function makePropertyRef() {
  const ts = Date.now().toString().slice(-6);
  const rand = Math.floor(100 + Math.random() * 900).toString();
  return `OR-${ts}${rand}`;
}

function isMissingIdColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("id") && m.includes("does not exist") && m.includes("owner_leads");
}

function parsePhotoLinks(raw: string | null | undefined) {
  return String(raw ?? "")
    .split(/[\n,\s]+/g)
    .map((x) => x.trim())
    .filter((x) => /^https?:\/\//i.test(x));
}

function extractPropertyImagePathFromUrl(url: string | null | undefined) {
  const input = String(url ?? "").trim();
  if (!input) return null;
  const withoutQuery = input.split("?")[0];
  const markers = [
    "/storage/v1/object/public/property-images/",
    "/storage/v1/render/image/public/property-images/",
  ];
  for (const marker of markers) {
    const idx = withoutQuery.indexOf(marker);
    if (idx < 0) continue;
    const path = withoutQuery.slice(idx + marker.length).replace(/^\/+/, "").trim();
    if (path) return path;
  }
  return null;
}

function collectLeadImagePaths(lead: OwnerLeadForPublish) {
  const urls = [...parsePhotoLinks(lead.photo_links), ...parsePhotoLinks(lead.message)];
  return Array.from(
    new Set(
      urls
        .map((url) => extractPropertyImagePathFromUrl(url))
        .filter((path): path is string => Boolean(path))
    )
  );
}

function sanitizeLeadDescriptionForProperty(value: string | null | undefined) {
  const lines = String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd());

  const cleaned = lines
    .filter((line) => !/https?:\/\/\S+/i.test(line))
    .map((line) => line.replace(/\s{2,}/g, " ").trimEnd())
    .filter((line) => {
      const normalized = line
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/^\*\s*/, "")
        .trim();
      if (!line.trim()) return false;
      if (normalized.startsWith("photos:") || normalized.startsWith("photos :")) return false;
      if (normalized.startsWith("liens photos/videos") || normalized.startsWith("liens photos videos")) return false;
      if (normalized.startsWith("liens photos") || normalized.startsWith("liens videos")) return false;
      return true;
    });

  const output = cleaned.join("\n").trim();
  return output || null;
}

function descriptionLikelyContainsMediaLinks(value: string | null | undefined) {
  const raw = String(value ?? "");
  if (!raw.trim()) return false;
  if (/https?:\/\/\S+/i.test(raw)) return true;
  const normalized = normalizeText(raw);
  return (
    normalized.includes("photos:") ||
    normalized.includes("photos :") ||
    normalized.includes("liens photos/videos") ||
    normalized.includes("liens photos videos") ||
    normalized.includes("liens photos") ||
    normalized.includes("liens videos")
  );
}

function normalizePhoneDigits(value: string | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits || null;
}

function formatVisitWhatsappMessage(input: {
  propertyRef: string;
  propertyTitle: string | null;
  propertyLocation: string | null;
  propertyPrice: string | null;
  preferredDate: string | null;
  preferredTime: string | null;
  status: string;
}) {
  const ref = input.propertyRef;
  const title = toOptionalString(input.propertyTitle) ?? "-";
  const location = toOptionalString(input.propertyLocation) ?? "-";
  const price = toOptionalString(input.propertyPrice) ?? "-";
  const date = toOptionalString(input.preferredDate) ?? "-";
  const time = toOptionalString(input.preferredTime) ?? "-";
  const status = toOptionalString(input.status) ?? "scheduled";

  return [
    "Nouvelle visite validee.",
    `Statut: ${status}`,
    `Date: ${date}`,
    `Heure: ${time}`,
    `Bien REF: ${ref}`,
    `Titre: ${title}`,
    `Localisation: ${location}`,
    `Prix: ${price}`,
  ].join("\n");
}

function isScheduledStatus(value: string) {
  return value.trim().toLowerCase() === "scheduled";
}

function shouldTriggerAgencyVisitNotification(previousStatus: string, nextStatus: string) {
  return !isScheduledStatus(previousStatus) && isScheduledStatus(nextStatus);
}

function normalizeRole(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function isAdminRole(value: unknown) {
  const role = normalizeRole(value);
  return role === "admin" || role === "super_admin" || role === "superadmin";
}

function isAdminActor(user: {
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
}) {
  const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;

  if (isAdminRole(userMeta.account_type) || isAdminRole(appMeta.account_type)) return true;
  if (isAdminRole(userMeta.role) || isAdminRole(appMeta.role)) return true;
  if (String(userMeta.is_admin ?? "").toLowerCase() === "true") return true;
  if (String(appMeta.is_admin ?? "").toLowerCase() === "true") return true;

  const appRoles = appMeta.roles;
  if (Array.isArray(appRoles) && appRoles.some((role) => isAdminRole(role))) return true;

  return false;
}

async function dispatchAgencyWhatsappNotification(input: {
  toDigits: string | null;
  message: string;
}) {
  const webhookUrl =
    process.env.AGENCY_WHATSAPP_WEBHOOK_URL ||
    process.env.WHATSAPP_WEBHOOK_URL;
  const webhookSecret =
    process.env.AGENCY_WHATSAPP_WEBHOOK_SECRET ||
    process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!webhookUrl || !input.toDigits) return;

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (webhookSecret) {
      headers.Authorization = `Bearer ${webhookSecret}`;
      headers["x-webhook-secret"] = webhookSecret;
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        to: input.toDigits,
        message: input.message,
        context: "agency_visit_validated",
      }),
    });
    if (!response.ok) {
      const reason = await response.text().catch(() => "");
      throw new Error(reason || `http_${response.status}`);
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "whatsapp_send_failed";
    console.error("[leads.actions] agency WhatsApp notification failed:", reason);
    // Keep visit validation non-blocking if WhatsApp provider fails.
  }
}

async function dispatchOwnerWhatsappNotification(input: {
  toDigits: string | null;
  message: string;
}) {
  const webhookUrl =
    process.env.OWNER_WHATSAPP_WEBHOOK_URL ||
    process.env.AGENCY_WHATSAPP_WEBHOOK_URL ||
    process.env.WHATSAPP_WEBHOOK_URL;
  const webhookSecret =
    process.env.OWNER_WHATSAPP_WEBHOOK_SECRET ||
    process.env.AGENCY_WHATSAPP_WEBHOOK_SECRET ||
    process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!webhookUrl || !input.toDigits) return;

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (webhookSecret) {
      headers.Authorization = `Bearer ${webhookSecret}`;
      headers["x-webhook-secret"] = webhookSecret;
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        to: input.toDigits,
        message: input.message,
        context: "owner_visit_validated",
      }),
    });
    if (!response.ok) {
      const reason = await response.text().catch(() => "");
      throw new Error(reason || `http_${response.status}`);
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "whatsapp_send_failed";
    console.error("[leads.actions] owner WhatsApp notification failed:", reason);
    // Keep visit validation non-blocking if WhatsApp provider fails.
  }
}

async function loadPropertyForVisitNotification(
  supabase: Awaited<ReturnType<typeof createClient>>,
  propertyRef: string
): Promise<PropertyForNotification | null> {
  const rich = await supabase
    .from("properties")
    .select("ref, title, location, price, owner_phone, uploaded_byteam, owner_lead_id")
    .eq("ref", propertyRef)
    .maybeSingle();

  if (!rich.error && rich.data) {
    return rich.data as PropertyForNotification;
  }

  if (!rich.error) return null;
  const canFallback =
    isMissingOwnerLeadIdColumn(rich.error.message) ||
    isMissingOwnerPhoneColumn(rich.error.message);
  if (!canFallback) {
    throw new Error(rich.error.message);
  }

  const legacy = await supabase
    .from("properties")
    .select("ref, title, location, price, uploaded_byteam")
    .eq("ref", propertyRef)
    .maybeSingle();

  if (legacy.error) throw new Error(legacy.error.message);
  if (!legacy.data) return null;

  return {
    ...(legacy.data as Omit<PropertyForNotification, "owner_lead_id">),
    owner_phone: null,
    owner_lead_id: null,
  };
}

async function loadOwnerLeadContact(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerLeadId: string
): Promise<OwnerLeadContact | null> {
  const rich = await supabase
    .from("owner_leads")
    .select("id, name, email, phone, whatsapp")
    .eq("id", ownerLeadId)
    .maybeSingle();

  if (!rich.error) {
    return rich.data as OwnerLeadContact | null;
  }

  const canFallback =
    isMissingOwnerLeadEmailColumn(rich.error.message) ||
    isMissingOwnerLeadWhatsappColumn(rich.error.message);
  if (!canFallback) {
    throw new Error(rich.error.message);
  }

  const fallback = await supabase
    .from("owner_leads")
    .select("id, name, phone")
    .eq("id", ownerLeadId)
    .maybeSingle();

  if (fallback.error) throw new Error(fallback.error.message);
  if (!fallback.data) return null;

  return {
    name: toOptionalString((fallback.data as { name?: string | null }).name ?? null),
    email: null,
    phone: toOptionalString((fallback.data as { phone?: string | null }).phone ?? null),
    whatsapp: null,
  };
}

async function loadOwnerLeadForPublish(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerLeadId: string
): Promise<OwnerLeadForPublish | null> {
  const rich = await supabase
    .from("owner_leads")
    .select(
      "id, title, property_type, transaction_type, location_type, address, district, commune, city, price, surface, rooms, baths, phone, photo_links, message, amenities"
    )
    .eq("id", ownerLeadId)
    .maybeSingle();

  if (!rich.error) {
    return (rich.data as OwnerLeadForPublish | null) ?? null;
  }

  if (!(isMissingAnyColumnError(rich.error.message) || isMissingIdColumn(rich.error.message))) {
    throw new Error(rich.error.message);
  }

  const fallback = await supabase
    .from("owner_leads")
    .select(
      "id, title, property_type, district, city, price, surface, rooms, phone, photo_links, message"
    )
    .eq("id", ownerLeadId)
    .maybeSingle();

  if (fallback.error) throw new Error(fallback.error.message);
  if (!fallback.data) return null;

  const row = fallback.data as {
    id: string;
    title?: string | null;
    property_type?: string | null;
    district?: string | null;
    city?: string | null;
    price?: number | null;
    surface?: number | null;
    rooms?: number | null;
    phone?: string | null;
    photo_links?: string | null;
    message?: string | null;
  };

  return {
    id: row.id,
    title: row.title ?? null,
    property_type: row.property_type ?? null,
    transaction_type: null,
    location_type: null,
    address: null,
    district: row.district ?? null,
    commune: null,
    city: row.city ?? null,
    price: row.price ?? null,
    surface: row.surface ?? null,
    rooms: row.rooms ?? null,
    baths: null,
    phone: row.phone ?? null,
    photo_links: row.photo_links ?? null,
    message: row.message ?? null,
    amenities: null,
  };
}

async function findPropertyByOwnerLeadId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerLeadId: string
): Promise<{ id: string; ref: string } | null> {
  const result = await supabase
    .from("properties")
    .select("id, ref")
    .eq("owner_lead_id", ownerLeadId)
    .maybeSingle();

  if (!result.error) {
    return (result.data as { id: string; ref: string } | null) ?? null;
  }

  if (isMissingOwnerLeadIdColumn(result.error.message)) return null;
  throw new Error(result.error.message);
}

async function createPropertyFromOwnerLead(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lead: OwnerLeadForPublish,
  ownerLeadId: string
): Promise<{ id: string; ref: string }> {
  const tx = normalizeTransactionType(lead.transaction_type ?? lead.location_type);
  const type = tx === "vente" ? "Vente" : "Location";
  const category = normalizeCategory(lead.property_type);
  const title = toOptionalString(lead.title) ?? fallbackTitle(lead);
  const location = buildLocationFromLead(lead);
  const ownerPhone = toOptionalDigits(lead.phone);
  const amenities = Array.isArray(lead.amenities)
    ? Array.from(
        new Set(
          lead.amenities
            .map((item) => toOptionalString(item))
            .filter((item): item is string => Boolean(item))
        )
      )
    : null;

  const payloadBase: Record<string, unknown> = {
    title,
    type,
    location_type: tx,
    category,
    apartment_type: null,
    price: lead.price != null ? String(lead.price) : null,
    location,
    owner_phone: ownerPhone,
    beds: lead.rooms ?? null,
    baths: lead.baths ?? null,
    area: lead.surface ?? null,
    description: sanitizeLeadDescriptionForProperty(lead.message),
    amenities,
    uploaded_byteam: false,
    owner_lead_id: ownerLeadId,
  };

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const payload = { ...payloadBase, ref: makePropertyRef() };

    for (let dropAttempt = 0; dropAttempt < 10; dropAttempt += 1) {
      const insert = await supabase
        .from("properties")
        .insert(payload)
        .select("id, ref")
        .single();

      if (!insert.error && insert.data) {
        return insert.data as { id: string; ref: string };
      }

      const message = insert.error?.message;
      if (isDuplicateRefError(message)) break;

      let changed = false;
      if (isMissingLocationTypeColumn(message) && "location_type" in payload) {
        delete payload.location_type;
        changed = true;
      }
      if (isMissingAmenitiesColumn(message) && "amenities" in payload) {
        delete payload.amenities;
        changed = true;
      }
      if (isMissingUploadedByTeamColumn(message) && "uploaded_byteam" in payload) {
        delete payload.uploaded_byteam;
        changed = true;
      }
      if (isMissingOwnerLeadIdColumn(message) && "owner_lead_id" in payload) {
        delete payload.owner_lead_id;
        changed = true;
      }
      if (isMissingOwnerPhoneColumn(message) && "owner_phone" in payload) {
        delete payload.owner_phone;
        changed = true;
      }

      if (!changed) {
        throw new Error(message || "Failed to create property from lead.");
      }
    }
  }

  throw new Error("Unable to generate unique property reference.");
}

async function updatePropertyDescriptionFromLeadIfNeeded(
  propertyId: string,
  lead: OwnerLeadForPublish
) {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("properties")
    .select("id, description")
    .eq("id", propertyId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return;

  const currentDescription = toOptionalString(
    (data as { description?: string | null }).description ?? null
  );
  const nextDescription = sanitizeLeadDescriptionForProperty(lead.message);
  if (!nextDescription) return;

  // Only auto-repair when description is missing or clearly includes media-link artifacts.
  if (currentDescription && !descriptionLikelyContainsMediaLinks(currentDescription)) return;

  const { error: updateError } = await admin
    .from("properties")
    .update({ description: nextDescription })
    .eq("id", propertyId);

  if (updateError) throw new Error(updateError.message);
}

async function attachPropertyImagesFromLead(propertyId: string, lead: OwnerLeadForPublish) {
  const imagePaths = collectLeadImagePaths(lead);
  if (!imagePaths.length) return;

  const admin = supabaseAdmin();
  const existing = await admin
    .from("property_images")
    .select("id, path, sort")
    .eq("property_id", propertyId);

  if (existing.error) {
    if (isMissingPropertyImagesTable(existing.error.message)) return;
    throw new Error(existing.error.message);
  }

  const existingRows = (existing.data ??
    []) as Array<{ id?: string; path?: string | null; sort?: number | null }>;
  const existingPathSet = new Set(
    existingRows
      .map((row) => toOptionalString(row.path ?? null))
      .filter((value): value is string => Boolean(value))
  );

  const missingPaths = imagePaths.filter((path) => !existingPathSet.has(path));
  if (!missingPaths.length) return;

  const maxSort = existingRows.reduce((max, row) => {
    const parsed = Number(row.sort);
    return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
  }, -1);
  const hasAnyExistingImage = existingRows.length > 0;

  let rows: Array<Record<string, unknown>> = missingPaths.map((path, index) => ({
    property_id: propertyId,
    path,
    sort: maxSort + index + 1,
    is_cover: !hasAnyExistingImage && index === 0,
  }));

  for (let dropAttempt = 0; dropAttempt < 4; dropAttempt += 1) {
    const insert = await admin.from("property_images").insert(rows);
    if (!insert.error) return;

    const message = insert.error.message;
    if (isMissingPropertyImagesTable(message)) return;

    let changed = false;
    if (isMissingSortColumn(message)) {
      rows = rows.map((row) => {
        const copy = { ...row };
        delete copy.sort;
        return copy;
      });
      changed = true;
    }
    if (isMissingIsCoverColumn(message)) {
      rows = rows.map((row) => {
        const copy = { ...row };
        delete copy.is_cover;
        return copy;
      });
      changed = true;
    }

    if (!changed) throw new Error(message);
  }

  throw new Error("Failed to attach property images from owner lead.");
}

async function notifyAgencyAfterVisitValidation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  request: ViewingRequestForNotification,
  validatedStatus: string
) {
  const propertyRef = toOptionalString(request.property_ref);
  if (!propertyRef) return;

  const property = await loadPropertyForVisitNotification(supabase, propertyRef);
  if (!property) return;
  if (property.uploaded_byteam !== false) return;

  const ownerLeadId = toOptionalString(property.owner_lead_id);
  if (!ownerLeadId) return;

  const ownerLead = await loadOwnerLeadContact(supabase, ownerLeadId);
  if (!ownerLead) return;

  const agencyEmail = toOptionalString(ownerLead.email);
  if (!agencyEmail) return;

  const agencyWhatsappRaw = toOptionalString(ownerLead.whatsapp) ?? toOptionalString(ownerLead.phone);
  const agencyWhatsappDigits = normalizePhoneDigits(agencyWhatsappRaw);
  const whatsappMessage = formatVisitWhatsappMessage({
    propertyRef: property.ref,
    propertyTitle: property.title,
    propertyLocation: property.location,
    propertyPrice: property.price,
    preferredDate: request.preferred_date,
    preferredTime: request.preferred_time,
    status: validatedStatus,
  });
  const whatsappLink = agencyWhatsappDigits
    ? `https://wa.me/${encodeURIComponent(agencyWhatsappDigits)}?text=${encodeURIComponent(whatsappMessage)}`
    : null;

  const admin = supabaseAdmin();
  const { error } = await admin
    .from("agency_visit_notifications")
    .upsert(
      {
        viewing_request_id: request.id,
        agency_email: agencyEmail,
        agency_name: toOptionalString(ownerLead.name),
        agency_whatsapp: agencyWhatsappRaw,
        property_ref: property.ref,
        property_title: property.title,
        property_location: property.location,
        property_price: property.price,
        visit_preferred_date: request.preferred_date,
        visit_preferred_time: request.preferred_time,
        visit_status: validatedStatus,
        whatsapp_message: whatsappMessage,
        whatsapp_link: whatsappLink,
        read_at: null,
      },
      { onConflict: "viewing_request_id" }
    );

  if (error && !isMissingAgencyVisitNotificationsTable(error.message)) {
    throw new Error(error.message);
  }

  await dispatchAgencyWhatsappNotification({
    toDigits: agencyWhatsappDigits,
    message: whatsappMessage,
  });
}

async function notifyOwnerAfterVisitValidation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  request: ViewingRequestForNotification,
  validatedStatus: string
) {
  const propertyRef = toOptionalString(request.property_ref);
  if (!propertyRef) return;

  const property = await loadPropertyForVisitNotification(supabase, propertyRef);
  if (!property) return;

  let ownerDigits = normalizePhoneDigits(property.owner_phone);
  if (!ownerDigits) {
    const ownerLeadId = toOptionalString(property.owner_lead_id);
    if (ownerLeadId) {
      const ownerLead = await loadOwnerLeadContact(supabase, ownerLeadId);
      ownerDigits = normalizePhoneDigits(
        toOptionalString(ownerLead?.whatsapp) ?? toOptionalString(ownerLead?.phone)
      );
    }
  }
  if (!ownerDigits) return;

  const ownerMessage = [
    "Votre bien a une nouvelle visite validee.",
    `Statut: ${toOptionalString(validatedStatus) ?? "scheduled"}`,
    `Date: ${toOptionalString(request.preferred_date) ?? "-"}`,
    `Heure: ${toOptionalString(request.preferred_time) ?? "-"}`,
    `Bien REF: ${property.ref}`,
    `Titre: ${toOptionalString(property.title) ?? "-"}`,
    `Localisation: ${toOptionalString(property.location) ?? "-"}`,
    `Prix: ${toOptionalString(property.price) ?? "-"}`,
  ].join("\n");

  await dispatchOwnerWhatsappNotification({
    toDigits: ownerDigits,
    message: ownerMessage,
  });
}

export async function updateOwnerLeadStatus(id: string, status: string, validationNote?: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const normalizedStatus = status.trim() || "new";
  const note = (validationNote || "").trim();
  const isValidated = normalizedStatus === "validated";

  const updatePayload = {
    status: normalizedStatus,
    validation_note: note || null,
    validated_at: isValidated ? new Date().toISOString() : null,
    validated_by: isValidated ? user?.id ?? null : null,
  };

  let { error } = await supabase
    .from("owner_leads")
    .update(updatePayload)
    .eq("id", id);

  if (error && isMissingValidationColumn(error.message)) {
    const fallback = await supabase
      .from("owner_leads")
      .update({ status: normalizedStatus })
      .eq("id", id);
    error = fallback.error;
  }

  if (error) throw new Error(error.message);

  revalidatePath("/admin/protected/leads/owners");
  revalidatePath("/admin/leads/owners");
  revalidatePath("/admin/protected/leads/depot-tiers");
  revalidatePath("/admin/leads/depot-tiers");

  if (isValidated) {
    const ts = Date.now().toString().slice(-6);
    const rand = Math.floor(100 + Math.random() * 900).toString();
    const ref = `OR-${ts}${rand}`;
    redirect(`/admin/protected/new?ownerLeadId=${encodeURIComponent(id)}&ref=${encodeURIComponent(ref)}`);
  }
}

export async function validateOwnerLeadAndPublish(id: string, validationNote?: string) {
  const leadId = id.trim();
  if (!leadId) throw new Error("Missing owner lead id.");

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);

  const leadForPublish = await loadOwnerLeadForPublish(supabase, leadId);
  if (!leadForPublish) throw new Error("Owner lead not found.");

  const existingProperty = await findPropertyByOwnerLeadId(supabase, leadId);
  let createdProperty: { id: string; ref: string } | null = existingProperty;
  if (!createdProperty) {
    createdProperty = await createPropertyFromOwnerLead(supabase, leadForPublish, leadId);
  }

  if (createdProperty) {
    await updatePropertyDescriptionFromLeadIfNeeded(createdProperty.id, leadForPublish);
    await attachPropertyImagesFromLead(createdProperty.id, leadForPublish);
  }

  if (!existingProperty && createdProperty) {
    await Promise.race([
      upsertPropertySemanticIndex({
        id: createdProperty.id,
        ref: createdProperty.ref,
        title: toOptionalString(leadForPublish.title) ?? fallbackTitle(leadForPublish),
        type: normalizeTransactionType(leadForPublish.transaction_type ?? leadForPublish.location_type) === "vente" ? "Vente" : "Location",
        locationType: normalizeTransactionType(leadForPublish.transaction_type ?? leadForPublish.location_type),
        category: normalizeCategory(leadForPublish.property_type),
        location: buildLocationFromLead(leadForPublish),
        description: sanitizeLeadDescriptionForProperty(leadForPublish.message),
        price: leadForPublish.price != null ? String(leadForPublish.price) : null,
        beds: leadForPublish.rooms ?? null,
        baths: leadForPublish.baths ?? null,
        area: leadForPublish.surface ?? null,
        amenities: Array.isArray(leadForPublish.amenities) ? leadForPublish.amenities : null,
      }).catch(() => false),
      new Promise((resolve) => setTimeout(resolve, 2_000)),
    ]);
  }

  const note = (validationNote || "").trim();
  const updatePayload = {
    status: "validated",
    validation_note: note || null,
    validated_at: new Date().toISOString(),
    validated_by: user?.id ?? null,
  };

  let { error } = await supabase
    .from("owner_leads")
    .update(updatePayload)
    .eq("id", leadId);

  if (error && isMissingValidationColumn(error.message)) {
    const fallback = await supabase
      .from("owner_leads")
      .update({ status: "validated" })
      .eq("id", leadId);
    error = fallback.error;
  }

  if (error) throw new Error(error.message);

  revalidatePath("/admin/protected/leads/owners");
  revalidatePath("/admin/leads/owners");
  revalidatePath("/admin/protected/leads/depot-tiers");
  revalidatePath("/admin/leads/depot-tiers");
  revalidatePath("/admin/protected");
  revalidatePath("/admin");
  revalidatePath("/biens");
  revalidatePath("/agency/dashboard");

  redirect("/biens");
}

export async function deleteOwnerLead(id: string) {
  const leadId = id.trim();
  if (!leadId) throw new Error("Missing owner lead id.");

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw new Error(userError.message);
  if (!user || !isAdminActor(user)) throw new Error("Unauthorized.");

  const admin = supabaseAdmin();
  const { error } = await admin.from("owner_leads").delete().eq("id", leadId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/protected/leads/owners");
  revalidatePath("/admin/leads/owners");
  revalidatePath("/admin/protected/leads/depot-tiers");
  revalidatePath("/admin/leads/depot-tiers");
  revalidatePath("/agency/dashboard");
}

export async function updateViewingRequestStatus(id: string, status: string) {
  const supabase = await createClient();
  const normalizedStatus = status.trim() || "new";
  const { data: requestData, error: requestError } = await supabase
    .from("viewing_requests")
    .select("id, status, property_ref, name, phone, preferred_date, preferred_time, message")
    .eq("id", id)
    .maybeSingle();

  if (requestError) throw new Error(requestError.message);
  if (!requestData) throw new Error("Viewing request not found.");

  const previousStatus = String(requestData.status ?? "new").trim().toLowerCase();

  const { error } = await supabase
    .from("viewing_requests")
    .update({ status: normalizedStatus })
    .eq("id", id);

  if (error) throw new Error(error.message);

  const shouldNotifyOnValidation = shouldTriggerAgencyVisitNotification(previousStatus, normalizedStatus);
  if (shouldNotifyOnValidation) {
    try {
      await notifyAgencyAfterVisitValidation(
        supabase,
        requestData as ViewingRequestForNotification,
        normalizedStatus
      );
    } catch (notificationError) {
      const reason =
        notificationError instanceof Error ? notificationError.message : "unknown_notification_error";
      console.error("[leads.actions] failed to notify agency for validated visit:", reason);
    }

    try {
      await notifyOwnerAfterVisitValidation(
        supabase,
        requestData as ViewingRequestForNotification,
        normalizedStatus
      );
    } catch (notificationError) {
      const reason =
        notificationError instanceof Error ? notificationError.message : "unknown_notification_error";
      console.error("[leads.actions] failed to notify owner for validated visit:", reason);
    }
  }

  revalidatePath("/admin/protected/leads/visits");
  revalidatePath("/admin/leads/visits");
  revalidatePath("/agency/dashboard");

  if (normalizedStatus === "scheduled") {
    redirect(`/admin/protected/leads/visits/plan/${encodeURIComponent(id)}`);
  }
}

const SHORT_STAY_RESERVATION_STATUS = [
  "hold",
  "new",
  "contacted",
  "confirmed",
  "cancelled",
  "closed",
] as const;

function isAllowedShortStayReservationStatus(value: string) {
  return SHORT_STAY_RESERVATION_STATUS.includes(
    value as (typeof SHORT_STAY_RESERVATION_STATUS)[number]
  );
}

function cancellationCutoffHours() {
  const raw = Number(process.env.RESERVATION_CANCELLATION_MIN_HOURS ?? 48);
  if (!Number.isFinite(raw)) return 48;
  return Math.max(0, Math.round(raw));
}

function hoursUntilDateStart(isoDate: string, now: Date) {
  const date = new Date(`${isoDate}T00:00:00`);
  if (!Number.isFinite(date.getTime())) return Number.POSITIVE_INFINITY;
  return (date.getTime() - now.getTime()) / 3_600_000;
}

export async function updateShortStayReservationStatus(
  id: string,
  status: string,
  adminNote?: string,
  forceCancel = false
) {
  const supabase = await createClient();
  const normalizedStatus = status.trim().toLowerCase() || "new";
  if (!isAllowedShortStayReservationStatus(normalizedStatus)) {
    throw new Error("Invalid reservation status");
  }

  const { data: current, error: loadError } = await supabase
    .from("short_stay_reservations")
    .select("id, status, check_in_date")
    .eq("id", id)
    .maybeSingle();

  if (loadError) throw new Error(loadError.message);
  if (!current) throw new Error("Reservation not found");

  const checkInDate = String((current as { check_in_date?: string | null }).check_in_date ?? "")
    .trim();

  if (normalizedStatus === "cancelled" && checkInDate) {
    const cutoffHours = cancellationCutoffHours();
    if (cutoffHours > 0 && !forceCancel) {
      const hoursLeft = hoursUntilDateStart(checkInDate, new Date());
      if (Number.isFinite(hoursLeft) && hoursLeft < cutoffHours) {
        throw new Error(
          `Cancellation blocked by policy (${cutoffHours}h before check-in). Use force cancel to proceed.`
        );
      }
    }
  }

  const note = (adminNote || "").trim();
  const nowIso = new Date().toISOString();
  const payload: Record<string, unknown> = {
    status: normalizedStatus,
    admin_note: note || null,
    updated_at: nowIso,
    confirmed_at: normalizedStatus === "confirmed" ? nowIso : null,
    cancelled_at: normalizedStatus === "cancelled" ? nowIso : null,
    closed_at: normalizedStatus === "closed" ? nowIso : null,
    cancellation_reason:
      normalizedStatus === "cancelled" ? (note || "cancelled_by_admin") : null,
    hold_expires_at:
      normalizedStatus === "hold"
        ? new Date(Date.now() + 15 * 60_000).toISOString()
        : null,
  };

  for (let dropAttempt = 0; dropAttempt < 8; dropAttempt += 1) {
    const { error } = await supabase
      .from("short_stay_reservations")
      .update(payload)
      .eq("id", id);

    if (!error) break;
    const message = error.message;
    let changed = false;

    if (isMissingSpecificColumn(message, "confirmed_at") && "confirmed_at" in payload) {
      delete payload.confirmed_at;
      changed = true;
    }
    if (isMissingSpecificColumn(message, "cancelled_at") && "cancelled_at" in payload) {
      delete payload.cancelled_at;
      changed = true;
    }
    if (isMissingSpecificColumn(message, "closed_at") && "closed_at" in payload) {
      delete payload.closed_at;
      changed = true;
    }
    if (isMissingSpecificColumn(message, "cancellation_reason") && "cancellation_reason" in payload) {
      delete payload.cancellation_reason;
      changed = true;
    }
    if (isMissingSpecificColumn(message, "hold_expires_at") && "hold_expires_at" in payload) {
      delete payload.hold_expires_at;
      changed = true;
    }

    if (!changed) throw new Error(message);
  }

  try {
    const admin = supabaseAdmin();
    await admin.rpc("maintain_short_stay_reservations", { p_now: nowIso });
  } catch {
    // Maintenance routine is optional when the RPC is missing.
  }

  revalidatePath("/admin/protected/leads/reservations");
  revalidatePath("/admin/leads/reservations");
  revalidatePath("/biens");
}
