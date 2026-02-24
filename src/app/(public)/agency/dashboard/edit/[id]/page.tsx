import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import AgencyDepositEditForm from "@/components/agency/AgencyDepositEditForm";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Params = { id: string };

type AgencyLeadRow = {
  id: string;
  status: string | null;
  title: string | null;
  property_type: string | null;
  transaction_type: string | null;
  location_type: string | null;
  commune: string | null;
  district: string | null;
  address: string | null;
  city: string | null;
  price: number | null;
  surface: number | null;
  rooms: number | null;
  baths: number | null;
  payment_terms: string | null;
  commission?: string | null;
  amenities?: string[] | null;
  message: string | null;
  photo_links: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
};

function normalizeText(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeDigits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function statusKind(status: string | null | undefined): "validated" | "rejected" | "processing" {
  const s = normalizeText(status);
  if (s === "validated") return "validated";
  if (s === "rejected") return "rejected";
  return "processing";
}

function isMissingAmenitiesColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("amenities") && (m.includes("does not exist") || m.includes("column"));
}

function isMissingCommissionColumn(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("commission") && (m.includes("does not exist") || m.includes("column"));
}

function isAgencyOwner(
  lead: AgencyLeadRow,
  user: { email?: string | null; phone?: string | null },
  userMeta: { agency_name?: string; company_name?: string; agency_phone?: string; phone?: string }
) {
  const agencyNameNorm = normalizeText(userMeta.agency_name || userMeta.company_name || null);
  const agencyEmailNorm = normalizeText(user.email);
  const agencyPhoneNorm = normalizeDigits(userMeta.agency_phone || userMeta.phone || user.phone || null);
  const leadEmail = normalizeText(lead.email);
  const leadPhone = normalizeDigits(lead.phone);
  const leadName = normalizeText(lead.name);

  if (agencyEmailNorm && leadEmail && agencyEmailNorm === leadEmail) return true;
  if (agencyPhoneNorm && leadPhone && agencyPhoneNorm === leadPhone) return true;
  if (agencyNameNorm && leadName && agencyNameNorm === leadName) return true;
  return false;
}

export default async function AgencyEditBienPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/agency/login");

  const userMeta = (user.user_metadata ?? {}) as {
    account_type?: string;
    agency_name?: string;
    company_name?: string;
    agency_status?: string;
    agency_phone?: string;
    phone?: string;
  };

  if (userMeta.account_type !== "agency") redirect("/agency/login");
  const accountStatus = userMeta.agency_status ?? "pending";
  if (accountStatus !== "active") redirect(`/agency/login?status=${encodeURIComponent(accountStatus)}`);

  const requiredFields = [
    "id",
    "status",
    "title",
    "property_type",
    "transaction_type",
    "location_type",
    "commune",
    "district",
    "address",
    "city",
    "price",
    "surface",
    "rooms",
    "baths",
    "payment_terms",
    "message",
    "photo_links",
    "name",
    "phone",
    "email",
  ];
  const optionalFields = new Set(["amenities", "commission"]);

  let data: AgencyLeadRow | null = null;
  let error: { message?: string } | null = null;

  for (let i = 0; i < 4; i += 1) {
    const selectFields = [...requiredFields, ...Array.from(optionalFields)].join(",");
    const attempt = await supabase
      .from("owner_leads")
      .select(selectFields)
      .eq("id", id)
      .maybeSingle();

    data = (attempt.data as AgencyLeadRow | null) ?? null;
    error = attempt.error;
    if (!error) break;

    let changed = false;
    if (isMissingAmenitiesColumn(error.message) && optionalFields.has("amenities")) {
      optionalFields.delete("amenities");
      changed = true;
    }
    if (isMissingCommissionColumn(error.message) && optionalFields.has("commission")) {
      optionalFields.delete("commission");
      changed = true;
    }
    if (!changed) break;
  }

  if (error) {
    throw new Error(error.message || "Unable to load agency deposit.");
  }

  const lead = data as AgencyLeadRow | null;
  if (!lead) redirect("/agency/dashboard");
  if (!isAgencyOwner(lead, user, userMeta)) redirect("/agency/dashboard");
  if (statusKind(lead.status) !== "processing") redirect("/agency/dashboard");

  return (
    <main className="relative min-h-screen overflow-hidden bg-[rgb(var(--brand-bg))] px-4 py-10 md:py-14">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full bg-[rgb(var(--gold))]/20 blur-3xl" />
        <div className="absolute right-0 top-16 h-[340px] w-[340px] rounded-full bg-[rgb(var(--navy))]/12 blur-3xl" />
      </div>

      <section className="relative mx-auto w-full max-w-[1120px] space-y-6">
        <div className="rounded-3xl border border-black/10 bg-white/75 p-7 backdrop-blur md:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-[rgb(var(--navy))] md:text-4xl">
                Modifier un bien
              </h1>
              <p className="mt-3 max-w-3xl text-sm text-black/65">
                Modifiez votre depot pendant la phase de traitement: infos, description et images.
              </p>
            </div>
            <Link
              href="/agency/dashboard?filter=processing"
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[rgb(var(--navy))] hover:bg-black/5"
            >
              <ArrowLeft size={15} />
              Retour au dashboard
            </Link>
          </div>
        </div>

        <AgencyDepositEditForm
          lead={{
            id: lead.id,
            title: lead.title,
            property_type: lead.property_type,
            transaction_type: lead.transaction_type,
            location_type: lead.location_type,
            commune: lead.commune,
            district: lead.district,
            address: lead.address,
            city: lead.city,
            price: lead.price,
            surface: lead.surface,
            rooms: lead.rooms,
            baths: lead.baths,
            payment_terms: lead.payment_terms,
            commission: ("commission" in lead ? lead.commission : null) ?? null,
            amenities:
              "amenities" in lead && Array.isArray(lead.amenities)
                ? lead.amenities.map((x) => String(x).trim()).filter(Boolean)
                : [],
            message: lead.message,
            photo_links: lead.photo_links,
          }}
        />
      </section>
    </main>
  );
}
