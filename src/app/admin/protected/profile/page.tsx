import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { hasAdminAccess } from "@/lib/admin-auth";

function toText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "-";
}

function toDate(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return "-";
  return parsed.toLocaleString("fr-FR");
}

export default async function AdminProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");
  const isAdmin = await hasAdminAccess(supabase, user);
  if (!isAdmin) redirect("/admin/login?error=forbidden");

  const meta = user.user_metadata ?? {};
  const fullName = toText(meta.full_name ?? meta.name ?? meta.username ?? "Admin");
  const phone = toText(meta.phone ?? user.phone ?? null);

  return (
    <main className="mx-auto max-w-3xl">
      <section className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur md:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-black/45">Profil admin</p>
            <h1 className="mt-1 text-2xl font-bold text-[rgb(var(--navy))]">Compte administrateur</h1>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <ShieldCheck size={14} />
            Admin
          </span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-black/45">Nom</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-black/80">
              <UserRound size={14} />
              {fullName}
            </p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-black/45">Email</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-black/80">
              <Mail size={14} />
              {toText(user.email)}
            </p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-black/45">Telephone</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-black/80">
              <Phone size={14} />
              {phone}
            </p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-black/45">ID utilisateur</p>
            <p className="mt-1 text-xs font-mono text-black/75">{toText(user.id)}</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-black/45">Creation du compte</p>
            <p className="mt-1 text-sm font-semibold text-black/80">{toDate(user.created_at)}</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-black/45">Derniere connexion</p>
            <p className="mt-1 text-sm font-semibold text-black/80">{toDate(user.last_sign_in_at)}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Link
            href="/admin/protected"
            className="inline-flex items-center rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[rgb(var(--navy))] hover:bg-black/5"
          >
            Retour dashboard
          </Link>
          <form action="/admin/logout" method="post">
            <button className="inline-flex items-center rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black/75 hover:bg-black/5">
              Logout
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
