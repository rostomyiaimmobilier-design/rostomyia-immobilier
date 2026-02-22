import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Calendar,
  Clock3,
  Eye,
  FileCheck2,
  Hourglass,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateOwnerLeadStatus } from "../actions";
import AppDropdown from "@/components/ui/app-dropdown";

const STATUS = [
  "new",
  "in_review",
  "contacted",
  "scheduled",
  "validated",
  "rejected",
  "closed",
] as const;

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
  photo_links: string | null;
  message: string | null;
};

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

function fmt(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "-";
  const s = String(value).trim();
  return s || "-";
}

function parsePhotoLinks(raw: string | null | undefined) {
  if (!raw) return [];
  return raw
    .split(/[\n,\s]+/g)
    .map((x) => x.trim())
    .filter((x) => /^https?:\/\//i.test(x));
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
        {leads.map((lead) => (
          <article
            key={lead.id}
            className="rounded-3xl border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur md:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-xl bg-[rgb(var(--navy))]/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
                  <Building2 size={13} />
                  Lead depot tiers
                </div>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs text-black/65">
                  <Calendar size={12} />
                  {new Date(lead.created_at).toLocaleString("fr-FR")}
                  {lead.lang ? ` | ${lead.lang.toUpperCase()}` : ""}
                </div>
                <h2 className="mt-2 text-xl font-extrabold tracking-tight text-[rgb(var(--navy))]">
                  {fmt(lead.title) !== "-" ? lead.title : fmt(lead.property_type)}
                </h2>
                <div className="mt-1 text-sm text-black/65">
                  {[lead.address, lead.district, lead.commune, lead.city].filter(Boolean).join(" | ") || "-"}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-black/10 bg-black/5 px-2.5 py-1 text-black/70">
                    Intent: {fmt(lead.intent)}
                  </span>
                  <span className="rounded-full border border-black/10 bg-black/5 px-2.5 py-1 text-black/70">
                    Transaction: {fmt(lead.transaction_type || lead.location_type)}
                  </span>
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
                <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold text-[rgb(var(--navy))]">
                  <Eye size={14} />
                  Afficher les details
                </span>
              </summary>

              <div className="space-y-4 border-t border-black/10 px-4 pb-4 pt-4 md:px-5 md:pb-5">
                <div className="grid gap-3 md:grid-cols-4">
                  <Metric label="Prix" value={formatPrice(lead.price)} />
                  <Metric label="Surface" value={lead.surface ? `${lead.surface} m2` : "-"} />
                  <Metric label="Pieces" value={fmt(lead.rooms)} />
                  <Metric label="SDB" value={fmt(lead.baths)} />
                </div>

                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <Info label="Soumis par" value={fmt(lead.name)} icon={<UserRound size={15} />} tone="blue" />
                  <Info label="Telephone" value={fmt(lead.phone)} icon={<Phone size={15} />} tone="blue" />
                  <Info label="Type de bien" value={fmt(lead.property_type)} icon={<Building2 size={15} />} tone="blue" />
                  <Info label="Transaction" value={fmt(lead.transaction_type || lead.location_type)} icon={<Clock3 size={15} />} tone="blue" />
                  <Info label="Paiement" value={fmt(lead.payment_terms)} icon={<FileCheck2 size={15} />} tone="blue" />
                  <Info
                    label="Localisation"
                    value={[lead.address, lead.district, lead.commune, lead.city].filter(Boolean).join(" | ") || "-"}
                    icon={<MapPin size={15} />}
                    tone="blue"
                  />
                </div>

                {lead.message && (
                  <div className="rounded-xl border border-black/10 bg-white p-3 text-sm">
                    <div className="inline-flex items-center gap-2 font-medium text-black/70">
                      <FileCheck2 size={14} />
                      Details soumis
                    </div>
                    <div className="mt-1 whitespace-pre-wrap break-words text-black/70">{fmt(lead.message)}</div>
                  </div>
                )}

                {lead.photo_links && (
                  <div className="rounded-xl border border-black/10 bg-white p-3 text-sm">
                    <div className="inline-flex items-center gap-2 font-medium text-black/70">
                      <FileCheck2 size={14} />
                      Photos
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {parsePhotoLinks(lead.photo_links).length ? (
                        parsePhotoLinks(lead.photo_links).map((url) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex rounded-lg border border-black/15 bg-black/[0.03] px-2 py-1 text-xs text-[rgb(var(--navy))] hover:bg-black/[0.06]"
                          >
                            Ouvrir photo
                          </a>
                        ))
                      ) : (
                        <span className="whitespace-pre-wrap break-words text-black/70">{fmt(lead.photo_links)}</span>
                      )}
                    </div>
                  </div>
                )}

                <form
                  className="rounded-xl border border-black/10 bg-white/80 p-3"
                  action={async (formData) => {
                    "use server";
                    const status = String(formData.get("status") || "new");
                    const note = String(formData.get("validation_note") || "");
                    await updateOwnerLeadStatus(lead.id, status, note);
                  }}
                >
                  <div className="grid gap-3 md:grid-cols-[220px_1fr]">
                    <label className="text-sm">
                      <div className="mb-1 font-medium text-black/70">Statut</div>
                      <AppDropdown
                        name="status"
                        defaultValue={lead.status ?? "new"}
                        triggerClassName="h-10"
                        options={STATUS.map((status) => ({ value: status, label: status }))}
                      />
                    </label>

                    <label className="text-sm">
                      <div className="mb-1 font-medium text-black/70">Note de validation</div>
                      <textarea
                        name="validation_note"
                        defaultValue={lead.validation_note ?? ""}
                        placeholder="Remarques internes pour la validation..."
                        className="min-h-10 w-full rounded-xl border border-black/10 bg-white px-3 py-2 outline-none transition focus:border-[rgb(var(--navy))]/40"
                      />
                    </label>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      type="submit"
                      className="h-10 rounded-xl bg-[rgb(var(--navy))] px-5 text-xs font-semibold tracking-wide text-white shadow-sm transition hover:opacity-95"
                    >
                      Enregistrer
                    </button>
                  </div>

                  {lead.validated_at && (
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">
                      <BadgeCheck size={12} />
                      Valide le {new Date(lead.validated_at).toLocaleString("fr-FR")}
                    </div>
                  )}
                </form>
              </div>
            </details>
          </article>
        ))}

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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-gradient-to-b from-white to-slate-50/60 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
      <div className="text-xs uppercase tracking-wide text-black/50">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[rgb(var(--navy))]">{value}</div>
    </div>
  );
}

function Info({
  label,
  value,
  icon,
  tone = "blue",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "blue" | "green" | "emerald";
}) {
  const tones: Record<"blue" | "green" | "emerald", { border: string; badge: string; title: string }> = {
    blue: {
      border: "border-[rgb(var(--navy))]/15",
      badge: "bg-[rgb(var(--navy))]/10 text-[rgb(var(--navy))]",
      title: "text-[rgb(var(--navy))]/70",
    },
    green: {
      border: "border-green-200",
      badge: "bg-green-100 text-green-700",
      title: "text-green-700",
    },
    emerald: {
      border: "border-emerald-200",
      badge: "bg-emerald-100 text-emerald-700",
      title: "text-emerald-700",
    },
  };

  const t = tones[tone];

  return (
    <div className={`rounded-xl border bg-gradient-to-b from-white to-slate-50/60 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] ${t.border}`}>
      <div className="flex items-start gap-2.5">
        <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${t.badge}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <div className={`text-[11px] font-semibold uppercase tracking-wide ${t.title}`}>{label}</div>
          <div className="mt-1 break-words text-sm font-medium text-black/80">{value}</div>
        </div>
      </div>
    </div>
  );
}
