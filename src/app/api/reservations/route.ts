import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isBackofficeAccount } from "@/lib/account-type";
import {
  addIsoDaysUtc,
  deriveReservedUntilForDate,
  findFirstOverlappingRange,
} from "@/lib/reservations-logic";

type PropertySnapshot = {
  ref: string;
  title: string | null;
  location: string | null;
  price: string | null;
  location_type: string | null;
};

type ReservationBlock = {
  id: string | null;
  status: string | null;
  check_in_date: string;
  check_out_date: string;
  hold_expires_at: string | null;
};

type ReservationAvailabilityPayload = {
  is_reserved: boolean;
  reserved_until: string | null;
  next_available_check_in: string | null;
  blocked_ranges: Array<{
    check_in_date: string;
    check_out_date: string;
    status: string | null;
    hold_expires_at: string | null;
  }>;
};

function isMissingLocationTypeColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("location_type") && (m.includes("does not exist") || m.includes("column"));
}

function isMissingShortStayReservationsTable(message: string | undefined) {
  const m = String(message ?? "").toLowerCase();
  return m.includes("short_stay_reservations") && (m.includes("does not exist") || m.includes("relation"));
}

function isMissingHoldExpiresAtColumn(message: string | undefined) {
  const m = String(message ?? "").toLowerCase();
  return m.includes("hold_expires_at") && (m.includes("does not exist") || m.includes("column"));
}

function isMissingCreateReservationRpc(message: string | undefined) {
  const m = String(message ?? "").toLowerCase();
  return m.includes("create_short_stay_reservation") && (m.includes("does not exist") || m.includes("function"));
}

