import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";

export async function POST() {
  const { url, configured } = getPublicSupabaseEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;

  if (!configured || !serviceKey || !email || !password) {
    return NextResponse.json(
      { ok: false, error: "Configuration Supabase/SUPERADMIN manquante." },
      { status: 503 }
    );
  }

  const supabaseAdmin = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  // Create user
  const { data: created, error: createErr } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  let userId = created?.user?.id;

  // If duplicate email, fetch existing user + reset password
  if (createErr) {
    const msg = (createErr.message || "").toLowerCase();
    const isDuplicate =
      msg.includes("users_email_partial_key") ||
      msg.includes("duplicate key") ||
      msg.includes("already registered") ||
      msg.includes("already exists");

    if (!isDuplicate) {
      return NextResponse.json(
        { ok: false, step: "createUser", error: createErr.message },
        { status: 400 }
      );
    }

    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) {
      return NextResponse.json(
        { ok: false, step: "listUsers", error: listErr.message },
        { status: 400 }
      );
    }

    const existing = list.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "User exists but not found" },
        { status: 400 }
      );
    }

    userId = existing.id;

    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (updErr) {
      return NextResponse.json(
        { ok: false, step: "resetPassword", error: updErr.message },
        { status: 400 }
      );
    }
  }

  // Mark as admin in profiles
  const { error: upsertErr } = await supabaseAdmin
    .from("profiles")
    .upsert({ id: userId!, email, is_admin: true });

  if (upsertErr) {
    return NextResponse.json(
      { ok: false, step: "upsertProfile", error: upsertErr.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, userId });
}
