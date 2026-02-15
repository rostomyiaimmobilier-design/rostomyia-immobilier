import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import DeletePropertyForm from "@/components/admin/DeletePropertyForm";

export const dynamic = "force-dynamic";

type PropertyImage = {
  path: string | null;
  sort: number | null;
  is_cover: boolean | null;
};

type PropertyCardRow = {
  id: string;
  title: string | null;
  location: string | null;
  price: string | number | null;
  ref: string | null;
  type: string | null;
  beds: number | null;
  baths: number | null;
  area: number | null;
  property_images: PropertyImage[] | null;
};

function imageUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-images/${path}`;
}

function formatPrice(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return value ?? "";
  return `${new Intl.NumberFormat("fr-DZ").format(n)} DA`;
}

function pickCoverPath(p: Pick<PropertyCardRow, "property_images">): string | null {
  const imgs = Array.isArray(p.property_images) ? p.property_images : [];
  if (!imgs.length) return null;

  const cover = imgs.find((img) => img?.is_cover);
  if (cover?.path) return cover.path;

  const sorted = [...imgs].sort((a, b) => (a?.sort ?? 9999) - (b?.sort ?? 9999));
  return sorted[0]?.path ?? null;
}

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: properties, error } = await supabase
    .from("properties")
    .select(
      `
      *,
      property_images (
        path,
        sort,
        is_cover
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="mx-auto max-w-5xl p-10">
        <h1 className="text-3xl font-bold">Admin</h1>
        <pre className="mt-6 overflow-auto rounded-xl bg-slate-900 p-4 text-white">
          {error.message}
        </pre>
      </main>
    );
  }

  async function deleteProperty(formData: FormData) {
    "use server";

    const id = String(formData.get("id") ?? "");
    if (!id) return;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    await supabase.from("property_images").delete().eq("property_id", id);
    await supabase.from("properties").delete().eq("id", id);

    revalidatePath("/admin");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900">Tableau d&apos;administration</h1>
              <p className="mt-2 text-slate-600">Connecte: {user.email}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/protected/leads/owners"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 active:scale-[0.98]"
              >
                Leads proprietaires
              </Link>
              <Link
                href="/admin/new"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95 active:scale-[0.98]"
              >
                + Nouveau bien
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {((properties ?? []) as PropertyCardRow[]).map((p) => {
            const coverPath = pickCoverPath(p);
            const coverUrl = coverPath ? imageUrl(coverPath) : null;

            return (
              <div
                key={p.id}
                className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                  {coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverUrl}
                      alt={p.title ?? "Bien"}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-slate-200 via-slate-100 to-white" />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="line-clamp-2 text-lg font-extrabold drop-shadow">
                      {p.title ?? "Sans titre"}
                    </div>
                    <div className="mt-1 line-clamp-1 text-sm opacity-90">{p.location ?? ""}</div>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-base font-bold text-slate-900">
                      {p.price != null ? formatPrice(p.price) : "-"}
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={`/admin/protected/${p.id}`}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
                      >
                        Modifier
                      </Link>
                      <DeletePropertyForm propertyId={p.id} action={deleteProperty} />
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-slate-600">
                    {p.ref ? `REF ${p.ref} · ` : ""}
                    {p.type ? `${p.type} · ` : ""}
                    {p.beds != null ? `${p.beds} ch · ` : ""}
                    {p.baths != null ? `${p.baths} sdb · ` : ""}
                    {p.area != null ? `${p.area} m2` : ""}
                  </div>
                </div>
              </div>
            );
          })}

          {(properties ?? []).length === 0 && (
            <div className="col-span-full rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <h2 className="text-xl font-semibold text-slate-900">Aucun bien disponible</h2>
              <p className="mt-2 text-slate-600">Ajoutez votre premier bien pour commencer.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
