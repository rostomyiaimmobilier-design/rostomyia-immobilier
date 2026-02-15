import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updateViewingRequestStatus } from "../actions";

const STATUS = ["new", "contacted", "scheduled", "closed"] as const;

export default async function ViewingRequestsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("viewing_requests")
    .select(
      "id, created_at, lang, property_ref, name, phone, preferred_date, preferred_time, message, status"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
          Error loading viewing requests: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Viewing Requests</h1>
          <p className="mt-1 text-sm text-black/60">Demandes de visite</p>
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
              <th className="p-3">Préférence</th>
              <th className="p-3">Statut</th>
            </tr>
          </thead>

          <tbody>
            {(data ?? []).map((x) => (
              <tr key={x.id} className="border-t border-black/5 align-top">
                <td className="p-3 text-black/70">
                  {new Date(x.created_at).toLocaleString("fr-FR")}
                  <div className="text-xs text-black/50">
                    {x.lang?.toUpperCase()}
                  </div>
                </td>

                <td className="p-3">
                  <div className="font-medium">{x.name}</div>
                  <div className="text-black/70">{x.phone}</div>
                  {x.message ? (
                    <div className="mt-2 line-clamp-3 text-xs text-black/60">
                      {x.message}
                    </div>
                  ) : null}
                </td>

                <td className="p-3">
                  <div className="font-medium">
                    {x.property_ref ? `REF: ${x.property_ref}` : "-"}
                  </div>
                </td>

                <td className="p-3 text-black/70">
                  <div>
                    {x.preferred_date ? String(x.preferred_date) : "-"}
                  </div>
                  <div className="text-xs text-black/55">
                    {x.preferred_time ?? "-"}
                  </div>
                </td>

                <td className="p-3">
                  <form
                    action={async (formData) => {
                      "use server";
                      const status = String(formData.get("status") || "new");
                      await updateViewingRequestStatus(x.id, status);
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
                  No viewing requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
