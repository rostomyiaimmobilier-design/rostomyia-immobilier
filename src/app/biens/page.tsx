import { createClient } from "@/lib/supabase/server";
import { propertyImageUrl } from "@/lib/property-image-url";
import ListingsClient from "./ListingsClient";

export const dynamic = "force-dynamic";

type PropertyRow = {
  id: string;
  ref: string;
  title: string;
  type: "Vente" | "Location";
  category?: string | null;
  price: string;
  location: string;
  beds: number;
  baths: number;
  area: number;
  created_at: string;

  // OPTIONAL (recommended): if you have this column
  // amenities?: string[] | null;

  property_images?: { path: string; sort: number }[];
};

export default async function BiensPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("properties")
    .select(
      `
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
      created_at,
      property_images (
        path,
        sort
      )
      `
      // If you have amenities column (text[]), add it here:
      // + ", amenities"
    )
    .order("created_at", { ascending: false });

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

  // ✅ Normalize: sort images by sort and convert path -> public URL
  const items = propsList.map((p) => {
    const sorted = (p.property_images ?? []).slice().sort((a, b) => {
      const sa = typeof a.sort === "number" ? a.sort : 0;
      const sb = typeof b.sort === "number" ? b.sort : 0;
      return sa - sb;
    });

    return {
      id: p.id,
      ref: p.ref,
      title: p.title,
      type: p.type,
      category: p.category ?? null,
      price: p.price,
      location: p.location,
      beds: Number(p.beds ?? 0),
      baths: Number(p.baths ?? 0),
      area: Number(p.area ?? 0),

      // ✅ add createdAt so client can sort accurately
      createdAt: p.created_at,

      images: sorted.map((img) => propertyImageUrl(img.path)),

      // OPTIONAL (recommended): pass amenities if you have them
      // amenities: Array.isArray(p.amenities) ? (p.amenities as string[]) : [],
    };
  });

  return <ListingsClient items={items} />;
}
