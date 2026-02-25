import Link from "next/link";
import {
  ArrowLeft,
  Archive,
  BadgeDollarSign,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Hash,
  Hotel,
  Hourglass,
  Info,
  Mail,
  MapPin,
  MessageSquare,
  NotebookPen,
  Phone,
  ShieldCheck,
  XCircle,
  UserCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateShortStayReservationStatus } from "../actions";
import AppDropdown from "@/components/ui/app-dropdown";

const STATUS = ["hold", "new", "contacted", "confirmed", "cancelled", "closed"] as const;

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
  hold_expires_at: string | null;
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

function fmtDateTime(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return raw;
  return date.toLocaleString("fr-FR");
}

function fmtDate(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return raw;
  return date.toLocaleDateString("fr-FR");
}

function shortReservationId(value: string | null | undefined) {
  const id = String(value ?? "").trim();
  if (!id) return "-";
  return id.slice(0, 8).toUpperCase();
}

function statusLabel(status: string | null | undefined) {
  const s = String(status ?? "new").trim().toLowerCase();
  if (s === "hold") return "en attente";
  if (s === "contacted") return "contacte";
  if (s === "confirmed") return "confirme";
  if (s === "cancelled") return "annule";
  if (s === "closed") return "ferme";
  return "nouveau";
}

