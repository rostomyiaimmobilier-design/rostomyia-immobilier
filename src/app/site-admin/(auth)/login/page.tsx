import { redirect } from "next/navigation";
import SiteAdminLoginForm from "@/components/site-builder/admin/SiteAdminLoginForm";
import { isSiteAdminAuthenticated } from "@/lib/site-builder/auth";

export default async function SiteAdminLoginPage() {
  const authenticated = await isSiteAdminAuthenticated();
  if (authenticated) {
    redirect("/site-admin/pages");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <SiteAdminLoginForm />
    </div>
  );
}

