import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Inbox,
  ListFilter,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { hasAdminWriteAccess } from "@/lib/admin-auth";
import AdminNotificationIcon from "@/components/admin/AdminNotificationIcon";

type NotificationRow = {
  id: number;
  event_type: string | null;
  icon_key: string | null;
  title: string | null;
  body: string | null;
  href: string | null;
  is_read: boolean | null;
  read_at: string | null;
  created_at: string | null;
};

type SearchParams = Record<string, string | string[] | undefined>;

const DEFAULT_PAGE_SIZE = 12;
const PAGE_SIZE_OPTIONS = [12, 24, 48] as const;
const SORT_OPTIONS = [
  { key: "created_desc", label: "Plus recents" },
  { key: "created_asc", label: "Plus anciens" },
  { key: "unread_first", label: "Non lues d'abord" },
  { key: "read_first", label: "Lues d'abord" },
  { key: "title_asc", label: "Titre A-Z" },
] as const;
const VIEW_OPTIONS = [
  { key: "all", label: "Toutes" },
  { key: "unread", label: "Non lues" },
  { key: "read", label: "Lues" },
] as const;

function isMissingAdminNotificationsTable(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("admin_notifications") && (m.includes("does not exist") || m.includes("relation"));
}

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function parsePage(value: string | string[] | undefined) {
  const n = Number.parseInt(firstParam(value), 10);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return n;
}

function parsePageSize(value: string | string[] | undefined) {
  const n = Number.parseInt(firstParam(value), 10);
  if (!Number.isFinite(n)) return DEFAULT_PAGE_SIZE;
  return PAGE_SIZE_OPTIONS.includes(n as (typeof PAGE_SIZE_OPTIONS)[number]) ? n : DEFAULT_PAGE_SIZE;
}

function parseSort(value: string | string[] | undefined) {
  const raw = firstParam(value).trim().toLowerCase();
  if (SORT_OPTIONS.some((option) => option.key === raw)) return raw as (typeof SORT_OPTIONS)[number]["key"];
  return "created_desc";
}

function parseView(value: string | string[] | undefined) {
  const raw = firstParam(value).trim().toLowerCase();
  if (VIEW_OPTIONS.some((option) => option.key === raw)) return raw as (typeof VIEW_OPTIONS)[number]["key"];
  return "all";
}

function safeReturnTo(input: FormDataEntryValue | null) {
  const raw = String(input ?? "").trim();
  if (!raw.startsWith("/admin/protected/notifications")) return "/admin/protected/notifications";
  return raw;
}

