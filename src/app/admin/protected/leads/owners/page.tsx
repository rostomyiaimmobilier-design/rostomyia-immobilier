import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updateOwnerLeadStatus } from "../actions";

const STATUS = ["new", "contacted", "scheduled", "closed"] as const;

export default async function OwnerLeadsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("owner_leads")
    .select(
      "id, created_at, lang, intent, property_type, city, district, price, surface, rooms, name, phone, message, status"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
          Error loading owner leads: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Owner Leads</h1>
          <p className="mt-1 text-sm text-black/60">
            Dépôts de biens (vendeurs/bailleurs)
          </p>
        </div>
        <Link
          href="/admin/leads"
          className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm hover:bg-white"
        >
          Back
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-black/10 bg-white/70">
        <table className="w-full text-sm">
          <thead className="bg-white/80">
            <tr className="text-left">
              <th className="p-3">Date</th>
              <th className="p-3">Client</th>
              <th className="p-3">Bien</th>
              <th className="p-3">Détails</th>
              <th className="p-3">Statut</th>
            </tr>
          </thead>

          <tbody>
            {(data ?? []).map((x) => (
              <tr key={x.id} className="border-t border-black/5 align-top">
                <td className="p-3 text-black/70">
                  {new Date(x.created_at).toLocaleString("fr-FR")}
                  <div className="text-xs text-black/50">
                    {x.lang?.toUpperCase()} • {x.intent}
                  </div>
                </td>

                <td className="p-3">
                  <div className="font-medium">{x.name}</div>
                  <div className="text-black/70">{x.phone}</div>
                </td>

                <td className="p-3">
                  <div className="font-medium">{x.property_type ?? "-"}</div>
                  <div className="text-black/60">
                    {[x.district, x.city].filter(Boolean).join(" • ") || "-"}
                  </div>
                </td>

                <td className="p-3 text-black/70">
                  <div className="text-xs">
                    Prix:{" "}
                    {typeof x.price === "number"
                      ? `${x.price.toLocaleString("fr-FR")} DZD`
                      : "-"}
                    {" • "}Surface: {x.surface ?? "-"}
                    {" • "}Pièces: {x.rooms ?? "-"}
                  </div>
                  {x.message ? (
                    <div className="mt-2 line-clamp-3 text-xs text-black/60">
                      {x.message}
                    </div>
                  ) : null}
                </td>

                <td className="p-3">
                  <form
                    action={async (formData) => {
                      "use server";
                      const status = String(formData.get("status") || "new");
                      await updateOwnerLeadStatus(x.id, status);
                    }}
                  >
                    <select
                      name="status"
                      defaultValue={x.status ?? "new"}
                      className="w-full rounded-xl border border-black/10 bg-white px-3 py-2"
                    >
                      {STATUS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>

                    <button className="mt-2 w-full rounded-xl bg-black px-3 py-2 text-xs font-medium text-white hover:opacity-95">
                      Save
                    </button>
                  </form>
                </td>
              </tr>
            ))}

            {(!data || data.length === 0) && (
              <tr>
                <td className="p-6 text-black/60" colSpan={5}>
                  No owner leads yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
