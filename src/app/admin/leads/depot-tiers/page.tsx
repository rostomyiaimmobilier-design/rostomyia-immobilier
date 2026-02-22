import { redirect } from "next/navigation";

export default function AdminDepotTiersLeadsRedirect() {
  redirect("/admin/protected/leads/depot-tiers");
}
