import type { ReactNode } from "react";
import AgencyMobileConversionRail from "./AgencyMobileConversionRail";
import AgencyPageMotion from "./AgencyPageMotion";
import AgencyPremiumFooter from "./AgencyPremiumFooter";
import AgencyPremiumNavbar from "./AgencyPremiumNavbar";
import AgencyTrustStrip from "./AgencyTrustStrip";
import {
  nativeContainerClass,
  nativeFontVars,
  nativeSectionSpacingClass,
  nativeTypographyClass,
} from "./native-studio";
import type { AgencyStorefrontData } from "./storefront-data";

type StorefrontSectionLayoutProps = {
  data: AgencyStorefrontData;
  children: ReactNode;
  locale?: "fr" | "ar";
};

export default function StorefrontSectionLayout({
  data,
  children,
  locale = "fr",
}: StorefrontSectionLayoutProps) {
  const sectionSpacingClass = nativeSectionSpacingClass(data.nativeStudio);
  const containerClass = nativeContainerClass(data.nativeStudio);
  const typographyClass = nativeTypographyClass(data.nativeStudio);
  const fonts = nativeFontVars(data.nativeStudio);

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#f6f5f2] text-slate-900"
      style={{
        backgroundColor: data.brandSecondaryColor || "#f6f5f2",
        fontFamily: fonts.bodyFont,
      }}
    >
      <AgencyPremiumNavbar data={data} />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-12rem] h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="absolute right-[-5rem] top-24 h-72 w-72 rounded-full bg-slate-200/40 blur-3xl" />
      </div>
      <AgencyPageMotion motionLevel={data.nativeStudio.design_tokens.motion_level}>
        <section className={`mx-auto ${containerClass} px-4 pb-20 pt-8 sm:px-6 md:pt-10 lg:px-8`}>
          <div
            className={`${typographyClass} ${sectionSpacingClass} [&_h1]:[font-family:var(--native-heading-font)] [&_h2]:[font-family:var(--native-heading-font)] [&_h3]:[font-family:var(--native-heading-font)]`}
            style={{ ["--native-heading-font" as string]: fonts.headingFont }}
          >
            {children}
          </div>
        </section>
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
