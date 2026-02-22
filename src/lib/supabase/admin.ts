import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";

export function supabaseAdmin(): SupabaseClient {
  const { url } = getPublicSupabaseEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ADMIN_KEY || process.env.SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase admin credentials (SUPABASE_SERVICE_ROLE_KEY)");
  }

  return createSupabaseClient(url, key);
}
