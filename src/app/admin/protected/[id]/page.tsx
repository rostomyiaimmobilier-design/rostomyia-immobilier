import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditPropertyForm from "@/components/admin/EditPropertyForm";

export const dynamic = "force-dynamic";

function isMissingLocationTypeColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("location_type") && (m.includes("does not exist") || m.includes("column"));
}

export default async function AdminEditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const selectWithoutLocationType = `
    id,
    ref,
    title,
    type,
    category,
    apartment_type,
    price,
    location,
    beds,
    baths,
    area,
    description
  `;

  const selectWithLocationType = `
    id,
    ref,
    title,
    type,
    location_type,
    category,
    apartment_type,
    price,
    location,
    beds,
    baths,
    area,
    description
  `;

  const queryWithLocationType = async () =>
    supabase
      .from("properties")
      .select(selectWithLocationType)
      .eq("id", id)
      .single();

  const queryWithoutLocationType = async () =>
    supabase
      .from("properties")
      .select(selectWithoutLocationType)
      .eq("id", id)
      .single();

  let { data: property, error } = await queryWithLocationType();

  if (error && isMissingLocationTypeColumn(error.message)) {
    const fallback = await queryWithoutLocationType();
    property = fallback.data;
    error = fallback.error;
  }

  if (error || !property) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
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
            location: property.location ?? null,
            beds: property.beds != null ? Number(property.beds) : null,
            baths: property.baths != null ? Number(property.baths) : null,
            area: property.area != null ? Number(property.area) : null,
            description: property.description ?? null,
          }}
        />
      </div>
    </main>
  );
}
