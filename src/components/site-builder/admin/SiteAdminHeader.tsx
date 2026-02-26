"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        active ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
      }`}
    >
      {label}
    </Link>
  );
}

export default function SiteAdminHeader() {
  const router = useRouter();

  async function onLogout() {
    await fetch("/api/site-admin/auth/logout", { method: "POST" });
    router.replace("/site-admin/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
            SB
          </span>
          <p className="text-sm font-semibold text-slate-900">Site Builder Admin</p>
        </div>

        <nav className="flex items-center gap-1">
          <NavLink href="/site-admin/pages" label="Pages" />
          <NavLink href="/site" label="View Site" />
        </nav>

        <button
          onClick={onLogout}
          className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

