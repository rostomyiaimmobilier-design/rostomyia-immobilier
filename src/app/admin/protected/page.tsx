import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  ArrowRight,
  Bath,
  BedDouble,
  Building2,
  Camera,
  FileCheck2,
  Home,
  Plus,
  Ruler,
} from "lucide-react";
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
      <main className="rounded-3xl border border-red-200 bg-red-50 p-6">
        <h1 className="text-2xl font-bold text-red-800">Admin loading error</h1>
        <pre className="mt-4 overflow-auto rounded-xl bg-red-950 p-4 text-sm text-red-100">{error.message}</pre>
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
    revalidatePath("/admin/protected");
  }

  const rows = (properties ?? []) as PropertyCardRow[];
  const total = rows.length;
  const withCover = rows.filter((p) => !!pickCoverPath(p)).length;
  const withoutCover = total - withCover;

  return (
    <main>
      <section className="rounded-3xl border border-black/10 bg-white/75 p-6 shadow-sm backdrop-blur md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--gold))]/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
              <Building2 size={14} />
              Admin Hub
            </div>
            <h1 className="mt-3 text-3xl font-extrabold text-[rgb(var(--navy))]">Tableau d'administration</h1>
            <p className="mt-2 text-sm text-black/60">Gerer le portefeuille biens, leads proprietaires et demandes de visite.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/protected/leads/owners"
              className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-[rgb(var(--navy))] shadow-sm hover:bg-black/5"
            >
              <FileCheck2 size={15} />
              Leads proprietaires
            </Link>
            <Link
              href="/admin/new"
              className="inline-flex items-center gap-2 rounded-2xl bg-[rgb(var(--navy))] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
            >
              <Plus size={15} />
              Nouveau bien
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-black/50">Total biens</div>
            <div className="mt-2 text-2xl font-extrabold text-[rgb(var(--navy))]">{total}</div>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-black/50">Avec visuel cover</div>
            <div className="mt-2 text-2xl font-extrabold text-[rgb(var(--navy))]">{withCover}</div>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-black/50">Sans visuel cover</div>
            <div className="mt-2 text-2xl font-extrabold text-[rgb(var(--navy))]">{withoutCover}</div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((p) => {
          const coverPath = pickCoverPath(p);
          const coverUrl = coverPath ? imageUrl(coverPath) : null;

          return (
            <article
              key={p.id}
              className="group overflow-hidden rounded-3xl border border-black/10 bg-white/82 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="relative h-52 overflow-hidden bg-slate-100">
                {coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverUrl}
                    alt={p.title ?? "Bien"}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 via-slate-100 to-white text-slate-500">
                    <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium">
                      <Camera size={14} />
                      Aucun cover
                    </div>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
                  <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--navy))]">
                    {p.ref ? `REF ${p.ref}` : "REF -"}
                  </span>
                  <span className="rounded-full bg-[rgb(var(--gold))]/85 px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--navy))]">
                    {p.type || "Bien"}
                  </span>
                </div>
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <div className="line-clamp-2 text-lg font-extrabold drop-shadow">{p.title ?? "Sans titre"}</div>
                  <div className="mt-1 line-clamp-1 text-sm text-white/90">{p.location ?? "-"}</div>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-lg font-extrabold text-[rgb(var(--navy))]">{p.price != null ? formatPrice(p.price) : "-"}</div>
                  {p.ref ? (
                    <Link
                      href={`/biens/${p.ref}`}
                      className="inline-flex items-center gap-1 rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
                    >
                      Voir public
                      <ArrowRight size={13} />
                    </Link>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-black/70">
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2.5 py-1 ring-1 ring-black/10">
                    <BedDouble size={13} />
                    {p.beds ?? "-"} ch
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2.5 py-1 ring-1 ring-black/10">
                    <Bath size={13} />
                    {p.baths ?? "-"} sdb
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2.5 py-1 ring-1 ring-black/10">
                    <Ruler size={13} />
                    {p.area ?? "-"} m2
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2.5 py-1 ring-1 ring-black/10">
                    <Home size={13} />
                    {p.type || "-"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/protected/${p.id}`}
                    className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
                  >
                    Modifier
                  </Link>
                  <DeletePropertyForm propertyId={p.id} action={deleteProperty} />
                </div>
              </div>
            </article>
          );
        })}

        {rows.length === 0 && (
          <div className="col-span-full rounded-3xl border border-dashed border-black/20 bg-white/75 p-12 text-center">
            <h2 className="text-xl font-semibold text-[rgb(var(--navy))]">Aucun bien disponible</h2>
            <p className="mt-2 text-black/60">Ajoutez votre premier bien pour commencer.</p>
          </div>
        )}
      </section>
    </main>
  );
}
