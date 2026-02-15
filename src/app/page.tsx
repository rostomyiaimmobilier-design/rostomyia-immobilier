// src/app/page.tsx
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { propertyImageUrl } from "@/lib/property-image-url";

import HomeHero from "../components/home/Hero";
import CoreValue from "../components/home/CoreValue";
import FeaturedListings from "../components/home/Featured";
import ValuePillars from "../components/home/ValuePillars";
import HomeCTA from "../components/home/HomeCTA";
import VerifiedUltraLuxury from "../components/home/VerifiedUltraLuxury";

type Lang = "fr" | "ar";

async function getLang(): Promise<Lang> {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value;
  return lang === "ar" ? "ar" : "fr";
}

type HomeProperty = {
  id: string;
  ref: string;
  title: string;
  price?: number | string | null;
  type?: string | null;
  location?: string | null;
  coverUrl?: string | null;
};

type HomeImageRow = {
  path: string | null;
  sort: number | null;
};

type HomePropertyRow = {
  id: string;
  ref: string;
  title: string | null;
  price: number | string | null;
  type: string | null;
  location: string | null;
  property_images?: HomeImageRow[] | null;
};

export default async function HomePage() {
  const lang = await getLang();
  const supabase = await createClient();

  const { data: properties, error } = await supabase
    .from("properties")
    .select(
      `
      id, ref, title, price, type, location,
      created_at,
      property_images ( path, sort )
    `
    )
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    console.error("[home.page] failed to load featured properties:", error.message);
  }

  const safeProps: HomeProperty[] = ((properties ?? []) as HomePropertyRow[]).map((p) => {
    const sortedImages = (p.property_images ?? []).slice().sort((a, b) => {
      const sa = typeof a.sort === "number" ? a.sort : 0;
      const sb = typeof b.sort === "number" ? b.sort : 0;
      return sa - sb;
    });

    const firstPath = sortedImages[0]?.path;
    const cover = firstPath ? propertyImageUrl(firstPath) : null;

    return {
      id: p.id,
      ref: p.ref,
      title: p.title ?? p.ref ?? "",
      price: p.price,
      type: p.type,
      location: p.location,
      coverUrl: cover,
    };
  });

  return (
    <main dir={lang === "ar" ? "rtl" : "ltr"}>
      <HomeHero lang={lang} />
      <VerifiedUltraLuxury />
      <CoreValue lang={lang} />
      <FeaturedListings lang={lang} items={safeProps} />
      <ValuePillars lang={lang} />
      <HomeCTA lang={lang} />
    </main>
  );
}
