import Link from "next/link";

type SectionKey = "overview" | "about" | "services" | "contact" | "marketplace";

type StorefrontSectionNavProps = {
  slug: string;
  active: SectionKey;
  sectionOrder?: Array<"about" | "services" | "contact" | "marketplace">;
  showServicesSection: boolean;
  showContactSection: boolean;
  showMarketplaceSection: boolean;
};

export default function StorefrontSectionNav({
  slug,
  active,
  sectionOrder,
  showServicesSection,
  showContactSection,
  showMarketplaceSection,
}: StorefrontSectionNavProps) {
  const sectionKeys = sectionOrder?.length
    ? sectionOrder
    : (["about", "services", "contact", "marketplace"] as const);

  const orderedSectionEntries: Array<{ key: SectionKey; label: string; href: string; enabled: boolean }> =
    sectionKeys.map((key) => {
      if (key === "about") {
        return { key, label: "A propos", href: `/agence/${encodeURIComponent(slug)}/a-propos`, enabled: true };
      }
      if (key === "services") {
        return {
          key,
          label: "Services",
          href: `/agence/${encodeURIComponent(slug)}/services`,
          enabled: showServicesSection,
        };
      }
      if (key === "contact") {
        return {
          key,
          label: "Contact",
          href: `/agence/${encodeURIComponent(slug)}/contact`,
          enabled: showContactSection,
        };
      }
      return {
        key: "marketplace",
        label: "Marketplace",
        href: `/agence/${encodeURIComponent(slug)}/marketplace`,
        enabled: showMarketplaceSection,
      };
    });

  const entries: Array<{ key: SectionKey; label: string; href: string; enabled: boolean }> = [
    { key: "overview", label: "Vue globale", href: `/agence/${encodeURIComponent(slug)}`, enabled: true },
    ...orderedSectionEntries,
  ];

  return (
    <nav className="mt-6 rounded-2xl border border-black/10 bg-white/90 p-2 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {entries
          .filter((entry) => entry.enabled || entry.key === active)
          .map((entry) => (
            <Link
              key={entry.key}
              href={entry.href}
              className={`inline-flex h-10 items-center rounded-xl px-3.5 text-sm font-semibold transition ${
                active === entry.key
                  ? "bg-[rgb(var(--navy))] text-white"
                  : "border border-black/10 bg-white text-[rgb(var(--navy))] hover:bg-black/5"
              }`}
            >
              {entry.label}
            </Link>
          ))}
      </div>
    </nav>
  );
}
