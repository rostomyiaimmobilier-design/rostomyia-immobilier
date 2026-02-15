import { createClient } from "@/lib/supabase/server";
import { propertyImageUrl } from "@/lib/property-image-url";
import ListingsClient from "./ListingsClient";

export const dynamic = "force-dynamic";

type PropertyRow = {
  id: string;
  ref: string;
  title: string;
  type: "Vente" | "Location";
  price: string;
  location: string;
  beds: number;
  baths: number;
  area: number;
  created_at: string;
  property_images?: { path: string; sort: number }[];
};

export default async function BiensPage() {
  const supabase = await createClient();

  // ✅ One query: properties + related images
  const { data, error } = await supabase
    .from("properties")
    .select(
      `
      id,
      ref,
      title,
      type,
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
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="mx-auto max-w-6xl p-10">
        <h1 className="text-2xl font-bold text-slate-900">Erreur</h1>
        <pre className="mt-4 rounded-xl bg-slate-900 p-4 text-white overflow-auto">
          {error.message}
        </pre>
      </main>
    );
  }

  const propsList = (data ?? []) as PropertyRow[];

  // DEBUG: log a small sample of properties and whether they include property_images
  try {
    console.log("[biens.page] properties sample:", JSON.stringify(propsList.slice(0, 5).map(p => ({ id: p.id, ref: p.ref, imagesCount: (p.property_images ?? []).length })), null, 2));
  } catch (e) {
    console.log("[biens.page] logging failed", e);
  }

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
      price: p.price,
      location: p.location,
      beds: Number(p.beds ?? 0),
      baths: Number(p.baths ?? 0),
      area: Number(p.area ?? 0),
      images: sorted.map((img) => propertyImageUrl(img.path)),
    };
  });

  return <ListingsClient items={items} />;
}
