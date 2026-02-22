import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Calendar,
  CheckCircle2,
  Clock3,
  Eye,
  Globe2,
  Mail,
  MailCheck,
  MapPin,
  MessageCircle,
  Phone,
  ShieldAlert,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createAgencyByAdmin, updateAgencyDetails, updateAgencyStatus } from "./actions";
import AddAgencyModal from "@/components/admin/AddAgencyModal";
import AgencyFilters from "./AgencyFilters";
import AppDropdown from "@/components/ui/app-dropdown";

const AGENCIES_PATH = "/admin/protected/agencies";

type AgencyUser = {
  id: string;
  email: string | null;
  email_confirmed_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  user_metadata?: {
    account_type?: string;
    agency_name?: string;
    agency_status?: string;
    agency_manager_name?: string;
    agency_phone?: string;
    agency_whatsapp?: string;
    agency_city?: string;
    agency_address?: string;
    agency_rc?: string;
    agency_nif?: string;
    agency_website?: string;
    agency_service_areas?: string[] | string | null;
    agency_years_experience?: number | string | null;
    agency_team_size?: number | string | null;
    profile_completed_at?: string | null;
    agency_status_updated_at?: string | null;
    agency_activated_at?: string | null;
    agency_profile_updated_at?: string | null;
  } | null;
};

type SearchParams = Record<string, string | string[] | undefined>;
type ActivityLogRow = {
  id: string;
  agency_user_id: string;
  actor_user_id: string | null;
  action: string;
  previous_status: string | null;
  next_status: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

function statusPill(status: string | undefined) {
  if (status === "pending") return "border-[rgb(var(--navy))]/20 bg-[rgb(var(--navy))]/10 text-[rgb(var(--navy))]";
  if (status === "suspended") return "border-red-200 bg-red-50 text-red-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function fmt(value: unknown) {
  if (Array.isArray(value)) {
    const arr = value.map((x) => String(x).trim()).filter(Boolean);
    return arr.length ? arr.join(", ") : "-";
  }
  if (value === null || value === undefined) return "-";
  const text = String(value).trim();
  return text || "-";
}

function serviceAreasForInput(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((x) => String(x).trim()).filter(Boolean).join(", ");
  }
  return String(value ?? "").trim();
}

function hasValue(value: unknown) {
  return String(value ?? "").trim().length > 0;
}

