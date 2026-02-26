import PremiumFooter, {
  type PremiumFooterColumn,
  type PremiumSocialLink,
} from "@/components/site-builder/public/PremiumFooter";
import type { AgencyStorefrontData } from "./storefront-data";

function withLocale(href: string, locale: "fr" | "ar") {
  if (locale !== "ar") return href;
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const [pathOnly, query = ""] = href.split("?");
  const next = new URLSearchParams(query);
  next.set("lang", "ar");
  const q = next.toString();
  return `${pathOnly}${q ? `?${q}` : ""}`;
}

function buildColumns(data: AgencyStorefrontData, locale: "fr" | "ar"): PremiumFooterColumn[] {
  const navigationLinks: Array<{ label: string; href: string }> = [
    { label: "Overview", href: withLocale(`/agence/${encodeURIComponent(data.slug)}`, locale) },
    { label: "About", href: withLocale(`/agence/${encodeURIComponent(data.slug)}/a-propos`, locale) },
  ];

  if (data.builderType !== "native" || data.showServicesSection) {
    navigationLinks.push({
      label: "Services",
      href: withLocale(`/agence/${encodeURIComponent(data.slug)}/services`, locale),
    });
  }
  if (data.builderType !== "native" || data.showMarketplaceSection) {
    navigationLinks.push({
      label: "Marketplace",
      href: withLocale(`/agence/${encodeURIComponent(data.slug)}/marketplace`, locale),
    });
  }
  if (data.builderType !== "native" || data.showContactSection) {
    navigationLinks.push({
      label: "Contact",
      href: withLocale(`/agence/${encodeURIComponent(data.slug)}/contact`, locale),
    });
  }

  const contactLinks: Array<{ label: string; href: string }> = [];
  if (data.contactPhone) {
    contactLinks.push({ label: "Call now", href: `tel:${data.contactPhone}` });
    contactLinks.push({ label: data.contactPhone, href: `tel:${data.contactPhone}` });
  }
  if (data.contactEmail) {
    contactLinks.push({ label: "Send email", href: `mailto:${data.contactEmail}` });
    contactLinks.push({ label: data.contactEmail, href: `mailto:${data.contactEmail}` });
  }
  if (data.whatsappHref) {
    contactLinks.push({ label: "WhatsApp chat", href: data.whatsappHref });
  }
  if (data.agencyWebsite) {
    contactLinks.push({ label: "Visit website", href: data.agencyWebsite });
  }

  return [
    { title: "Navigation", links: navigationLinks },
    { title: "Contact", links: contactLinks.length ? contactLinks : [{ label: "No contact yet", href: "#" }] },
  ];
}

function buildSocials(data: AgencyStorefrontData): PremiumSocialLink[] {
  return data.socialLinks.map((item) => ({ label: item.label, href: item.href }));
}

export default function AgencyPremiumFooter({
  data,
  locale = "fr",
}: {
  data: AgencyStorefrontData;
  locale?: "fr" | "ar";
}) {
  return (
    <PremiumFooter
      brandName={data.agencyName}
      logoUrl={data.logoUrl}
      description={
        data.agencyTagline ||
        "Premium real-estate storefront experience powered by Rostomyia."
      }
      columns={buildColumns(data, locale)}
      socials={buildSocials(data)}
      copyrightText={`(c) ${new Date().getFullYear()} ${data.agencyName}. All rights reserved.`}
    />
  );
}
