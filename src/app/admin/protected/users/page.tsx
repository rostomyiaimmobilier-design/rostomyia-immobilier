import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Clock3,
  Lock,
  Mail,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import UserSuspendActionButton from "@/components/admin/UserSuspendActionButton";
import AppDropdown from "@/components/ui/app-dropdown";
import { hasAdminWriteAccess } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createManagedUser, suspendManagedUser, unsuspendManagedUser } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
type UserRole = "super_admin" | "admin" | "admin_read_only" | "user" | "agency";

type AuthUserLike = {
  id: string;
  email?: string | null;
  created_at?: string;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
  banned_until?: string | null;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
};

type UserRow = AuthUserLike & {
  role: UserRole;
  accountType: string;
  displayName: string;
  companyName: string;
  phone: string;
  isSuspended: boolean;
};

const PREMIUM_FIELD_LABEL_CLASS = "text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]/62";
const PREMIUM_FIELD_INPUT_CLASS =
  "h-10 w-full rounded-xl border border-[rgb(var(--navy))]/15 bg-[linear-gradient(180deg,#fff,rgba(248,250,252,0.96))] px-3 text-sm font-medium text-black/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] outline-none transition placeholder:text-black/35 focus:border-[rgb(var(--navy))]/45 focus:ring-2 focus:ring-[rgb(var(--gold))]/20";

function firstParam(input: string | string[] | undefined) {
  if (Array.isArray(input)) return input[0] ?? "";
  return input ?? "";
}

function toPositiveInt(input: string | undefined, fallback: number) {
  const n = Number(input ?? "");
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.trunc(n);
}