function normalizeFold(input: string | null | undefined) {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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

function formatLogAction(action: string) {
  if (action === "agency_created") return "Creation agence";
  if (action === "agency_status_updated") return "Mise a jour statut";
  if (action === "agency_details_updated") return "Mise a jour details";
  if (action === "agency_email_notification") return "Notification email";
  return action;
}

function getValidationChecks(meta: NonNullable<AgencyUser["user_metadata"]>) {
  return [
    { key: "agency_name", label: "Nom agence", ok: hasValue(meta.agency_name) },
    { key: "agency_manager_name", label: "Responsable", ok: hasValue(meta.agency_manager_name) },
    { key: "agency_phone", label: "Telephone", ok: hasValue(meta.agency_phone) },
    { key: "agency_city", label: "Ville", ok: hasValue(meta.agency_city) },
    { key: "agency_address", label: "Adresse", ok: hasValue(meta.agency_address) },
  ];
}

export const dynamic = "force-dynamic";

export default async function AgenciesManagementPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const successMessage = typeof params.success === "string" ? params.success : null;
  const errorMessage = typeof params.error === "string" ? params.error : null;
  const q = firstParam(params.q).trim();
  const statusFilter = firstParam(params.status).trim().toLowerCase();
  const cityFilter = firstParam(params.city).trim();
  const createdFilter = firstParam(params.created_within).trim();
  const perPage = Math.min(50, Math.max(5, toPositiveInt(firstParam(params.per_page), 10)));
  const requestedPage = toPositiveInt(firstParam(params.page), 1);

  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 500,
  });

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
        Error loading agencies: {error.message}
      </div>
    );
  }

  const agencies = (data.users ?? [])
    .filter((u) => (u.user_metadata as { account_type?: string } | null)?.account_type === "agency")
    .map((u) => ({
      id: u.id,
      email: u.email ?? null,
      email_confirmed_at: u.email_confirmed_at ?? null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      user_metadata: (u.user_metadata ?? null) as AgencyUser["user_metadata"],
    })) as AgencyUser[];

  const emailPendingAgencies = agencies.filter((u) => !u.email_confirmed_at);

  const confirmedAgencies = agencies
    .filter((u) => !!u.email_confirmed_at)
    .sort((a, b) => {
      const sa = a.user_metadata?.agency_status ?? "pending";
      const sb = b.user_metadata?.agency_status ?? "pending";
      if (sa === "pending" && sb !== "pending") return -1;
      if (sa !== "pending" && sb === "pending") return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const total = confirmedAgencies.length;
  const pending = confirmedAgencies.filter((u) => (u.user_metadata?.agency_status ?? "pending") === "pending").length;
  const active = confirmedAgencies.filter((u) => (u.user_metadata?.agency_status ?? "pending") === "active").length;
  const suspended = confirmedAgencies.filter((u) => (u.user_metadata?.agency_status ?? "pending") === "suspended").length;

  const cityOptions = Array.from(
    new Set(
      confirmedAgencies
        .map((agency) => String(agency.user_metadata?.agency_city ?? "").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, "fr"));

  const qFold = normalizeFold(q);
  const createdDays = createdFilter === "7" || createdFilter === "30" || createdFilter === "90" ? Number(createdFilter) : 0;
  const referenceTs = confirmedAgencies
    .map((agency) => new Date(agency.created_at).getTime())
    .filter((ts) => Number.isFinite(ts))
    .reduce<number | null>((max, ts) => (max === null || ts > max ? ts : max), null);

  const filteredAgencies = confirmedAgencies.filter((agency) => {
    const meta = agency.user_metadata ?? {};
    const status = String(meta.agency_status ?? "pending").toLowerCase();

    if (statusFilter && statusFilter !== "all" && status !== statusFilter) return false;
    if (cityFilter && String(meta.agency_city ?? "").trim() !== cityFilter) return false;

    if (createdDays > 0) {
      const createdAt = new Date(agency.created_at).getTime();
      if (!Number.isFinite(createdAt) || referenceTs === null) return false;
      const ageDays = (referenceTs - createdAt) / (1000 * 60 * 60 * 24);
      if (ageDays > createdDays) return false;
    }

    if (!qFold) return true;
    const haystack = normalizeFold(
      [
        agency.email,
        meta.agency_name,
        meta.agency_manager_name,
        meta.agency_phone,
        meta.agency_city,
        meta.agency_address,
        fmt(meta.agency_service_areas),
      ].join(" ")
    );
    return haystack.includes(qFold);
  });

  const totalFiltered = filteredAgencies.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / perPage));
  const currentPage = Math.min(requestedPage, totalPages);
  const pageStart = (currentPage - 1) * perPage;
  const paginatedAgencies = filteredAgencies.slice(pageStart, pageStart + perPage);

  const qpBase = new URLSearchParams();
  if (q) qpBase.set("q", q);
  if (statusFilter) qpBase.set("status", statusFilter);
  if (cityFilter) qpBase.set("city", cityFilter);
  if (createdFilter) qpBase.set("created_within", createdFilter);
  qpBase.set("per_page", String(perPage));

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
    return `${AGENCIES_PATH}${str ? `?${str}` : ""}`;
  }

  let recentActivity: ActivityLogRow[] = [];
  const activityByAgency = new Map<string, ActivityLogRow[]>();

  if (paginatedAgencies.length > 0) {
    const agencyIds = paginatedAgencies.map((a) => a.id);
    const [recentRes, scopedRes] = await Promise.all([
      admin
        .from("agency_activity_logs")
        .select("id, agency_user_id, actor_user_id, action, previous_status, next_status, details, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      admin
        .from("agency_activity_logs")
        .select("id, agency_user_id, actor_user_id, action, previous_status, next_status, details, created_at")
        .in("agency_user_id", agencyIds)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    if (!recentRes.error) {
      recentActivity = (recentRes.data ?? []) as ActivityLogRow[];
    }

    if (!scopedRes.error) {
      const rows = (scopedRes.data ?? []) as ActivityLogRow[];
      for (const row of rows) {
        const list = activityByAgency.get(row.agency_user_id) ?? [];
        list.push(row);
        activityByAgency.set(row.agency_user_id, list);
      }
    }
  }

  return (
    <div className="space-y-6">
      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{successMessage}</div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{errorMessage}</div>
      ) : null}

      <section className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/75 p-6 shadow-sm backdrop-blur md:p-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 -top-16 h-56 w-56 rounded-full bg-[rgb(var(--gold))]/18 blur-3xl" />
          <div className="absolute right-0 top-8 h-52 w-52 rounded-full bg-[rgb(var(--navy))]/10 blur-3xl" />
        </div>

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
              <Building2 size={14} />
              Agences
            </div>
            <h1 className="mt-3 text-3xl font-extrabold text-[rgb(var(--navy))]">Gestion des agences</h1>
            <p className="mt-2 max-w-2xl text-sm text-black/65">Validation des dossiers agences avec controles de completude avant activation.</p>
          </div>

          <div className="flex items-center gap-2">
            <AddAgencyModal action={createAgencyByAdmin} />
            <Link
              href="/admin/protected"
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium text-[rgb(var(--navy))] hover:bg-black/5"
            >
              <ArrowLeft size={15} />
              Retour
            </Link>
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total" value={String(total)} icon={<Users size={15} />} />
          <StatCard label="En attente" value={String(pending)} icon={<ShieldAlert size={15} />} />
          <StatCard label="Actives" value={String(active)} icon={<BadgeCheck size={15} />} />
          <StatCard label="Suspendues" value={String(suspended)} icon={<ShieldAlert size={15} />} />
        </div>

        <div className="relative mt-4 inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/70">
          <MailCheck size={14} />
          En attente de confirmation email: <span className="font-semibold">{emailPendingAgencies.length}</span>
        </div>

        <AgencyFilters
          key={`${q}|${statusFilter}|${cityFilter}|${createdFilter}|${perPage}`}
          initialQ={q}
          initialStatus={statusFilter || "all"}
          initialCity={cityFilter}
          initialCreatedWithin={createdFilter}
          initialPerPage={String(perPage)}
          totalCount={total}
          filteredCount={totalFiltered}
          cityOptions={cityOptions}
        />
      </section>

      {recentActivity.length > 0 ? (
        <section className="rounded-3xl border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur md:p-6">
          <h2 className="text-lg font-bold text-[rgb(var(--navy))]">Activite recente</h2>
          <div className="mt-3 space-y-2">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs text-black/70">
                <span className="font-semibold text-[rgb(var(--navy))]">{formatLogAction(item.action)}</span>
                <span className="text-black/50">|</span>
                <span>{new Date(item.created_at).toLocaleString("fr-FR")}</span>
                {item.previous_status || item.next_status ? (
                  <>
                    <span className="text-black/50">|</span>
                    <span>
                      {item.previous_status || "-"} {"->"} {item.next_status || "-"}
                    </span>
                  </>
                ) : null}
                <span className="text-black/50">|</span>
                <span className="truncate">Agence: {item.agency_user_id}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        {paginatedAgencies.map((agency) => {
          const status = agency.user_metadata?.agency_status ?? "pending";
          const isActive = status === "active";
          const agencyName = agency.user_metadata?.agency_name || agency.email || agency.id;
          const meta = (agency.user_metadata ?? {}) as NonNullable<AgencyUser["user_metadata"]>;
          const checks = getValidationChecks(meta);
          const missing = checks.filter((x) => !x.ok);
          const canActivate = !!agency.email_confirmed_at && missing.length === 0;
          const completeness = `${checks.length - missing.length}/${checks.length}`;
          const agencyLogs = (activityByAgency.get(agency.id) ?? []).slice(0, 5);

          return (
            <article
              key={agency.id}
              className="rounded-3xl border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur md:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-xl bg-[rgb(var(--navy))]/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
                    <Building2 size={13} />
                    Agence
                  </div>
                  <h2 className="mt-2 text-xl font-extrabold tracking-tight text-[rgb(var(--navy))]">{agencyName}</h2>
                  <div className="mt-1 inline-flex items-center gap-1.5 text-sm text-black/65">
                    <Mail size={14} className="text-[rgb(var(--navy))]/70" />
                    {agency.email || "-"}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2 py-1 text-black/60">
                      <Calendar size={12} />
                      Cree le {new Date(agency.created_at).toLocaleString("fr-FR")}
                    </span>
                    {agency.last_sign_in_at ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2 py-1 text-black/60">
                        <Clock3 size={12} />
                        Derniere connexion: {new Date(agency.last_sign_in_at).toLocaleString("fr-FR")}
                      </span>
                    ) : null}
                    {agency.email_confirmed_at ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">
                        <MailCheck size={12} />
                        Email confirme: {new Date(agency.email_confirmed_at).toLocaleString("fr-FR")}
                      </span>
                    ) : null}
                  </div>
                </div>

                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusPill(status)}`}>
                  {status}
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
                  <div className="grid gap-3 text-sm md:grid-cols-2">
                    <Info label="Responsable" value={fmt(meta.agency_manager_name)} icon={<UserRound size={15} />} tone="blue" />
                    <Info label="Telephone" value={fmt(meta.agency_phone)} icon={<Phone size={15} />} tone="blue" />
                    <Info label="WhatsApp" value={fmt(meta.agency_whatsapp)} icon={<MessageCircle size={15} />} tone="green" />
                    <Info label="Ville" value={fmt(meta.agency_city)} icon={<MapPin size={15} />} tone="blue" />
                    <Info label="Adresse" value={fmt(meta.agency_address)} icon={<MapPin size={15} />} tone="blue" />
                    <Info label="Site web" value={fmt(meta.agency_website)} icon={<Globe2 size={15} />} tone="blue" />
                    <Info label="Zones" value={fmt(meta.agency_service_areas)} icon={<MapPin size={15} />} tone="blue" />
                    <Info label="Experience" value={fmt(meta.agency_years_experience)} icon={<BadgeCheck size={15} />} tone="emerald" />
                    <Info label="Profil complete" value={meta.profile_completed_at ? new Date(meta.profile_completed_at).toLocaleString("fr-FR") : "-"} icon={<CheckCircle2 size={15} />} tone="emerald" />
                    <Info label="Derniere MAJ profil" value={meta.agency_profile_updated_at ? new Date(meta.agency_profile_updated_at).toLocaleString("fr-FR") : "-"} icon={<Clock3 size={15} />} tone="blue" />
                    <Info label="Derniere MAJ statut" value={meta.agency_status_updated_at ? new Date(meta.agency_status_updated_at).toLocaleString("fr-FR") : "-"} icon={<ShieldAlert size={15} />} tone="blue" />
                    <Info label="Activation" value={meta.agency_activated_at ? new Date(meta.agency_activated_at).toLocaleString("fr-FR") : "-"} icon={<BadgeCheck size={15} />} tone="emerald" />
                  </div>

                  <div className="rounded-xl border border-black/10 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-[rgb(var(--navy))]">Validation dossier</div>
                      <div className="text-xs font-medium text-black/60">Completude: {completeness}</div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {checks.map((check) => (
                        <div
                          key={check.key}
                          className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
                            check.ok
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-red-200 bg-red-50 text-red-700"
                          }`}
                        >
                          {check.ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                          {check.label}
                        </div>
                      ))}
                    </div>
                    {!canActivate ? (
                      <p className="mt-2 text-xs text-red-600">Activation indisponible tant que les champs obligatoires sont incomplets.</p>
                    ) : (
                      <p className="mt-2 text-xs text-emerald-700">Dossier valide pour activation.</p>
                    )}
                  </div>

                  <form
                    className="rounded-xl border border-black/10 bg-white/80 p-3"
                    action={async (formData) => {
                      "use server";
                      await updateAgencyStatus(String(formData.get("user_id") || ""), String(formData.get("agency_status") || "pending"));
                    }}
                  >
                    <input type="hidden" name="user_id" value={agency.id} />
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="text-sm">
                        <div className="mb-1 font-medium text-black/70">Statut</div>
                        <AppDropdown
                          name="agency_status"
                          defaultValue={status}
                          triggerClassName="h-10 min-w-[190px]"
                          options={[
                            { value: "pending", label: "en attente", disabled: isActive },
                            {
                              value: "active",
                              label: "active",
                              disabled: !canActivate && status !== "active",
                            },
                            { value: "suspended", label: "suspendue" },
                          ]}
                        />
                      </label>
                      <button
                        type="submit"
                        className="h-10 rounded-xl bg-[rgb(var(--navy))] px-5 text-xs font-semibold tracking-wide text-white shadow-sm transition hover:opacity-95"
                      >
                        Enregistrer statut
                      </button>
                    </div>
                    {isActive ? (
                      <p className="mt-2 text-xs text-[rgb(var(--navy))]">Statut verrouille: une agence active ne peut pas revenir en pending.</p>
                    ) : null}
                  </form>

                  <details className="group overflow-hidden rounded-2xl border border-black/10 bg-gradient-to-b from-white to-slate-50/70 shadow-sm">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[rgb(var(--navy))] transition group-open:border-b group-open:border-black/10 md:px-5 md:py-4">
                      Editer details agence
                    </summary>
                    <form action={updateAgencyDetails} className="grid gap-3 border-t border-black/10 p-4 md:grid-cols-2 md:p-5">
                      <input type="hidden" name="user_id" value={agency.id} />

                      <label className="space-y-1.5 text-sm">
                        <div className="mb-1 font-medium text-black/70">Nom agence *</div>
                        <input
                          name="agency_name"
                          required
                          defaultValue={String(meta.agency_name ?? "")}
                          className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 outline-none transition focus:border-[rgb(var(--navy))]/40"
                        />
                      </label>

                      <label className="space-y-1.5 text-sm">
                        <div className="mb-1 font-medium text-black/70">Responsable *</div>
                        <input
                          name="agency_manager_name"
                          required
                          defaultValue={String(meta.agency_manager_name ?? "")}
                          className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 outline-none transition focus:border-[rgb(var(--navy))]/40"
                        />
                      </label>

                      <label className="space-y-1.5 text-sm">
                        <div className="mb-1 font-medium text-black/70">Telephone *</div>
                        <input
                          name="agency_phone"
                          required
                          defaultValue={String(meta.agency_phone ?? "")}
                          className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 outline-none transition focus:border-[rgb(var(--navy))]/40"
                        />
                      </label>

                      <label className="space-y-1.5 text-sm">
                        <div className="mb-1 font-medium text-black/70">WhatsApp</div>
                        <input
                          name="agency_whatsapp"
                          defaultValue={String(meta.agency_whatsapp ?? "")}
                          className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 outline-none transition focus:border-[rgb(var(--navy))]/40"
                        />
                      </label>

                      <label className="space-y-1.5 text-sm">
                        <div className="mb-1 font-medium text-black/70">Ville *</div>
                        <input
                          name="agency_city"
                          required
                          defaultValue={String(meta.agency_city ?? "")}
                          className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 outline-none transition focus:border-[rgb(var(--navy))]/40"
                        />
                      </label>

                      <label className="space-y-1.5 text-sm">
                        <div className="mb-1 font-medium text-black/70">Adresse *</div>
                        <input
                          name="agency_address"
                          required
                          defaultValue={String(meta.agency_address ?? "")}
                          className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 outline-none transition focus:border-[rgb(var(--navy))]/40"
                        />
                      </label>

                      <label className="space-y-1.5 text-sm">
                        <div className="mb-1 font-medium text-black/70">Site web</div>
                        <input
                          name="agency_website"
                          defaultValue={String(meta.agency_website ?? "")}
                          className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 outline-none transition focus:border-[rgb(var(--navy))]/40"
                        />
                      </label>

                      <label className="space-y-1.5 text-sm">
                        <div className="mb-1 font-medium text-black/70">Annees d&apos;experience</div>
                        <input
                          name="agency_years_experience"
                          type="number"
                          min={0}
                          defaultValue={String(meta.agency_years_experience ?? "")}
                          className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 outline-none transition focus:border-[rgb(var(--navy))]/40"
                        />
                      </label>

                      <label className="space-y-1.5 text-sm md:col-span-2">
                        <div className="mb-1 font-medium text-black/70">Zones (separees par virgules)</div>
                        <input
                          name="agency_service_areas"
                          defaultValue={serviceAreasForInput(meta.agency_service_areas)}
                          className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 outline-none transition focus:border-[rgb(var(--navy))]/40"
                        />
                      </label>

                      <div className="md:col-span-2">
                        <button
                          type="submit"
                          className="h-10 rounded-xl bg-[rgb(var(--navy))] px-5 text-xs font-semibold tracking-wide text-white shadow-sm transition hover:opacity-95"
                        >
                          Enregistrer details
                        </button>
                      </div>
                    </form>
                  </details>

                  <div className="rounded-2xl border border-black/10 bg-white p-3">
                    <div className="text-sm font-semibold text-[rgb(var(--navy))]">Historique agence</div>
                    <div className="mt-2 space-y-2">
                      {agencyLogs.length > 0 ? (
                        agencyLogs.map((log) => (
                          <div key={log.id} className="rounded-xl border border-black/10 bg-slate-50/70 px-3 py-2 text-xs text-black/70">
                            <div className="font-semibold text-[rgb(var(--navy))]">{formatLogAction(log.action)}</div>
                            <div className="mt-1">{new Date(log.created_at).toLocaleString("fr-FR")}</div>
                            {log.previous_status || log.next_status ? (
                              <div className="mt-1">
                                {log.previous_status || "-"} {"->"} {log.next_status || "-"}
                              </div>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-black/50">Aucune activite enregistree.</div>
                      )}
                    </div>
                  </div>
                </div>
              </details>
            </article>
          );
        })}

        {paginatedAgencies.length === 0 && (
          <div className="rounded-2xl border border-black/10 bg-white/75 p-6 text-sm text-black/60">
            Aucun resultat pour les filtres actuels.
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/75 p-4 text-sm">
            <div className="text-black/60">
              Page {currentPage} / {totalPages}
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
            </div>
          </div>
        ) : null}

        {emailPendingAgencies.length > 0 ? (
          <div className="rounded-2xl border border-black/10 bg-white/75 p-5 text-sm text-black/65">
            <div className="font-semibold text-[rgb(var(--navy))]">Agences non visibles pour validation (email non confirme)</div>
            <div className="mt-2">
              {emailPendingAgencies
                .slice(0, 10)
                .map((agency) => agency.user_metadata?.agency_name || agency.email || agency.id)
                .join(" | ")}
            </div>
          </div>
        ) : null}
      </section>
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
    <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
      <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-black/50">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-extrabold text-[rgb(var(--navy))]">{value}</div>
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
