import { createClient } from "@/lib/supabase/server";
import { propertyImageUrl } from "@/lib/property-image-url";
import { ORAN_COMMUNES } from "@/lib/oran-locations";
import ListingsClient from "./ListingsClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Biens a Oran | Rostomyia Immobilier",
  description: "Parcourez nos biens immobiliers a Oran: vente, location et court sejour.",
};

type PropertyRow = {
  id: string;
  ref: string;
  title: string;
  type: "Vente" | "Location";
  location_type?: string | null;
  category?: string | null;
  price: string;
  location: string;
  beds: number;
  baths: number;
  area: number;
  description?: string | null;
  created_at: string;

  // OPTIONAL (recommended): if you have this column
  // amenities?: string[] | null;

  property_images?: { path: string; sort: number }[];
};

type AppCommuneRow = {
  name: string | null;
  is_active: boolean | null;
  wilaya_code: string | null;
};

type AppQuartierRow = {
  name: string | null;
  commune: string | null;
  sort_order: number | null;
  is_active: boolean | null;
};

type ReservationAvailabilityCacheRow = {
  property_ref: string | null;
  is_reserved_now: boolean | null;
  reserved_until: string | null;
  next_available_check_in: string | null;
};

function isMissingLocationTypeColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("location_type") && (m.includes("does not exist") || m.includes("column"));
}

function isMissingTableError(message: string | undefined, tableName: string) {
  const m = String(message ?? "").toLowerCase();
  return m.includes(tableName.toLowerCase()) && (m.includes("does not exist") || m.includes("relation"));
}