function normalizeFold(input: string | null | undefined) {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isTruthy(value: unknown) {
  if (value === true) return true;
  if (typeof value === "string") return value.toLowerCase() === "true";
  if (typeof value === "number") return value === 1;
  return false;
}

function textValue(value: unknown) {
  const txt = String(value ?? "").trim();
  return txt || "-";
}

function resolveRole(user: AuthUserLike): UserRole {
  const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;

  const roleCandidates = [userMeta.role, appMeta.role, Array.isArray(appMeta.roles) ? appMeta.roles[0] : null];
  for (const candidate of roleCandidates) {
    const role = String(candidate ?? "").trim().toLowerCase();
    if (role === "agency") return "agency";
    if (role === "super_admin") return "super_admin";
    if (role === "admin_read_only") return "admin_read_only";
    if (role === "admin") return "admin";
    if (role === "user") return "user";
  }

  const accountType = String(userMeta.account_type ?? "").trim().toLowerCase();
  if (accountType === "agency") return "agency";
  if (accountType === "super_admin") return "super_admin";
  if (accountType === "admin_read_only") return "admin_read_only";
  if (accountType === "admin") return "admin";

  if (isTruthy(userMeta.is_admin) || isTruthy(appMeta.is_admin)) return "admin";
  return "user";
}

function rolePill(role: UserRole) {
  if (role === "super_admin") return "border-amber-300 bg-amber-50 text-amber-700";
  if (role === "admin_read_only") return "border-blue-300 bg-blue-50 text-blue-700";
  if (role === "admin") return "border-[rgb(var(--navy))]/20 bg-[rgb(var(--navy))]/10 text-[rgb(var(--navy))]";
  if (role === "agency") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-black/15 bg-black/5 text-black/70";
}

function displayDate(value: string | null | undefined) {
  if (!value) return "-";
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return "-";
  return new Date(ts).toLocaleString("fr-FR");
}

function displayName(user: AuthUserLike) {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fullName = String(meta.full_name ?? "").trim();
  if (fullName) return fullName;

  const manager = String(meta.agency_manager_name ?? "").trim();
  if (manager) return manager;

  return user.email ?? user.id;
}

function isSuspended(user: Pick<AuthUserLike, "banned_until">) {
  const until = String(user.banned_until ?? "").trim();
  if (!until) return false;
  const ts = new Date(until).getTime();
  if (!Number.isFinite(ts)) return false;
  return ts > Date.now();
}

async function listAllUsers(admin: ReturnType<typeof supabaseAdmin>) {
  const perPage = 200;
  const maxPages = 15;
  const users: AuthUserLike[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);

    const chunk = (data.users ?? []) as AuthUserLike[];
    users.push(...chunk);

    if (chunk.length < perPage) break;
  }

  return users;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const {
    data: { user: actor },
  } = await supabase.auth.getUser();
  const canWrite = actor ? await hasAdminWriteAccess(supabase, actor) : false;

  const params = searchParams ? await searchParams : {};
  const successMessage = typeof params.success === "string" ? params.success : null;
  const errorMessage = typeof params.error === "string" ? params.error : null;
  const q = firstParam(params.q).trim();
  const roleFilter = firstParam(params.role).trim().toLowerCase();
  const perPage = Math.min(100, Math.max(10, toPositiveInt(firstParam(params.per_page), 20)));
  const requestedPage = toPositiveInt(firstParam(params.page), 1);

  let users: AuthUserLike[] = [];
  try {
    const admin = supabaseAdmin();
    users = await listAllUsers(admin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
        Error loading users: {message}
      </div>
    );
  }

  const normalizedQuery = normalizeFold(q);

  const rows = users
    .map((user) => {
      const role = resolveRole(user);
      const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>;

      return {
        ...user,
        role,
        accountType: textValue(userMeta.account_type),
        displayName: displayName(user),
        companyName: textValue(userMeta.company_name ?? userMeta.agency_name),
        phone: textValue(userMeta.phone ?? userMeta.agency_phone),
        isSuspended: isSuspended(user),
      } as UserRow;
    })
    .sort((a, b) => {
      const ta = new Date(a.created_at ?? "").getTime();
      const tb = new Date(b.created_at ?? "").getTime();
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    });

  const filteredRows = rows.filter((row) => {
    if (roleFilter && roleFilter !== "all" && row.role !== roleFilter) return false;
    if (!normalizedQuery) return true;

    const haystack = normalizeFold(
      [
        row.email,
        row.id,
        row.displayName,
        row.accountType,
        row.role,
        row.companyName,
      ].join(" ")
    );
    return haystack.includes(normalizedQuery);
  });

  const total = rows.length;
  const totalFiltered = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / perPage));
  const currentPage = Math.min(requestedPage, totalPages);
  const start = (currentPage - 1) * perPage;
  const paginatedRows = filteredRows.slice(start, start + perPage);

  const superAdminCount = rows.filter((row) => row.role === "super_admin").length;
  const adminCount = rows.filter((row) => row.role === "admin").length;
  const readOnlyAdminCount = rows.filter((row) => row.role === "admin_read_only").length;
  const agencyCount = rows.filter((row) => row.role === "agency").length;
  const confirmedCount = rows.filter((row) => !!row.email_confirmed_at).length;
  const suspendedCount = rows.filter((row) => row.isSuspended).length;

  const qpBase = new URLSearchParams();
  if (q) qpBase.set("q", q);
  if (roleFilter) qpBase.set("role", roleFilter);
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
    return `/admin/protected/users${str ? `?${str}` : ""}`;
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
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
              <Users size={14} />
              Users and roles
            </div>
            <h1 className="mt-3 text-3xl font-extrabold text-[rgb(var(--navy))]">Gestion des utilisateurs</h1>
            <p className="mt-2 max-w-2xl text-sm text-black/65">
              Les roles admin, admin lecture seule, user et agency sont gerables depuis ce tableau. Le role super_admin est lecture seule.
            </p>
          </div>

          <Link
            href="/admin/protected"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium text-[rgb(var(--navy))] hover:bg-black/5"
          >
            <ArrowLeft size={15} />
            Retour
          </Link>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Total users" value={String(total)} icon={<Users size={15} />} />
          <StatCard label="Super admins" value={String(superAdminCount)} icon={<ShieldCheck size={15} />} />
          <StatCard label="Admins" value={String(adminCount)} icon={<ShieldAlert size={15} />} />
          <StatCard label="Admins read-only" value={String(readOnlyAdminCount)} icon={<ShieldAlert size={15} />} />
          <StatCard label="Agencies" value={String(agencyCount)} icon={<BadgeCheck size={15} />} />
        </div>

        <div className="relative mt-3 inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/70">
          <Mail size={14} />
          Email confirmes: <span className="font-semibold">{confirmedCount}</span> / {total}
        </div>
        <div className="relative mt-3 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <Lock size={14} />
          Comptes suspendus: <span className="font-semibold">{suspendedCount}</span>
        </div>

        {canWrite ? (
          <form action={createManagedUser} className="relative mt-5 rounded-2xl border border-black/10 bg-gradient-to-b from-white to-slate-50/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <div className="text-sm font-semibold text-[rgb(var(--navy))]">Ajouter un utilisateur</div>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <label className="space-y-1 text-sm md:col-span-2">
                <span className={PREMIUM_FIELD_LABEL_CLASS}>Email</span>
                <input
                  name="email"
                  type="email"
                  required
                  className={PREMIUM_FIELD_INPUT_CLASS}
                  placeholder="user@rostomyia.com"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className={PREMIUM_FIELD_LABEL_CLASS}>Mot de passe</span>
                <input
                  name="password"
                  type="password"
                  minLength={8}
                  required
                  className={PREMIUM_FIELD_INPUT_CLASS}
                  placeholder="Minimum 8 caracteres"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className={PREMIUM_FIELD_LABEL_CLASS}>Role</span>
                <AppDropdown
                  name="role"
                  defaultValue="user"
                  triggerClassName="h-10 bg-[linear-gradient(180deg,#fff,rgba(248,250,252,0.96))]"
                  options={[
                    { value: "user", label: "user" },
                    { value: "admin", label: "admin" },
                    { value: "admin_read_only", label: "admin read only" },
                    { value: "agency", label: "agency" },
                  ]}
                />
              </label>
            </div>
            <p className="mt-3 text-xs text-black/55">
              Le role <span className="font-semibold">super_admin</span> est reserve aux operations base de donnees.
            </p>
            <div className="mt-3">
              <button
                type="submit"
                className="h-10 rounded-xl bg-[rgb(var(--navy))] px-5 text-xs font-semibold tracking-wide text-white shadow-sm transition hover:opacity-95"
              >
                Creer utilisateur
              </button>
            </div>
          </form>
        ) : (
          <div className="relative mt-5 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-800">
            Compte admin en lecture seule: creation, suspension et modification des utilisateurs desactivees.
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur md:p-6">
        <form className="grid gap-3 md:grid-cols-5" method="get">
          <label className="space-y-1 text-sm md:col-span-2">
            <span className={PREMIUM_FIELD_LABEL_CLASS}>Recherche</span>
            <input
              name="q"
              defaultValue={q}
              className={PREMIUM_FIELD_INPUT_CLASS}
              placeholder="Email, nom, id, company..."
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className={PREMIUM_FIELD_LABEL_CLASS}>Role</span>
            <AppDropdown
              name="role"
              defaultValue={roleFilter || "all"}
              triggerClassName="h-10 bg-[linear-gradient(180deg,#fff,rgba(248,250,252,0.96))]"
                options={[
                  { value: "all", label: "all" },
                  { value: "admin", label: "admin" },
                  { value: "admin_read_only", label: "admin read only" },
                  { value: "user", label: "user" },
                  { value: "agency", label: "agency" },
                ]}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className={PREMIUM_FIELD_LABEL_CLASS}>Par page</span>
            <AppDropdown
              name="per_page"
              defaultValue={String(perPage)}
              triggerClassName="h-10 bg-[linear-gradient(180deg,#fff,rgba(248,250,252,0.96))]"
              options={[
                { value: "10", label: "10" },
                { value: "20", label: "20" },
                { value: "50", label: "50" },
                { value: "100", label: "100" },
              ]}
            />
          </label>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="h-10 rounded-xl bg-[rgb(var(--navy))] px-4 text-xs font-semibold tracking-wide text-white shadow-sm transition hover:opacity-95"
            >
              Filtrer
            </button>
            <Link
              href="/admin/protected/users"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-black/10 bg-white px-3 text-sm font-medium text-[rgb(var(--navy))] hover:bg-black/5"
            >
              <RefreshCcw size={14} />
              Reset
            </Link>
          </div>
        </form>

        <div className="mt-4 rounded-xl border border-black/10 bg-slate-50/70 px-3 py-2 text-sm text-black/65">
          Resultats: <span className="font-semibold text-[rgb(var(--navy))]">{totalFiltered}</span> / {total}
        </div>
      </section>

      <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm ring-1 ring-black/5">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[1160px] text-left text-sm">
            <thead className="bg-gradient-to-b from-slate-50 to-slate-100/90">
              <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-black/50">
                <th className="px-4 py-3.5 font-semibold first:pl-6">Utilisateur</th>
                <th className="px-4 py-3.5 font-semibold">Role</th>
                <th className="px-4 py-3.5 font-semibold">Etat</th>
                <th className="px-4 py-3.5 font-semibold">Societe</th>
                <th className="px-4 py-3.5 font-semibold">Phone</th>
                <th className="px-4 py-3.5 font-semibold">Connexion</th>
                <th className="px-4 py-3.5 font-semibold">Email confirme</th>
                <th className="px-4 py-3.5 font-semibold last:pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((row) => (
                <tr key={row.id} className="border-b border-black/10 align-top even:bg-slate-50/40 hover:bg-[rgb(var(--navy))]/[0.04]">
                  <td className="px-4 py-4 first:pl-6">
                    <div className="font-semibold text-[rgb(var(--navy))]">{row.displayName}</div>
                    <div className="mt-1 inline-flex items-center gap-1.5 text-black/70">
                      <Mail size={13} />
                      <span className="break-all">{row.email ?? "-"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${rolePill(row.role)}`}>
                      {row.role === "admin_read_only" ? "admin read only" : row.role}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        row.isSuspended ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {row.isSuspended ? "suspendu" : "actif"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-black/75">{row.companyName}</td>
                  <td className="px-4 py-4 text-black/75">{row.phone}</td>
                  <td className="px-4 py-4 text-black/70">
                    <div className="inline-flex items-center gap-1.5">
                      <Clock3 size={13} />
                      {displayDate(row.last_sign_in_at)}
                    </div>
                  </td>
                  <td className="px-4 py-4 last:pr-6">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        row.email_confirmed_at ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"
                      }`}
                    >
                      {row.email_confirmed_at ? "oui" : "non"}
                    </span>
                  </td>
                  <td className="px-4 py-4 last:pr-6">
                    {!canWrite ? (
                      <span className="inline-flex rounded-xl border border-black/10 bg-black/5 px-2.5 py-1 text-xs font-medium text-black/60">
                        Lecture seule
                      </span>
                    ) : row.role === "super_admin" || row.role === "admin_read_only" ? (
                      <span className="inline-flex rounded-xl border border-black/10 bg-black/5 px-2.5 py-1 text-xs font-medium text-black/60">
                        Protege
                      </span>
                    ) : row.isSuspended ? (
                      <UserSuspendActionButton action={unsuspendManagedUser} userId={row.id} variant="unsuspend" />
                    ) : (
                      <UserSuspendActionButton action={suspendManagedUser} userId={row.id} variant="suspend" />
                    )}
                  </td>
                </tr>
              ))}

              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-sm text-black/60">
                    Aucun utilisateur pour les filtres actuels.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

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
