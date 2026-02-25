import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bell,
  Building2,
  ChevronDown,
  Home,
  Hotel,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  PlusCircle,
  UserRound,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccess } from "@/lib/admin-auth";
import AdminNotificationsMenu, {
  type AdminNotificationListItem,
} from "@/components/admin/AdminNotificationsMenu";
import ActiveAdminLink from "@/components/admin/ActiveAdminLink";
import AdminQuartiersDashboardAction from "@/components/admin/AdminQuartiersDashboardAction";

function isMissingAdminNotificationsTable(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("admin_notifications") && (m.includes("does not exist") || m.includes("relation"));
}

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const access = await getAdminAccess(supabase, user);
  if (!access.isAdmin) redirect("/admin/login?error=forbidden");
  const canWrite = access.canWrite;

  let notifications: AdminNotificationListItem[] = [];
  let unreadCount = 0;
  let notificationsTableMissing = false;
  let notificationsLoadError: string | null = null;

  const latestNotificationsResult = await supabase
    .from("admin_notifications")
    .select("id, title, body, href, icon_key, is_read, created_at")
    .order("created_at", { ascending: false })
    .limit(12);

  if (latestNotificationsResult.error) {
    notificationsTableMissing = isMissingAdminNotificationsTable(latestNotificationsResult.error.message);
    if (!notificationsTableMissing) {
      notificationsLoadError = latestNotificationsResult.error.message || "unknown_error";
    }
  } else {
    notifications = ((latestNotificationsResult.data ?? []) as Array<{
      id: number;
      title: string | null;
      body: string | null;
      href: string | null;
      icon_key: string | null;
      is_read: boolean | null;
      created_at: string | null;
    }>).map((row) => ({
      id: row.id,
      title: String(row.title ?? "").trim() || "Notification",
      body: row.body,
      href: row.href,
      iconKey: row.icon_key,
      isRead: Boolean(row.is_read),
      createdAt: String(row.created_at ?? ""),
    }));

    const unreadResult = await supabase
      .from("admin_notifications")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false);
    unreadCount = unreadResult.count ?? 0;
  }

  const desktopNavItemClass =
    "group inline-flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium text-black/75 transition hover:translate-x-0.5 hover:border-[rgb(var(--gold))]/35 hover:bg-white/95 hover:text-[rgb(var(--navy))] hover:shadow-sm";
  const desktopActiveNavItemClass =
    "border-[rgb(var(--gold))]/55 bg-[linear-gradient(110deg,rgba(var(--navy),0.16),rgba(var(--gold),0.14))] text-[rgb(var(--navy))] shadow-sm";
  const mobileNavItemClass =
    "inline-flex w-full items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium text-[rgb(var(--navy))] transition hover:border-[rgb(var(--gold))]/35 hover:bg-black/5";
  const mobileActiveNavItemClass =
    "border-[rgb(var(--gold))]/55 bg-[linear-gradient(110deg,rgba(var(--navy),0.16),rgba(var(--gold),0.14))]";
  const mobileSubNavItemClass =
    "inline-flex w-full items-center gap-2 rounded-lg border border-black/10 bg-white/85 px-3 py-2 text-xs font-semibold text-[rgb(var(--navy))] transition hover:border-[rgb(var(--gold))]/35 hover:bg-black/5";
  const desktopSubNavItemClass =
    "inline-flex w-full items-center gap-2 rounded-lg border border-black/10 bg-white/85 px-3 py-2 text-xs font-semibold text-[rgb(var(--navy))] transition hover:border-[rgb(var(--gold))]/35 hover:bg-black/5";
  const desktopSubActiveNavItemClass =
    "border-[rgb(var(--gold))]/55 bg-[linear-gradient(110deg,rgba(var(--navy),0.14),rgba(var(--gold),0.12))] text-[rgb(var(--navy))]";

  return (
    <div className="relative min-h-screen bg-[rgb(var(--brand-bg))]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-[rgb(var(--gold))]/20 blur-3xl" />
        <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-[rgb(var(--navy))]/12 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-black/10 bg-white/85 backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 lg:px-8">
          <Link
            href="/admin/protected"
            className="inline-flex min-w-0 items-center gap-3 text-sm font-semibold text-[rgb(var(--navy))]"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[rgb(var(--navy))] text-white shadow-sm">
              <Building2 size={16} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm">Rostomyia Admin</span>
              <span className="hidden truncate text-xs font-medium text-black/55 sm:block">{user.email}</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <AdminNotificationsMenu
              notifications={notifications}
              unreadCount={unreadCount}
              tableMissing={notificationsTableMissing}
              loadError={notificationsLoadError}
            />
            <Link
              href="/admin/protected/profile"
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium text-black/75 hover:bg-black/5"
            >
              <UserRound size={15} />
              <span className="hidden md:inline">Profile</span>
            </Link>
            <form action="/admin/logout" method="post">
              <button className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium text-black/75 hover:bg-black/5">
                <LogOut size={15} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </form>
            <details className="relative lg:hidden">
              <summary className="inline-flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-black/10 bg-white text-[rgb(var(--navy))] hover:bg-black/5">
                <Menu size={16} />
              </summary>
              <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.9))] p-3 shadow-xl backdrop-blur">
                <div className="mb-2 rounded-xl border border-[rgb(var(--gold))]/35 bg-[rgb(var(--navy))]/5 px-3 py-2 text-xs font-medium text-black/60">
                  {user.email}
                </div>
                <nav className="space-y-2">
                  <ActiveAdminLink
                    href="/admin/protected"
                    matchMode="exact"
                    className={mobileNavItemClass}
                    activeClassName={mobileActiveNavItemClass}
                  >
                    <LayoutDashboard size={15} />
                    Dashboard
                  </ActiveAdminLink>
                  <ActiveAdminLink
                    href="/admin/protected/biens"
                    matchMode="exact"
                    className={mobileNavItemClass}
                    activeClassName={mobileActiveNavItemClass}
                  >
                    <Home size={15} />
                    Biens
                  </ActiveAdminLink>
                  {canWrite ? (
                    <ActiveAdminLink
                      href="/admin/new"
                      matchMode="exact"
                      className={mobileNavItemClass}
                      activeClassName={mobileActiveNavItemClass}
                    >
                      <PlusCircle size={15} />
                      Nouveau bien
                    </ActiveAdminLink>
                  ) : (
                    <span
                      className={`${mobileNavItemClass} pointer-events-none cursor-not-allowed opacity-55`}
                      title="Lecture seule: creation desactivee"
                    >
                      <PlusCircle size={15} />
                      Nouveau bien
                    </span>
                  )}
                  <details className="group rounded-xl border border-black/10 bg-white/70 p-2">
                    <summary className={`${mobileNavItemClass} cursor-pointer list-none justify-between`}>
                      <span className="inline-flex items-center gap-2">
                        <ListChecks size={15} />
                        Leads
                      </span>
                      <ChevronDown size={14} className="transition group-open:rotate-180" />
                    </summary>
                    <div className="mt-2 space-y-1.5 pl-1">
                      <ActiveAdminLink
                        href="/admin/protected/leads/owners"
                        className={mobileSubNavItemClass}
                        activeClassName={mobileActiveNavItemClass}
                      >
                        Owner Leads
                      </ActiveAdminLink>
                      <ActiveAdminLink
                        href="/admin/protected/leads/depot-tiers"
                        className={mobileSubNavItemClass}
                        activeClassName={mobileActiveNavItemClass}
                      >
                        Depots agences
                      </ActiveAdminLink>
                      <ActiveAdminLink
                        href="/admin/protected/leads/visits"
                        className={mobileSubNavItemClass}
                        activeClassName={mobileActiveNavItemClass}
                      >
                        Viewing Requests
                      </ActiveAdminLink>
                      <ActiveAdminLink
                        href="/admin/protected/leads/reservations"
                        className={mobileSubNavItemClass}
                        activeClassName={mobileActiveNavItemClass}
                      >
                        Reservations
                      </ActiveAdminLink>
                    </div>
                  </details>
                  <ActiveAdminLink
                    href="/admin/protected/agencies"
                    className={mobileNavItemClass}
                    activeClassName={mobileActiveNavItemClass}
                  >
                    <Users size={15} />
                    Agencies
                  </ActiveAdminLink>
                  <ActiveAdminLink
                    href="/admin/protected/users"
                    className={mobileNavItemClass}
                    activeClassName={mobileActiveNavItemClass}
                  >
                    <UserRound size={15} />
                    Users
                  </ActiveAdminLink>
                  <ActiveAdminLink
                    href="/admin/protected/notifications"
                    className={mobileNavItemClass}
                    activeClassName={mobileActiveNavItemClass}
                  >
                    <Bell size={15} />
                    Notifications
                  </ActiveAdminLink>
                  <AdminQuartiersDashboardAction
                    triggerLabel="Quartiers"
                    triggerClassName={`${mobileNavItemClass} w-full justify-start`}
                  />
                </nav>
              </div>
            </details>
          </div>
        </div>
      </header>

      <div className="relative lg:grid lg:grid-cols-[312px_minmax(0,1fr)]">
        <aside className="hidden border-r border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.6))] backdrop-blur lg:sticky lg:top-16 lg:flex lg:h-[calc(100vh-4rem)] lg:flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-5 pt-3">
            <section className="rounded-2xl border border-black/10 bg-white/88 p-3 shadow-sm">
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-black/45">Principal</p>
              <nav className="space-y-1">
                <ActiveAdminLink
                  href="/admin/protected"
                  matchMode="exact"
                  className={desktopNavItemClass}
                  activeClassName={desktopActiveNavItemClass}
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </ActiveAdminLink>
                <ActiveAdminLink
                  href="/admin/protected/biens"
                  matchMode="exact"
                  className={desktopNavItemClass}
                  activeClassName={desktopActiveNavItemClass}
                >
                  <Home size={16} />
                  Biens
                </ActiveAdminLink>
                {canWrite ? (
                  <ActiveAdminLink
                    href="/admin/new"
                    matchMode="exact"
                    className={desktopNavItemClass}
                    activeClassName={desktopActiveNavItemClass}
                  >
                    <PlusCircle size={16} />
                    Nouveau bien
                  </ActiveAdminLink>
                ) : (
                  <span
                    className={`${desktopNavItemClass} pointer-events-none cursor-not-allowed opacity-55`}
                    title="Lecture seule: creation desactivee"
                  >
                    <PlusCircle size={16} />
                    Nouveau bien
                  </span>
                )}
              </nav>
            </section>

            <section className="rounded-2xl border border-black/10 bg-white/88 p-3 shadow-sm">
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-black/45">Gestion</p>
              <nav className="space-y-1">
                <details className="group rounded-xl border border-black/10 bg-white/70 p-2">
                  <summary className={`${desktopNavItemClass} cursor-pointer list-none justify-between`}>
                    <span className="inline-flex items-center gap-3">
                      <ListChecks size={16} />
                      Leads
                    </span>
                    <ChevronDown size={14} className="transition group-open:rotate-180" />
                  </summary>
                  <div className="mt-2 space-y-1.5 pl-1">
                    <ActiveAdminLink
                      href="/admin/protected/leads/owners"
                      className={desktopSubNavItemClass}
                      activeClassName={desktopSubActiveNavItemClass}
                    >
                      Owner Leads
                    </ActiveAdminLink>
                    <ActiveAdminLink
                      href="/admin/protected/leads/depot-tiers"
                      className={desktopSubNavItemClass}
                      activeClassName={desktopSubActiveNavItemClass}
                    >
                      Depots agences
                    </ActiveAdminLink>
                    <ActiveAdminLink
                      href="/admin/protected/leads/visits"
                      className={desktopSubNavItemClass}
                      activeClassName={desktopSubActiveNavItemClass}
                    >
                      Viewing Requests
                    </ActiveAdminLink>
                    <ActiveAdminLink
                      href="/admin/protected/leads/reservations"
                      className={desktopSubNavItemClass}
                      activeClassName={desktopSubActiveNavItemClass}
                    >
                      <Hotel size={15} />
                      Reservations
                    </ActiveAdminLink>
                  </div>
                </details>
                <ActiveAdminLink
                  href="/admin/protected/agencies"
                  className={desktopNavItemClass}
                  activeClassName={desktopActiveNavItemClass}
                >
                  <Users size={16} />
                  Agencies
                </ActiveAdminLink>
                <ActiveAdminLink
                  href="/admin/protected/users"
                  className={desktopNavItemClass}
                  activeClassName={desktopActiveNavItemClass}
                >
                  <UserRound size={16} />
                  Users
                </ActiveAdminLink>
                <ActiveAdminLink
                  href="/admin/protected/notifications"
                  className={desktopNavItemClass}
                  activeClassName={desktopActiveNavItemClass}
                >
                  <Bell size={16} />
                  Notifications
                </ActiveAdminLink>
                <AdminQuartiersDashboardAction
                  triggerLabel="Quartiers"
                  triggerClassName={`${desktopNavItemClass} w-full justify-start`}
                />
              </nav>
            </section>
          </div>
        </aside>

        <main className="min-w-0 px-4 pb-10 pt-6 lg:px-8 lg:pt-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
