import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BedDouble,
  BellRing,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Image as ImageIcon,
  LoaderCircle,
  MapPin,
  MessageCircle,
  PencilLine,
  PlusCircle,
  Ruler,
  Tag,
  XCircle,
} from "lucide-react";
import DepositFilterChips from "./DepositFilterChips";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
type DepositFilter = "all" | "processing" | "validated" | "rejected";

type AgencyVisitNotificationRow = {
  id: number;
  property_ref: string;
  property_title: string | null;
  property_location: string | null;
  property_price: string | null;
  visit_preferred_date: string | null;
  visit_preferred_time: string | null;
  visit_status: string | null;
  whatsapp_link: string | null;
  created_at: string;
};

type AgencyDepositLeadRow = {
  id: string;
  created_at: string;
  intent: string | null;
  status: string | null;
  validation_note: string | null;
  title: string | null;
  property_type: string | null;
  transaction_type: string | null;
  location_type: string | null;
  commune: string | null;
  district: string | null;
  address: string | null;
  city: string | null;
  price: number | null;
  surface: number | null;
  rooms: number | null;
  photo_links: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
};

type DepositStatusKind = "validated" | "rejected" | "processing";

const AGENCY_DEPOSIT_INTENTS = [
  "agency_deposit",
  "depot_tiers",
  "third_party_upload",
  "third_party",
] as const;

const VALIDATED_STATUSES = new Set(["validated"]);
const REJECTED_STATUSES = new Set(["rejected"]);

function isMissingAgencyVisitNotificationsTable(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("agency_visit_notifications") && m.includes("does not exist");
}

function isMissingColumnError(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("column") && m.includes("does not exist");
}

