import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  Clock3,
  Eye,
  Hourglass,
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
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/75 p-6 shadow-sm backdrop-blur md:p-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 -top-16 h-56 w-56 rounded-full bg-[rgb(var(--gold))]/18 blur-3xl" />
          <div className="absolute right-0 top-8 h-52 w-52 rounded-full bg-[rgb(var(--navy))]/10 blur-3xl" />
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--gold))]/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
              <Sparkles size={14} />
              Visit Desk
            </div>
            <h1 className="mt-3 text-3xl font-extrabold text-[rgb(var(--navy))]">Demandes de visite</h1>
            <p className="mt-2 max-w-2xl text-sm text-black/65">
              Suivez les nouvelles demandes, qualifiez les contacts et planifiez les visites depuis un flux unique.
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

        <div className="relative mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
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

      <section className="space-y-4">
        {filteredRequests.map((x) => (
          <article
            key={x.id}
            className="rounded-3xl border border-black/10 bg-white/82 p-5 shadow-sm backdrop-blur md:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs text-black/65">
                  <Clock3 size={12} />
                  {new Date(x.created_at).toLocaleString("fr-FR")}
                  {x.lang ? ` | ${x.lang.toUpperCase()}` : ""}
                </div>
                <h2 className="mt-2 inline-flex items-center gap-2 text-lg font-bold text-[rgb(var(--navy))]">
                  <UserCircle2 size={18} />
                  {fmt(x.name)}
                </h2>
                <div className="mt-1 inline-flex items-center gap-2 text-sm text-black/70">
                  <Phone size={14} />
                  {fmt(x.phone)}
                </div>
              </div>

              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusPill(
                  x.status
                )}`}
              >
                {statusLabel(x.status)}
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-black/10 bg-white p-3 text-sm">
                <div className="text-xs uppercase tracking-wide text-black/50">Bien</div>
                <div className="mt-1 font-semibold text-slate-900">{x.property_ref ? `REF: ${x.property_ref}` : "-"}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {x.property_ref ? (
                    <a
                      href={`/biens/${encodeURIComponent(x.property_ref)}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs font-medium text-[rgb(var(--navy))] hover:bg-black/5"
                    >
                      <Eye size={12} />
                      Voir bien
                    </a>
                  ) : null}
                  <Link
                    href={`/admin/protected/leads/visits/plan/${x.id}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-[rgb(var(--navy))] px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-95"
                  >
                    Planifier
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-white p-3 text-sm">
                <div className="text-xs uppercase tracking-wide text-black/50">Preference</div>
                <div className="mt-1 text-slate-900">{x.preferred_date ? String(x.preferred_date) : "-"}</div>
                <div className="text-xs text-black/60">{x.preferred_time ?? "-"}</div>
              </div>

              <form
                className="rounded-2xl border border-black/10 bg-white p-3"
                action={async (formData) => {
                  "use server";
                  const status = String(formData.get("status") || "new");
                  await updateViewingRequestStatus(x.id, status);
                }}
              >
                <div className="text-xs uppercase tracking-wide text-black/50">Mise a jour</div>
                <AppDropdown
                  name="status"
                  defaultValue={x.status ?? "new"}
                  className="mt-2"
                  triggerClassName="h-10"
                  options={STATUS.map((s) => ({ value: s, label: s }))}
                />
                <button className="mt-2 h-10 w-full rounded-xl bg-[rgb(var(--navy))] px-3 text-xs font-semibold text-white hover:opacity-95">
                  Enregistrer
                </button>
              </form>
            </div>

            {x.message ? (
              <div className="mt-3 rounded-2xl border border-black/10 bg-white p-3 text-sm text-black/70">
                <div className="text-xs uppercase tracking-wide text-black/50">Message client</div>
                <div className="mt-1 whitespace-pre-wrap break-words">{x.message}</div>
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
    <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
      <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-black/50">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-extrabold text-[rgb(var(--navy))]">{value}</div>
    </div>
  );
}
