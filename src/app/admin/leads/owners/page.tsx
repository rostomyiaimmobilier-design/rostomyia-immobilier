import { redirect } from "next/navigation";

export default function AdminLeadsOwnersRedirectPage() {
  redirect("/admin/protected/leads/owners");
}
