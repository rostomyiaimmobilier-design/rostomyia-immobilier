import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Hotel,
  MessageSquare,
  Phone,
  UserCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateShortStayReservationStatus } from "../actions";
import AppDropdown from "@/components/ui/app-dropdown";

const STATUS = ["new", "contacted", "confirmed", "cancelled", "closed"] as const;

type ReservationRow = {
  id: string;
  created_at: string;
  updated_at: string;
  status: string | null;
  lang: string | null;
  property_ref: string;
  property_title: string | null;
  property_location: string | null;
  property_price: string | null;
  reservation_option_label: string | null;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  message: string | null;
  admin_note: string | null;
};

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(input: string | string[] | undefined) {
  if (Array.isArray(input)) return input[0] ?? "";
  return input ?? "";
}

function normalizeFold(input: string | null | undefined) {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function fmt(value: string | null | undefined) {
  const v = String(value ?? "").trim();
  return v || "-";
}

function statusLabel(status: string | null | undefined) {
  const s = String(status ?? "new").trim().toLowerCase();
  if (s === "contacted") return "contacte";
  if (s === "confirmed") return "confirme";
  if (s === "cancelled") return "annule";
  if (s === "closed") return "ferme";
  return "nouveau";
}

function statusPill(status: string | null | undefined) {
  const s = String(status ?? "new").trim().toLowerCase();
  if (s === "confirmed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (s === "contacted") return "border-blue-200 bg-blue-50 text-blue-700";
  if (s === "cancelled") return "border-rose-200 bg-rose-50 text-rose-700";
  if (s === "closed") return "border-slate-300 bg-slate-100 text-slate-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function isMissingReservationsTable(message: string | undefined) {
  const m = String(message ?? "").toLowerCase();
  return m.includes("short_stay_reservations") && (m.includes("does not exist") || m.includes("relation"));
}

export default async function ShortStayReservationsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const q = firstParam(params.q).trim();
  const statusFilter = firstParam(params.status).trim().toLowerCase();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("short_stay_reservations")
    .select(
      "id, created_at, updated_at, status, lang, property_ref, property_title, property_location, property_price, reservation_option_label, check_in_date, check_out_date, nights, customer_name, customer_phone, customer_email, message, admin_note"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div
          className={`rounded-2xl border p-4 ${
            isMissingReservationsTable(error.message)
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {isMissingReservationsTable(error.message)
            ? "Table short_stay_reservations absente. Lancez la migration 2026-02-23-add-short-stay-reservations.sql."
            : `Error loading reservations: ${error.message}`}
        </div>
      </div>
    );
  }

  const rows = (data ?? []) as ReservationRow[];
  const qFold = normalizeFold(q);
  const filteredRows = rows.filter((x) => {
    const s = String(x.status ?? "new").trim().toLowerCase();
    if (statusFilter && statusFilter !== "all" && statusFilter !== s) return false;
    if (!qFold) return true;
    const haystack = normalizeFold(
      [
        x.property_ref,
        x.property_title,
        x.property_location,
        x.customer_name,
        x.customer_phone,
        x.customer_email,
        x.message,
      ].join(" ")
    );
    return haystack.includes(qFold);
  });

  const total = filteredRows.length;
  const fresh = filteredRows.filter((x) => String(x.status ?? "new").toLowerCase() === "new").length;
  const contacted = filteredRows.filter((x) => String(x.status ?? "").toLowerCase() === "contacted").length;
  const confirmed = filteredRows.filter((x) => String(x.status ?? "").toLowerCase() === "confirmed").length;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/75 p-6 shadow-sm backdrop-blur md:p-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 -top-16 h-56 w-56 rounded-full bg-[rgb(var(--gold))]/18 blur-3xl" />
          <div className="absolute right-0 top-8 h-52 w-52 rounded-full bg-[rgb(var(--navy))]/10 blur-3xl" />
        </div>

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--gold))]/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
              <Hotel size={14} />
              Reservations
            </div>
            <h1 className="mt-3 text-3xl font-extrabold text-[rgb(var(--navy))]">Reservations court sejour</h1>
            <p className="mt-2 max-w-2xl text-sm text-black/65">
              Suivez les reservations creees depuis la fiche bien et traitez-les comme un flux lead.
            </p>
          </div>
          <Link
            href="/admin/protected/leads"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium text-[rgb(var(--navy))] hover:bg-black/5"
          >
            <ArrowLeft size={15} />
            Retour
          </Link>
        </div>

        <form className="relative mt-6 grid gap-3 md:grid-cols-[1fr_210px_auto]">
          <input
            name="q"
            defaultValue={q}
            placeholder="Recherche (ref, client, telephone...)"
            className="h-11 w-full rounded-xl border border-black/12 bg-white/95 px-3 text-sm text-[rgb(var(--navy))] outline-none focus:border-[rgb(var(--navy))]/35"
          />
          <AppDropdown
            name="status"
            defaultValue={statusFilter || "all"}
            options={[
              { value: "all", label: "Tous statuts" },
              ...STATUS.map((x) => ({ value: x, label: x })),
            ]}
            className="w-full"
          />
          <button className="h-11 rounded-xl bg-[rgb(var(--navy))] px-4 text-sm font-semibold text-white hover:opacity-95">
            Filtrer
          </button>
        </form>

        <div className="relative mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <StatCard label="Total" value={String(total)} icon={<Hotel size={15} />} />
          <StatCard label="Nouvelles" value={String(fresh)} icon={<Clock3 size={15} />} />
          <StatCard label="Contactees" value={String(contacted)} icon={<Phone size={15} />} />
          <StatCard label="Confirmees" value={String(confirmed)} icon={<CalendarDays size={15} />} />
        </div>
      </section>

      <section className="space-y-4">
        {filteredRows.map((row) => (
          <article key={row.id} className="rounded-3xl border border-black/10 bg-white/82 p-5 shadow-sm backdrop-blur md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs text-black/65">
                  <Clock3 size={12} />
                  {new Date(row.created_at).toLocaleString("fr-FR")}
                  {row.lang ? ` | ${row.lang.toUpperCase()}` : ""}
                </div>
                <h2 className="mt-2 inline-flex items-center gap-2 text-lg font-bold text-[rgb(var(--navy))]">
                  <Hotel size={18} />
                  {fmt(row.property_title)}
                </h2>
                <div className="mt-1 text-sm text-black/70">{fmt(row.property_location)}</div>
              </div>

              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusPill(
                  row.status
                )}`}
              >
                {statusLabel(row.status)}
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-black/10 bg-white p-3 text-sm">
                <div className="text-xs uppercase tracking-wide text-black/50">Bien</div>
                <div className="mt-1 font-semibold text-slate-900">REF: {row.property_ref}</div>
                <div className="text-black/65">{fmt(row.property_price)}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <a
                    href={`/biens/${encodeURIComponent(row.property_ref)}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs font-medium text-[rgb(var(--navy))] hover:bg-black/5"
                  >
                    Voir bien
                  </a>
                </div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-white p-3 text-sm">
                <div className="text-xs uppercase tracking-wide text-black/50">Sejour</div>
                <div className="mt-1 text-slate-900">
                  {row.check_in_date} - {row.check_out_date}
                </div>
                <div className="text-xs text-black/60">
                  {row.nights} nuit(s)
                  {row.reservation_option_label ? ` | ${row.reservation_option_label}` : ""}
                </div>
              </div>

              <form
                className="rounded-2xl border border-black/10 bg-white p-3"
                action={async (formData) => {
                  "use server";
                  const status = String(formData.get("status") || "new");
                  const adminNote = String(formData.get("admin_note") || "");
                  await updateShortStayReservationStatus(row.id, status, adminNote);
                }}
              >
                <div className="text-xs uppercase tracking-wide text-black/50">Mise a jour</div>
                <AppDropdown
                  name="status"
                  defaultValue={row.status ?? "new"}
                  className="mt-2"
                  triggerClassName="h-10"
                  options={STATUS.map((s) => ({ value: s, label: s }))}
                />
                <textarea
                  name="admin_note"
                  defaultValue={row.admin_note ?? ""}
                  placeholder="Note interne"
                  className="mt-2 min-h-[80px] w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs text-black/75 outline-none focus:border-[rgb(var(--navy))]/30"
                />
                <button className="mt-2 h-10 w-full rounded-xl bg-[rgb(var(--navy))] px-3 text-xs font-semibold text-white hover:opacity-95">
                  Enregistrer
                </button>
              </form>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-black/10 bg-white p-3 text-sm text-black/70">
                <div className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-black/50">
                  <UserCircle2 size={13} />
                  Client
                </div>
                <div className="mt-1 font-medium text-slate-900">{fmt(row.customer_name)}</div>
                <div className="mt-1 inline-flex items-center gap-1 text-xs text-black/70">
                  <Phone size={12} />
                  {fmt(row.customer_phone)}
                </div>
                <div className="mt-1 text-xs text-black/60">{fmt(row.customer_email)}</div>
              </div>

              {row.message ? (
                <div className="rounded-2xl border border-black/10 bg-white p-3 text-sm text-black/70">
                  <div className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-black/50">
                    <MessageSquare size={13} />
                    Message
                  </div>
                  <div className="mt-1 whitespace-pre-wrap break-words">{row.message}</div>
                </div>
              ) : null}
            </div>
          </article>
        ))}

        {filteredRows.length === 0 && (
          <div className="rounded-2xl border border-black/10 bg-white/75 p-6 text-sm text-black/60">
            Aucune reservation pour les filtres actuels.
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
      <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-black/50">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-extrabold text-[rgb(var(--navy))]">{value}</div>
    </div>
  );
}
