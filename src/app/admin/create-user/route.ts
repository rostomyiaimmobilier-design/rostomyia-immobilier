import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const { url, configured } = getPublicSupabaseEnv();

  if (!configured || !serviceRoleKey) {
    return NextResponse.json(
      { ok: false, message: "Configuration Supabase manquante." },
      { status: 503 }
    );
  }

  const supabaseAdmin = createClient(
    url,
    serviceRoleKey, // server-only
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // optional
  });

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, user: data.user });
}
