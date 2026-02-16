import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Clock3,
  FileCheck2,
  Hourglass,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateOwnerLeadStatus } from "../actions";

const STATUS = [
  "new",
  "in_review",
  "contacted",
  "scheduled",
  "validated",
  "rejected",
  "closed",
] as const;

type OwnerLeadRow = {
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
  residence_name: string | null;
  price: number | null;
  surface: number | null;
  rooms: number | null;
  baths: number | null;
  floor: number | null;
  year_built: number | null;
  furnishing_type: string | null;
  property_condition: string | null;
  availability: string | null;
  legal_docs: string | null;
  payment_terms: string | null;
  has_parking: boolean | null;
  has_elevator: boolean | null;
  has_security: boolean | null;
  has_balcony: boolean | null;
  has_central_heating: boolean | null;
  has_air_conditioning: boolean | null;
  has_fiber: boolean | null;
  name: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  preferred_contact_method: string | null;
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

function yesNo(value: boolean | null | undefined) {
  if (value === null || value === undefined) return "-";
  return value ? "Oui" : "Non";
}

function boolFeatures(lead: OwnerLeadRow) {
  const items = [
    lead.has_parking ? "Parking" : null,
    lead.has_elevator ? "Ascenseur" : null,
    lead.has_security ? "Securite" : null,
    lead.has_balcony ? "Balcon" : null,
    lead.has_central_heating ? "Chauffage central" : null,
    lead.has_air_conditioning ? "Climatisation" : null,
    lead.has_fiber ? "Fibre" : null,
  ].filter(Boolean) as string[];

  return items.length ? items.join(" | ") : "-";
}

export default async function OwnerLeadsPage() {
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
    residence_name,
    price,
    surface,
    rooms,
    baths,
    floor,
    year_built,
    furnishing_type,
    property_condition,
    availability,
    legal_docs,
    payment_terms,
    has_parking,
    has_elevator,
    has_security,
    has_balcony,
    has_central_heating,
    has_air_conditioning,
    has_fiber,
    name,
    phone,
    whatsapp,
    email,
    preferred_contact_method,
    photo_links,
    message
  `;

  const legacySelect = `
    id,
    created_at,
    lang,
    intent,
    property_type,
    city,
    district,
    price,
    surface,
    rooms,
    name,
    phone,
    message,
    status
  `;

  const queryRich = async () =>
    supabase
      .from("owner_leads")
      .select(richSelect)
      .order("created_at", { ascending: false })
      .limit(200);

  const queryLegacy = async () =>
    supabase
      .from("owner_leads")
      .select(legacySelect)
      .order("created_at", { ascending: false })
      .limit(200);

  let { data, error } = await queryRich();

  if (error && isMissingColumnError(error.message)) {
    const fallback = await queryLegacy();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
          Error loading owner leads: {error.message}
        </div>
      </div>
    );
  }

  const leads = (data ?? []) as OwnerLeadRow[];
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
              Owner Validation Desk
            </div>
            <h1 className="mt-3 text-3xl font-extrabold text-[rgb(var(--navy))]">Owner Leads</h1>
            <p className="mt-2 text-sm text-black/60">
              Validation des propositions de biens clients.
            </p>
          </div>

          <Link
            href="/admin/protected/leads"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium text-[rgb(var(--navy))] hover:bg-black/5"
          >
            <ArrowLeft size={15} />
            Back
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <StatCard label="Total leads" value={String(total)} icon={<Building2 size={15} />} />
          <StatCard label="Nouveaux" value={String(fresh)} icon={<Clock3 size={15} />} />
          <StatCard label="En review" value={String(reviewing)} icon={<Hourglass size={15} />} />
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
                <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs text-black/65">
                  <Clock3 size={12} />
                  {new Date(lead.created_at).toLocaleString("fr-FR")}
                  {lead.lang ? ` | ${lead.lang.toUpperCase()}` : ""}
                </div>
                <h2 className="mt-2 text-xl font-bold text-[rgb(var(--navy))]">
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
                    Type: {fmt(lead.property_type)}
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

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <Metric label="Prix" value={formatPrice(lead.price)} />
              <Metric label="Surface" value={lead.surface ? `${lead.surface} m2` : "-"} />
              <Metric label="Pieces" value={fmt(lead.rooms)} />
              <Metric label="SDB" value={fmt(lead.baths)} />
            </div>

            <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <Info label="Client" value={fmt(lead.name)} />
              <Info label="Telephone" value={fmt(lead.phone)} />
              <Info label="WhatsApp" value={fmt(lead.whatsapp)} />
              <Info label="Email" value={fmt(lead.email)} />
              <Info label="Contact prefere" value={fmt(lead.preferred_contact_method)} />
              <Info label="Objectif" value={fmt(lead.intent)} />
              <Info label="Transaction" value={fmt(lead.transaction_type || lead.location_type)} />
              <Info label="Type de bien" value={fmt(lead.property_type)} />
              <Info label="Ameublement" value={fmt(lead.furnishing_type)} />
              <Info label="Etat" value={fmt(lead.property_condition)} />
              <Info label="Disponibilite" value={fmt(lead.availability)} />
              <Info label="Etage" value={fmt(lead.floor)} />
              <Info label="Annee construction" value={fmt(lead.year_built)} />
              <Info label="Docs legaux" value={fmt(lead.legal_docs)} />
              <Info label="Paiement" value={fmt(lead.payment_terms)} />
              <Info label="Residence" value={fmt(lead.residence_name)} />
              <Info label="Parking" value={yesNo(lead.has_parking)} />
              <Info label="Ascenseur" value={yesNo(lead.has_elevator)} />
              <Info label="Securite" value={yesNo(lead.has_security)} />
              <Info label="Balcon" value={yesNo(lead.has_balcony)} />
              <Info label="Chauffage central" value={yesNo(lead.has_central_heating)} />
              <Info label="Climatisation" value={yesNo(lead.has_air_conditioning)} />
              <Info label="Fibre" value={yesNo(lead.has_fiber)} />
              <Info label="Equipements actifs" value={boolFeatures(lead)} />
            </div>

            {(lead.photo_links || lead.message) && (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-black/10 bg-white p-3 text-sm">
                  <div className="inline-flex items-center gap-2 font-medium text-black/70">
                    <FileCheck2 size={14} />
                    Liens photos/videos
                  </div>
                  <div className="mt-1 whitespace-pre-wrap break-words text-black/70">
                    {fmt(lead.photo_links)}
                  </div>
                </div>
                <div className="rounded-2xl border border-black/10 bg-white p-3 text-sm">
                  <div className="inline-flex items-center gap-2 font-medium text-black/70">
                    <FileCheck2 size={14} />
                    Description client
                  </div>
                  <div className="mt-1 whitespace-pre-wrap break-words text-black/70">
                    {fmt(lead.message)}
                  </div>
                </div>
              </div>
            )}

            <form
              className="mt-4 rounded-2xl border border-black/10 bg-white p-3 md:p-4"
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
                  <select
                    name="status"
                    defaultValue={lead.status ?? "new"}
                    className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 outline-none"
                  >
                    {STATUS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm">
                  <div className="mb-1 font-medium text-black/70">Note de validation</div>
                  <textarea
                    name="validation_note"
                    defaultValue={lead.validation_note ?? ""}
                    placeholder="Remarques internes, corrections demandees, etat du dossier..."
                    className="min-h-10 w-full rounded-xl border border-black/10 bg-white px-3 py-2 outline-none"
                  />
                </label>

              </div>

              {lead.status !== "validated" && (
                <div className="mt-3 flex justify-end">
                  <button
                    type="submit"
                    className="h-10 rounded-xl bg-[rgb(var(--navy))] px-4 text-xs font-semibold text-white hover:opacity-95"
                  >
                    Save
                  </button>
                </div>
              )}

              {lead.validated_at && (
                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">
                  <BadgeCheck size={12} />
                  Valide le {new Date(lead.validated_at).toLocaleString("fr-FR")}
                </div>
              )}
            </form>
          </article>
        ))}

        {leads.length === 0 && (
          <div className="rounded-2xl border border-black/10 bg-white/75 p-6 text-sm text-black/60">
            No owner leads yet.
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
    <div className="rounded-2xl border border-black/10 bg-white px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-black/50">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-black/50">{label}</div>
      <div className="mt-0.5 text-sm text-slate-900">{value}</div>
    </div>
  );
}