function eventTypeLabel(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return "Evenement";
  return raw
    .replace(/_/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function eventTypeTone(value: string | null | undefined) {
  const key = String(value ?? "").toLowerCase();
  if (key.includes("reservation")) return "border-blue-200 bg-blue-50 text-blue-700";
  if (key.includes("lead") || key.includes("owner") || key.includes("depot")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (key.includes("agency") || key.includes("user")) return "border-violet-200 bg-violet-50 text-violet-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function fmtDate(value: string | null | undefined) {
  const txt = String(value ?? "").trim();
  if (!txt) return "-";
  const d = new Date(txt);
  if (!Number.isFinite(d.getTime())) return txt;
  return d.toLocaleString("fr-FR");
}

async function markOneAsRead(formData: FormData) {
  "use server";
  const id = Number(formData.get("id") ?? 0);
  const returnTo = safeReturnTo(formData.get("returnTo"));
  if (!Number.isFinite(id) || id <= 0) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const canWrite = await hasAdminWriteAccess(supabase, user);
  if (!canWrite) redirect("/admin/protected/notifications?error=read_only_admin");

  await supabase
    .from("admin_notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/admin/protected");
  revalidatePath("/admin/protected/notifications");
  redirect(returnTo);
}

async function markAllAsRead(formData: FormData) {
  "use server";
  const returnTo = safeReturnTo(formData.get("returnTo"));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const canWrite = await hasAdminWriteAccess(supabase, user);
  if (!canWrite) redirect("/admin/protected/notifications?error=read_only_admin");

  await supabase
    .from("admin_notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("is_read", false);

  revalidatePath("/admin/protected");
  revalidatePath("/admin/protected/notifications");
  redirect(returnTo);
}

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const accessError = firstParam(params.error);
  const requestedPage = parsePage(params.page);
  const perPage = parsePageSize(params.perPage);
  const sort = parseSort(params.sort);
  const view = parseView(params.view);

  const supabase = await createClient();

  let countQuery = supabase.from("admin_notifications").select("id", { count: "exact", head: true });
  if (view === "unread") countQuery = countQuery.eq("is_read", false);
  if (view === "read") countQuery = countQuery.eq("is_read", true);
  const countResult = await countQuery;

  if (countResult.error) {
    return (
      <div className="space-y-6">
        <section className="rounded-3xl border border-black/10 bg-white/80 p-6 md:p-8">
          <h1 className="text-3xl font-extrabold text-[rgb(var(--navy))]">Notifications admin</h1>
          <p className="mt-2 text-sm text-black/60">Flux des evenements detectes sur la plateforme.</p>
        </section>
        <div
          className={`rounded-2xl border p-4 text-sm ${
            isMissingAdminNotificationsTable(countResult.error.message)
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {isMissingAdminNotificationsTable(countResult.error.message)
            ? "Table admin_notifications absente. Lancez la migration 2026-02-23-add-admin-notifications-system.sql."
            : `Error loading notifications: ${countResult.error.message}`}
        </div>
      </div>
    );
  }

  const totalCount = countResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  const currentPage = Math.min(requestedPage, totalPages);
  const from = (currentPage - 1) * perPage;
  const to = Math.max(from, from + perPage - 1);

  let dataQuery = supabase
    .from("admin_notifications")
    .select("id, event_type, icon_key, title, body, href, is_read, read_at, created_at");
  if (view === "unread") dataQuery = dataQuery.eq("is_read", false);
  if (view === "read") dataQuery = dataQuery.eq("is_read", true);

  if (sort === "created_asc") {
    dataQuery = dataQuery.order("created_at", { ascending: true });
  } else if (sort === "unread_first") {
    dataQuery = dataQuery.order("is_read", { ascending: true }).order("created_at", { ascending: false });
  } else if (sort === "read_first") {
    dataQuery = dataQuery.order("is_read", { ascending: false }).order("created_at", { ascending: false });
  } else if (sort === "title_asc") {
    dataQuery = dataQuery.order("title", { ascending: true }).order("created_at", { ascending: false });
  } else {
    dataQuery = dataQuery.order("created_at", { ascending: false });
  }

  const { data, error } = await dataQuery.range(from, to);

  let unreadCount = 0;
  const unreadResult = await supabase
    .from("admin_notifications")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);
  if (!unreadResult.error) unreadCount = unreadResult.count ?? 0;

  if (error) {
    return (
      <div className="space-y-6">
        <section className="rounded-3xl border border-black/10 bg-white/80 p-6 md:p-8">
          <h1 className="text-3xl font-extrabold text-[rgb(var(--navy))]">Notifications admin</h1>
          <p className="mt-2 text-sm text-black/60">Flux des evenements detectes sur la plateforme.</p>
        </section>
        <div
          className={`rounded-2xl border p-4 text-sm ${
            isMissingAdminNotificationsTable(error.message)
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {isMissingAdminNotificationsTable(error.message)
            ? "Table admin_notifications absente. Lancez la migration 2026-02-23-add-admin-notifications-system.sql."
            : `Error loading notifications: ${error.message}`}
        </div>
      </div>
    );
  }

  const rows = (data ?? []) as NotificationRow[];

  const baseParams = new URLSearchParams();
  if (sort !== "created_desc") baseParams.set("sort", sort);
  if (view !== "all") baseParams.set("view", view);
  if (perPage !== DEFAULT_PAGE_SIZE) baseParams.set("perPage", String(perPage));

  function withParams(overrides: Record<string, string | number | null>) {
    const params = new URLSearchParams(baseParams);
    Object.entries(overrides).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    const query = params.toString();
    return `/admin/protected/notifications${query ? `?${query}` : ""}`;
  }

  const returnTo = withParams({ page: currentPage });
  const currentSortLabel = SORT_OPTIONS.find((option) => option.key === sort)?.label ?? SORT_OPTIONS[0].label;
  const currentViewLabel = VIEW_OPTIONS.find((option) => option.key === view)?.label ?? VIEW_OPTIONS[0].label;
  const readCount = Math.max(0, totalCount - unreadCount);
  const rangeStart = totalCount === 0 ? 0 : from + 1;
  const rangeEnd = Math.min(totalCount, from + rows.length);
  const pageWindowStart = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const pageWindowEnd = Math.min(totalPages, Math.max(currentPage + 2, 5));
  const pageItems: number[] = [];
  for (let page = pageWindowStart; page <= pageWindowEnd; page += 1) pageItems.push(page);

  return (
    <div className="space-y-8">
      {accessError === "read_only_admin" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Compte admin en lecture seule: marquage des notifications desactive.
        </div>
      ) : null}
      <section className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/80 p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 top-0 h-52 w-52 rounded-full bg-[rgb(var(--gold))]/20 blur-3xl" />
          <div className="absolute right-0 top-8 h-56 w-56 rounded-full bg-[rgb(var(--navy))]/10 blur-3xl" />
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--gold))]/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
              <Bell size={14} />
              Admin Alerts
            </div>
            <h1 className="mt-3 text-3xl font-extrabold text-[rgb(var(--navy))]">Notifications admin</h1>
            <p className="mt-2 text-sm text-black/60">
              Vue complete des notifications avec tri, filtres et pagination.
            </p>
          </div>

          <div className="relative flex flex-wrap items-center gap-2">
            <div className="inline-flex h-10 items-center rounded-xl border border-black/10 bg-white px-3 text-sm text-black/70">
              Non lues: <span className="ml-1 font-semibold text-[rgb(var(--navy))]">{unreadCount}</span>
            </div>
            <form action={markAllAsRead}>
              <input type="hidden" name="returnTo" value={returnTo} />
              <button
                disabled={unreadCount <= 0}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-black/10 bg-white px-3 text-sm font-medium text-[rgb(var(--navy))] hover:bg-black/5 disabled:pointer-events-none disabled:opacity-50"
              >
                <CheckCheck size={14} />
                Tout marquer lu
              </button>
            </form>
            <Link
              href="/admin/protected"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-black/10 bg-white px-3 text-sm font-medium text-[rgb(var(--navy))] hover:bg-black/5"
            >
              <ArrowLeft size={14} />
              Retour
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-black/10 bg-[linear-gradient(130deg,rgba(255,255,255,0.98),rgba(var(--gold),0.14))] p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-black/55">Total</div>
          <div className="mt-2 text-2xl font-extrabold text-[rgb(var(--navy))]">{totalCount}</div>
          <div className="mt-1 text-xs text-black/50">Notifications dans la vue active</div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-[linear-gradient(130deg,rgba(255,255,255,0.98),rgba(var(--navy),0.08))] p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-black/55">Non lues</div>
          <div className="mt-2 text-2xl font-extrabold text-[rgb(var(--navy))]">{unreadCount}</div>
          <div className="mt-1 text-xs text-black/50">Actions en attente de traitement</div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-black/55">Lues</div>
          <div className="mt-2 text-2xl font-extrabold text-[rgb(var(--navy))]">{readCount}</div>
          <div className="mt-1 text-xs text-black/50">Historique deja consulte</div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-black/55">Contexte</div>
          <div className="mt-2 text-sm font-bold text-[rgb(var(--navy))]">
            Tri: {currentSortLabel}
          </div>
          <div className="mt-1 text-xs text-black/60">
            Filtre: {currentViewLabel} | Page {currentPage}/{totalPages}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-black/10 bg-white/80 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-black/55">
            <ListFilter size={14} />
            Tri
          </div>
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((option) => {
              const isActive = sort === option.key;
              return (
                <Link
                  key={option.key}
                  href={withParams({ sort: option.key, page: 1 })}
                  className={`inline-flex h-9 items-center rounded-xl px-3 text-xs font-semibold transition ${
                    isActive
                      ? "border border-[rgb(var(--gold))]/55 bg-[rgb(var(--gold))]/20 text-[rgb(var(--navy))]"
                      : "border border-black/10 bg-white text-black/65 hover:bg-black/5"
                  }`}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-black/55">
            <Sparkles size={14} />
            Filtre
          </div>
          <div className="flex flex-wrap gap-2">
            {VIEW_OPTIONS.map((option) => {
              const isActive = view === option.key;
              return (
                <Link
                  key={option.key}
                  href={withParams({ view: option.key, page: 1 })}
                  className={`inline-flex h-9 items-center rounded-xl px-3 text-xs font-semibold transition ${
                    isActive
                      ? "border border-[rgb(var(--gold))]/55 bg-[rgb(var(--gold))]/20 text-[rgb(var(--navy))]"
                      : "border border-black/10 bg-white text-black/65 hover:bg-black/5"
                  }`}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            {PAGE_SIZE_OPTIONS.map((value) => {
              const isActive = perPage === value;
              return (
                <Link
                  key={value}
                  href={withParams({ perPage: value, page: 1 })}
                  className={`inline-flex h-9 items-center rounded-xl px-3 text-xs font-semibold transition ${
                    isActive
                      ? "border border-[rgb(var(--gold))]/55 bg-[rgb(var(--gold))]/20 text-[rgb(var(--navy))]"
                      : "border border-black/10 bg-white text-black/65 hover:bg-black/5"
                  }`}
                >
                  {value} / page
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {rows.map((row) => (
          <article
            key={row.id}
            className={`relative overflow-hidden rounded-2xl border p-4 transition ${
              row.is_read
                ? "border-black/10 bg-white/85 hover:-translate-y-0.5 hover:shadow-md"
                : "border-[rgb(var(--gold))]/45 bg-[rgb(var(--gold))]/10 hover:-translate-y-0.5 hover:shadow-md"
            }`}
          >
            <div className={`absolute inset-y-0 left-0 w-1 ${row.is_read ? "bg-slate-300" : "bg-[rgb(var(--navy))]"}`} />
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    row.is_read ? "bg-[rgb(var(--navy))]/10 text-[rgb(var(--navy))]" : "bg-[rgb(var(--navy))] text-white"
                  }`}
                >
                  <AdminNotificationIcon iconKey={row.icon_key} size={16} />
                </span>
                <div className="min-w-0">
                  <div className="inline-flex flex-wrap items-center gap-1.5">
                    <h2 className="text-sm font-semibold text-[rgb(var(--navy))]">{row.title ?? "Notification"}</h2>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        row.is_read
                          ? "border-black/10 bg-slate-100 text-black/55"
                          : "border-[rgb(var(--gold))]/45 bg-white text-[rgb(var(--navy))]"
                      }`}
                    >
                      {row.is_read ? "Lue" : "Non lue"}
                    </span>
                    {row.event_type ? (
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${eventTypeTone(
                          row.event_type
                        )}`}
                      >
                        {eventTypeLabel(row.event_type)}
                      </span>
                    ) : null}
                  </div>
                  {row.body ? (
                    <p className="mt-1 text-sm leading-6 text-black/65">{row.body}</p>
                  ) : (
                    <p className="mt-1 text-sm text-black/45">Aucun detail supplementaire pour cette notification.</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-black/50">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 size={12} />
                      Cree le {fmtDate(row.created_at)}
                    </span>
                    {row.is_read && row.read_at ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 size={12} />
                        Lue le {fmtDate(row.read_at)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-col sm:items-stretch sm:rounded-xl sm:border sm:border-black/10 sm:bg-white/85 sm:p-2">
                {row.href ? (
                  <Link
                    href={row.href}
                    aria-label="Ouvrir la notification"
                    title="Ouvrir"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 bg-white text-[rgb(var(--navy))] hover:bg-black/5"
                  >
                    <ExternalLink size={14} />
                  </Link>
                ) : null}
                {!row.is_read ? (
                  <form action={markOneAsRead}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <button
                      aria-label="Marquer la notification comme lue"
                      title="Marquer lu"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 bg-white text-[rgb(var(--navy))] hover:bg-black/5"
                    >
                      <Check size={14} />
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          </article>
        ))}

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-black/10 bg-white/80 p-8 text-center">
            <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <Inbox size={18} />
            </div>
            <div className="mt-3 text-sm font-semibold text-[rgb(var(--navy))]">Aucune notification dans cette vue</div>
            <div className="mt-1 text-sm text-black/55">Essayez un autre filtre ou revenez plus tard.</div>
          </div>
        ) : null}
      </section>

      {totalCount > 0 ? (
        <section className="rounded-2xl border border-black/10 bg-white/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-black/60">
              Affichage <span className="font-semibold text-[rgb(var(--navy))]">{rangeStart}</span>-
              <span className="font-semibold text-[rgb(var(--navy))]">{rangeEnd}</span> sur{" "}
              <span className="font-semibold text-[rgb(var(--navy))]">{totalCount}</span>
              <span className="ml-2 text-black/45">
                (Page {currentPage}/{totalPages})
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Link
                href={withParams({ page: Math.max(1, currentPage - 1) })}
                className={`inline-flex h-9 items-center rounded-lg border border-black/10 px-3 text-sm ${
                  currentPage <= 1 ? "pointer-events-none opacity-40" : "hover:bg-black/5"
                }`}
              >
                <ArrowLeft size={14} />
              </Link>
              {pageItems.map((page) => (
                <Link
                  key={page}
                  href={withParams({ page })}
                  className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-semibold transition ${
                    page === currentPage
                      ? "border border-[rgb(var(--gold))]/55 bg-[rgb(var(--gold))]/20 text-[rgb(var(--navy))]"
                      : "border border-black/10 bg-white text-black/70 hover:bg-black/5"
                  }`}
                >
                  {page}
                </Link>
              ))}
              <Link
                href={withParams({ page: Math.min(totalPages, currentPage + 1) })}
                className={`inline-flex h-9 items-center rounded-lg border border-black/10 px-3 text-sm ${
                  currentPage >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-black/5"
                }`}
              >
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
