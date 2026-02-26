import SiteAdminHeader from "@/components/site-builder/admin/SiteAdminHeader";
import { requireSiteAdminAuth } from "@/lib/site-builder/auth";

export default async function SiteAdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSiteAdminAuth();

  return (
    <>
      <SiteAdminHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </>
  );
}

