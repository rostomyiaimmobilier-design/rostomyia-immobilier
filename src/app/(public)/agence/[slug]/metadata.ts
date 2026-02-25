import type { Metadata } from "next";
import type { AgencyStorefrontData } from "./storefront-data";

function siteOrigin() {
  return String(process.env.NEXT_PUBLIC_SITE_URL || "https://rostomyia.com").replace(/\/+$/, "");
}

function splitKeywords(value: string) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function buildStorefrontMetadata(
  data: AgencyStorefrontData,
  options?: {
    pageTitle?: string;
    pageDescription?: string;
    pathSuffix?: string;
  }
): Metadata {
  const pathSuffix = options?.pathSuffix || "";
  const basePath = `/agence/${encodeURIComponent(data.slug)}${pathSuffix}`;
  const canonical = data.customDomainStatus === "verified" && data.customDomain
    ? `https://${data.customDomain}${pathSuffix}`
    : `${siteOrigin()}${basePath}`;

  const titleBase = data.seoTitle || data.heroTitle || data.agencyName;
  const title = options?.pageTitle ? `${options.pageTitle} | ${titleBase}` : titleBase;
  const description =
    options?.pageDescription ||
    data.seoDescription ||
    data.agencyTagline ||
    `${data.agencyName} - agence immobiliere.`;
  const keywords = splitKeywords(data.seoKeywords);

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      locale: "fr_FR",
      title,
      description,
      url: canonical,
      siteName: data.agencyName,
      images: data.coverUrl ? [{ url: data.coverUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: data.coverUrl ? [data.coverUrl] : undefined,
    },
  };
}
