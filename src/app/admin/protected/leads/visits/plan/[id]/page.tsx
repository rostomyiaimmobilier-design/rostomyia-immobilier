import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, CheckCircle2, Clock3, ExternalLink, Home, MessageSquare, Phone, User2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateViewingRequestStatus } from "../../../actions";

type ViewingRequestRow = {
  id: string;
  created_at: string;
  property_ref: string | null;
  name: string | null;
  phone: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  message: string | null;
  status: string | null;
};

export const dynamic = "force-dynamic";

function fmt(value: string | null | undefined) {
  const v = (value || "").trim();
  return v || "-";
}

function statusLabel(status: string | null | undefined) {
  const s = (status || "").trim().toLowerCase();
  if (!s || s === "new") return "Nouveau";
  if (s === "contacted") return "Contacte";
  if (s === "closed") return "Cloture";
  return status ?? "-";
}

function statusBadgeClass(status: string | null | undefined) {
  const s = (status || "").trim().toLowerCase();
  if (!s || s === "new") return "border-amber-200 bg-amber-50 text-amber-800";
  if (s === "contacted") return "border-blue-200 bg-blue-50 text-blue-800";
  if (s === "closed") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  return "border-black/10 bg-white text-black/70";
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-black/10 bg-white px-3 py-2.5">
      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--gold))]/20 text-[rgb(var(--navy))]">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-black/45">{label}</div>
        <div className="mt-0.5 break-words text-sm font-medium text-black/80">{value}</div>
      </div>
    </div>
  );
}

export default async function VisitPlanningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: req, error } = await supabase
    .from("viewing_requests")
    .select("id, created_at, property_ref, name, phone, preferred_date, preferred_time, message, status")
    .eq("id", id)
    .maybeSingle();

  if (error || !req) notFound();

  const request = req as ViewingRequestRow;

  const propertyRef = (request.property_ref || "").trim();
  let propertyId: string | null = null;
  if (propertyRef) {
    const { data: property } = await supabase
      .from("properties")
      .select("id")
      .eq("ref", propertyRef)
      .maybeSingle();
    propertyId = property?.id ?? null;
  }

  const phoneClean = (request.phone || "").replace(/\s+/g, "");
  const waMessage = `Bonjour, confirmation de visite pour le bien ${propertyRef || "-"}.`;
  const waUrl = phoneClean ? `https://wa.me/${encodeURIComponent(phoneClean)}?text=${encodeURIComponent(waMessage)}` : "";

  return (
    <main className="relative mx-auto max-w-5xl px-4 py-8">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-28 -top-16 h-64 w-64 rounded-full bg-[rgb(var(--gold))]/15 blur-3xl" />
        <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-[rgb(var(--navy))]/10 blur-3xl" />
      </div>

      <section className="rounded-3xl border border-black/10 bg-white/85 p-6 backdrop-blur md:p-7">
        <div className="space-y-2">
          <Link
            href="/admin/protected/leads/visits"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            &larr; Retour aux demandes de visite
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[rgb(var(--navy))] md:text-3xl">Planification de visite</h1>
              <p className="mt-1 inline-flex items-center gap-2 text-sm text-black/60">
                <CalendarDays size={14} className="text-[rgb(var(--gold))]" />
                Demande du {new Date(request.created_at).toLocaleString("fr-FR")}
              </p>
            </div>
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusBadgeClass(
                request.status
              )}`}
            >
              {statusLabel(request.status)}
            </span>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-black/10 bg-white/90 p-5">
          <h2 className="text-base font-semibold text-[rgb(var(--navy))]">Client</h2>
          <div className="mt-3 space-y-2.5">
            <DetailRow icon={<User2 size={14} />} label="Nom" value={fmt(request.name)} />
            <DetailRow icon={<Phone size={14} />} label="Telephone" value={fmt(request.phone)} />
            <DetailRow icon={<CalendarDays size={14} />} label="Date souhaitee" value={fmt(request.preferred_date)} />
            <DetailRow icon={<Clock3 size={14} />} label="Heure souhaitee" value={fmt(request.preferred_time)} />
          </div>
          <div className="mt-4 rounded-xl border border-black/10 bg-[rgb(var(--navy))]/[0.03] px-3 py-3 text-sm text-black/70">
            <div className="mb-1.5 inline-flex items-center gap-2 font-medium text-[rgb(var(--navy))]">
              <MessageSquare size={14} className="text-[rgb(var(--gold))]" />
              Message
            </div>
            <p className="whitespace-pre-wrap">{fmt(request.message)}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white/90 p-5">
          <h2 className="text-base font-semibold text-[rgb(var(--navy))]">Bien</h2>
          <div className="mt-3 space-y-2.5">
            <DetailRow icon={<Home size={14} />} label="Reference" value={fmt(propertyRef)} />
            <DetailRow icon={<CheckCircle2 size={14} />} label="Statut demande" value={statusLabel(request.status)} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {propertyRef ? (
              <Link
                href={`/biens/${encodeURIComponent(propertyRef)}`}
                className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-black/5"
              >
                <ExternalLink size={14} />
                Voir bien (public)
              </Link>
            ) : null}
            {propertyId ? (
              <Link
                href={`/admin/protected/${propertyId}`}
                className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-black/5"
              >
                <ExternalLink size={14} />
                Ouvrir fiche admin
              </Link>
            ) : null}
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-black/10 bg-white/90 p-5">
        <h2 className="text-base font-semibold text-[rgb(var(--navy))]">Actions rapides</h2>
        <p className="mt-1 text-xs text-black/55">Utilisez les actions ci-dessous pour traiter cette demande plus vite.</p>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {phoneClean ? (
            <a
              href={`tel:${phoneClean}`}
              className="inline-flex items-center gap-2 rounded-xl bg-[rgb(var(--navy))] px-3.5 py-2 text-sm font-medium text-white hover:opacity-95"
            >
              <Phone size={14} />
              Appeler
            </a>
          ) : null}
          {waUrl ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3.5 py-2 text-sm hover:bg-black/5"
            >
              <MessageSquare size={14} />
              WhatsApp
            </a>
          ) : null}
          <form
            action={async () => {
              "use server";
              await updateViewingRequestStatus(request.id, "contacted");
            }}
          >
            <button className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3.5 py-2 text-sm hover:bg-black/5">
              <CheckCircle2 size={14} />
              Marquer contacte
            </button>
          </form>
          <form
            action={async () => {
              "use server";
              await updateViewingRequestStatus(request.id, "closed");
            }}
          >
            <button className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3.5 py-2 text-sm hover:bg-black/5">
              <CheckCircle2 size={14} />
              Marquer cloture
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
