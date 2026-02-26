import type { NavItem, SiteSettings } from "@prisma/client";
import PremiumNavbar from "@/components/site-builder/public/PremiumNavbar";

export default function SiteNavbar({
  settings,
  navItems,
}: {
  settings: SiteSettings | null;
  navItems: NavItem[];
}) {
  return (
    <PremiumNavbar
      brandName={settings?.brandName || "Atelier Prime"}
      logoUrl={settings?.logoUrl}
      homeHref="/site"
      navItems={navItems.map((item) => ({ id: item.id, label: item.label, href: item.href }))}
      ctaLabel="Start Project"
      ctaHref="/site/contact"
      pillLayoutId="site-nav-pill"
    />
  );
}
