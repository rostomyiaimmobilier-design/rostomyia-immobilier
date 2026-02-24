import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Clock3,
  Eye,
  Hourglass,
  Trash2,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PropertyImageSlider from "@/components/PropertyImageSlider";
import ConfirmSubmitButton from "@/components/ui/confirm-submit-button";
import { deleteOwnerLead, updateOwnerLeadStatus, validateOwnerLeadAndPublish } from "../actions";

type DepotLeadRow = {
  id: string;
  created_at: string;
  lang: string | null;
  status: string | null;
  validation_note: string | null;
  validated_at: string | null;
  intent: string | null;
  property_type: string | null;
  transaction_type: string | null;
  location_type: string | null;
  title: string | null;
  city: string | null;
  commune: string | null;
  district: string | null;
  address: string | null;
  price: number | null;
  surface: number | null;
  rooms: number | null;
  baths: number | null;
  payment_terms: string | null;
  name: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  amenities: string[] | null;
  photo_links: string | null;
  message: string | null;
};

const AMENITY_OPTIONS = [
  { key: "residence_fermee", label: "Residence fermee" },
  { key: "parking_sous_sol", label: "Parking sous-sol" },
  { key: "garage", label: "Garage" },
  { key: "box", label: "Box" },
  { key: "luxe", label: "Luxe" },
  { key: "haut_standing", label: "Haut standing" },
  { key: "domotique", label: "Domotique" },
  { key: "double_ascenseur", label: "Double ascenseur" },
  { key: "concierge", label: "Concierge" },
  { key: "camera_surveillance", label: "Camera de surveillance" },
  { key: "groupe_electrogene", label: "Groupe electrogene" },
  { key: "chauffage_central", label: "Chauffage central" },
  { key: "climatisation", label: "Climatisation" },
  { key: "cheminee", label: "Cheminee" },
  { key: "dressing", label: "Dressing" },
  { key: "porte_blindee", label: "Porte blindee" },
  { key: "cuisine_equipee", label: "Cuisine equipee" },
  { key: "sdb_italienne", label: "Salle de bain italienne" },
  { key: "deux_balcons", label: "Deux balcons" },
  { key: "terrasse", label: "Terrasse" },
  { key: "jardin", label: "Jardin" },
  { key: "piscine", label: "Piscine" },
  { key: "salle_sport", label: "Salle de sport" },
  { key: "interphone", label: "Interphone" },
  { key: "fibre", label: "Wifi fibre optique" },
  { key: "lumineux", label: "Appartement tres lumineux" },
  { key: "securite_h24", label: "Agent de securite H24" },
  { key: "vue_ville", label: "Vue ville" },
  { key: "vue_mer", label: "Vue mer" },
] as const;

type AmenityKey = (typeof AMENITY_OPTIONS)[number]["key"];

function isMissingColumnError(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("column") && m.includes("does not exist");
}

