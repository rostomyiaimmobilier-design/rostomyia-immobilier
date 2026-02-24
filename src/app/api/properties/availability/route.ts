import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type AvailabilityRow = {
  property_ref: string;
  is_reserved_now: boolean;
  reserved_until: string | null;
  next_available_check_in: string | null;
};

function isMissingAvailabilityCacheTable(message: string | undefined) {
  const m = String(message ?? "").toLowerCase();
  return (
    m.includes("property_reservation_availability_cache") &&
    (m.includes("does not exist") || m.includes("relation"))
  );
}

function isMissingHoldExpiresAtColumn(message: string | undefined) {
  const m = String(message ?? "").toLowerCase();
  return m.includes("hold_expires_at") && m.includes("does not exist");
}

function parseRefs(raw: string | null) {
  return Array.from(
    new Set(
      String(raw ?? "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
    )
  ).slice(0, 120);
}

function addIsoDaysUtc(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return isoDate;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const refs = parseRefs(url.searchParams.get("refs"));
  if (!refs.length) {
    return NextResponse.json({ items: [] });
  }

  const admin = supabaseAdmin();
  const baseRows: AvailabilityRow[] = refs.map((propertyRef) => ({
    property_ref: propertyRef,
    is_reserved_now: false,
    reserved_until: null,
    next_available_check_in: null,
  }));
  const byRef = new Map(baseRows.map((x) => [x.property_ref, x]));

  const fromCache = await admin
    .from("property_reservation_availability_cache")
    .select("property_ref, is_reserved_now, reserved_until, next_available_check_in")
    .in("property_ref", refs);

  if (!fromCache.error) {
    ((fromCache.data ?? []) as AvailabilityRow[]).forEach((row) => {
      byRef.set(row.property_ref, {
        property_ref: row.property_ref,
        is_reserved_now: Boolean(row.is_reserved_now),
        reserved_until: row.reserved_until,
        next_available_check_in: row.next_available_check_in,
      });
    });
    return NextResponse.json({ items: Array.from(byRef.values()) });
  }

  if (!isMissingAvailabilityCacheTable(fromCache.error.message)) {
    return NextResponse.json({ error: fromCache.error.message }, { status: 400 });
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();
  const rich = await admin
    .from("short_stay_reservations")
    .select("property_ref, status, check_in_date, check_out_date, hold_expires_at")
    .in("property_ref", refs)
    .in("status", ["hold", "new", "contacted", "confirmed"])
    .lte("check_in_date", todayIso)
    .gte("check_out_date", todayIso);

  let rows: Array<{
    property_ref: string;
    status: string | null;
    check_in_date: string;
    check_out_date: string;
    hold_expires_at?: string | null;
  }> = [];

  if (!rich.error) {
    rows = (rich.data ?? []) as typeof rows;
  } else if (isMissingHoldExpiresAtColumn(rich.error.message)) {
    const fallback = await admin
      .from("short_stay_reservations")
      .select("property_ref, status, check_in_date, check_out_date")
      .in("property_ref", refs)
      .in("status", ["new", "contacted", "confirmed"])
      .lte("check_in_date", todayIso)
      .gte("check_out_date", todayIso);

    if (fallback.error) {
      return NextResponse.json({ error: fallback.error.message }, { status: 400 });
    }
    rows = ((fallback.data ?? []) as Array<{
      property_ref: string;
      status: string | null;
      check_in_date: string;
      check_out_date: string;
    }>).map((x) => ({ ...x, hold_expires_at: null }));
  } else {
    return NextResponse.json({ error: rich.error.message }, { status: 400 });
  }

  rows
    .filter((x) => {
      const status = String(x.status ?? "").trim().toLowerCase();
      if (status !== "hold") return true;
      if (!x.hold_expires_at) return true;
      return x.hold_expires_at > nowIso;
    })
    .forEach((row) => {
      const current = byRef.get(row.property_ref);
      if (!current) return;
      const nextReservedUntil =
        !current.reserved_until || row.check_out_date > current.reserved_until
          ? row.check_out_date
          : current.reserved_until;
      byRef.set(row.property_ref, {
        property_ref: row.property_ref,
        is_reserved_now: true,
        reserved_until: nextReservedUntil,
        next_available_check_in: addIsoDaysUtc(nextReservedUntil, 1),
      });
    });

  return NextResponse.json({ items: Array.from(byRef.values()) });
}

