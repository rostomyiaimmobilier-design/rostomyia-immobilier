import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: properties, error } = await supabase
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="mx-auto max-w-5xl p-10">
        <h1 className="text-3xl font-bold">Admin</h1>
        <pre className="mt-6 rounded-xl bg-slate-900 p-4 text-white overflow-auto">
          {error.message}
        </pre>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin</h1>
          <p className="mt-2 text-slate-600">Connecté: {user.email}</p>
        </div>

        <Link
          href="/admin/new"
          className="rounded-xl bg-yellow-500 px-4 py-3 font-semibold text-slate-900 hover:opacity-95"
        >
          + Nouveau bien
        </Link>
      </div>

      <div className="mt-8 grid gap-4">
        {(properties ?? []).map((p) => (
          <div key={p.id} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="font-semibold text-slate-900">{p.title}</div>
            <div className="text-sm text-slate-600">
              {p.ref} · {p.type} · {p.price} · {p.location}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
