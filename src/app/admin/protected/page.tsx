import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  ArrowRight,
  Bath,
  BedDouble,
  Building2,
  CalendarClock,
  Camera,
  CheckCircle2,
  Clock3,
  Home,
  MapPin,
  Ruler,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import DeletePropertyForm from "@/components/admin/DeletePropertyForm";
import AdminPropertiesFilters from "./AdminPropertiesFilters";

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
  location_type: string | null;
  description: string | null;
  ref: string | null;
  type: string | null;
  category: string | null;
  beds: number | null;
  baths: number | null;
  area: number | null;
  created_at: string | null;
  property_images: PropertyImage[] | null;
};

type SearchParams = Record<string, string | string[] | undefined>;
const DEFAULT_PER_PAGE = 15;

const BASE_CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "appartement", label: "Appartement" },
  { value: "villa", label: "Villa" },
  { value: "terrain", label: "Terrain" },
  { value: "local", label: "Local" },
  { value: "bureau", label: "Bureau" },
];

function imageUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "";
  return `${base}/storage/v1/object/public/property-images/${path}`;
}

function formatPrice(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? "-");
  return `${new Intl.NumberFormat("fr-DZ").format(n)} DA`;
}

function normalizeFold(input?: string | null) {
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

function locationTypeLabel(raw: string | null | undefined, fallbackType: string | null | undefined) {
  const n = normalizeFold(raw);
  if (n.includes("vente")) return "Vente";
  if (n.includes("par_nuit") || n.includes("par nuit")) return "Location / par nuit";
  if (n.includes("court_sejour") || n.includes("court sejour")) return "Location / court sejour";
  if (n.includes("douze_mois") || n.includes("douze mois") || n.includes("12 mois")) return "Location / 12 mois";
  if (n.includes("six_mois") || n.includes("six mois") || n.includes("6 mois")) return "Location / 6 mois";
  if (n.includes("par_mois") || n.includes("par mois")) return "Location / par mois";
  if (n.includes("location")) return "Location";
  const fallback = normalizeFold(fallbackType);
  return fallback.includes("vente") ? "Vente" : "Location";
}

function extractAgencyFeesFromDescription(description: string | null | undefined) {
  const lines = String(description ?? "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);

  const lineValue = (line: string) => {
    const colon = line.split(":").slice(1).join(":").trim();
    if (colon) return colon;
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

function resolveDisplayPrice(row: PropertyCardRow) {
  if (!isShortStayLocationType(row.location_type)) return row.price;
  const basePrice = parseMoneyToInt(row.price);
  const fees = extractAgencyFeesFromDescription(row.description);
  if (basePrice == null || fees == null) return row.price;
  return basePrice + fees;
}

function pickCoverPath(p: Pick<PropertyCardRow, "property_images">): string | null {
  const imgs = Array.isArray(p.property_images) ? p.property_images : [];
  if (!imgs.length) return null;

  const cover = imgs.find((img) => img?.is_cover);
  if (cover?.path) return cover.path;

  const sorted = [...imgs].sort((a, b) => (a?.sort ?? 9999) - (b?.sort ?? 9999));
  return sorted[0]?.path ?? null;
}

function isSale(row: Pick<PropertyCardRow, "type" | "location_type">) {
  const type = normalizeFold(row.type);
  const locType = normalizeFold(row.location_type);
  return type.includes("vente") || locType.includes("vente");
}

function matchesTransactionFilter(row: Pick<PropertyCardRow, "type" | "location_type">, filter: string) {
  if (!filter || filter === "all") return true;
  const locType = normalizeFold(row.location_type);

  if (filter === "sale") return isSale(row);
  if (filter === "location") return !isSale(row);
  if (filter === "par_mois") return locType.includes("par_mois") || locType.includes("par mois");
  if (filter === "six_mois") return locType.includes("six_mois") || locType.includes("six mois") || locType.includes("6 mois");
  if (filter === "douze_mois") return locType.includes("douze_mois") || locType.includes("douze mois") || locType.includes("12 mois");
  if (filter === "par_nuit") return locType.includes("par_nuit") || locType.includes("par nuit");
  if (filter === "court_sejour") return locType.includes("court_sejour") || locType.includes("court sejour");

  return true;
}

function matchesCategoryFilter(rawType: string | null | undefined, filter: string) {
  if (!filter) return true;
  const normalizedType = normalizeFold(rawType);
  const normalizedFilter = normalizeFold(filter);

  if (normalizedFilter === "appartement") {
    return (
      normalizedType.includes("appartement") ||
      normalizedType.includes("appartment") ||
      normalizedType.includes("apartment")
    );
  }

  return normalizedType.includes(normalizedFilter);
}

function categoryLabel(rawCategory: string | null | undefined) {
  const normalized = normalizeFold(rawCategory);
  const found = BASE_CATEGORY_OPTIONS.find((x) => normalizeFold(x.value) === normalized);
  if (found) return found.label;
  const txt = String(rawCategory ?? "").trim();
  return txt || "-";
}

function firstParam(input: string | string[] | undefined) {
  if (Array.isArray(input)) return input[0] ?? "";
  return input ?? "";
}

function toPositiveInt(input: string | undefined, fallback: number) {
  const n = Number(input ?? "");
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.trunc(n);
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const q = firstParam(params.q).trim();
  const transaction = firstParam(params.transaction).trim().toLowerCase();
  const category = firstParam(params.category).trim();
  const cover = firstParam(params.cover).trim().toLowerCase();
  const perPage = DEFAULT_PER_PAGE;
  const requestedPage = toPositiveInt(firstParam(params.page), 1);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

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
        <h1 className="text-2xl font-bold text-red-800">Erreur de chargement admin</h1>
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
    if (!user) redirect("/admin/login");

    await supabase.from("property_images").delete().eq("property_id", id);
    await supabase.from("properties").delete().eq("id", id);

    revalidatePath("/admin");
    revalidatePath("/admin/protected");
  }

  const rows = (properties ?? []) as PropertyCardRow[];
  const total = rows.length;
  const withCover = rows.filter((p) => !!pickCoverPath(p)).length;
  const withoutCover = total - withCover;
  const saleCount = rows.filter((row) => isSale(row)).length;
  const locationCount = total - saleCount;
  const shortStayCount = rows.filter((row) => isShortStayLocationType(row.location_type)).length;

  const numericPrices = rows
    .map((row) => parseMoneyToInt(resolveDisplayPrice(row)))
    .filter((value): value is number => Number.isFinite(value as number));
  const avgPrice =
    numericPrices.length > 0
      ? formatPrice(Math.round(numericPrices.reduce((acc, value) => acc + value, 0) / numericPrices.length))
      : "-";

  const detailsReady = rows.filter((row) => {
    const hasDescription = String(row.description ?? "").trim().length > 0;
    const hasRef = String(row.ref ?? "").trim().length > 0;
    return hasDescription && hasRef;
  }).length;
  const withCreatedDate = rows.filter((row) => !!String(row.created_at ?? "").trim()).length;
  const coverRate = total > 0 ? Math.round((withCover / total) * 100) : 0;
  const discoveredCategoryOptions = Array.from(
    new Set(rows.map((row) => String(row.category ?? "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "fr"));

  const baseCategoryMap = new Map(
    BASE_CATEGORY_OPTIONS.map((option) => [normalizeFold(option.value), option])
  );

  const extraCategoryOptions = discoveredCategoryOptions
    .filter((type) => !baseCategoryMap.has(normalizeFold(type)))
    .map((type) => ({ value: type, label: type }));

  const categoryOptions = [...BASE_CATEGORY_OPTIONS, ...extraCategoryOptions];

  const qFold = normalizeFold(q);
  const filteredRows = rows.filter((row) => {
    const hasCover = !!pickCoverPath(row);

    if (!matchesTransactionFilter(row, transaction)) return false;
    if (!matchesCategoryFilter(row.category, category)) return false;

    if (cover === "with" && !hasCover) return false;
    if (cover === "without" && hasCover) return false;

    if (!qFold) return true;
    const haystack = normalizeFold(
      [
        row.ref,
        row.title,
        row.location,
        row.category,
        row.type,
        row.location_type,
        row.description,
      ].join(" ")
    );
    return haystack.includes(qFold);
  });

  const totalFiltered = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / perPage));
  const currentPage = Math.min(requestedPage, totalPages);
  const pageStart = (currentPage - 1) * perPage;
  const paginatedRows = filteredRows.slice(pageStart, pageStart + perPage);

  const qpBase = new URLSearchParams();
  if (q) qpBase.set("q", q);
  if (transaction && transaction !== "all") qpBase.set("transaction", transaction);
  if (category) qpBase.set("category", category);
  if (cover && cover !== "all") qpBase.set("cover", cover);

  function withParams(overrides: Record<string, string | number | null>) {
    const p = new URLSearchParams(qpBase);
    Object.entries(overrides).forEach(([key, value]) => {
      if (value === null || value === "") {
        p.delete(key);
      } else {
        p.set(key, String(value));
      }
    });
    const str = p.toString();
    return `/admin/protected${str ? `?${str}` : ""}`;
  }

  return (
    <main className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/75 p-6 shadow-sm backdrop-blur md:p-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 -top-16 h-56 w-56 rounded-full bg-[rgb(var(--gold))]/18 blur-3xl" />
          <div className="absolute right-0 top-8 h-52 w-52 rounded-full bg-[rgb(var(--navy))]/10 blur-3xl" />
        </div>

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--gold))]/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
              <Sparkles size={14} />
              Admin Hub
            </div>
            <h1 className="mt-3 text-3xl font-extrabold text-[rgb(var(--navy))]">Tableau d&apos;administration</h1>
            <p className="mt-2 max-w-2xl text-sm text-black/65">
              Supervisez le portefeuille immobilier, pilotez les leads et accedez rapidement aux operations critiques.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-xs text-black/65">
              <Clock3 size={13} />
              Session: {user.email}
            </div>
          </div>

        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="Total biens" value={String(total)} icon={<Building2 size={15} />} />
          <KpiCard label="Vente" value={String(saleCount)} icon={<Home size={15} />} />
          <KpiCard label="Location" value={String(locationCount)} icon={<Home size={15} />} />
          <KpiCard label="Court sejour" value={String(shortStayCount)} icon={<CalendarClock size={15} />} />
          <KpiCard label="Avec cover" value={`${withCover} (${coverRate}%)`} icon={<Camera size={15} />} />
          <KpiCard label="Prix moyen" value={avgPrice} icon={<CheckCircle2 size={15} />} />
        </div>

        <div className="relative mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-black/70">
            <span className="font-semibold text-[rgb(var(--navy))]">{withCreatedDate}</span> biens avec date de creation renseignee.
          </div>
          <div className="rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-black/70">
            <span className="font-semibold text-[rgb(var(--navy))]">{detailsReady}</span> biens avec fiche detaillee (ref + description).
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-extrabold text-[rgb(var(--navy))]">Portefeuille biens</h2>
            <p className="text-sm text-black/60">Derniers biens crees, edition rapide et suppression.</p>
          </div>
          <div className="inline-flex items-center rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-black/65">
            Sans cover: {withoutCover}
          </div>
        </div>

        <AdminPropertiesFilters
          key={`${q}|${transaction}|${category}|${cover}`}
          initialQ={q}
          initialTransaction={transaction || "all"}
          initialCategory={category}
          initialCover={cover || "all"}
          totalCount={total}
          filteredCount={totalFiltered}
          categoryOptions={categoryOptions}
        />

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {paginatedRows.map((p) => {
            const coverPath = pickCoverPath(p);
            const coverUrl = coverPath ? imageUrl(coverPath) : null;
            const displayPrice = resolveDisplayPrice(p);
            const txLabel = locationTypeLabel(p.location_type, p.type);

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
                  <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--navy))]">
                      {p.ref ? `REF ${p.ref}` : "REF -"}
                    </span>
                    <span className="rounded-full bg-[rgb(var(--gold))]/85 px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--navy))]">
                      {txLabel}
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="line-clamp-2 text-lg font-extrabold drop-shadow">{p.title ?? "Sans titre"}</div>
                    <div className="mt-1 inline-flex items-center gap-1.5 text-sm text-white/90">
                      <MapPin size={13} />
                      <span className="line-clamp-1">{p.location ?? "-"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-lg font-extrabold text-[rgb(var(--navy))]">
                      {displayPrice != null ? formatPrice(displayPrice) : "-"}
                    </div>
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
                      {categoryLabel(p.category)}
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

          {paginatedRows.length === 0 && (
            <div className="col-span-full rounded-3xl border border-dashed border-black/20 bg-white/75 p-12 text-center">
              <h2 className="text-xl font-semibold text-[rgb(var(--navy))]">Aucun resultat</h2>
              <p className="mt-2 text-black/60">Aucun bien ne correspond aux filtres selectionnes.</p>
            </div>
          )}
        </div>

        {totalPages > 1 ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/75 p-4 text-sm">
            <div className="text-black/60">
              Page {currentPage} / {totalPages} | 15 resultats par page
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={withParams({ page: Math.max(1, currentPage - 1) })}
                className={`inline-flex h-9 items-center rounded-xl border border-black/10 px-3 ${
                  currentPage <= 1 ? "pointer-events-none opacity-50" : "hover:bg-black/5"
                }`}
              >
                Precedent
              </Link>
              <Link
                href={withParams({ page: Math.min(totalPages, currentPage + 1) })}
                className={`inline-flex h-9 items-center rounded-xl border border-black/10 px-3 ${
                  currentPage >= totalPages ? "pointer-events-none opacity-50" : "hover:bg-black/5"
                }`}
              >
                Suivant
              </Link>
              {currentPage < totalPages ? (
                <Link
                  href={withParams({ page: currentPage + 1 })}
                  className="inline-flex h-9 items-center rounded-xl bg-[rgb(var(--navy))] px-3 font-semibold text-white hover:opacity-95"
                >
                  Charger plus
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function KpiCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
      <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-black/50">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-xl font-extrabold text-[rgb(var(--navy))]">{value}</div>
    </div>
  );
}
