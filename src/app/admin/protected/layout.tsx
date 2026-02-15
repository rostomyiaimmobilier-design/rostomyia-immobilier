import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");


  return (
    <div className="min-h-screen bg-[rgb(var(--brand-bg))]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex items-center justify-between">
          <a href="/admin" className="text-lg font-semibold">
            Rostomyia Admin
          </a>
          <form action="/admin/logout" method="post">
            <button className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm hover:bg-white">
              Logout
            </button>
          </form>
        </div>
      </div>
      {children}
    </div>
  );
}
