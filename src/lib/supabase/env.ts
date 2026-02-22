const FALLBACK_SUPABASE_URL = "http://127.0.0.1:54321";
const FALLBACK_SUPABASE_ANON_KEY = "public-anon-key";

let didWarnMissingPublicSupabaseEnv = false;

export function getPublicSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const configured = Boolean(url && anonKey);

  if (!configured && !didWarnMissingPublicSupabaseEnv) {
    didWarnMissingPublicSupabaseEnv = true;
    console.error(
      "[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Using safe fallback values."
    );
  }

  return {
    url: url || FALLBACK_SUPABASE_URL,
    anonKey: anonKey || FALLBACK_SUPABASE_ANON_KEY,
    configured,
  };
}
