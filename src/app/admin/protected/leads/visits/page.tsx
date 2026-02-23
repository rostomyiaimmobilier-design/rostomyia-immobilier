import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  CalendarClock,
  Clock3,
  Eye,
  Hourglass,
  MessageSquare,
  Phone,
  Sparkles,
  UserCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateViewingRequestStatus } from "../actions";
import ViewingRequestsFilters from "./ViewingRequestsFilters";
import AppDropdown from "@/components/ui/app-dropdown";

const STATUS = ["new", "contacted", "scheduled", "closed"] as const;

type ViewingRequestRow = {
  id: string;
  created_at: string;
  lang: string | null;
  property_ref: string | null;
  name: string | null;
  phone: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  message: string | null;
  status: string | null;
};

type SearchParams = Record<string, string | string[] | undefined>;

function fmt(value: string | null | undefined) {
  const v = (value || "").trim();
  return v || "-";
}

function firstParam(input: string | string[] | undefined) {
  if (Array.isArray(input)) return input[0] ?? "";
  return input ?? "";
}

function normalizeFold(input: string | null | undefined) {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function statusLabel(status: string | null | undefined) {
  if (status === "contacted") return "contacte";
  if (status === "scheduled") return "planifie";
  if (status === "closed") return "ferme";
  return "nouveau";
}

function statusPill(status: string | null) {
  switch (status) {
    case "scheduled":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "contacted":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "closed":
      return "border-slate-300 bg-slate-100 text-slate-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

export default async function ViewingRequestsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const q = firstParam(params.q).trim();
  const statusFilter = firstParam(params.status).trim().toLowerCase();
  const langFilter = firstParam(params.lang).trim().toLowerCase();
  const createdFilter = firstParam(params.created_within).trim();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("viewing_requests")
    .select("id, created_at, lang, property_ref, name, phone, preferred_date, preferred_time, message, status")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
          Error loading viewing requests: {error.message}
        </div>
      </div>
    );
  }

  const requests = ((data ?? []) as ViewingRequestRow[]) ?? [];
  const qFold = normalizeFold(q);
  const createdDays = createdFilter === "7" || createdFilter === "30" || createdFilter === "90" ? Number(createdFilter) : 0;
  const referenceTs = requests
    .map((x) => new Date(x.created_at).getTime())
    .filter((ts) => Number.isFinite(ts))
    .reduce<number | null>((max, ts) => (max === null || ts > max ? ts : max), null);

  const filteredRequests = requests.filter((x) => {
    const normalizedStatus = String(x.status ?? "new").toLowerCase();
    const normalizedLang = String(x.lang ?? "fr").toLowerCase();

    if (statusFilter && statusFilter !== "all" && normalizedStatus !== statusFilter) return false;
    if (langFilter && langFilter !== "all" && normalizedLang !== langFilter) return false;

    if (createdDays > 0) {
      const createdAtTs = new Date(x.created_at).getTime();
      if (!Number.isFinite(createdAtTs) || referenceTs === null) return false;
      const ageDays = (referenceTs - createdAtTs) / (1000 * 60 * 60 * 24);
      if (ageDays > createdDays) return false;
    }

    if (!qFold) return true;

    const haystack = normalizeFold(
      [
        x.property_ref,
        x.name,
        x.phone,
        x.message,
        x.preferred_date,
        x.preferred_time,
      ].join(" ")
    );

    return haystack.includes(qFold);
  });

  const total = filteredRequests.length;
  const fresh = filteredRequests.filter((x) => (x.status ?? "new") === "new").length;
  const contacted = filteredRequests.filter((x) => x.status === "contacted").length;
  const scheduled = filteredRequests.filter((x) => x.status === "scheduled").length;

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/80 p-6 backdrop-blur md:p-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 -top-16 h-56 w-56 rounded-full bg-[rgb(var(--gold))]/18 blur-3xl" />
          <div className="absolute right-0 top-8 h-52 w-52 rounded-full bg-[rgb(var(--navy))]/10 blur-3xl" />
        </div>

        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--gold))]/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
              <Sparkles size={14} />
              Visit Desk
            </div>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight text-[rgb(var(--navy))]">Demandes de visite</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-black/65">
              Suivez les nouvelles demandes, qualifiez les contacts et planifiez les visites depuis un flux unique.
            </p>
          </div>
          <Link
            href="/admin/protected/leads"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm font-medium text-[rgb(var(--navy))] hover:bg-black/5"
          >
            <ArrowLeft size={15} />
            Retour
          </Link>
        </div>

        <div className="relative mt-7 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <StatCard label="Total" value={String(total)} icon={<CalendarClock size={15} />} />
          <StatCard label="Nouvelles" value={String(fresh)} icon={<Hourglass size={15} />} />
          <StatCard label="Contactees" value={String(contacted)} icon={<Phone size={15} />} />
          <StatCard label="Planifiees" value={String(scheduled)} icon={<BadgeCheck size={15} />} />
        </div>

        <ViewingRequestsFilters
          key={`${q}|${statusFilter}|${langFilter}|${createdFilter}`}
          initialQ={q}
          initialStatus={statusFilter || "all"}
          initialLang={langFilter || "all"}
          initialCreatedWithin={createdFilter}
          totalCount={requests.length}
          filteredCount={filteredRequests.length}
        />
      </section>

      <section className="space-y-5">
        {filteredRequests.map((x) => (
          <article
            key={x.id}
            className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/92 p-6 ring-1 ring-white/70 backdrop-blur md:p-7"
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[rgb(var(--gold))]/15 blur-2xl" />
              <div className="absolute -left-8 bottom-0 h-20 w-20 rounded-full bg-[rgb(var(--navy))]/8 blur-2xl" />
            </div>

            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/95 px-3 py-1 text-xs text-black/65">
                  <Clock3 size={12} />
                  {new Date(x.created_at).toLocaleString("fr-FR")}
                  {x.lang ? ` | ${x.lang.toUpperCase()}` : ""}
                </div>
                <h2 className="mt-2 inline-flex items-center gap-2 text-xl font-bold leading-tight text-[rgb(var(--navy))]">
                  <UserCircle2 size={18} />
                  {fmt(x.name)}
                </h2>
                <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-black/10 bg-black/5 px-3 py-1.5 text-sm text-black/70">
                  <Phone size={14} />
                  {fmt(x.phone)}
                </div>
              </div>

              <span
                className={`relative inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusPill(
                  x.status
                )}`}
              >
                {statusLabel(x.status)}
              </span>
            </div>

            <div className="my-5 h-px w-full bg-gradient-to-r from-transparent via-black/10 to-transparent" />

            <div className="relative grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
              <div className="rounded-2xl border border-black/10 bg-white/95 p-4 text-sm">
                <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-black/50">
                  <Eye size={12} />
                  Bien
                </div>
                <div className="mt-2 inline-flex rounded-full border border-black/10 bg-black/5 px-2.5 py-1 text-xs font-semibold text-[rgb(var(--navy))]">
                  {x.property_ref ? `REF: ${x.property_ref}` : "REF: -"}
                </div>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  {x.property_ref ? (
                    <a
                      href={`/biens/${encodeURIComponent(x.property_ref)}`}
                      className="inline-flex h-9 items-center gap-1 rounded-lg border border-black/10 bg-white px-3 text-xs font-medium text-[rgb(var(--navy))] hover:bg-black/5"
                    >
                      <Eye size={12} />
                      Voir bien
                    </a>
                  ) : null}
                  <Link
                    href={`/admin/protected/leads/visits/plan/${x.id}`}
                    className="inline-flex h-9 items-center gap-1 rounded-lg bg-[rgb(var(--navy))] px-3 text-xs font-semibold text-white hover:opacity-95"
                  >
                    Planifier
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-white/95 p-4 text-sm">
                <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-black/50">
                  <CalendarDays size={12} />
                  Preference
                </div>
                <div className="mt-3 grid gap-2.5">
                  <div className="rounded-xl border border-black/10 bg-black/5 px-3 py-2 text-xs text-black/70">
                    <span className="font-semibold text-black/85">Date:</span>{" "}
                    {x.preferred_date ? String(x.preferred_date) : "-"}
                  </div>
                  <div className="rounded-xl border border-black/10 bg-black/5 px-3 py-2 text-xs text-black/70">
                    <span className="font-semibold text-black/85">Heure:</span> {x.preferred_time ?? "-"}
                  </div>
                </div>
              </div>

              <form
                className="rounded-2xl border border-black/10 bg-white/95 p-4"
                action={async (formData) => {
                  "use server";
                  const status = String(formData.get("status") || "new");
                  await updateViewingRequestStatus(x.id, status);
                }}
              >
                <div className="text-xs uppercase tracking-wide text-black/50">Mise a jour statut</div>
                <AppDropdown
                  name="status"
                  defaultValue={x.status ?? "new"}
                  className="mt-3"
                  triggerClassName="h-11"
                  options={STATUS.map((s) => ({ value: s, label: s }))}
                />
                <button className="mt-3 h-11 w-full rounded-xl bg-[rgb(var(--navy))] px-3 text-xs font-semibold text-white hover:opacity-95">
                  Enregistrer
                </button>
              </form>
            </div>

            {x.message ? (
              <div className="relative mt-4 rounded-2xl border border-black/10 bg-[rgb(var(--navy))]/[0.03] p-4 text-sm text-black/70">
                <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-black/50">
                  <MessageSquare size={12} />
                  Message client
                </div>
                <div className="mt-2 whitespace-pre-wrap break-words rounded-lg border border-black/10 bg-white/90 px-3 py-3 leading-relaxed">
                  {x.message}
                </div>
              </div>
            ) : null}
          </article>
        ))}

        {filteredRequests.length === 0 && (
          <div className="rounded-2xl border border-black/10 bg-white/75 p-6 text-sm text-black/60">
            Aucun resultat pour les filtres actuels.
          </div>
        )}
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
    <div className="rounded-2xl border border-black/10 bg-white/95 p-4 ring-1 ring-white/70">
      <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-black/50">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-extrabold leading-none text-[rgb(var(--navy))]">{value}</div>
    </div>
  );
}
