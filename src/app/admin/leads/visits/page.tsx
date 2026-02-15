import { redirect } from "next/navigation";

export default function AdminLeadsVisitsRedirectPage() {
  redirect("/admin/protected/leads/visits");
}
