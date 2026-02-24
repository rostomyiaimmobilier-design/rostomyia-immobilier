import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function isAuthorized(req: Request) {
  const secret =
    process.env.RESERVATION_CRON_SECRET ||
    process.env.CRON_SECRET ||
    process.env.SCHEDULER_SECRET;
  if (!secret) return true;

  const auth = req.headers.get("authorization") || "";
  if (auth === `Bearer ${secret}`) return true;

  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret");
  return querySecret === secret;
}

function isMissingMaintenanceFunction(message: string | undefined) {
  const m = String(message ?? "").toLowerCase();
  return m.includes("maintain_short_stay_reservations") && (m.includes("does not exist") || m.includes("function"));
}

async function runMaintenance() {
  const admin = supabaseAdmin();
  const nowIso = new Date().toISOString();
  const result = await admin.rpc("maintain_short_stay_reservations", { p_now: nowIso });
  if (result.error) {
    if (isMissingMaintenanceFunction(result.error.message)) {
      return { skipped: true, reason: "maintenance_function_missing" };
    }
    throw new Error(result.error.message);
  }
  return result.data ?? { ok: true };
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runMaintenance();
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "reservations_maintenance_failed";
    return NextResponse.json({ error: reason }, { status: 400 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}

