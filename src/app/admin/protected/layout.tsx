import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, LayoutDashboard, ListChecks, PlusCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");

  return (
    <div className="relative min-h-screen overflow-hidden bg-[rgb(var(--brand-bg))]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-24 h-80 w-80 rounded-full bg-[rgb(var(--gold))]/25 blur-3xl" />
        <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-[rgb(var(--navy))]/12 blur-3xl" />
      </div>

      <header className="sticky top-0 z-20 border-b border-black/10 bg-white/75 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Link
            href="/admin/protected"
            className="inline-flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-3 py-2 shadow-sm"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[rgb(var(--navy))] text-white">
              <Building2 size={18} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-[rgb(var(--navy))]">Rostomyia Admin</span>
              <span className="block text-xs text-black/55">{user.email}</span>
            </span>
          </Link>

          <nav className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/protected"
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium text-[rgb(var(--navy))] hover:bg-black/5"
            >
              <LayoutDashboard size={15} />
              Dashboard
            </Link>
            <Link
              href="/admin/protected/leads"
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium text-[rgb(var(--navy))] hover:bg-black/5"
            >
              <ListChecks size={15} />
              Leads
            </Link>
            <Link
              href="/admin/new"
              className="inline-flex items-center gap-2 rounded-xl bg-[rgb(var(--navy))] px-3 py-2 text-sm font-semibold text-white hover:opacity-95"
            >
              <PlusCircle size={15} />
              Nouveau bien
            </Link>
          </nav>

          <form action="/admin/logout" method="post">
            <button className="rounded-xl border border-black/10 bg-white/90 px-3 py-2 text-sm font-medium text-black/75 hover:bg-white">
              Logout
            </button>
          </form>
        </div>
      </header>

      <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-8">{children}</div>
    </div>
  );
}