function isReservationOverlapRpcError(message: string | undefined) {
  const m = String(message ?? "").toLowerCase();
  return m.includes("reservation_overlap") || m.includes("exclusion");
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

function isHoldStatus(status: string | null | undefined) {
  return String(status ?? "").trim().toLowerCase() === "hold";
}

const ACTIVE_SHORT_STAY_STATUSES = ["hold", "new", "contacted", "confirmed"] as const;

function holdMinutesFromEnv() {
  const raw = Number(process.env.RESERVATION_HOLD_MINUTES ?? 15);
  if (!Number.isFinite(raw)) return 15;
  return Math.max(1, Math.min(180, Math.round(raw)));
}

function shouldAutoConfirmFromEnv() {
  const raw = String(process.env.RESERVATION_AUTO_CONFIRM ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

function isBlockStillActive(block: ReservationBlock, nowIsoTs: string) {
  if (!isHoldStatus(block.status)) return true;
  if (!block.hold_expires_at) return true;
  return block.hold_expires_at > nowIsoTs;
}

function toReservationAvailabilityPayload(
  blocks: ReservationBlock[],
  todayIso: string
): ReservationAvailabilityPayload {
  const reservedUntil = deriveReservedUntilForDate(blocks, todayIso);

  return {
    is_reserved: Boolean(reservedUntil),
    reserved_until: reservedUntil,
    next_available_check_in: reservedUntil ? addIsoDaysUtc(reservedUntil, 1) : null,
    blocked_ranges: blocks.map((x) => ({
      check_in_date: x.check_in_date,
      check_out_date: x.check_out_date,
      status: x.status,
      hold_expires_at: x.hold_expires_at,
    })),
  };
}

function findOverlapBlock(
  blocks: ReservationBlock[],
  checkInDate: string,
  checkOutDate: string
) {
  return findFirstOverlappingRange(blocks, checkInDate, checkOutDate);
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

async function cleanupExpiredHoldsForProperty(propertyRef: string, nowIsoTs: string) {
  const admin = supabaseAdmin();
  const result = await admin
    .from("short_stay_reservations")
    .update({
      status: "cancelled",
      cancellation_reason: "hold_expired_auto",
      cancelled_at: nowIsoTs,
    })
    .eq("property_ref", propertyRef)
    .eq("status", "hold")
    .not("hold_expires_at", "is", null)
    .lte("hold_expires_at", nowIsoTs);

  if (result.error && !isMissingShortStayReservationsTable(result.error.message)) {
    if (!isMissingHoldExpiresAtColumn(result.error.message)) {
      throw new Error(result.error.message);
    }
  }
}

async function loadActiveReservationBlocks(
  propertyRef: string,
  todayIso: string,
  nowIsoTs: string
) {
  const admin = supabaseAdmin();
  const rich = await admin
    .from("short_stay_reservations")
    .select("id, status, check_in_date, check_out_date, hold_expires_at")
    .eq("property_ref", propertyRef)
    .in("status", [...ACTIVE_SHORT_STAY_STATUSES])
    .gte("check_out_date", todayIso)
    .order("check_in_date", { ascending: true })
    .limit(200);

  if (!rich.error) {
    const rows = (rich.data ?? []) as ReservationBlock[];
    return rows.filter((row) => isBlockStillActive(row, nowIsoTs));
  }

  if (isMissingShortStayReservationsTable(rich.error.message)) return [] as ReservationBlock[];
  if (!isMissingHoldExpiresAtColumn(rich.error.message)) {
    throw new Error(rich.error.message);
  }

  const fallback = await admin
    .from("short_stay_reservations")
    .select("id, status, check_in_date, check_out_date")
    .eq("property_ref", propertyRef)
    .in("status", [...ACTIVE_SHORT_STAY_STATUSES.filter((x) => x !== "hold")])
    .gte("check_out_date", todayIso)
    .order("check_in_date", { ascending: true })
    .limit(200);

  if (fallback.error) {
    if (isMissingShortStayReservationsTable(fallback.error.message)) return [] as ReservationBlock[];
    throw new Error(fallback.error.message);
  }

  return ((fallback.data ?? []) as Array<{
    id: string | null;
    status: string | null;
    check_in_date: string;
    check_out_date: string;
  }>).map((x) => ({
    ...x,
    hold_expires_at: null,
  }));
}

function inferUserName(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
} | null) {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const candidate = [meta.full_name, meta.name, meta.username, meta.agency_name]
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
  const candidate = [meta.phone, meta.agency_phone, user.phone]
    .map((x) => String(x ?? "").trim())
    .find(Boolean);
  return normalizePhone(candidate ?? null);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const propertyRef = toOptionalString(url.searchParams.get("property_ref"));
  if (!propertyRef) {
    return NextResponse.json({ error: "property_ref is required" }, { status: 400 });
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const nowIsoTs = new Date().toISOString();
  try {
    await cleanupExpiredHoldsForProperty(propertyRef, nowIsoTs);
    const blocks = await loadActiveReservationBlocks(propertyRef, todayIso, nowIsoTs);
    return NextResponse.json(toReservationAvailabilityPayload(blocks, todayIso));
  } catch (error) {
    const reason = error instanceof Error ? error.message : "reservation_availability_failed";
    return NextResponse.json({ error: reason }, { status: 400 });
  }
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
  const nowIsoTs = new Date().toISOString();
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

  let blocksBefore: ReservationBlock[] = [];
  try {
    await cleanupExpiredHoldsForProperty(property.ref, nowIsoTs);
    blocksBefore = await loadActiveReservationBlocks(property.ref, todayIso, nowIsoTs);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "reservation_availability_failed";
    return NextResponse.json({ error: reason }, { status: 400 });
  }

  const overlapBefore = findOverlapBlock(blocksBefore, checkInDate, checkOutDate);
  if (overlapBefore) {
    const availability = toReservationAvailabilityPayload(blocksBefore, todayIso);
    return NextResponse.json(
      {
        error: "Ces dates chevauchent une reservation existante.",
        is_reserved: availability.is_reserved,
        reserved_until: availability.reserved_until,
        blocked_ranges: availability.blocked_ranges,
        conflicting_check_in: overlapBefore.check_in_date,
        conflicting_check_out: overlapBefore.check_out_date,
        next_available_check_in: overlapBefore.check_out_date,
      },
      { status: 400 }
    );
  }

  let created: {
    id: string;
    status: string;
    check_in_date: string;
    check_out_date: string;
    nights: number;
    hold_expires_at: string | null;
  } | null = null;

  try {
    const admin = supabaseAdmin();
    const rpc = await admin
      .rpc("create_short_stay_reservation", {
        p_source: "property_details",
        p_lang: lang,
        p_property_ref: property.ref,
        p_property_title: property.title,
        p_property_location: property.location,
        p_property_price: property.price,
        p_location_type: property.location_type,
        p_reservation_option: reservationOption,
        p_reservation_option_label: reservationOptionLabel,
        p_check_in_date: checkInDate,
        p_check_out_date: checkOutDate,
        p_customer_user_id: user?.id ?? null,
        p_customer_name: toOptionalString(body.customer_name) ?? inferUserName(user),
        p_customer_phone: normalizePhone(toOptionalString(body.customer_phone) ?? inferUserPhone(user)),
        p_customer_email: toOptionalString(body.customer_email) ?? toOptionalString(user?.email),
        p_message: message,
        p_hold_minutes: holdMinutesFromEnv(),
        p_auto_confirm: shouldAutoConfirmFromEnv(),
      })
      .single();

    if (rpc.error) {
      const message = rpc.error.message;
      if (isMissingCreateReservationRpc(message)) {
        const fallbackPayload = {
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

        const insert = await supabase
          .from("short_stay_reservations")
          .insert(fallbackPayload)
          .select("id, status, check_in_date, check_out_date, nights")
          .single();

        if (insert.error) throw new Error(insert.error.message);
        created = {
          ...(insert.data as {
            id: string;
            status: string;
            check_in_date: string;
            check_out_date: string;
            nights: number;
          }),
          hold_expires_at: null,
        };
      } else if (isReservationOverlapRpcError(message)) {
        throw new Error("reservation_overlap");
      } else {
        throw new Error(message || "reservation_insert_failed");
      }
    } else if (rpc.data) {
      created = rpc.data as {
        id: string;
        status: string;
        check_in_date: string;
        check_out_date: string;
        nights: number;
        hold_expires_at: string | null;
      };
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "reservation_insert_failed";
    if (reason === "reservation_overlap") {
      const blocks = await loadActiveReservationBlocks(property.ref, todayIso, nowIsoTs);
      const conflict = findOverlapBlock(blocks, checkInDate, checkOutDate);
      const availability = toReservationAvailabilityPayload(blocks, todayIso);
      return NextResponse.json(
        {
          error: "Ces dates chevauchent une reservation existante.",
          is_reserved: availability.is_reserved,
          reserved_until: availability.reserved_until,
          blocked_ranges: availability.blocked_ranges,
          conflicting_check_in: conflict?.check_in_date ?? null,
          conflicting_check_out: conflict?.check_out_date ?? null,
          next_available_check_in: conflict?.check_out_date ?? null,
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: reason }, { status: 400 });
  }

  if (!created) {
    return NextResponse.json({ error: "reservation_insert_failed" }, { status: 400 });
  }

  try {
    const admin = supabaseAdmin();
    await admin.rpc("maintain_short_stay_reservations", { p_now: nowIsoTs });
  } catch {
    // Optional cache refresh; keep reservation creation successful even if maintenance RPC is unavailable.
  }

  const blocksAfter = await loadActiveReservationBlocks(property.ref, todayIso, nowIsoTs);
  const availability = toReservationAvailabilityPayload(blocksAfter, todayIso);

  return NextResponse.json({
    id: created.id,
    status: created.status,
    check_in_date: created.check_in_date,
    check_out_date: created.check_out_date,
    nights: created.nights,
    hold_expires_at: created.hold_expires_at,
    ...availability,
  });
}