function fmt(value: string | null | undefined) {
  const v = String(value ?? "").trim();
  return v || "-";
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeDigits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function statusKind(status: string | null | undefined): DepositStatusKind {
  const s = normalizeText(status);
  if (VALIDATED_STATUSES.has(s)) return "validated";
  if (REJECTED_STATUSES.has(s)) return "rejected";
  return "processing";
}

function statusLabel(status: string | null | undefined) {
  const s = normalizeText(status);
  if (!s) return "processing";
  if (s === "new" || s === "in_review" || s === "contacted" || s === "scheduled") {
    return "processing";
  }
  return s.replaceAll("_", " ");
}

function statusBadgeClass(kind: DepositStatusKind) {
  if (kind === "validated") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (kind === "rejected") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function formatPrice(value: number | null | undefined) {
  if (typeof value !== "number") return "-";
  return `${value.toLocaleString("fr-FR")} DZD`;
}

function parsePhotoLinks(value: string | null | undefined) {
  return String(value ?? "")
    .split(/[\n,\s]+/g)
    .map((item) => item.trim())
    .filter((item) => /^https?:\/\//i.test(item));
}

function coverPhotoUrl(lead: AgencyDepositLeadRow) {
  const links = parsePhotoLinks(lead.photo_links);
  return links[0] ?? null;
}

function buildDepositLocation(lead: AgencyDepositLeadRow) {
  const rawParts = [lead.address, lead.district, lead.commune, lead.city]
    .map((part) => fmt(part))
    .filter((part) => part !== "-");

  const seen = new Set<string>();
  const deduped: string[] = [];

  rawParts.forEach((raw) => {
    raw
      .split(/[|,-]/g)
      .map((token) => token.trim())
      .filter(Boolean)
      .forEach((token) => {
        const key = normalizeText(token);
        if (!key || seen.has(key)) return;
        seen.add(key);
        deduped.push(token);
      });
  });

  return deduped.length ? deduped.join(" | ") : "-";
}

function firstParam(input: string | string[] | undefined) {
  if (Array.isArray(input)) return input[0] ?? "";
  return input ?? "";
}

function normalizeDepositFilter(raw: string | undefined): DepositFilter {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value === "processing" || value === "validated" || value === "rejected") {
    return value;
  }
  return "all";
}

export default async function AgencyDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const selectedFilter = normalizeDepositFilter(firstParam(params.filter));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/agency/login");

  const userMeta = (user.user_metadata ?? {}) as {
    account_type?: string;
    agency_name?: string;
    company_name?: string;
    agency_status?: string;
    agency_phone?: string;
    phone?: string;
  };

  if (userMeta.account_type !== "agency") redirect("/agency/login");
  const status = userMeta.agency_status ?? "pending";
  if (status !== "active") redirect(`/agency/login?status=${encodeURIComponent(status)}`);

  const agencyName = userMeta.agency_name || user.email || "Agence";
  const agencyNameNorm = normalizeText(userMeta.agency_name || userMeta.company_name || null);
  const agencyEmailNorm = normalizeText(user.email);
  const agencyPhoneNorm = normalizeDigits(userMeta.agency_phone || userMeta.phone || user.phone || null);
  let notifications: AgencyVisitNotificationRow[] = [];
  let deposits: AgencyDepositLeadRow[] = [];

  const notificationsQuery = await supabase
    .from("agency_visit_notifications")
    .select(
      "id, property_ref, property_title, property_location, property_price, visit_preferred_date, visit_preferred_time, visit_status, whatsapp_link, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(25);

  if (!notificationsQuery.error) {
    notifications = (notificationsQuery.data ?? []) as AgencyVisitNotificationRow[];
  } else if (!isMissingAgencyVisitNotificationsTable(notificationsQuery.error.message)) {
    throw new Error(notificationsQuery.error.message);
  }

  const richSelect = `
    id,
    created_at,
    intent,
    status,
    validation_note,
    title,
    property_type,
    transaction_type,
    location_type,
    commune,
    district,
    address,
    city,
    price,
    surface,
    rooms,
    photo_links,
    name,
    phone,
    email
  `;

  const legacySelect = `
    id,
    created_at,
    intent,
    status,
    title,
    property_type,
    location_type,
    district,
    city,
    price,
    surface,
    rooms,
    photo_links,
    name,
    phone
  `;

  const loadRichDeposits = async () =>
    supabase
      .from("owner_leads")
      .select(richSelect)
      .in("intent", [...AGENCY_DEPOSIT_INTENTS])
      .order("created_at", { ascending: false })
      .limit(200);

  const loadLegacyDeposits = async () =>
    supabase
      .from("owner_leads")
      .select(legacySelect)
      .in("intent", [...AGENCY_DEPOSIT_INTENTS])
      .order("created_at", { ascending: false })
      .limit(200);

  const richDepositsResult = await loadRichDeposits();
  let depositRows = (richDepositsResult.data ?? null) as AgencyDepositLeadRow[] | null;
  let depositError = richDepositsResult.error;

  if (depositError && isMissingColumnError(depositError.message)) {
    const fallback = await loadLegacyDeposits();
    depositRows = (fallback.data ?? null) as AgencyDepositLeadRow[] | null;
    depositError = fallback.error;
  }

  if (depositError) {
    throw new Error(depositError.message);
  }

  const scopedDeposits = (depositRows ?? []).filter((lead) => {
    const leadEmail = normalizeText(lead.email);
    const leadPhone = normalizeDigits(lead.phone);
    const leadName = normalizeText(lead.name);
    if (agencyEmailNorm && leadEmail && leadEmail === agencyEmailNorm) return true;
    if (agencyPhoneNorm && leadPhone && leadPhone === agencyPhoneNorm) return true;
    if (agencyNameNorm && leadName && leadName === agencyNameNorm) return true;
    return false;
  });

  deposits = scopedDeposits.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const totalDeposits = deposits.length;
  const validatedDeposits = deposits.filter((item) => statusKind(item.status) === "validated").length;
  const processingDeposits = deposits.filter((item) => statusKind(item.status) === "processing").length;
  const rejectedDeposits = deposits.filter((item) => statusKind(item.status) === "rejected").length;
  const filteredDeposits =
    selectedFilter === "all"
      ? deposits
      : deposits.filter((item) => statusKind(item.status) === selectedFilter);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[rgb(var(--brand-bg))] px-4 py-10 md:py-14">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full bg-[rgb(var(--gold))]/20 blur-3xl" />
        <div className="absolute right-0 top-16 h-[340px] w-[340px] rounded-full bg-[rgb(var(--navy))]/12 blur-3xl" />
      </div>

      <section className="relative mx-auto w-full max-w-[1400px] space-y-6">
        <div className="rounded-3xl border border-black/10 bg-white/75 p-7 shadow-sm backdrop-blur md:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--navy))]">Agency Dashboard</p>
              <h1 className="mt-3 text-3xl font-extrabold text-[rgb(var(--navy))] md:text-4xl">{agencyName}</h1>
              <p className="mt-3 max-w-3xl text-sm text-black/65">
                Deposez vos biens pour validation. Le backoffice controle chaque demande avant publication.
              </p>
            </div>
            <form action="/agency/logout" method="post">
              <button className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[rgb(var(--navy))] hover:bg-black/5">
                Logout
              </button>
            </form>
          </div>
        </div>

        <section className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--navy))]">
              <Building2 size={16} />
              Mes depots de biens
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-black/70">
                {totalDeposits}
              </span>
              <Link
                href="/agency/dashboard/new"
                className="inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--navy))]/20 bg-[rgb(var(--navy))]/8 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--navy))] hover:bg-[rgb(var(--navy))]/12"
              >
                <PlusCircle size={14} />
                Ajouter un bien
              </Link>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-black/10 bg-white p-4">
              <div className="text-xs uppercase tracking-wide text-black/55">Total</div>
              <div className="mt-2 text-2xl font-bold text-[rgb(var(--navy))]">{totalDeposits}</div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-amber-700">
                <LoaderCircle size={13} />
                En cours
              </div>
              <div className="mt-2 text-2xl font-bold text-amber-700">{processingDeposits}</div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-emerald-700">
                <CheckCircle2 size={13} />
                Valides
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-700">{validatedDeposits}</div>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-rose-700">
                <XCircle size={13} />
                Rejetes
              </div>
              <div className="mt-2 text-2xl font-bold text-rose-700">{rejectedDeposits}</div>
            </div>
          </div>

          <DepositFilterChips
            selectedFilter={selectedFilter}
            totalDeposits={totalDeposits}
            processingDeposits={processingDeposits}
            validatedDeposits={validatedDeposits}
            rejectedDeposits={rejectedDeposits}
          />

          {filteredDeposits.length === 0 ? (
            <p className="mt-4 text-sm text-black/60">
              {selectedFilter === "all"
                ? "Aucun depot de bien trouve pour ce compte agence."
                : "Aucun depot pour ce filtre."}
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {filteredDeposits.map((item) => {
                const kind = statusKind(item.status);
                const statusText = statusLabel(item.status);
                const cover = coverPhotoUrl(item);
                const photosCount = parsePhotoLinks(item.photo_links).length;
                const transaction = fmt(item.transaction_type || item.location_type);
                const typeLabel = fmt(item.property_type);
                return (
                  <article
                    key={item.id}
                    className="group overflow-hidden rounded-[26px] border border-[rgb(var(--navy))]/10 bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-[rgb(var(--navy))]/20 hover:shadow-[0_14px_36px_rgba(15,23,42,0.12)]"
                  >
                    <div className="grid gap-0 md:grid-cols-[260px_1fr]">
                      <div className="relative min-h-[190px] bg-slate-100 md:min-h-full">
                        {cover ? (
                          <img
                            src={cover}
                            alt={fmt(item.title)}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(130deg,rgba(15,23,42,0.08),rgba(15,23,42,0.02))]">
                            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/85 px-3 py-1 text-xs font-medium text-slate-700">
                              <ImageIcon size={13} />
                              Cover indisponible
                            </div>
                          </div>
                        )}
                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.04)_0%,rgba(2,6,23,0.4)_100%)]" />
                        <div className="absolute left-3 top-3">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur ${statusBadgeClass(
                              kind
                            )}`}
                          >
                            {statusLabel(item.status)}
                          </span>
                        </div>
                        <div className="absolute right-3 top-3">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/45 bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white">
                            <ImageIcon size={12} />
                            {photosCount}
                          </span>
                        </div>
                        <div className="absolute bottom-3 left-3 right-3">
                          <div className="inline-flex rounded-full border border-white/40 bg-white/88 px-3 py-1 text-[11px] font-semibold text-[rgb(var(--navy))] backdrop-blur">
                            Depot agence
                          </div>
                        </div>
                      </div>

                      <div className="p-4 md:p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs text-black/65">
                            <CalendarDays size={12} />
                            {new Date(item.created_at).toLocaleString("fr-FR")}
                          </div>
                          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/[0.03] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-black/65">
                            {photosCount} photo{photosCount > 1 ? "s" : ""}
                          </div>
                        </div>

                        <h2 className="mt-2 text-lg font-extrabold tracking-tight text-[rgb(var(--navy))]">
                          {fmt(item.title) !== "-" ? fmt(item.title) : fmt(item.property_type)}
                        </h2>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--navy))]/15 bg-[rgb(var(--navy))]/8 px-2.5 py-1 font-medium text-[rgb(var(--navy))]">
                            <Tag size={12} />
                            {transaction !== "-" ? transaction : "Transaction -"}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-black/[0.03] px-2.5 py-1 font-medium text-black/70">
                            <Building2 size={12} />
                            {typeLabel !== "-" ? typeLabel : "Type -"}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium ${statusBadgeClass(
                              kind
                            )}`}
                          >
                            {kind === "validated" ? (
                              <CheckCircle2 size={12} />
                            ) : kind === "rejected" ? (
                              <XCircle size={12} />
                            ) : (
                              <LoaderCircle size={12} />
                            )}
                            Statut: {statusText}
                          </span>
                        </div>
                        <p className="mt-2 inline-flex items-start gap-2 text-sm text-black/70">
                          <MapPin size={14} className="mt-0.5 shrink-0 text-black/55" />
                          <span>{buildDepositLocation(item)}</span>
                        </p>

                        <div className="mt-4 grid gap-2 text-sm md:grid-cols-4">
                          <div className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-black/[0.02] px-3 py-2 text-black/75">
                            <Tag size={14} />
                            {formatPrice(item.price)}
                          </div>
                          <div className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-black/[0.02] px-3 py-2 text-black/75">
                            <Ruler size={14} />
                            {typeof item.surface === "number" ? `${item.surface} m2` : "-"}
                          </div>
                          <div className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-black/[0.02] px-3 py-2 text-black/75">
                            <BedDouble size={14} />
                            {typeof item.rooms === "number" ? `${item.rooms} pieces` : "-"}
                          </div>
                          <div className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-black/[0.02] px-3 py-2 text-black/75">
                            <ImageIcon size={14} />
                            {photosCount} photo{photosCount > 1 ? "s" : ""}
                          </div>
                        </div>

                        {item.validation_note ? (
                          <div className="mt-4 rounded-xl border border-[rgb(var(--navy))]/15 bg-[rgb(var(--navy))]/6 px-3 py-2 text-sm text-black/80">
                            <span className="font-semibold text-[rgb(var(--navy))]">Note admin:</span>{" "}
                            {item.validation_note}
                          </div>
                        ) : null}

                        {kind === "processing" ? (
                          <div className="mt-4 flex justify-end">
                            <Link
                              href={`/agency/dashboard/edit/${encodeURIComponent(item.id)}`}
                              className="inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--navy))]/20 bg-[rgb(var(--navy))]/8 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--navy))] hover:bg-[rgb(var(--navy))]/12"
                            >
                              <PencilLine size={13} />
                              Editer
                            </Link>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--navy))]">
              <BellRing size={16} />
              Visites validees
            </div>
            <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-black/70">
              {notifications.length}
            </span>
          </div>

          {notifications.length === 0 ? (
            <p className="mt-4 text-sm text-black/60">
              Aucune visite validee pour le moment.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {notifications.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-black/10 bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs text-black/65">
                        <CalendarDays size={12} />
                        {new Date(item.created_at).toLocaleString("fr-FR")}
                      </div>
                      <h2 className="mt-2 text-base font-bold text-[rgb(var(--navy))]">
                        REF: {fmt(item.property_ref)}
                      </h2>
                      <p className="text-sm text-black/70">{fmt(item.property_title)}</p>
                    </div>
                    <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                      {fmt(item.visit_status)}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-black/70 md:grid-cols-2">
                    <div className="inline-flex items-center gap-2">
                      <CalendarDays size={14} />
                      Date: {fmt(item.visit_preferred_date)}
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <Clock3 size={14} />
                      Heure: {fmt(item.visit_preferred_time)}
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <MapPin size={14} />
                      {fmt(item.property_location)}
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <Tag size={14} />
                      {fmt(item.property_price)}
                    </div>
                  </div>

                  {item.whatsapp_link ? (
                    <a
                      href={item.whatsapp_link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium text-[rgb(var(--navy))] hover:bg-black/5"
                    >
                      <MessageCircle size={14} />
                      Ouvrir WhatsApp
                    </a>
                  ) : (
                    <p className="mt-3 text-xs text-black/55">
                      WhatsApp agence manquant: ajoutez un numero WhatsApp dans le profil agence.
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

      </section>
    </main>
  );
}
