import { redirect } from "next/navigation";
import { BellRing, CalendarDays, Clock3, MapPin, MessageCircle, Tag } from "lucide-react";
import NewPropertyForm from "@/components/admin/NewPropertyForm";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AgencyVisitNotificationRow = {
  id: number;
  property_ref: string;
  property_title: string | null;
  property_location: string | null;
  property_price: string | null;
  visit_preferred_date: string | null;
  visit_preferred_time: string | null;
  visit_status: string | null;
  whatsapp_link: string | null;
  created_at: string;
};

function isMissingAgencyVisitNotificationsTable(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("agency_visit_notifications") && m.includes("does not exist");
}

function fmt(value: string | null | undefined) {
  const v = String(value ?? "").trim();
  return v || "-";
}

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
  let notifications: AgencyVisitNotificationRow[] = [];

  const notificationsQuery = await supabase
    .from("agency_visit_notifications")
    .select(
      "id, property_ref, property_title, property_location, property_price, visit_preferred_date, visit_preferred_time, visit_status, whatsapp_link, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(25);

  if (!notificationsQuery.error) {
    notifications = (notificationsQuery.data ?? []) as AgencyVisitNotificationRow[];
  } else if (!isMissingAgencyVisitNotificationsTable(notificationsQuery.error.message)) {
    throw new Error(notificationsQuery.error.message);
  }

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

        <section className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--navy))]">
              <BellRing size={16} />
              Visites validees
            </div>
            <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-black/70">
              {notifications.length}
            </span>
          </div>

          {notifications.length === 0 ? (
            <p className="mt-4 text-sm text-black/60">
              Aucune visite validee pour le moment.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {notifications.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-black/10 bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs text-black/65">
                        <CalendarDays size={12} />
                        {new Date(item.created_at).toLocaleString("fr-FR")}
                      </div>
                      <h2 className="mt-2 text-base font-bold text-[rgb(var(--navy))]">
                        REF: {fmt(item.property_ref)}
                      </h2>
                      <p className="text-sm text-black/70">{fmt(item.property_title)}</p>
                    </div>
                    <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                      {fmt(item.visit_status)}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-black/70 md:grid-cols-2">
                    <div className="inline-flex items-center gap-2">
                      <CalendarDays size={14} />
                      Date: {fmt(item.visit_preferred_date)}
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <Clock3 size={14} />
                      Heure: {fmt(item.visit_preferred_time)}
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <MapPin size={14} />
                      {fmt(item.property_location)}
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <Tag size={14} />
                      {fmt(item.property_price)}
                    </div>
                  </div>

                  {item.whatsapp_link ? (
                    <a
                      href={item.whatsapp_link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium text-[rgb(var(--navy))] hover:bg-black/5"
                    >
                      <MessageCircle size={14} />
                      Ouvrir WhatsApp
                    </a>
                  ) : (
                    <p className="mt-3 text-xs text-black/55">
                      WhatsApp agence manquant: ajoutez un numero WhatsApp dans le profil agence.
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
          <NewPropertyForm submissionMode="request" />
        </section>
      </section>
    </main>
  );
}