function normalizeName(value: string | null | undefined) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeFold(input?: string | null) {
  return (input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parseMoneyToInt(raw: unknown) {
  const txt = String(raw ?? "").trim();
  if (!txt) return null;
  const digits = txt.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

function formatDzd(value: number) {
  return `${new Intl.NumberFormat("fr-DZ").format(value)} DA`;
}

function isShortStayLocationType(raw: string | null | undefined) {
  const n = normalizeFold(raw);
  return (
    n.includes("par_nuit") ||
    n.includes("par nuit") ||
    n.includes("nuit") ||
    n.includes("court_sejour") ||
    n.includes("court sejour") ||
    n.includes("sejour")
  );
}

function extractAgencyFeesFromDescription(description: string | null | undefined) {
  const lines = String(description ?? "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);

  const lineValue = (line: string) => {
    const byColon = line.split(":").slice(1).join(":").trim();
    if (byColon) return byColon;
    return line.split("-").slice(1).join("-").trim();
  };

  for (const line of lines) {
    const n = normalizeFold(line);
    if (n.startsWith("frais d'agence") || n.startsWith("frais d agence")) {
      return parseMoneyToInt(lineValue(line));
    }
  }

  return null;
}

function resolveListingPriceDisplay(row: Pick<PropertyRow, "price" | "location_type" | "description">) {
  if (!isShortStayLocationType(row.location_type)) return row.price;
  const basePrice = parseMoneyToInt(row.price);
  const fees = extractAgencyFeesFromDescription(row.description ?? null);
  if (basePrice == null || fees == null) return row.price;
  return formatDzd(basePrice + fees);
}

export default async function BiensPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const selectWithoutLocationType = `
      id,
      ref,
      title,
      type,
      category,
      price,
      location,
      beds,
      baths,
      area,
      description,
      created_at,
      property_images (
        path,
        sort
      )
    `;

  const selectWithLocationType = `
      id,
      ref,
      title,
      type,
      location_type,
      category,
      price,
      location,
      beds,
      baths,
      area,
      description,
      created_at,
      property_images (
        path,
        sort
      )
    `;

  const queryWithLocationType = async () =>
    supabase
      .from("properties")
      .select(selectWithLocationType)
      .order("created_at", { ascending: false });

  const queryWithoutLocationType = async () =>
    supabase
      .from("properties")
      .select(selectWithoutLocationType)
      .order("created_at", { ascending: false });

  const withLocationType = await queryWithLocationType();
  let data = (withLocationType.data as PropertyRow[] | null) ?? null;
  let error = withLocationType.error;

  if (error && isMissingLocationTypeColumn(error.message)) {
    const fallback = await queryWithoutLocationType();
    data = (fallback.data as PropertyRow[] | null) ?? null;
    error = fallback.error;
  }

  if (error) {
    return (
      <main className="mx-auto max-w-6xl p-10">
        <h1 className="text-2xl font-bold text-slate-900">Erreur</h1>
        <pre className="mt-4 overflow-auto rounded-xl bg-slate-900 p-4 text-white">
          {error.message}
        </pre>
      </main>
    );
  }

  const propsList = (data ?? []) as PropertyRow[];
  const refs = Array.from(new Set(propsList.map((x) => String(x.ref ?? "").trim()).filter(Boolean)));
  const availabilityByRef = new Map<
    string,
    { isReservedNow: boolean; reservedUntil: string | null; nextAvailableCheckIn: string | null }
  >();

  if (refs.length > 0) {
    const availabilityResult = await supabase
      .from("property_reservation_availability_cache")
      .select("property_ref, is_reserved_now, reserved_until, next_available_check_in")
      .in("property_ref", refs);

    if (!availabilityResult.error) {
      ((availabilityResult.data ?? []) as ReservationAvailabilityCacheRow[]).forEach((row) => {
        const ref = normalizeName(row.property_ref);
        if (!ref) return;
        availabilityByRef.set(ref, {
          isReservedNow: Boolean(row.is_reserved_now),
          reservedUntil: normalizeName(row.reserved_until) || null,
          nextAvailableCheckIn: normalizeName(row.next_available_check_in) || null,
        });
      });
    } else if (
      !isMissingTableError(availabilityResult.error?.message, "property_reservation_availability_cache")
    ) {
      return (
        <main className="mx-auto max-w-6xl p-10">
          <h1 className="text-2xl font-bold text-slate-900">Erreur</h1>
          <pre className="mt-4 overflow-auto rounded-xl bg-slate-900 p-4 text-white">
            {availabilityResult.error.message}
          </pre>
        </main>
      );
    }
  }

  const communesResult = await supabase
    .from("app_communes")
    .select("name, is_active, wilaya_code")
    .eq("is_active", true)
    .eq("wilaya_code", "31")
    .order("name", { ascending: true });

  const quartiersResult = await supabase
    .from("app_quartiers")
    .select("name, commune, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const canUseDbCommunes = !communesResult.error || isMissingTableError(communesResult.error?.message, "app_communes");
  const canUseDbQuartiers =
    !quartiersResult.error || isMissingTableError(quartiersResult.error?.message, "app_quartiers");

  const communeRows =
    canUseDbCommunes && !communesResult.error
      ? ((communesResult.data ?? []) as AppCommuneRow[])
      : [];
  const quartierRows =
    canUseDbQuartiers && !quartiersResult.error
      ? ((quartiersResult.data ?? []) as AppQuartierRow[])
      : [];

  const quartiersFromDb = quartierRows
    .filter((row) => row.is_active !== false)
    .map((row) => ({
      name: normalizeName(row.name),
      commune: normalizeName(row.commune) || null,
      sort: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : 0,
    }))
    .filter((row) => row.name.length > 0)
    .sort((a, b) => {
      if (a.sort !== b.sort) return a.sort - b.sort;
      const byCommune = String(a.commune ?? "").localeCompare(String(b.commune ?? ""), "fr", {
        sensitivity: "base",
      });
      if (byCommune !== 0) return byCommune;
      return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
    });

  const dbCommuneCandidates = [
    ...communeRows
      .filter((row) => row.is_active !== false)
      .map((row) => normalizeName(row.name))
      .filter(Boolean),
    ...quartiersFromDb.map((row) => row.commune).filter((value): value is string => Boolean(value)),
  ];

  const communeMap = new Map<string, string>();
  dbCommuneCandidates.forEach((commune) => {
    const key = commune
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    if (!key || communeMap.has(key)) return;
    communeMap.set(key, commune);
  });

  const communesFromDb = Array.from(communeMap.values()).sort((a, b) =>
    a.localeCompare(b, "fr", { sensitivity: "base" })
  );

  const communes = communesFromDb.length > 0 ? communesFromDb : [...ORAN_COMMUNES];
  const quartiers = quartiersFromDb.map((row) => ({
    name: row.name,
    commune: row.commune,
  }));

  // ✅ Normalize: sort images by sort and convert path -> public URL
  const items = propsList.map((p) => {
    const sorted = (p.property_images ?? []).slice().sort((a, b) => {
      const sa = typeof a.sort === "number" ? a.sort : 0;
      const sb = typeof b.sort === "number" ? b.sort : 0;
      return sa - sb;
    });

    const reservationAvailability = availabilityByRef.get(p.ref) ?? null;
    return {
      id: p.id,
      ref: p.ref,
      title: p.title,
      type: p.type,
      locationType: p.location_type ?? null,
      category: p.category ?? null,
      description: p.description ?? null,
      price: resolveListingPriceDisplay(p),
      location: p.location,
      beds: Number(p.beds ?? 0),
      baths: Number(p.baths ?? 0),
      area: Number(p.area ?? 0),

      // ✅ add createdAt so client can sort accurately
      createdAt: p.created_at,
      isReservedNow: reservationAvailability?.isReservedNow ?? false,
      reservedUntil: reservationAvailability?.reservedUntil ?? null,
      nextAvailableCheckIn: reservationAvailability?.nextAvailableCheckIn ?? null,

      images: sorted.map((img) => propertyImageUrl(img.path, { width: 1200, quality: 76, format: "webp" })),

      // OPTIONAL (recommended): pass amenities if you have them
      // amenities: Array.isArray(p.amenities) ? (p.amenities as string[]) : [],
    };
  });

  const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "");
  const listingsUrl = siteUrl ? `${siteUrl}/biens` : "/biens";
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: siteUrl || "/" },
      { "@type": "ListItem", position: 2, name: "Biens", item: listingsUrl },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.slice(0, 20).map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: siteUrl ? `${siteUrl}/biens/${encodeURIComponent(item.ref)}` : `/biens/${encodeURIComponent(item.ref)}`,
      item: {
        "@type": "RealEstateListing",
        name: item.title,
        description: item.category ?? item.type,
        image: item.images?.[0] ?? undefined,
        offers: {
          "@type": "Offer",
          price: Number(String(item.price).replace(/[^\d]/g, "")) || undefined,
          priceCurrency: "DZD",
          availability: item.isReservedNow
            ? "https://schema.org/OutOfStock"
            : "https://schema.org/InStock",
        },
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <ListingsClient
        items={items}
        communes={communes}
        quartiers={quartiers}
        currentUserId={user?.id ?? null}
      />
    </>
  );
}
