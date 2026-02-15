import { redirect } from "next/navigation";

export default function AdminNewRedirect() {
  redirect("/admin/protected/new");
}
