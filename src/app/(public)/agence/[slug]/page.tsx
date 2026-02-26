import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AgencyHomeSectionRenderer from "./AgencyHomeSectionRenderer";
import AgencyMobileConversionRail from "./AgencyMobileConversionRail";
import AgencyPageMotion from "./AgencyPageMotion";
import { buildAgencyHomeSections } from "./agency-home-sections";
import AgencyPremiumFooter from "./AgencyPremiumFooter";
import AgencyPremiumNavbar from "./AgencyPremiumNavbar";
import AgencyTrustStrip from "./AgencyTrustStrip";
import { buildStorefrontMetadata } from "./metadata";
import { nativeContainerClass, nativeFontVars } from "./native-studio";
import StorefrontBuilderContent from "./StorefrontBuilderContent";
import { getAgencyStorefrontData } from "./storefront-data";

export const dynamic = "force-dynamic";

type RouteParams = {
  slug: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getAgencyStorefrontData(slug);
  if (!data) return {};

  return buildStorefrontMetadata(data, {
    pageTitle: data.agencyName,
    pageDescription: data.agencyTagline || data.seoDescription,
    pathSuffix: "",
  });
}

export default async function AgencyShowcasePage({
  params,
  searchParams,
}: {
  params: Promise<RouteParams>;
  searchParams: Promise<{ lang?: string; preview_editor?: string }>;
}) {
  const { slug } = await params;
  const { lang, preview_editor } = await searchParams;
  const locale = lang === "ar" ? "ar" : "fr";
  const editablePreview = preview_editor === "1";
  const data = await getAgencyStorefrontData(slug, { includeMarketplace: true, locale });
  if (!data) notFound();

  const homeSections = buildAgencyHomeSections(data);
  const containerClass = nativeContainerClass(data.nativeStudio);
  const fonts = nativeFontVars(data.nativeStudio);

  return (
    <main
      className="min-h-screen bg-[#f6f5f2] text-slate-900"
      style={{
        backgroundColor: data.brandSecondaryColor || "#f6f5f2",
        fontFamily: fonts.bodyFont,
      }}
    >
      <AgencyPremiumNavbar data={data} />

      <AgencyPageMotion motionLevel={data.nativeStudio.design_tokens.motion_level}>
        <div
          className="relative [&_h1]:[font-family:var(--native-heading-font)] [&_h2]:[font-family:var(--native-heading-font)] [&_h3]:[font-family:var(--native-heading-font)]"
          style={{ ["--native-heading-font" as string]: fonts.headingFont }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-amber-100/45 to-transparent" />

          {data.builderType !== "native" ? (
            <section className="px-4 py-16 sm:px-6 lg:px-8">
              <div className={`mx-auto w-full ${containerClass}`}>
                <StorefrontBuilderContent data={data} page="overview" />
              </div>
            </section>
          ) : (
            <AgencyHomeSectionRenderer sections={homeSections} data={data} editablePreview={editablePreview} />
          )}
        </div>
      </AgencyPageMotion>

      <AgencyTrustStrip data={data} />
      <AgencyPremiumFooter data={data} locale={locale} />
      <AgencyMobileConversionRail
        enabled={data.nativeStudio.mobile_conversion_rail}
        contactPhone={data.contactPhone}
        whatsappHref={data.whatsappHref}
        ctaHref={data.ctaHref}
        ctaLabel={data.ctaLabel}
        brandPrimaryColor={data.brandPrimaryColor}
      />
    </main>
  );
}
