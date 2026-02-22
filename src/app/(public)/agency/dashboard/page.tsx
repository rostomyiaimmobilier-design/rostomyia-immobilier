import { redirect } from "next/navigation";
import NewPropertyForm from "@/components/admin/NewPropertyForm";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AgencyDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/agency/login");

  const userMeta = (user.user_metadata ?? {}) as {
    account_type?: string;
    agency_name?: string;
    agency_status?: string;
  };

  if (userMeta.account_type !== "agency") redirect("/agency/login");
  const status = userMeta.agency_status ?? "pending";
  if (status !== "active") redirect(`/agency/login?status=${encodeURIComponent(status)}`);

  const agencyName = userMeta.agency_name || user.email || "Agence";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[rgb(var(--brand-bg))] px-4 py-10 md:py-14">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full bg-[rgb(var(--gold))]/20 blur-3xl" />
        <div className="absolute right-0 top-16 h-[340px] w-[340px] rounded-full bg-[rgb(var(--navy))]/12 blur-3xl" />
      </div>

      <section className="relative mx-auto w-full max-w-[1400px] space-y-6">
        <div className="rounded-3xl border border-black/10 bg-white/75 p-7 shadow-sm backdrop-blur md:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--navy))]">Agency Dashboard</p>
              <h1 className="mt-3 text-3xl font-extrabold text-[rgb(var(--navy))] md:text-4xl">{agencyName}</h1>
              <p className="mt-3 max-w-3xl text-sm text-black/65">
                Deposez vos biens pour validation. Le backoffice controle chaque demande avant publication.
              </p>
            </div>
            <form action="/agency/logout" method="post">
              <button className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[rgb(var(--navy))] hover:bg-black/5">
                Logout
              </button>
            </form>
          </div>
        </div>

        <section className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
          <NewPropertyForm submissionMode="request" />
        </section>
      </section>
    </main>
  );
}
