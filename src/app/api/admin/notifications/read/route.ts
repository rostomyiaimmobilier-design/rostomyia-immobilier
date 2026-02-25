import { NextResponse } from "next/server";
import { hasAdminWriteAccess } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
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

  let payload: unknown = null;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const id = Number((payload as { id?: unknown } | null)?.id ?? 0);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid notification id" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { error } = await admin
    .from("admin_notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message || "Failed to mark notification as read" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
