import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import PropertyDetailClient from "@/components/PropertyDetailClient";
import { propertyImageUrl } from "@/lib/property-image-url";

import { LANG_COOKIE_KEY, LEGACY_LANG_COOKIE_KEY, langToDir, normalizeLang, type Lang } from "@/lib/i18n";

type DescriptionSection = {
  title?: string;
  paragraphs: string[];
  bullets: string[];
};

type RelatedImageRow = {
  path: string | null;
  sort: number | null;
};

type RelatedPropertyRow = {
  ref: string | null;
  title: string | null;
  type: string | null;
  location_type?: string | null;
  price: string | number | null;
  location: string | null;
  description: string | null;
  property_images?: RelatedImageRow[] | null;
};

const dict = {
  fr: {
    back: "Retour aux biens",
    contact: "Contacter Rostomyia",
    call: "Appeler",
    wa: "WhatsApp",
    book: "Programmer une visite",
    ref: "Reference",
    desc: "Description",
    descText: "Description du bien.",
    keyFeaturesTitle: "Caractéristiques principales",
    keyFeatureSurface: "Surface",
    keyFeatureParking: "Parking sous-sol",
    keyFeatureResidence: "Residence",
    keyFeatureSeaView: "Vue sur mer",
    keyFeatureYes: "Oui",
    keyFeatureNotSpecified: "Non precise",
    viewMore: "Voir plus",
    viewLess: "Voir moins",
    details: "Details",
    locationLabel: "Emplacement",
    otherOptions: "Autres biens",
    priceLabel: "Prix",
    commissionLabel: "Commission",
    paymentLabel: "Paiement",
    undefinedLabel: "A preciser",
    cityCountry: "Oran, Algerie",
    bedsLabel: "lits",
    bathsLabel: "bains",
  },
  ar: {
    back: "العودة إلى العقارات",
    contact: "تواصل مع Rostomyia",
    call: "اتصال",
    wa: "واتساب",
    book: "حجز زيارة",
    ref: "المرجع",
    desc: "الوصف",
    descText: "وصف العقار.",
    keyFeaturesTitle: "الخصائص الرئيسية",
    keyFeatureSurface: "المساحة",
    keyFeatureParking: "موقف سيارات تحت الأرض",
    keyFeatureResidence: "إقامة",
    keyFeatureSeaView: "إطلالة على البحر",
    keyFeatureYes: "نعم",
    keyFeatureNotSpecified: "غير محدد",
    viewMore: "عرض المزيد",
    viewLess: "عرض أقل",
    details: "التفاصيل",
    locationLabel: "الموقع",
    otherOptions: "عقارات أخرى",
    priceLabel: "السعر",
    commissionLabel: "العمولة",
    paymentLabel: "الدفع",
    undefinedLabel: "غير محدد",
    cityCountry: "وهران، الجزائر",
    bedsLabel: "غرف نوم",
    bathsLabel: "حمامات",
  },
} as const;

export const dynamic = "force-dynamic";

function imageUrl(path: string) {
  return propertyImageUrl(path, { width: 1600, quality: 78, format: "webp" });
}

function parseDescription(raw?: string | null): DescriptionSection[] {
  const text = raw?.trim();
  if (!text) return [];

  const sections: DescriptionSection[] = [];
  let current: DescriptionSection = { paragraphs: [], bullets: [] };

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (line.endsWith(":")) {
      if (current.title || current.paragraphs.length || current.bullets.length) {
        sections.push(current);
      }
      current = { title: line.slice(0, -1), paragraphs: [], bullets: [] };
      continue;
    }

    if (line.startsWith("*")) {
      current.bullets.push(line.replace(/^\*\s*/, ""));
      continue;
    }

    current.paragraphs.push(line);
  }

  if (current.title || current.paragraphs.length || current.bullets.length) {
    sections.push(current);
  }

  return sections;
}