function statusBadgeClass(status: string | null) {
  switch (status) {
    case "validated":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "rejected":
      return "border-red-200 bg-red-50 text-red-700";
    case "contacted":
    case "scheduled":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "in_review":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "new":
      return "border-[rgb(var(--navy))]/20 bg-[rgb(var(--navy))]/10 text-[rgb(var(--navy))]";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function formatPrice(value: number | null | undefined) {
  if (typeof value !== "number") return "-";
  return `${value.toLocaleString("fr-FR")} DZD`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("fr-FR");
}

function fmt(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "-";
  const s = String(value).trim();
  return s || "-";
}

function textMetrics(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  if (!text) return { lineCount: 0, wordCount: 0, charCount: 0 };
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
  const words = text.split(/\s+/).filter(Boolean).length;
  return { lineCount: lines, wordCount: words, charCount: text.length };
}

function buildDescriptionPreview(value: string | null | undefined, maxChars = 520) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).trimEnd()}...`;
}

function parsePhotoLinks(raw: string | null | undefined) {
  if (!raw) return [];
  return raw
    .split(/[\n,\s]+/g)
    .map((x) => x.trim())
    .filter((x) => /^https?:\/\//i.test(x));
}

function sanitizeDescription(value: string | null | undefined) {
  const lines = String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd());

  const cleaned = lines
    .map((line) =>
      line
        .replace(/https?:\/\/\S+/gi, "")
        .replace(/\s{2,}/g, " ")
        .trimEnd()
    )
    .filter((line) => {
      const normalized = line
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/^\*\s*/, "")
        .trim();
      if (!line.trim()) return false;
      if (normalized.startsWith("photos:") || normalized.startsWith("photos :")) return false;
      if (normalized.startsWith("liens photos/videos") || normalized.startsWith("liens photos videos")) return false;
      if (normalized.startsWith("liens photos") || normalized.startsWith("liens videos")) return false;
      return true;
    });

  return cleaned.join("\n");
}

function collectLeadPhotos(photoLinks: string | null | undefined, message: string | null | undefined) {
  return Array.from(new Set([...parsePhotoLinks(photoLinks), ...parsePhotoLinks(message)]));
}

function compactText(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  return text || "";
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const AMENITY_KEY_BY_ALIAS = (() => {
  const map = new Map<string, AmenityKey>();
  for (const option of AMENITY_OPTIONS) {
    const aliases = [option.key, option.key.replaceAll("_", " "), option.label];
    for (const alias of aliases) {
      map.set(normalizeText(alias), option.key);
    }
  }
  return map;
})();

function toAmenityKey(value: string | null | undefined): AmenityKey | null {
  return AMENITY_KEY_BY_ALIAS.get(normalizeText(value)) ?? null;
}

function parseAmenitiesFromMessage(message: string | null | undefined): AmenityKey[] {
  const lines = String(message ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const candidates: string[] = [];

  for (const line of lines) {
    const cleaned = line.replace(/^\*\s*/, "").trim();
    if (!cleaned) continue;

    const normalized = normalizeText(cleaned);
    if (normalized.startsWith("equipements:") || normalized.startsWith("equipements :")) {
      cleaned
        .split(":")
        .slice(1)
        .join(":")
        .split(/[,|]/)
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((token) => candidates.push(token));
    }
  }

  return Array.from(
    new Set(
      candidates
        .map((token) => toAmenityKey(token))
        .filter((key): key is AmenityKey => key !== null)
    )
  );
}

function resolveSelectedAmenities(
  amenities: string[] | null | undefined,
  message: string | null | undefined
): AmenityKey[] {
  const fromColumn = Array.isArray(amenities)
    ? Array.from(
        new Set(
          amenities
            .map((item) => toAmenityKey(item))
            .filter((key): key is AmenityKey => key !== null)
        )
      )
    : [];
  if (fromColumn.length) return fromColumn;
  return parseAmenitiesFromMessage(message);
}

function buildAgencyContact(lead: Pick<DepotLeadRow, "phone" | "whatsapp" | "email">) {
  const parts = [compactText(lead.phone), compactText(lead.whatsapp), compactText(lead.email)].filter(Boolean);
  return Array.from(new Set(parts)).join(" | ");
}

function buildAgencyUsersHref(lead: Pick<DepotLeadRow, "name" | "phone" | "email">) {
  const params = new URLSearchParams();
  params.set("role", "agency");

  const searchValue = compactText(lead.email) || compactText(lead.phone) || compactText(lead.name);
  if (searchValue) {
    params.set("q", searchValue);
  }

  return `/admin/protected/users?${params.toString()}`;
}

export default async function DepotTiersLeadsPage() {
  const supabase = await createClient();

  const richSelect = `
    id,
    created_at,
    lang,
    status,
    validation_note,
    validated_at,
    intent,
    property_type,
    transaction_type,
    location_type,
    title,
    city,
    commune,
    district,
    address,
    price,
    surface,
    rooms,
    baths,
    payment_terms,
    name,
    phone,
    whatsapp,
    email,
    amenities,
    photo_links,
    message
  `;

  const legacySelect = `
    id,
    created_at,
    lang,
    status,
    intent,
    property_type,
    city,
    district,
    price,
    surface,
    rooms,
    name,
    phone,
    message
  `;

  const filterDepotTiers = "intent.eq.agency_deposit,intent.eq.depot_tiers,intent.eq.third_party_upload,intent.eq.third_party";

  const queryRich = async () =>
    supabase
      .from("owner_leads")
      .select(richSelect)
      .or(filterDepotTiers)
      .order("created_at", { ascending: false })
      .limit(200);

  const queryLegacy = async () =>
    supabase
      .from("owner_leads")
      .select(legacySelect)
      .or(filterDepotTiers)
      .order("created_at", { ascending: false })
      .limit(200);

  const richResult = await queryRich();
  let data = (richResult.data as DepotLeadRow[] | null) ?? null;
  let error = richResult.error;

  if (error && isMissingColumnError(error.message)) {
    const fallback = await queryLegacy();
    data = (fallback.data as DepotLeadRow[] | null) ?? null;
    error = fallback.error;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
          Error loading agency deposit requests: {error.message}
        </div>
      </div>
    );
  }

  const leads = (data ?? []) as DepotLeadRow[];
  const total = leads.length;
  const fresh = leads.filter((x) => (x.status ?? "new") === "new").length;
  const reviewing = leads.filter((x) => x.status === "in_review").length;
  const validated = leads.filter((x) => x.status === "validated").length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <section className="rounded-3xl border border-black/10 bg-white/75 p-6 shadow-sm backdrop-blur md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--gold))]/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
              <Building2 size={14} />
              Depot agences
            </div>
            <h1 className="mt-3 text-3xl font-extrabold text-[rgb(var(--navy))]">Leads depot tiers</h1>
            <p className="mt-2 text-sm text-black/60">
              Validation des depots agences avant creation du bien public.
            </p>
          </div>

          <Link
            href="/admin/protected/leads"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium text-[rgb(var(--navy))] hover:bg-black/5"
          >
            <ArrowLeft size={15} />
            Retour
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <StatCard label="Total" value={String(total)} icon={<Building2 size={15} />} />
          <StatCard label="Nouveaux" value={String(fresh)} icon={<Clock3 size={15} />} />
          <StatCard label="En revision" value={String(reviewing)} icon={<Hourglass size={15} />} />
          <StatCard label="Valides" value={String(validated)} icon={<BadgeCheck size={15} />} />
        </div>
      </section>

      <div className="space-y-4">
        {leads.map((lead) => {
          const photos = collectLeadPhotos(lead.photo_links, lead.message);
          const cleanMessage = sanitizeDescription(lead.message);
          const previewMessage = buildDescriptionPreview(cleanMessage);
          const messageMetrics = textMetrics(cleanMessage);
          const selectedAmenities = resolveSelectedAmenities(lead.amenities, cleanMessage);
          const agencyName = fmt(lead.name);
          const agencyContact = buildAgencyContact(lead);
          const agencyUsersHref = buildAgencyUsersHref(lead);
          return (
          <article
            key={lead.id}
            className="relative overflow-hidden rounded-[30px] border border-slate-200/80 bg-gradient-to-b from-white via-white to-slate-50 p-6 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.65)] md:p-8"
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(60%_140%_at_50%_-20%,rgba(30,64,175,0.14),transparent)]" />
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[rgb(var(--gold))]/15 blur-2xl" />
            </div>
            <div className="relative">
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Edit Section
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-xl bg-[rgb(var(--navy))]/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
                  <Building2 size={13} />
                  Depot tiers
                </div>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                  <Calendar size={12} />
                  {new Date(lead.created_at).toLocaleString("fr-FR")}
                  {lead.lang ? ` | ${lead.lang.toUpperCase()}` : ""}
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                  {fmt(lead.title) !== "-" ? lead.title : fmt(lead.property_type)}
                </h2>
                <div className="mt-1 text-sm text-slate-600">
                  {[lead.address, lead.district, lead.commune, lead.city].filter(Boolean).join(" | ") || "-"}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-[rgb(var(--navy))]/20 bg-[rgb(var(--navy))]/10 px-2.5 py-1 text-[rgb(var(--navy))]">
                    Agence: {agencyName}
                  </span>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">
                    Contact: {agencyContact || "-"}
                  </span>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
                    Intent: {fmt(lead.intent)}
                  </span>
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-blue-700">
                    Transaction: {fmt(lead.transaction_type || lead.location_type)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-cyan-700">
                    <Camera size={11} />
                    Photos: {photos.length}
                  </span>
                  <Link
                    href={agencyUsersHref}
                    className="inline-flex items-center rounded-full border border-[rgb(var(--gold))]/40 bg-[rgb(var(--gold))]/25 px-2.5 py-1 font-semibold text-[rgb(var(--navy))] hover:bg-[rgb(var(--gold))]/35"
                  >
                    Voir utilisateur agence
                  </Link>
                </div>
              </div>

              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusBadgeClass(
                  lead.status
                )}`}
              >
                {lead.status ?? "new"}
              </span>
            </div>

            <details className="group mt-4 overflow-hidden rounded-2xl border border-black/10 bg-white/70 shadow-sm">
              <summary className="cursor-pointer list-none px-4 py-3 md:px-5">
                <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900">
                  <Eye size={14} />
                  Afficher les details
                </span>
              </summary>

              <div className="space-y-4 border-t border-black/10 px-4 pb-4 pt-4 md:px-5 md:pb-5">
                <section className="relative rounded-3xl border border-slate-200/80 bg-white/85 p-5 shadow-sm md:p-6">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <ReadOnlyField
                      label="Titre"
                      value={fmt(lead.title) !== "-" ? String(lead.title) : fmt(lead.property_type)}
                    />
                    <ReadOnlyField label="Type de bien" value={fmt(lead.property_type)} />
                    <ReadOnlyField label="Transaction" value={fmt(lead.transaction_type || lead.location_type)} />
                    <ReadOnlyField label="Prix" value={formatPrice(lead.price)} />
                    <ReadOnlyField label="Surface (m2)" value={lead.surface ? `${lead.surface}` : "-"} />
                    <ReadOnlyField label="Pieces" value={fmt(lead.rooms)} />
                    <ReadOnlyField label="Salles de bain" value={fmt(lead.baths)} />
                    <ReadOnlyField label="Paiement" value={fmt(lead.payment_terms)} />
                    <ReadOnlyField label="Soumis par" value={fmt(lead.name)} />
                    <ReadOnlyField
                      label="Contact agence"
                      value={agencyContact || "-"}
                      valueClassName="bg-emerald-50 text-emerald-800 ring-emerald-200"
                    />
                    <ReadOnlyField label="Ville" value={fmt(lead.city)} />
                    <ReadOnlyField
                      label="Localisation"
                      value={[lead.address, lead.district, lead.commune].filter(Boolean).join(" - ") || "-"}
                      className="xl:col-span-2"
                    />
                  </div>
                </section>

                <section className="relative space-y-4 rounded-3xl border border-slate-200/80 bg-white/85 p-5 shadow-sm md:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900">Equipements / points forts</div>
                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                      {selectedAmenities.length} selectionne(s)
                    </span>
                  </div>
                  {selectedAmenities.length ? (
                    <div className="grid gap-2 md:grid-cols-3">
                      {selectedAmenities.map((amenity) => (
                        <div
                          key={amenity}
                          className="rounded-xl border border-slate-800/25 bg-slate-100 px-3 py-2 text-sm text-slate-900"
                        >
                          {AMENITY_OPTIONS.find((option) => option.key === amenity)?.label ?? amenity}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                      Aucun equipement selectionne.
                    </div>
                  )}
                </section>

                <section className="relative space-y-4 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm md:p-6">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[radial-gradient(65%_125%_at_50%_-20%,rgba(30,64,175,0.16),transparent)]"
                  />
                  <div className="relative flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Description
                      </div>
                      <p className="text-xs text-slate-600">
                        Donnees soumises par l&apos;agence en lecture seule.
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                      Lecture seule
                    </div>
                  </div>

                  <div className="relative flex flex-wrap gap-2">
                    <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                      {messageMetrics.lineCount} ligne(s)
                    </span>
                    <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                      {messageMetrics.wordCount} mot(s)
                    </span>
                    <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                      {messageMetrics.charCount} caractere(s)
                    </span>
                  </div>

                  <label className="relative block space-y-2.5">
                    <div className="text-[13px] font-semibold tracking-wide text-[rgb(var(--navy))]">
                      Texte du bien
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-black/5">
                      <div className="min-h-52 whitespace-pre-wrap break-words px-4 py-4 font-serif text-[15px] leading-7 text-slate-800">
                        {fmt(previewMessage)}
                      </div>
                      {cleanMessage.length > previewMessage.length ? (
                        <details className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
                          <summary className="cursor-pointer list-none">
                            <span className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 hover:bg-slate-50">
                              Etendre la description
                            </span>
                          </summary>
                          <div className="mt-3 whitespace-pre-wrap break-words font-serif text-[15px] leading-7 text-slate-800">
                            {fmt(cleanMessage)}
                          </div>
                        </details>
                      ) : null}
                      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-2 text-[11px] font-medium text-slate-600">
                        <span>Description non modifiable.</span>
                        <span>Etat: {String(cleanMessage ?? "").trim() ? "renseigne" : "vide"}</span>
                      </div>
                    </div>
                  </label>
                </section>

                <section className="relative space-y-5 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm md:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Images existantes</div>
                      <div className="text-xs text-slate-500">
                        Meme affichage que la page Edit Bien, sans actions d&apos;edition.
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                      {photos.length} image(s)
                    </div>
                  </div>

                  {photos.length ? (
                    <PropertyImageSlider
                      images={photos}
                      alt={fmt(lead.title) !== "-" ? String(lead.title) : `Lead ${lead.id}`}
                      aspectClassName="aspect-[4/3] md:aspect-[16/9]"
                      sizes="(max-width: 768px) 100vw, 70vw"
                      showThumbs
                      enableZoom={false}
                    />
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                      Aucune image pour ce lead.
                    </div>
                  )}
                </section>

                <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900">Validation (lecture seule)</div>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusBadgeClass(
                        lead.status
                      )}`}
                    >
                      {lead.status ?? "new"}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <ReadOnlyField label="Note de validation" value={fmt(lead.validation_note)} />
                    <ReadOnlyField label="Date de validation" value={formatDateTime(lead.validated_at)} />
                  </div>

                  {lead.validated_at && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">
                      <BadgeCheck size={12} />
                      Valide le {formatDateTime(lead.validated_at)}
                    </div>
                  )}
                </section>

                <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Actions de moderation</div>
                      <div className="text-xs text-slate-600">
                        Validez, rejetez avec motif, ou supprimez definitivement ce lead.
                      </div>
                    </div>
                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                      Actions admin
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <form
                      className="rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
                      action={async (formData) => {
                        "use server";
                        const note = String(formData.get("validation_note") || "");
                        await validateOwnerLeadAndPublish(lead.id, note);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                          <CheckCircle2 size={14} />
                        </span>
                        <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                          Validation
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-emerald-700/80">
                        Cette action valide le lead puis ouvre la creation du bien.
                      </p>
                      <textarea
                        name="validation_note"
                        defaultValue={lead.validation_note ?? ""}
                        placeholder="Message optionnel avant validation..."
                        className="mt-3 min-h-24 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400"
                      />
                      <ConfirmSubmitButton
                        confirmMessage="Confirmer la validation de ce lead et la creation du bien ?"
                        className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-semibold tracking-wide text-white shadow-sm transition hover:opacity-95"
                      >
                        Valider et creer le bien
                      </ConfirmSubmitButton>
                    </form>

                    <form
                      className="rounded-2xl border border-rose-200 bg-gradient-to-b from-rose-50 to-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
                      action={async (formData) => {
                        "use server";
                        const note = String(formData.get("validation_note") || "").trim();
                        await updateOwnerLeadStatus(
                          lead.id,
                          "rejected",
                          note || "Rejet sans detail complementaire."
                        );
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                          <XCircle size={14} />
                        </span>
                        <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                          Rejet
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-rose-700/80">
                        Un message de rejet est obligatoire pour informer l&apos;agence.
                      </p>
                      <textarea
                        name="validation_note"
                        defaultValue={lead.validation_note ?? ""}
                        placeholder="Message de rejet..."
                        required
                        className="mt-3 min-h-24 w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-rose-400"
                      />
                      <ConfirmSubmitButton
                        confirmMessage="Confirmer le rejet de ce lead avec ce message ?"
                        className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-4 text-xs font-semibold tracking-wide text-white shadow-sm transition hover:opacity-95"
                      >
                        Rejeter avec message
                      </ConfirmSubmitButton>
                    </form>
                  </div>

                  <form
                    className="mt-3 rounded-2xl border border-red-200 bg-gradient-to-b from-red-50 to-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
                    action={async () => {
                      "use server";
                      await deleteOwnerLead(lead.id);
                    }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 text-red-700">
                            <Trash2 size={14} />
                          </span>
                          <div className="text-xs font-semibold uppercase tracking-wide text-red-700">
                            Suppression definitive
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-red-700/80">
                          Cette action supprime le lead de maniere irreversible.
                        </p>
                      </div>
                      <ConfirmSubmitButton
                        confirmMessage="Suppression definitive: confirmer la suppression de ce lead ?"
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-semibold tracking-wide text-white shadow-sm transition hover:opacity-95"
                      >
                        Supprimer ce lead
                      </ConfirmSubmitButton>
                    </div>
                  </form>
                </section>
              </div>
            </details>
            </div>
          </article>
        )})}

        {leads.length === 0 && (
          <div className="rounded-2xl border border-black/10 bg-white/75 p-6 text-sm text-black/60">
            Aucun lead depot tiers pour le moment.
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-black/50">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-extrabold text-[rgb(var(--navy))]">{value}</div>
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
  className,
  valueClassName,
}: {
  label: string;
  value: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={className}>
      <div className="text-[13px] font-semibold tracking-wide text-[rgb(var(--navy))]">{label}</div>
      <div
        className={[
          "mt-2.5 min-h-11 rounded-2xl border-0 bg-white/80 px-4 py-3 text-sm text-slate-800 ring-1 ring-black/10",
          valueClassName ?? "",
        ].join(" ")}
      >
        <span className="whitespace-pre-wrap break-words">{value}</span>
      </div>
    </div>
  );
}
