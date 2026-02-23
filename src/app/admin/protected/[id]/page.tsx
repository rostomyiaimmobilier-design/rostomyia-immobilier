import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditPropertyForm from "@/components/admin/EditPropertyForm";

export const dynamic = "force-dynamic";

function isMissingLocationTypeColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("location_type") && (m.includes("does not exist") || m.includes("column"));
}

function isMissingAmenitiesColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("amenities") && (m.includes("does not exist") || m.includes("column"));
}

function isMissingOwnerPhoneColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("owner_phone") && (m.includes("does not exist") || m.includes("column"));
}

type PropertyRow = {
  id: string;
  ref: string;
  title: string | null;
  type: string | null;
  location_type?: string | null;
  category: string | null;
  apartment_type: string | null;
  price: string | null;
  owner_phone?: string | null;
  location: string | null;
  beds: number | null;
  baths: number | null;
  area: number | null;
  description: string | null;
  amenities?: string[] | null;
};

export default async function AdminEditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const requiredFields = [
    "id",
    "ref",
    "title",
    "type",
    "category",
    "apartment_type",
    "price",
    "location",
    "beds",
    "baths",
    "area",
    "description",
  ];
  const optionalFields = new Set(["location_type", "amenities", "owner_phone"]);

  let property: PropertyRow | null = null;
  let error: { message?: string } | null = null;
  for (let i = 0; i < 6; i += 1) {
    const selectFields = [...requiredFields, ...Array.from(optionalFields)].join(",");
    const attempt = await supabase
      .from("properties")
      .select(selectFields)
      .eq("id", id)
      .single();
    property = (attempt.data as PropertyRow | null) ?? null;
    error = attempt.error;

    if (!error) break;

    let changed = false;
    if (isMissingLocationTypeColumn(error.message) && optionalFields.has("location_type")) {
      optionalFields.delete("location_type");
      changed = true;
    }
    if (isMissingAmenitiesColumn(error.message) && optionalFields.has("amenities")) {
      optionalFields.delete("amenities");
      changed = true;
    }
    if (isMissingOwnerPhoneColumn(error.message) && optionalFields.has("owner_phone")) {
      optionalFields.delete("owner_phone");
      changed = true;
    }
    if (!changed) break;
  }

  if (error || !property) {
    notFound();
  }

  const { data: propertyImages } = await supabase
    .from("property_images")
    .select("id, path, sort, is_cover")
    .eq("property_id", id)
    .order("sort", { ascending: true });

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-1">
        <div>
          <Link href="/admin/protected" className="text-sm text-slate-600 hover:text-slate-900">
            &larr; Retour a la liste
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Modifier le bien</h1>
        <p className="text-sm text-slate-600">Ref: {property.ref}</p>
      </div>

      <div className="mt-6">
        <EditPropertyForm
          property={{
            id: property.id,
            ref: property.ref,
            title: property.title ?? "",
            type: property.type ?? null,
            locationType: ("location_type" in property ? property.location_type : null) ?? null,
            category: property.category ?? null,
            apartmentType: property.apartment_type ?? null,
            price: property.price ?? null,
            ownerPhone: ("owner_phone" in property ? property.owner_phone : null) ?? null,
            location: property.location ?? null,
            beds: property.beds != null ? Number(property.beds) : null,
            baths: property.baths != null ? Number(property.baths) : null,
            area: property.area != null ? Number(property.area) : null,
            description: property.description ?? null,
            amenities:
              "amenities" in property && Array.isArray(property.amenities)
                ? property.amenities
                    .map((x) => (typeof x === "string" ? x.trim() : ""))
                    .filter(Boolean)
                : [],
            images: (propertyImages ?? []).map((img) => ({
              id: String((img as { id: string }).id),
              path: String((img as { path: string }).path),
              sort: Number((img as { sort: number | null }).sort ?? 0),
              is_cover: Boolean((img as { is_cover: boolean | null }).is_cover),
            })),
          }}
        />
      </div>
    </main>
  );
}