function normalizeText(input?: string | null) {
  return (input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parseMoneyToInt(raw: string | number | null | undefined) {
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
  const n = normalizeText(raw);
  return (
    n.includes("par_nuit") ||
    n.includes("par nuit") ||
    n.includes("nuit") ||
    n.includes("court_sejour") ||
    n.includes("court sejour") ||
    n.includes("sejour")
  );
}

function extractAgencyFeesFromDescription(raw?: string | null): number | null {
  const text = (raw || "").trim();
  if (!text) return null;

  const lines = text
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  for (const line of lines) {
    const n = normalizeText(line);
    if (n.startsWith("frais d'agence") || n.startsWith("frais d agence")) {
      const value = extractLineValue(line);
      return parseMoneyToInt(value);
    }
  }

  return null;
}

function resolveDisplayPriceForShortStay({
  price,
  locationType,
  description,
}: {
  price: string | number | null | undefined;
  locationType: string | null | undefined;
  description?: string | null;
}) {
  if (!isShortStayLocationType(locationType)) return price;
  const base = parseMoneyToInt(price);
  const fees = extractAgencyFeesFromDescription(description);
  if (base == null || fees == null) return price;
  return formatDzd(base + fees);
}

function isPaymentLine(line: string) {
  const n = normalizeText(line);
  return (
    n.startsWith("paiement") ||
    n.startsWith("paiment") ||
    n.startsWith("payment") ||
    n.startsWith("modalites de paiement") ||
    n.startsWith("modalites paiement") ||
    n.startsWith("mode de paiement")
  );
}

function extractLineValue(line: string) {
  const byColon = line.split(":").slice(1).join(":").trim();
  if (byColon) return byColon;
  return line.split("-").slice(1).join("-").trim();
}

function extractPaymentTerms(raw?: string | null): string | null {
  const text = (raw || "").trim();
  if (!text) return null;

  const lines = text
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (isPaymentLine(line)) {
      const value = extractLineValue(line);
      if (value) return value;
    }
  }

  return null;
}

function isMissingLocationTypeColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("location_type") && (m.includes("does not exist") || m.includes("column"));
}

type PropertyRow = {
  id: string;
  ref: string;
  title: string;
  type: string;
  category: string | null;
  location_type?: string | null;
  price: string;
  location: string;
  beds: number | null;
  baths: number | null;
  area: number | null;
  description: string | null;
};

