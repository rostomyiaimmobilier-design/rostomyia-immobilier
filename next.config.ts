import type { NextConfig } from "next";
type RemotePattern = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const parsedSupabase = (() => {
  if (!supabaseUrl) return null;
  try {
    return new URL(supabaseUrl);
  } catch {
    return null;
  }
})();

const supabaseHostFromEnv = parsedSupabase?.hostname;

const supabasePatterns: RemotePattern[] = [
  // Covers default Supabase project domains.
  { protocol: "https", hostname: "**.supabase.co", pathname: "/storage/v1/object/public/**" },
  { protocol: "https", hostname: "**.supabase.co", pathname: "/storage/v1/render/image/public/**" },
];

// Covers custom Supabase domains or non-standard hostnames from env.
if (supabaseHostFromEnv) {
  supabasePatterns.push(
    { protocol: "https", hostname: supabaseHostFromEnv, pathname: "/storage/v1/object/public/**" },
    { protocol: "https", hostname: supabaseHostFromEnv, pathname: "/storage/v1/render/image/public/**" }
  );
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...supabasePatterns,
    ],
  },
};

export default nextConfig;
