import Link from "next/link";

type SectionKey = "overview" | "about" | "services" | "contact" | "marketplace";

type StorefrontSectionNavProps = {
  slug: string;
  active: SectionKey;
  sectionOrder?: Array<"about" | "services" | "contact" | "marketplace">;
  showServicesSection: boolean;
  showContactSection: boolean;
  showMarketplaceSection: boolean;
  builderType?: "native" | "puck" | "webstudio";
};

export default function StorefrontSectionNav({
  slug,
  active,
  sectionOrder,
  showServicesSection,
  showContactSection,
  showMarketplaceSection,
  builderType = "native",
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
          enabled: builderType !== "native" ? true : showServicesSection,
        };
      }
      if (key === "contact") {
        return {
          key,
          label: "Contact",
          href: `/agence/${encodeURIComponent(slug)}/contact`,
          enabled: builderType !== "native" ? true : showContactSection,
        };
      }
      return {
        key: "marketplace",
        label: "Marketplace",
        href: `/agence/${encodeURIComponent(slug)}/marketplace`,
        enabled: builderType !== "native" ? true : showMarketplaceSection,
      };
    });

  const entries: Array<{ key: SectionKey; label: string; href: string; enabled: boolean }> = [
    { key: "overview", label: "Vue globale", href: `/agence/${encodeURIComponent(slug)}`, enabled: true },
    ...orderedSectionEntries,
  ];

  return (
    <nav className="mt-6 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-[0_16px_38px_-28px_rgba(15,23,42,0.52)]">
      <div className="flex flex-wrap gap-2">
        {entries
          .filter((entry) => entry.enabled || entry.key === active)
          .map((entry) => (
            <Link
              key={entry.key}
              href={entry.href}
              className={`inline-flex h-10 items-center rounded-xl px-3.5 text-sm font-semibold transition ${
                active === entry.key
                  ? "bg-slate-900 text-white shadow-sm"
                  : "border border-transparent bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {entry.label}
            </Link>
          ))}
      </div>
    </nav>
  );
}
