// src/app/page.tsx
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { propertyImageUrl } from "@/lib/property-image-url";
import { DEFAULT_ORAN_QUARTIERS, ORAN_COMMUNES } from "@/lib/oran-locations";
import { LANG_COOKIE_KEY, LEGACY_LANG_COOKIE_KEY, langToDir, normalizeLang, type Lang } from "@/lib/i18n";

import HomeHero from "@/components/home/Hero";
import CoreValue from "@/components/home/CoreValue";
import FeaturedListings from "@/components/home/Featured";
import ValuePillars from "@/components/home/ValuePillars";
import HomeCTA from "@/components/home/HomeCTA";
import VerifiedUltraLuxury from "@/components/home/VerifiedUltraLuxury";

async function getLang(): Promise<Lang> {
  const cookieStore = await cookies();
  return normalizeLang(
    cookieStore.get(LANG_COOKIE_KEY)?.value ?? cookieStore.get(LEGACY_LANG_COOKIE_KEY)?.value
  );
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

type HomeCommuneRow = {
  name: string | null;
  is_active: boolean | null;
  wilaya_code: string | null;
};

type HomeQuartierRow = {
  name: string | null;
  commune: string | null;
  sort_order: number | null;
  is_active: boolean | null;
};

type HomeQuartierItem = {
  name: string;
  commune: string | null;
};

function normalizeName(value: string | null | undefined) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeFold(value: string | null | undefined) {
  return normalizeName(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isMissingTableError(message: string | undefined, tableName: string) {
  const m = String(message ?? "").toLowerCase();
  return m.includes(tableName.toLowerCase()) && (m.includes("does not exist") || m.includes("relation"));
}

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
    .limit(9);

  if (error) {
    console.error("[home.page] failed to load featured properties:", error.message);
  }

  const communesResult = await supabase
    .from("app_communes")
    .select("name, is_active, wilaya_code")
    .eq("is_active", true)
    .eq("wilaya_code", "31")
    .order("name", { ascending: true });

  if (communesResult.error && !isMissingTableError(communesResult.error.message, "app_communes")) {
    console.error("[home.page] failed to load app_communes:", communesResult.error.message);
  }

  const quartiersResult = await supabase
    .from("app_quartiers")
    .select("name, commune, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (quartiersResult.error && !isMissingTableError(quartiersResult.error.message, "app_quartiers")) {
    console.error("[home.page] failed to load app_quartiers:", quartiersResult.error.message);
  }

  const communeRows = communesResult.error
    ? []
    : ((communesResult.data ?? []) as HomeCommuneRow[]);
  const quartierRows = quartiersResult.error
    ? []
    : ((quartiersResult.data ?? []) as HomeQuartierRow[]);

  const communeMap = new Map<string, string>();
  communeRows.forEach((row) => {
    if (row.is_active === false) return;
    const value = normalizeName(row.name);
    const key = normalizeFold(value);
    if (!key || communeMap.has(key)) return;
    communeMap.set(key, value);
  });
  quartierRows.forEach((row) => {
    if (row.is_active === false) return;
    const commune = normalizeName(row.commune);
    const key = normalizeFold(commune);
    if (!key || communeMap.has(key)) return;
    communeMap.set(key, commune);
  });
  const communes = (communeMap.size ? Array.from(communeMap.values()) : [...ORAN_COMMUNES]).sort((a, b) =>
    a.localeCompare(b, "fr", { sensitivity: "base" })
  );

  const rawQuartiers = quartierRows
    .filter((row) => row.is_active !== false)
    .map((row) => ({
      name: normalizeName(row.name),
      commune: normalizeName(row.commune) || null,
      sort: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : 0,
    }))
    .filter((row) => row.name.length > 0)
    .sort((a, b) => {
      if (a.sort !== b.sort) return a.sort - b.sort;
      const communeCompare = String(a.commune ?? "").localeCompare(String(b.commune ?? ""), "fr", {
        sensitivity: "base",
      });
      if (communeCompare !== 0) return communeCompare;
      return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
    });

  const quartiersMap = new Map<string, HomeQuartierItem>();
  rawQuartiers.forEach((row) => {
    const key = `${normalizeFold(row.commune)}|${normalizeFold(row.name)}`;
    if (!key || quartiersMap.has(key)) return;
    quartiersMap.set(key, { name: row.name, commune: row.commune });
  });
  const quartiers = quartiersMap.size
    ? Array.from(quartiersMap.values())
    : DEFAULT_ORAN_QUARTIERS.map((name) => ({ name, commune: null as string | null }));

  const safeProps: HomeProperty[] = ((properties ?? []) as HomePropertyRow[]).map((p) => {
    const sortedImages = (p.property_images ?? []).slice().sort((a, b) => {
      const sa = typeof a.sort === "number" ? a.sort : 0;
      const sb = typeof b.sort === "number" ? b.sort : 0;
      return sa - sb;
    });

    const firstPath = sortedImages[0]?.path;
    const cover = firstPath
      ? propertyImageUrl(firstPath, { width: 1200, quality: 76, format: "webp" })
      : null;

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
    <main dir={langToDir(lang)} className="overflow-x-hidden">
      <HomeHero lang={lang} communes={communes} quartiers={quartiers} />
      <VerifiedUltraLuxury lang={lang} />
      <CoreValue lang={lang} />
      <FeaturedListings lang={lang} items={safeProps} />
      <ValuePillars lang={lang} />
      <HomeCTA lang={lang} />
    </main>
  );
}
