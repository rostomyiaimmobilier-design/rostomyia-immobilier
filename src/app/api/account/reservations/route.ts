import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ReservationHistoryRow = {
  id: string;
  status: string | null;
  property_ref: string | null;
  property_title: string | null;
  property_location: string | null;
  property_price: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  nights: number | null;
  reservation_option_label: string | null;
  created_at: string | null;
};

const BASE_SELECT_COLUMNS = [
  "id",
  "status",
  "property_ref",
  "property_title",
  "property_location",
  "property_price",
  "check_in_date",
  "check_out_date",
  "nights",
  "reservation_option_label",
  "created_at",
] as const;

function isMissingReservationsTable(message: string | undefined) {
  const m = String(message ?? "").toLowerCase();
  return m.includes("short_stay_reservations") && (m.includes("does not exist") || m.includes("relation"));
}

function extractMissingColumn(message: string | undefined) {
  const m = String(message ?? "");
  const match = m.match(/column\s+["']?([a-zA-Z0-9_]+)["']?\s+does not exist/i);
  if (match?.[1]) return match[1].toLowerCase();
  return null;
}

function toReservationRows(data: unknown): ReservationHistoryRow[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const id = String(row.id ?? "").trim();
      if (!id) return null;
      return {
        id,
        status: typeof row.status === "string" ? row.status : null,
        property_ref: typeof row.property_ref === "string" ? row.property_ref : null,
        property_title: typeof row.property_title === "string" ? row.property_title : null,
        property_location: typeof row.property_location === "string" ? row.property_location : null,
        property_price: typeof row.property_price === "string" ? row.property_price : null,
        check_in_date: typeof row.check_in_date === "string" ? row.check_in_date : null,
        check_out_date: typeof row.check_out_date === "string" ? row.check_out_date : null,
        nights: typeof row.nights === "number" ? row.nights : null,
        reservation_option_label:
          typeof row.reservation_option_label === "string" ? row.reservation_option_label : null,
        created_at: typeof row.created_at === "string" ? row.created_at : null,
      } satisfies ReservationHistoryRow;
    })
    .filter((x): x is ReservationHistoryRow => Boolean(x));
}

async function loadByUserId(userId: string) {
  const admin = supabaseAdmin();
  const columns = [...BASE_SELECT_COLUMNS];
  for (let attempts = 0; attempts < 6; attempts += 1) {
    const { data, error } = await admin
      .from("short_stay_reservations")
      .select(columns.join(", "))
      .eq("customer_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (!error) return toReservationRows(data);
    if (isMissingReservationsTable(error.message)) return [];

    const missing = extractMissingColumn(error.message);
    if (!missing) throw new Error(error.message);

    const idx = columns.findIndex((x) => x === missing);
    if (idx < 0) throw new Error(error.message);
    columns.splice(idx, 1);
  }
  return [];
}

async function loadByEmail(email: string) {
  const admin = supabaseAdmin();
  const columns = [...BASE_SELECT_COLUMNS];
  for (let attempts = 0; attempts < 6; attempts += 1) {
    const { data, error } = await admin
      .from("short_stay_reservations")
      .select(columns.join(", "))
      .eq("customer_email", email)
      .is("customer_user_id", null)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error) return toReservationRows(data);
    if (isMissingReservationsTable(error.message)) return [];

    const missing = extractMissingColumn(error.message);
    if (!missing) throw new Error(error.message);

    const idx = columns.findIndex((x) => x === missing);
    if (idx >= 0) {
      columns.splice(idx, 1);
      continue;
    }

    if (missing === "customer_email" || missing === "customer_user_id") return [];
    throw new Error(error.message);
  }
  return [];
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 401 });
  }
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const byUserId = await loadByUserId(user.id);
    const email = String(user.email ?? "").trim();
    const byEmail = email ? await loadByEmail(email) : [];

    const merged = [...byUserId, ...byEmail];
    const deduped = merged.filter((item, idx, all) => all.findIndex((x) => x.id === item.id) === idx);
    deduped.sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));

    return NextResponse.json({ reservations: deduped.slice(0, 200) });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "reservation_history_failed";
    return NextResponse.json({ error: reason }, { status: 400 });
  }
}
