import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import PropertyDetailClient from "@/components/PropertyDetailClient";

type Lang = "fr" | "ar";

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
    back: "الرجوع الى العقارات",
    contact: "التواصل مع Rostomyia",
    call: "اتصال",
    wa: "واتساب",
    book: "حجز زيارة",
    ref: "المرجع",
    desc: "الوصف",
    descText: "وصف العقار.",
    details: "التفاصيل",
    locationLabel: "الموقع",
    otherOptions: "عقارات اخرى",
    priceLabel: "السعر",
    commissionLabel: "العمولة",
    paymentLabel: "الدفع",
    undefinedLabel: "غير محدد",
    cityCountry: "وهران، الجزائر",
    bedsLabel: "غرف",
    bathsLabel: "حمامات",
  },
} as const;

export const dynamic = "force-dynamic";

function imageUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-images/${path}`;
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

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: ref } = await params;

  const supabase = await createClient();

  const queryPropertyWithLocationType = async () =>
    supabase
      .from("properties")
      .select("id, ref, title, type, location_type, price, location, beds, baths, area, description")
      .eq("ref", ref)
      .single();

  const queryPropertyWithoutLocationType = async () =>
    supabase
      .from("properties")
      .select("id, ref, title, type, price, location, beds, baths, area, description")
      .eq("ref", ref)
      .single();

  let { data: property, error } = await queryPropertyWithLocationType();

  if (error && isMissingLocationTypeColumn(error.message)) {
    const fallback = await queryPropertyWithoutLocationType();
    property = fallback.data as typeof property;
    error = fallback.error;
  }

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

  let { data: relatedRows, error: relatedError } = await queryRelatedWithLocationType();

  if (relatedError && isMissingLocationTypeColumn(relatedError.message)) {
    const fallback = await queryRelatedWithoutLocationType();
    relatedRows = fallback.data;
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
        price: x.price,
        location: x.location ?? "",
        paymentTerms: extractPaymentTerms(x.description) ?? null,
        locationType: x.location_type ?? null,
        imageUrl: firstPath ? imageUrl(firstPath) : null,
      };
    })
    .slice(0, 8);

  const cookieStore = await cookies();
  const cookieLang = cookieStore.get("rostomyia_lang")?.value;
  const lang: Lang = cookieLang === "ar" ? "ar" : "fr";
  const dir: "ltr" | "rtl" = lang === "ar" ? "rtl" : "ltr";
  const t = dict[lang];

  const phone = process.env.NEXT_PUBLIC_PHONE ?? "+213559712981";
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP ?? "+213559712981";
  const waDigits = whatsapp.replace(/\D/g, "");

  const waMsg =
    lang === "ar"
      ? `السلام عليكم، انا مهتم(ة) بالعقار ${property.ref} (${property.title}).`
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