function statusPill(status: string | null | undefined) {
  const s = String(status ?? "new").trim().toLowerCase();
  if (s === "hold") return "border-violet-200 bg-violet-50 text-violet-700";
  if (s === "confirmed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (s === "contacted") return "border-blue-200 bg-blue-50 text-blue-700";
  if (s === "cancelled") return "border-rose-200 bg-rose-50 text-rose-700";
  if (s === "closed") return "border-slate-300 bg-slate-100 text-slate-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function statusCardTone(status: string | null | undefined) {
  const s = String(status ?? "new").trim().toLowerCase();
  if (s === "hold") return "before:bg-violet-500";
  if (s === "confirmed") return "before:bg-emerald-500";
  if (s === "contacted") return "before:bg-blue-500";
  if (s === "cancelled") return "before:bg-rose-500";
  if (s === "closed") return "before:bg-slate-500";
  return "before:bg-amber-500";
}

function statusSummary(status: string | null | undefined) {
  const s = String(status ?? "new").trim().toLowerCase();
  if (s === "hold") return "Reservation en attente de confirmation. Verifier expiration hold puis confirmer ou annuler.";
  if (s === "new") return "Nouveau lead reservation. Priorite: contacter rapidement le client.";
  if (s === "contacted") return "Client contacte. Mettre a jour selon retour client.";
  if (s === "confirmed") return "Reservation confirmee. Surveiller date de sortie pour cloture.";
  if (s === "cancelled") return "Reservation annulee. Conserver un motif dans la note interne.";
  if (s === "closed") return "Reservation terminee et archivee.";
  return "Verifier les details de reservation puis mettre a jour le statut.";
}

function holdSummary(status: string | null | undefined, holdExpiresAt: string | null | undefined) {
  if (String(status ?? "").toLowerCase() !== "hold") return "Aucun hold actif";
  const expiryRaw = String(holdExpiresAt ?? "").trim();
  if (!expiryRaw) return "Hold actif sans expiration";
  const expiry = new Date(expiryRaw);
  if (!Number.isFinite(expiry.getTime())) return `Hold jusqu'au ${expiryRaw}`;
  return `Hold actif jusqu'au ${fmtDateTime(expiryRaw)}`;
}

function isMissingReservationsTable(message: string | undefined) {
  const m = String(message ?? "").toLowerCase();
  return m.includes("short_stay_reservations") && (m.includes("does not exist") || m.includes("relation"));
}

function digitsOnly(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function buildStatusTemplate(row: ReservationRow, nextStatus: string) {
  return [
    "Rostomyia Immobilier - mise a jour reservation",
    `Statut: ${nextStatus}`,
    `REF Bien: ${row.property_ref}`,
    `Bien: ${fmt(row.property_title)}`,
    `Sejour: ${row.check_in_date} -> ${row.check_out_date}`,
    `Nuits: ${row.nights}`,
  ].join("\n");
}

function buildWhatsappTemplateLink(row: ReservationRow, nextStatus: string) {
  const digits = digitsOnly(row.customer_phone);
  if (!digits) return null;
  const text = buildStatusTemplate(row, nextStatus);
  return `https://wa.me/${encodeURIComponent(digits)}?text=${encodeURIComponent(text)}`;
}

function buildMailtoTemplateLink(row: ReservationRow, nextStatus: string) {
  const email = fmt(row.customer_email);
  if (email === "-") return null;
  const subject = `Reservation ${row.property_ref} - ${nextStatus}`;
  const body = buildStatusTemplate(row, nextStatus);
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
      "id, created_at, updated_at, status, lang, property_ref, property_title, property_location, property_price, reservation_option_label, check_in_date, check_out_date, nights, customer_name, customer_phone, customer_email, message, admin_note, hold_expires_at"
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

        <details className="relative mt-4 rounded-2xl border border-black/10 bg-white/80 p-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-2 py-1 text-sm font-semibold text-[rgb(var(--navy))] hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              <Info size={14} />
              Guide des statuts et actions
            </span>
            <span className="text-xs text-black/55">Cliquez pour afficher</span>
          </summary>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            <StatusLegendItem
              status="hold"
              description="Reservation temporairement bloquee (15 min)."
              action="Verifier rapidement puis confirmer ou annuler."
            />
            <StatusLegendItem
              status="new"
              description="Nouvelle reservation entrante."
              action="Contacter le client puis passer a contacted/confirmed."
            />
            <StatusLegendItem
              status="contacted"
              description="Client deja contacte."
              action="Mettre a jour vers confirmed, cancelled ou hold."
            />
            <StatusLegendItem
              status="confirmed"
              description="Reservation validee."
              action="Suivre le sejour puis clore apres check-out."
            />
            <StatusLegendItem
              status="cancelled"
              description="Reservation annulee."
              action="Renseigner un motif dans note interne."
            />
            <StatusLegendItem
              status="closed"
              description="Reservation terminee et archivee."
              action="Aucune action operationnelle restante."
            />
          </div>
        </details>
      </section>

      <section className="space-y-4">
        {filteredRows.map((row) => {
          const confirmWa = buildWhatsappTemplateLink(row, "confirmed");
          const cancelWa = buildWhatsappTemplateLink(row, "cancelled");
          const closeWa = buildWhatsappTemplateLink(row, "closed");
          const confirmMail = buildMailtoTemplateLink(row, "confirmed");
          const cancelMail = buildMailtoTemplateLink(row, "cancelled");
          const closeMail = buildMailtoTemplateLink(row, "closed");
          const holdDate =
            row.status === "hold" && row.hold_expires_at
              ? fmtDateTime(row.hold_expires_at)
              : null;
          const reservationCode = shortReservationId(row.id);
          const statusText = statusSummary(row.status);
          const holdText = holdSummary(row.status, row.hold_expires_at);
          const phoneDigits = digitsOnly(row.customer_phone);
          const phoneHref = phoneDigits ? `tel:${phoneDigits}` : null;
          const whatsappHref = phoneDigits ? `https://wa.me/${encodeURIComponent(phoneDigits)}` : null;
          const customerEmail = fmt(row.customer_email);
          const emailHref = customerEmail !== "-" ? `mailto:${encodeURIComponent(customerEmail)}` : null;
          const isPriorityStatus = ["new", "hold"].includes(String(row.status ?? "new").toLowerCase());
          const normalizedRowStatus = String(row.status ?? "new").trim().toLowerCase();
          const isActionLocked = ["confirmed", "cancelled", "closed"].includes(normalizedRowStatus);
          return (
            <article
              key={row.id}
              className={`relative overflow-hidden rounded-3xl border border-black/10 bg-white/90 p-5 shadow-sm ring-1 ring-white/65 backdrop-blur before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:content-[''] md:p-6 ${statusCardTone(
                row.status
              )}`}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[radial-gradient(65%_120%_at_50%_-20%,rgba(15,23,42,0.09),transparent)]" />

              <div className="relative flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] font-medium text-black/65">
                      <Clock3 size={12} />
                      {fmtDateTime(row.created_at)}
                    </span>
                    <span className="inline-flex rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] font-medium text-black/65">
                      MAJ: {fmtDateTime(row.updated_at)}
                    </span>
                    {row.lang ? (
                      <span className="inline-flex rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--navy))]">
                        {row.lang.toUpperCase()}
                      </span>
                    ) : null}
                  </div>

                  <h2 className="inline-flex items-center gap-2 text-xl font-extrabold tracking-tight text-[rgb(var(--navy))]">
                    <Hotel size={18} />
                    {fmt(row.property_title)}
                  </h2>
                  <p className="inline-flex items-center gap-1.5 text-sm text-black/70">
                    <MapPin size={14} />
                    {fmt(row.property_location)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--navy))]">
                    REF: {row.property_ref}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] font-semibold text-black/70">
                    <Hash size={12} />
                    RES: {reservationCode}
                  </span>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusPill(
                      row.status
                    )}`}
                  >
                    {statusLabel(row.status)}
                  </span>
                </div>
              </div>

              <div className="relative mt-4 grid gap-2 rounded-2xl border border-black/10 bg-gradient-to-r from-slate-50 to-white p-3 sm:grid-cols-2 xl:grid-cols-4">
                <OverviewItem
                  label="Periode"
                  value={`${fmtDate(row.check_in_date)} - ${fmtDate(row.check_out_date)}`}
                  icon={<CalendarRange size={13} />}
                />
                <OverviewItem
                  label="Nuits / Option"
                  value={`${row.nights} nuit(s)${row.reservation_option_label ? ` | ${row.reservation_option_label}` : ""}`}
                  icon={<Hotel size={13} />}
                />
                <OverviewItem label="Etat hold" value={holdText} icon={<Hourglass size={13} />} />
                <OverviewItem label="Guide statut" value={statusText} icon={<Info size={13} />} />
              </div>

              <details
                open={isPriorityStatus}
                className="group relative mt-4 rounded-2xl border border-black/10 bg-white/55 p-2 open:bg-transparent"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-[rgb(var(--navy))] hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex items-center gap-2">
                    <Info size={14} />
                    Details complets reservation
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-black/60">
                    <span className="group-open:hidden">Etendre</span>
                    <span className="hidden group-open:inline">Reduire</span>
                    <ChevronDown size={14} className="transition-transform duration-200 group-open:rotate-180" />
                  </span>
                </summary>

                <div className="relative mt-3 grid gap-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
                <div className="space-y-3">
                  <div className="rounded-2xl border border-black/10 bg-white p-4">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl bg-slate-50 p-3 text-sm">
                        <div className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-black/50">
                          <BadgeDollarSign size={12} />
                          Prix
                        </div>
                        <div className="mt-1 font-semibold text-slate-900">{fmt(row.property_price)}</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3 text-sm">
                        <div className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-black/50">
                          <CalendarDays size={12} />
                          Sejour
                        </div>
                        <div className="mt-1 font-semibold text-slate-900">
                          {row.check_in_date}
                          {" -> "}
                          {row.check_out_date}
                        </div>
                        <div className="mt-0.5 text-xs text-black/60">
                          Du {fmtDate(row.check_in_date)} au {fmtDate(row.check_out_date)}
                        </div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3 text-sm">
                        <div className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-black/50">
                          <Hash size={12} />
                          Detail reservation
                        </div>
                        <div className="mt-1 font-semibold text-slate-900">{row.nights} nuit(s)</div>
                        <div className="mt-0.5 text-xs text-black/60">
                          {row.reservation_option_label ? row.reservation_option_label : "Option non renseignee"}
                        </div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3 text-sm">
                        <div className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-black/50">
                          <ExternalLink size={12} />
                          Actions bien
                        </div>
                        <a
                          href={`/biens/${encodeURIComponent(row.property_ref)}`}
                          className="mt-1 inline-flex items-center gap-1 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs font-medium text-[rgb(var(--navy))] hover:bg-black/5"
                        >
                          <ExternalLink size={12} />
                          Voir bien
                        </a>
                        {holdDate ? (
                          <div className="mt-1 text-xs font-medium text-violet-700">Hold jusqu&apos;au {holdDate}</div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-white p-4 text-sm text-black/75">
                    <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-black/50">
                      <UserCircle2 size={13} />
                      Client et communication
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      <div className="font-medium text-slate-900">{fmt(row.customer_name)}</div>
                      <div className="inline-flex items-center gap-1 text-xs"><Phone size={12} /> {fmt(row.customer_phone)}</div>
                      <div className="inline-flex items-center gap-1 text-xs"><Mail size={12} /> {fmt(row.customer_email)}</div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {phoneHref ? (
                        <a
                          href={phoneHref}
                          className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[11px] font-semibold text-sky-700"
                        >
                          <Phone size={12} />
                          Appeler
                        </a>
                      ) : null}
                      {whatsappHref ? (
                        <a
                          href={whatsappHref}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700"
                        >
                          <Phone size={12} />
                          WhatsApp direct
                        </a>
                      ) : null}
                      {emailHref ? (
                        <a
                          href={emailHref}
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700"
                        >
                          <Mail size={12} />
                          Envoyer email
                        </a>
                      ) : null}
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Templates confirmation</div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {confirmWa ? <a href={confirmWa} target="_blank" rel="noreferrer" className="inline-flex rounded-md border border-emerald-300 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-700">WA</a> : null}
                          {confirmMail ? <a href={confirmMail} className="inline-flex rounded-md border border-emerald-300 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-700">Email</a> : null}
                        </div>
                      </div>
                      <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-2">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">Templates annulation/closure</div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {cancelWa ? <a href={cancelWa} target="_blank" rel="noreferrer" className="inline-flex rounded-md border border-rose-300 bg-white px-2 py-1 text-[11px] font-semibold text-rose-700">WA annule</a> : null}
                          {cancelMail ? <a href={cancelMail} className="inline-flex rounded-md border border-rose-300 bg-white px-2 py-1 text-[11px] font-semibold text-rose-700">Email annule</a> : null}
                          {closeWa ? <a href={closeWa} target="_blank" rel="noreferrer" className="inline-flex rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700">WA clos</a> : null}
                          {closeMail ? <a href={closeMail} className="inline-flex rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700">Email clos</a> : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  {row.admin_note ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-black/75">
                      <div className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-amber-700">
                        <NotebookPen size={13} />
                        Note interne actuelle
                      </div>
                      <div className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-white/70 p-3">
                        {row.admin_note}
                      </div>
                    </div>
                  ) : null}

                  {!isActionLocked && row.message ? (
                    <div className="rounded-2xl border border-black/10 bg-white p-4 text-sm text-black/75">
                      <div className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-black/50">
                        <MessageSquare size={13} />
                        Message client
                      </div>
                      <div className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-3">
                        {row.message}
                      </div>
                    </div>
                  ) : null}
                </div>

                <form
                  className="rounded-2xl border border-black/10 bg-gradient-to-b from-white to-slate-50 p-4"
                  action={async (formData) => {
                    "use server";
                    const quickStatus = String(formData.get("quick_status") || "");
                    const status = quickStatus || String(formData.get("status") || "new");
                    const adminNote = String(formData.get("admin_note") || "");
                    const forceCancel = String(formData.get("force_cancel") || "") === "1";
                    await updateShortStayReservationStatus(row.id, status, adminNote, forceCancel);
                  }}
                >
                  <div className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.12em] text-black/50">
                    <ShieldCheck size={12} />
                    Pilotage reservation
                  </div>
                  <div className="mt-2 rounded-xl border border-black/10 bg-white/80 p-2 text-xs text-black/70">
                    <div className="inline-flex items-center gap-1 font-semibold text-[rgb(var(--navy))]">
                      <Info size={12} />
                      Resume execution
                    </div>
                    <div className="mt-2 space-y-1.5">
                      <ExecutionLabel icon={<CalendarDays size={12} />} label="Date de creation" value={fmtDateTime(row.created_at)} />
                      <ExecutionLabel icon={<Clock3 size={12} />} label="Derniere mise a jour" value={fmtDateTime(row.updated_at)} />
                      <ExecutionLabel icon={<Hash size={12} />} label="Code reservation" value={reservationCode} />
                      <ExecutionLabel icon={<Hourglass size={12} />} label="Etat du hold" value={holdText} />
                    </div>
                  </div>
                  {isActionLocked && row.message ? (
                    <div className="mt-2 rounded-xl border border-black/10 bg-white p-3 text-xs text-black/75">
                      <div className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-black/50">
                        <MessageSquare size={12} />
                        Message client
                      </div>
                      <div className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-2.5">
                        {row.message}
                      </div>
                    </div>
                  ) : null}
                  {isActionLocked ? (
                    <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-800">
                      Actions masquees: reservation deja {statusLabel(row.status)}.
                    </div>
                  ) : (
                    <>
                      <div className="mt-2 grid grid-cols-3 gap-1.5">
                        <button type="submit" name="quick_status" value="confirmed" className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 text-[11px] font-semibold text-white hover:opacity-95"><CheckCircle2 size={12} />Confirmer</button>
                        <button type="submit" name="quick_status" value="cancelled" className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-rose-600 px-2 text-[11px] font-semibold text-white hover:opacity-95"><XCircle size={12} />Annuler</button>
                        <button type="submit" name="quick_status" value="closed" className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-slate-700 px-2 text-[11px] font-semibold text-white hover:opacity-95"><Archive size={12} />Clore</button>
                      </div>

                      <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-black/55">
                        <NotebookPen size={12} />
                        Changer le statut manuellement
                      </div>
                      <AppDropdown
                        name="status"
                        defaultValue={row.status ?? "new"}
                        className="mt-1"
                        triggerClassName="h-10"
                        options={STATUS.map((s) => ({ value: s, label: s }))}
                      />
                      <label className="mt-2 inline-flex items-center gap-2 text-[11px] text-black/70">
                        <input type="checkbox" name="force_cancel" value="1" className="rounded border-black/20" />
                        Forcer annulation (ignore cutoff)
                      </label>
                      <textarea
                        name="admin_note"
                        defaultValue={row.admin_note ?? ""}
                        placeholder="Note interne (motif, relance, details client)"
                        className="mt-2 min-h-[110px] w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs text-black/75 outline-none focus:border-[rgb(var(--navy))]/30"
                      />
                      <button className="mt-2 h-10 w-full rounded-xl bg-[rgb(var(--navy))] px-3 text-xs font-semibold text-white hover:opacity-95">
                        Enregistrer les modifications
                      </button>
                    </>
                  )}
                </form>
                </div>
              </details>
            </article>
          );
        })}

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
    <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition hover:shadow-md">
      <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-black/50">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-black/10 bg-slate-50 text-[rgb(var(--navy))]">
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-2 text-2xl font-extrabold text-[rgb(var(--navy))]">{value}</div>
    </div>
  );
}

function OverviewItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white/80 p-2.5">
      <div className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-black/45">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-xs font-semibold leading-5 text-slate-800">{value}</div>
    </div>
  );
}

function ExecutionLabel({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-black/10 bg-white/80 px-2 py-1.5">
      <div className="inline-flex items-center gap-1 text-[11px] font-medium text-black/60">
        {icon}
        {label}
      </div>
      <div className="text-[11px] font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function StatusLegendItem({
  status,
  description,
  action,
}: {
  status: string;
  description: string;
  action: string;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-2.5">
      <div className="flex items-center gap-2">
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusPill(status)}`}>
          {statusLabel(status)}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/45">{status}</span>
      </div>
      <p className="mt-1 text-xs text-black/70">{description}</p>
      <p className="mt-1 text-xs font-medium text-[rgb(var(--navy))]">Action: {action}</p>
    </div>
  );
}
