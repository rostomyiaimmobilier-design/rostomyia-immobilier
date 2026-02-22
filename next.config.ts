import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "mluxpatigogyugsmqdba.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "mluxpatigogyugsmqdba.supabase.co", pathname: "/storage/v1/render/image/public/**" },
    ],
  },
};

export default nextConfig;
