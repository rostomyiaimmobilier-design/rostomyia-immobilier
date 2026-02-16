import Link from "next/link";
import { notFound } from "next/navigation";
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
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-1">
        <Link href="/admin/protected/leads/visits" className="text-sm text-slate-600 hover:text-slate-900">
          &larr; Retour aux demandes de visite
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Planification de visite</h1>
        <p className="text-sm text-slate-600">
          Demande du {new Date(request.created_at).toLocaleString("fr-FR")}
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-black/10 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-900">Client</h2>
          <p className="mt-2 text-sm text-black/70">Nom: {fmt(request.name)}</p>
          <p className="mt-1 text-sm text-black/70">Telephone: {fmt(request.phone)}</p>
          <p className="mt-1 text-sm text-black/70">Date souhaitee: {fmt(request.preferred_date)}</p>
          <p className="mt-1 text-sm text-black/70">Heure souhaitee: {fmt(request.preferred_time)}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-black/70">Message: {fmt(request.message)}</p>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-900">Bien</h2>
          <p className="mt-2 text-sm text-black/70">Ref: {fmt(propertyRef)}</p>
          <p className="mt-1 text-sm text-black/70">Statut demande: {fmt(request.status)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {propertyRef ? (
              <Link
                href={`/biens/${encodeURIComponent(propertyRef)}`}
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-black/5"
              >
                Voir bien (public)
              </Link>
            ) : null}
            {propertyId ? (
              <Link
                href={`/admin/protected/${propertyId}`}
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-black/5"
              >
                Ouvrir fiche admin
              </Link>
            ) : null}
          </div>
        </section>
      </div>

      <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-900">Actions rapides</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {phoneClean ? (
            <a
              href={`tel:${phoneClean}`}
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:opacity-95"
            >
              Appeler
            </a>
          ) : null}
          {waUrl ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-black/5"
            >
              WhatsApp
            </a>
          ) : null}
          <form
            action={async () => {
              "use server";
              await updateViewingRequestStatus(request.id, "contacted");
            }}
          >
            <button className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-black/5">
              Marquer contacte
            </button>
          </form>
          <form
            action={async () => {
              "use server";
              await updateViewingRequestStatus(request.id, "closed");
            }}
          >
            <button className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-black/5">
              Marquer cloture
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
