import PremiumNavbar, {
  type PremiumNavItem,
} from "@/components/site-builder/public/PremiumNavbar";
import type { AgencyStorefrontData } from "./storefront-data";

function buildNavItems(data: AgencyStorefrontData): PremiumNavItem[] {
  const ordered = data.sectionOrder.length
    ? data.sectionOrder
    : (["about", "services", "contact", "marketplace"] as const);

  const items: PremiumNavItem[] = [
    { id: "overview", label: "Overview", href: `/agence/${encodeURIComponent(data.slug)}` },
  ];

  for (const key of ordered) {
    if (key === "services" && data.builderType === "native" && !data.showServicesSection) continue;
    if (key === "contact" && data.builderType === "native" && !data.showContactSection) continue;
    if (key === "marketplace" && data.builderType === "native" && !data.showMarketplaceSection) {
      continue;
    }

    if (key === "about") {
      items.push({
        id: "about",
        label: "About",
        href: `/agence/${encodeURIComponent(data.slug)}/a-propos`,
      });
      continue;
    }
    if (key === "services") {
      items.push({
        id: "services",
        label: "Services",
        href: `/agence/${encodeURIComponent(data.slug)}/services`,
      });
      continue;
    }
    if (key === "contact") {
      items.push({
        id: "contact",
        label: "Contact",
        href: `/agence/${encodeURIComponent(data.slug)}/contact`,
      });
      continue;
    }
    items.push({
      id: "marketplace",
      label: "Projects",
      href: `/agence/${encodeURIComponent(data.slug)}/marketplace`,
    });
  }

  return items;
}

export default function AgencyPremiumNavbar({ data }: { data: AgencyStorefrontData }) {
  return (
    <PremiumNavbar
      brandName={data.agencyName}
      logoUrl={data.logoUrl}
      homeHref={`/agence/${encodeURIComponent(data.slug)}`}
      navItems={buildNavItems(data)}
      ctaLabel={data.ctaLabel || "Contact"}
      ctaHref={data.ctaHref || `/agence/${encodeURIComponent(data.slug)}/contact`}
      pillLayoutId="agency-nav-pill"
      showLocaleSwitch
    />
  );
}