async function fetchPropertyByRef(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ref: string
): Promise<{ property: PropertyRow | null; error: { message?: string } | null }> {
  const queryPropertyWithLocationType = async () =>
    supabase
      .from("properties")
      .select("id, ref, title, type, category, location_type, price, location, beds, baths, area, description")
      .eq("ref", ref)
      .single();

  const queryPropertyWithoutLocationType = async () =>
    supabase
      .from("properties")
      .select("id, ref, title, type, category, price, location, beds, baths, area, description")
      .eq("ref", ref)
      .single();

  let { data: property, error } = await queryPropertyWithLocationType();

  if (error && isMissingLocationTypeColumn(error.message)) {
    const fallback = await queryPropertyWithoutLocationType();
    property = fallback.data as typeof property;
    error = fallback.error;
  }

  return { property: (property as PropertyRow | null) ?? null, error };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: ref } = await params;
  const supabase = await createClient();
  const { property } = await fetchPropertyByRef(supabase, ref);

  if (!property) {
    return {
      title: "Bien introuvable | Rostomyia Immobilier",
      robots: { index: false, follow: false },
    };
  }

  const { data: coverRows } = await supabase
    .from("property_images")
    .select("path, sort")
    .eq("property_id", property.id)
    .order("sort", { ascending: true })
    .limit(1);

  const coverPath = coverRows?.[0]?.path ?? null;
  const ogImage = coverPath
    ? propertyImageUrl(coverPath, {
        width: 1200,
        height: 630,
        resize: "cover",
        quality: 80,
        format: "webp",
      })
    : undefined;

  const pagePath = `/biens/${encodeURIComponent(property.ref ?? ref)}`;
  const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "");
  const canonical = siteUrl ? `${siteUrl}${pagePath}` : pagePath;
  const title = `${property.title} | Rostomyia Immobilier`;
  const metaDisplayPrice = resolveDisplayPriceForShortStay({
    price: property.price,
    locationType: property.location_type ?? null,
    description: property.description,
  });
  const description = `${property.type} - ${property.location} - ${metaDisplayPrice}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: property.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: ref } = await params;

  const supabase = await createClient();
  const { property, error } = await fetchPropertyByRef(supabase, ref);

  if (error || !property) return notFound();

  const { data: imgs } = await supabase
    .from("property_images")
    .select("path, sort")
    .eq("property_id", property.id)
    .order("sort", { ascending: true });

  const images = (imgs ?? [])
    .map((x) => (x.path ? imageUrl(x.path) : null))
    .filter(Boolean) as string[];

  const queryRelatedWithLocationType = async () =>
    supabase
      .from("properties")
      .select(
        `
        ref,
        title,
        type,
        location_type,
        price,
        location,
        description,
        property_images (
          path,
          sort
        )
      `
      )
      .neq("id", property.id)
      .order("created_at", { ascending: false })
      .limit(10);

  const queryRelatedWithoutLocationType = async () =>
    supabase
      .from("properties")
      .select(
        `
        ref,
        title,
        type,
        price,
        location,
        description,
        property_images (
          path,
          sort
        )
      `
      )
      .neq("id", property.id)
      .order("created_at", { ascending: false })
      .limit(10);

  const relatedWithLocationType = await queryRelatedWithLocationType();
  let relatedRows = (relatedWithLocationType.data as RelatedPropertyRow[] | null) ?? null;
  let relatedError = relatedWithLocationType.error;

  if (relatedError && isMissingLocationTypeColumn(relatedError.message)) {
    const fallback = await queryRelatedWithoutLocationType();
    relatedRows = (fallback.data as RelatedPropertyRow[] | null) ?? null;
    relatedError = fallback.error;
  }

  const relatedProperties = ((relatedRows ?? []) as RelatedPropertyRow[])
    .filter((x) => !!x.ref)
    .map((x) => {
      const sortedImages = (x.property_images ?? []).slice().sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
      const firstPath = sortedImages[0]?.path;
      return {
        ref: String(x.ref),
        title: x.title ?? x.ref ?? "",
        type: x.type ?? "",
        price:
          resolveDisplayPriceForShortStay({
            price: x.price,
            locationType: x.location_type ?? null,
            description: x.description,
          }) ?? null,
        location: x.location ?? "",
        paymentTerms: extractPaymentTerms(x.description) ?? null,
        locationType: x.location_type ?? null,
        imageUrl: firstPath ? imageUrl(firstPath) : null,
      };
    })
    .slice(0, 8);

  const cookieStore = await cookies();
  const cookieLang =
    cookieStore.get(LANG_COOKIE_KEY)?.value ?? cookieStore.get(LEGACY_LANG_COOKIE_KEY)?.value;
  const lang: Lang = normalizeLang(cookieLang);
  const dir: "ltr" | "rtl" = langToDir(lang);
  const t = dict[lang];

  const phone = process.env.NEXT_PUBLIC_PHONE ?? "+213559712981";
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP ?? "+213559712981";
  const waDigits = whatsapp.replace(/\D/g, "");

  const waMsg =
    lang === "ar"
      ? `مرحبا، أنا مهتم(ة) بالعقار ${property.ref} (${property.title}).`
      : `Bonjour, je suis interesse(e) par le bien ${property.ref} (${property.title}).`;

  const waLink = `https://wa.me/${waDigits}?text=${encodeURIComponent(waMsg)}`;
  const sections = parseDescription(property.description);

  return (
    <PropertyDetailClient
      dir={dir}
      t={t}
      property={{
        ref: property.ref,
        title: property.title,
        type: property.type,
        category: property.category ?? null,
        locationType: (property as { location_type?: string | null }).location_type ?? null,
        price: property.price,
        location: property.location,
        beds: Number(property.beds ?? 0),
        baths: Number(property.baths ?? 0),
        area: Number(property.area ?? 0),
        description: property.description,
      }}
      images={images}
      waLink={waLink}
      phone={phone}
      sections={sections}
      relatedProperties={relatedProperties}
    />
  );
}

