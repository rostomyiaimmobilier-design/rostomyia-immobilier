import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowLeft, Bell, CheckCheck, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { hasAdminAccess } from "@/lib/admin-auth";
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

function isMissingAdminNotificationsTable(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("admin_notifications") && (m.includes("does not exist") || m.includes("relation"));
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
  if (!Number.isFinite(id) || id <= 0) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const isAdmin = await hasAdminAccess(supabase, user);
  if (!isAdmin) redirect("/admin/login?error=forbidden");

  await supabase
    .from("admin_notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/admin/protected");
  revalidatePath("/admin/protected/notifications");
}

async function markAllAsRead() {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const isAdmin = await hasAdminAccess(supabase, user);
  if (!isAdmin) redirect("/admin/login?error=forbidden");

  await supabase
    .from("admin_notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("is_read", false);

  revalidatePath("/admin/protected");
  revalidatePath("/admin/protected/notifications");
}

export default async function AdminNotificationsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_notifications")
    .select("id, event_type, icon_key, title, body, href, is_read, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(300);

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
  const unread = rows.filter((x) => !x.is_read).length;

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-black/10 bg-white/80 p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--gold))]/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
              <Bell size={14} />
              Admin Alerts
            </div>
            <h1 className="mt-3 text-3xl font-extrabold text-[rgb(var(--navy))]">Notifications admin</h1>
            <p className="mt-2 text-sm text-black/60">Chaque evenement important remonte ici avec son lien d'action.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex h-10 items-center rounded-xl border border-black/10 bg-white px-3 text-sm text-black/70">
              Non lues: <span className="ml-1 font-semibold text-[rgb(var(--navy))]">{unread}</span>
            </div>
            <form action={markAllAsRead}>
              <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-black/10 bg-white px-3 text-sm font-medium text-[rgb(var(--navy))] hover:bg-black/5">
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

      <section className="space-y-3">
        {rows.map((row) => (
          <article
            key={row.id}
            className={`rounded-2xl border p-4 ${
              row.is_read
                ? "border-black/10 bg-white/80"
                : "border-[rgb(var(--navy))]/20 bg-white"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--navy))]/10 text-[rgb(var(--navy))]">
                  <AdminNotificationIcon iconKey={row.icon_key} size={16} />
                </span>
                <div className="min-w-0">
                  <div className="inline-flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-[rgb(var(--navy))]">{row.title ?? "Notification"}</h2>
                    {!row.is_read ? (
                      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[rgb(var(--gold))]" />
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700">
                        <CheckCircle2 size={12} />
                        Lue
                      </span>
                    )}
                  </div>
                  {row.body ? <p className="mt-1 text-sm text-black/65">{row.body}</p> : null}
                  <div className="mt-1 text-[11px] text-black/50">
                    {fmtDate(row.created_at)}
                    {row.event_type ? ` | ${row.event_type}` : ""}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {row.href ? (
                  <Link
                    href={row.href}
                    className="inline-flex h-9 items-center rounded-lg border border-black/10 bg-white px-3 text-xs font-medium text-[rgb(var(--navy))] hover:bg-black/5"
                  >
                    Ouvrir
                  </Link>
                ) : null}
                {!row.is_read ? (
                  <form action={markOneAsRead}>
                    <input type="hidden" name="id" value={row.id} />
                    <button className="inline-flex h-9 items-center rounded-lg border border-black/10 bg-white px-3 text-xs font-medium text-[rgb(var(--navy))] hover:bg-black/5">
                      Marquer lu
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          </article>
        ))}

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-black/10 bg-white/80 p-6 text-sm text-black/60">
            Aucune notification pour le moment.
          </div>
        ) : null}
      </section>
    </div>
  );
}
