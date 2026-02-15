#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const [,, email, password] = process.argv;

if (!email || !password) {
  console.error("Usage: node scripts/create-admin.mjs <email> <password>");
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_ADMIN_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase service role credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

try {
  const { data, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createErr) {
    console.error("Error creating user:", createErr.message || createErr);
    process.exit(1);
  }

  const user = data?.user;
  if (!user) {
    console.error("No user returned from Supabase admin createUser.");
    process.exit(1);
  }

  // Upsert profile and mark as admin
  const { error: upsertErr } = await supabase
    .from("profiles")
    .upsert({ id: user.id, email: user.email, is_admin: true }, { returning: "minimal" });

  if (upsertErr) {
    console.error("Error upserting profile:", upsertErr.message || upsertErr);
    process.exit(1);
  }

  console.log("Admin user created:", user.id, user.email);
  process.exit(0);
} catch (err) {
  console.error("Unexpected error:", err);
  process.exit(1);
}
