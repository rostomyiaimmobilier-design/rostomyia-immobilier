"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function isMissingValidationColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  const missingColumn = m.includes("column") && m.includes("does not exist");
  const touchesValidationFields =
    m.includes("validation_note") || m.includes("validated_at") || m.includes("validated_by");
  return missingColumn && touchesValidationFields;
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

function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
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

async function dispatchAgencyWhatsappNotification(input: {
  toDigits: string | null;
  message: string;
}) {
  const webhookUrl = process.env.AGENCY_WHATSAPP_WEBHOOK_URL;
  if (!webhookUrl || !input.toDigits) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: input.toDigits,
        message: input.message,
        context: "agency_visit_validated",
      }),
    });
  } catch {
    // Keep visit validation non-blocking if WhatsApp provider fails.
  }
}

async function dispatchOwnerWhatsappNotification(input: {
  toDigits: string | null;
  message: string;
}) {
  const webhookUrl =
    process.env.OWNER_WHATSAPP_WEBHOOK_URL ||
    process.env.AGENCY_WHATSAPP_WEBHOOK_URL;
  if (!webhookUrl || !input.toDigits) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: input.toDigits,
        message: input.message,
        context: "owner_visit_validated",
      }),
    });
  } catch {
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

  const ownerDigits = normalizePhoneDigits(property.owner_phone);
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
