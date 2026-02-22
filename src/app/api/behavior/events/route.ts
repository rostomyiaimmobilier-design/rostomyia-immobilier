import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_EVENT_TYPES = new Set(["view", "favorite", "contact", "search_click"]);

function isMissingTableError(message: string | undefined, table: string) {
  const m = String(message ?? "").toLowerCase();
  return m.includes(table.toLowerCase()) && (m.includes("does not exist") || m.includes("relation"));
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 200 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  const payload = (body ?? {}) as {
    eventType?: string;
    propertyRef?: string;
    payload?: Record<string, unknown>;
  };

  const eventType = String(payload.eventType ?? "").trim();
  if (!ALLOWED_EVENT_TYPES.has(eventType)) {
    return NextResponse.json({ ok: false, reason: "invalid_event_type" }, { status: 400 });
  }

  const propertyRef = String(payload.propertyRef ?? "").trim();
  const safePayload =
    payload.payload && typeof payload.payload === "object" && !Array.isArray(payload.payload)
      ? payload.payload
      : {};

  const { error } = await supabase.from("user_behavior_events").insert({
    user_id: user.id,
    event_type: eventType,
    property_ref: propertyRef || null,
    payload: safePayload,
  });

  if (error) {
    if (isMissingTableError(error.message, "user_behavior_events")) {
      return NextResponse.json({ ok: false, reason: "table_missing" }, { status: 200 });
    }
    return NextResponse.json({ ok: false, reason: error.message ?? "insert_failed" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
