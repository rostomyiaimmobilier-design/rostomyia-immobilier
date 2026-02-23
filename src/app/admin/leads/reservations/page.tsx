import { redirect } from "next/navigation";

export default function AdminLeadsReservationsRedirectPage() {
  redirect("/admin/protected/leads/reservations");
}
