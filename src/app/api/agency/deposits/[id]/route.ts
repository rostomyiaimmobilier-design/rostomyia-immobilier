import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyAdminEvent } from "@/lib/admin-notifications";

type AgencyLeadRow = {
  id: string;
  status: string | null;
  email: string | null;
  phone: string | null;
  name: string | null;
};

function normalizeText(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeDigits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function statusKind(status: string | null | undefined): "validated" | "rejected" | "processing" {
  const s = normalizeText(status);
  if (s === "validated") return "validated";
  if (s === "rejected") return "rejected";
  return "processing";
}

function toOptionalString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s || null;
}

function toOptionalNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function normalizeCommissionPercent(value: string | null | undefined): string | null {
  const raw = String(value ?? "")
    .replace(/[^\d]/g, "")
    .trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return `${n}%`;
}

function toOptionalStringArray(value: unknown): string[] | null {
  if (value == null) return null;
  if (!Array.isArray(value)) return null;
  const cleaned = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  return Array.from(new Set(cleaned));
}

function normalizeTransactionValue(value: string | null | undefined) {
  const raw = normalizeText(value);
  if (!raw) return null;
  if (raw === "vente" || raw === "sale") return "vente";
  if (raw === "par_mois" || raw === "par mois" || raw === "location" || raw === "rent") return "par_mois";
  if (raw === "six_mois" || raw === "six mois" || raw === "6 mois") return "six_mois";
  if (raw === "douze_mois" || raw === "douze mois" || raw === "12 mois") return "douze_mois";
  if (raw === "par_nuit" || raw === "par nuit" || raw === "par nuite") return "par_nuit";
  if (raw === "court_sejour" || raw === "court sejour") return "court_sejour";
  return null;
}

function isMissingAmenitiesColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("amenities") && (m.includes("does not exist") || m.includes("column"));
}

function isMissingCommissionColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("commission") && (m.includes("does not exist") || m.includes("column"));
}

function normalizeCategoryValue(value: string | null | undefined) {
  const raw = normalizeText(value);
  if (!raw) return null;
  if (raw.includes("appartement")) return "appartement";
  if (raw.includes("villa")) return "villa";
  if (raw.includes("terrain")) return "terrain";
  if (raw.includes("local")) return "local";
  if (raw.includes("bureau")) return "bureau";
  return null;
}

function toPhotoLinksText(value: unknown) {
  if (Array.isArray(value)) {
    const lines = value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
    return lines.length ? lines.join("\n") : null;
  }
  return toOptionalString(value);
}

function isAgencyOwner(
  lead: AgencyLeadRow,
  user: { email?: string | null; phone?: string | null },
  userMeta: { agency_name?: string; company_name?: string; agency_phone?: string; phone?: string }
) {
  const agencyNameNorm = normalizeText(userMeta.agency_name || userMeta.company_name || null);
  const agencyEmailNorm = normalizeText(user.email);
  const agencyPhoneNorm = normalizeDigits(userMeta.agency_phone || userMeta.phone || user.phone || null);
  const leadEmail = normalizeText(lead.email);
  const leadPhone = normalizeDigits(lead.phone);
  const leadName = normalizeText(lead.name);

  if (agencyEmailNorm && leadEmail && agencyEmailNorm === leadEmail) return true;
  if (agencyPhoneNorm && leadPhone && agencyPhoneNorm === leadPhone) return true;
  if (agencyNameNorm && leadName && agencyNameNorm === leadName) return true;
  return false;
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing lead id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userMeta = (user.user_metadata ?? {}) as {
    account_type?: string;
    agency_name?: string;
    company_name?: string;
    agency_status?: string;
    agency_phone?: string;
    phone?: string;
  };

  if (String(userMeta.account_type ?? "").toLowerCase() !== "agency") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (String(userMeta.agency_status ?? "pending").toLowerCase() !== "active") {
    return NextResponse.json({ error: "Agency inactive" }, { status: 403 });
  }

  const currentResult = await supabase
    .from("owner_leads")
    .select("id,status,email,phone,name")
    .eq("id", id)
    .maybeSingle();
  if (currentResult.error) {
    return NextResponse.json({ error: currentResult.error.message }, { status: 400 });
  }
  const lead = currentResult.data as AgencyLeadRow | null;
  if (!lead) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isAgencyOwner(lead, user, userMeta)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (statusKind(lead.status) !== "processing") {
    return NextResponse.json({ error: "Editing is allowed only while processing." }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const transaction = normalizeTransactionValue(toOptionalString((body as Record<string, unknown>).transaction_type));
  const commissionInput = toOptionalString((body as Record<string, unknown>).commission);
  const commission = normalizeCommissionPercent(commissionInput);
  if (commissionInput && !commission) {
    return NextResponse.json(
      { error: "Frais d'agence invalide. Entrez un pourcentage entier entre 1% et 5%." },
      { status: 400 }
    );
  }
  const payload = {
    title: toOptionalString((body as Record<string, unknown>).title),
    property_type: normalizeCategoryValue(toOptionalString((body as Record<string, unknown>).property_type)),
    transaction_type: transaction,
    location_type: transaction,
    commune: toOptionalString((body as Record<string, unknown>).commune),
    district: toOptionalString((body as Record<string, unknown>).district),
    address: toOptionalString((body as Record<string, unknown>).address),
    city: toOptionalString((body as Record<string, unknown>).city) ?? "Oran",
    price: toOptionalNumber((body as Record<string, unknown>).price),
    surface: toOptionalNumber((body as Record<string, unknown>).surface),
    rooms: toOptionalNumber((body as Record<string, unknown>).rooms),
    baths: toOptionalNumber((body as Record<string, unknown>).baths),
    payment_terms: toOptionalString((body as Record<string, unknown>).payment_terms),
    commission,
    amenities: toOptionalStringArray((body as Record<string, unknown>).amenities),
    message: toOptionalString((body as Record<string, unknown>).message),
    photo_links: toPhotoLinksText((body as Record<string, unknown>).photo_links),
  };

  const updatePayload: Record<string, unknown> = { ...payload };
  let updateError: { message?: string } | null = null;

  for (let i = 0; i < 4; i += 1) {
    const attempt = await supabase
      .from("owner_leads")
      .update(updatePayload)
      .eq("id", id);
    updateError = attempt.error;
    if (!updateError) break;

    let changed = false;
    if (isMissingAmenitiesColumn(updateError.message) && "amenities" in updatePayload) {
      delete updatePayload.amenities;
      changed = true;
    }
    if (isMissingCommissionColumn(updateError.message) && "commission" in updatePayload) {
      delete updatePayload.commission;
      changed = true;
    }
    if (!changed) break;
  }

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  try {
    await notifyAdminEvent({
      eventType: "agency_deposit_updated",
      title: "Depot agence mis a jour",
      body: `Lead: ${id}`,
      href: "/admin/protected/leads/depot-tiers",
      iconKey: "building-2",
      entityTable: "owner_leads",
      entityId: id,
      metadata: {
        owner_lead_id: id,
        source: "agency_deposit_edit",
      },
      dedupeSeconds: 8,
    });
  } catch (notificationError) {
    const reason =
      notificationError instanceof Error ? notificationError.message : "unknown_notification_error";
    console.error("[api/agency/deposits/:id] admin notification failed:", reason);
  }

  return NextResponse.json({ ok: true, id });
}
