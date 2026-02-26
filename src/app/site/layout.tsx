import SiteNavbar from "@/components/site-builder/public/SiteNavbar";
import SiteFooter from "@/components/site-builder/public/SiteFooter";
import PageTransitionShell from "@/components/site-builder/public/PageTransitionShell";
import { getSiteShellData } from "@/lib/site-builder/queries";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { siteSettings, navItems } = await getSiteShellData();

  return (
    <div className="min-h-screen bg-[#f6f5f2] text-slate-900">
      <SiteNavbar settings={siteSettings} navItems={navItems} />
      <PageTransitionShell>{children}</PageTransitionShell>
      <SiteFooter settings={siteSettings} />
    </div>
  );
}
