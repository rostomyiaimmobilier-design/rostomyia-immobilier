"use client";

import Link from "next/link";
import { Bell, ExternalLink } from "lucide-react";
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white text-[rgb(var(--navy))] transition hover:bg-black/5"
          aria-label="Notifications admin"
        >
          <Bell size={16} />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[rgb(var(--navy))] px-1 text-[10px] font-semibold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] rounded-2xl border border-black/10 bg-white p-2">
        <div className="flex items-center justify-between rounded-xl border border-black/10 bg-slate-50/80 px-3 py-2">
          <div className="text-sm font-semibold text-[rgb(var(--navy))]">Notifications admin</div>
          <div className="text-xs text-black/55">Non lues: {unreadCount}</div>
        </div>

        {tableMissing ? (
          <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Table admin_notifications absente. Lancez la migration SQL des notifications.
          </div>
        ) : loadError ? (
          <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            Impossible de charger les notifications: {loadError}
          </div>
        ) : notifications.length === 0 ? (
          <div className="mt-2 rounded-xl border border-black/10 bg-white px-3 py-6 text-center text-sm text-black/55">
            Aucune notification.
          </div>
        ) : (
          <div className="mt-2 max-h-[420px] space-y-1 overflow-auto pr-1">
            {notifications.map((item) => (
              <Link
                key={item.id}
                href={item.href || "/admin/protected/notifications"}
                className="group block rounded-xl border border-black/10 bg-white px-3 py-2.5 transition hover:bg-slate-50"
              >
                <div className="flex items-start gap-2.5">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--navy))]/10 text-[rgb(var(--navy))]">
                    <AdminNotificationIcon iconKey={item.iconKey} size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="line-clamp-1 text-sm font-semibold text-[rgb(var(--navy))]">{item.title}</div>
                      {!item.isRead ? (
                        <span className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-[rgb(var(--gold))]" />
                      ) : null}
                    </div>
                    {item.body ? <div className="mt-0.5 line-clamp-2 text-xs text-black/65">{item.body}</div> : null}
                    <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-black/50">
                      {formatDate(item.createdAt)}
                      <ExternalLink size={11} className="opacity-0 transition group-hover:opacity-100" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-2 border-t border-black/10 pt-2">
          <Link
            href="/admin/protected/notifications"
            className="inline-flex w-full items-center justify-center rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium text-[rgb(var(--navy))] transition hover:bg-black/5"
          >
            Ouvrir le centre de notifications
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
