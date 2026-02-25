"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronRight, Clock3, ExternalLink, Inbox, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AdminNotificationIcon from "@/components/admin/AdminNotificationIcon";

export type AdminNotificationListItem = {
  id: number;
  title: string;
  body: string | null;
  href: string | null;
  iconKey: string | null;
  isRead: boolean;
  createdAt: string;
};

function formatDate(value: string) {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "-";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminNotificationsMenu({
  notifications,
  unreadCount,
  tableMissing = false,
  loadError = null,
}: {
  notifications: AdminNotificationListItem[];
  unreadCount: number;
  tableMissing?: boolean;
  loadError?: string | null;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [locallyReadIds, setLocallyReadIds] = useState<Set<number>>(new Set());

  const visibleNotifications = notifications.map((item) => ({
    ...item,
    isRead: item.isRead || locallyReadIds.has(item.id),
  }));
  const locallyReadUnreadCount = notifications.reduce((count, item) => {
    if (item.isRead) return count;
    return locallyReadIds.has(item.id) ? count + 1 : count;
  }, 0);
  const unreadDisplayCount = Math.max(0, unreadCount - locallyReadUnreadCount);

  async function markAsRead(notificationId: number) {
    try {
      const response = await fetch("/api/admin/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notificationId }),
        keepalive: true,
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async function handleNotificationClick(event: React.MouseEvent<HTMLAnchorElement>, item: AdminNotificationListItem) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();

    setIsOpen(false);

    if (!item.isRead) {
      const marked = await markAsRead(item.id);
      if (marked) {
        setLocallyReadIds((prev) => {
          const next = new Set(prev);
          next.add(item.id);
          return next;
        });
      }
    }

    router.push(item.href || "/admin/protected/notifications");
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgb(var(--gold))]/35 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(var(--gold),0.16))] text-[rgb(var(--navy))] shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,23,42,0.14)]"
          aria-label="Notifications admin"
        >
          <Bell size={17} className="transition group-hover:scale-105" />
          {unreadDisplayCount > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border border-white bg-[rgb(var(--navy))] px-1 text-[10px] font-semibold text-white shadow-sm">
              {unreadDisplayCount > 99 ? "99+" : unreadDisplayCount}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[408px] rounded-2xl border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] p-2 shadow-2xl"
      >
        <div className="rounded-xl border border-[rgb(var(--gold))]/30 bg-[linear-gradient(120deg,rgba(var(--navy),0.09),rgba(var(--gold),0.15))] px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-[rgb(var(--navy))]">
              <Sparkles size={13} />
              Notifications admin
            </div>
            <div className="inline-flex items-center rounded-full border border-black/10 bg-white/90 px-2 py-0.5 text-[11px] font-medium text-black/65">
              Non lues: {unreadDisplayCount}
            </div>
          </div>
          <div className="mt-1 text-[11px] text-black/55">Evenements recents et actions a traiter</div>
        </div>

        {tableMissing ? (
          <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Table admin_notifications absente. Lancez la migration SQL des notifications.
          </div>
        ) : loadError ? (
          <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            Impossible de charger les notifications: {loadError}
          </div>
        ) : visibleNotifications.length === 0 ? (
          <div className="mt-2 rounded-xl border border-black/10 bg-white px-3 py-7 text-center">
            <div className="mx-auto mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <Inbox size={16} />
            </div>
            <div className="text-sm font-medium text-black/65">Aucune notification</div>
            <div className="mt-0.5 text-xs text-black/45">Le flux sera affiche ici des qu&apos;une action est detectee.</div>
          </div>
        ) : (
          <div className="mt-2 max-h-[430px] space-y-1.5 overflow-auto pr-1">
            {visibleNotifications.map((item) => (
              <Link
                key={item.id}
                href={item.href || "/admin/protected/notifications"}
                onClick={(event) => void handleNotificationClick(event, item)}
                className={`group relative block overflow-hidden rounded-xl border px-3 py-2.5 transition ${
                  item.isRead
                    ? "border-black/10 bg-white hover:bg-slate-50"
                    : "border-[rgb(var(--gold))]/45 bg-[rgb(var(--gold))]/10 hover:bg-[rgb(var(--gold))]/15"
                }`}
              >
                <span
                  className={`absolute inset-y-0 left-0 w-1 ${item.isRead ? "bg-slate-300" : "bg-[rgb(var(--navy))]"}`}
                  aria-hidden="true"
                />
                <div className="flex items-start gap-2.5">
                  <span
                    className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      item.isRead
                        ? "bg-[rgb(var(--navy))]/10 text-[rgb(var(--navy))]"
                        : "bg-[rgb(var(--navy))] text-white shadow-sm"
                    }`}
                  >
                    <AdminNotificationIcon iconKey={item.iconKey} size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="line-clamp-1 text-sm font-semibold text-[rgb(var(--navy))]">{item.title}</div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          item.isRead
                            ? "border border-black/10 bg-slate-100 text-black/55"
                            : "border border-[rgb(var(--gold))]/45 bg-white text-[rgb(var(--navy))]"
                        }`}
                      >
                        {item.isRead ? "Lu" : "Non lu"}
                      </span>
                    </div>
                    {item.body ? (
                      <div className="mt-0.5 line-clamp-2 text-xs leading-5 text-black/65">{item.body}</div>
                    ) : (
                      <div className="mt-0.5 line-clamp-1 text-xs text-black/45">Cliquer pour ouvrir le detail de la notification.</div>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="inline-flex items-center gap-1.5 text-[11px] text-black/50">
                        <Clock3 size={11} />
                        {formatDate(item.createdAt)}
                      </div>
                      <div className="inline-flex items-center gap-1 text-[11px] font-medium text-[rgb(var(--navy))] opacity-70 transition group-hover:opacity-100">
                        Ouvrir
                        <ExternalLink size={11} />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-2 border-t border-black/10 pt-2">
          <div className="px-1 pb-2 text-[11px] text-black/50">Consultez l&apos;historique complet et les details d&apos;evenement.</div>
          <Link
            href="/admin/protected/notifications"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[rgb(var(--navy))] transition hover:border-[rgb(var(--gold))]/40 hover:bg-black/5"
          >
            Ouvrir le centre de notifications
            <ChevronRight size={14} />
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
