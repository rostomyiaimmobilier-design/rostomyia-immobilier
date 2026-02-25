import Image from "next/image";
import {
  Globe2,
  Mail,
  MapPin,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import StorefrontSectionNav from "./StorefrontSectionNav";
import type { AgencyStorefrontData } from "./storefront-data";

type StorefrontSectionLayoutProps = {
  data: AgencyStorefrontData;
  active: "overview" | "about" | "services" | "contact" | "marketplace";
  title: string;
  subtitle: string;
  children: ReactNode;
};

export default function StorefrontSectionLayout({
  data,
  active,
  title,
  subtitle,
  children,
}: StorefrontSectionLayoutProps) {
  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[rgb(var(--brand-bg))]"
      style={{ backgroundColor: data.brandSecondaryColor }}
    >
      <section className="relative">
        <div
          className="h-[300px] w-full bg-[linear-gradient(130deg,rgba(15,23,42,0.92),rgba(15,23,42,0.75))]"
          style={
            data.coverUrl
              ? {
                  backgroundImage: `linear-gradient(130deg,rgba(15,23,42,0.82),rgba(15,23,42,0.62)),url("${data.coverUrl}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : { backgroundColor: data.brandPrimaryColor }
          }
        />
        <div className="absolute inset-0 mx-auto flex max-w-6xl items-end px-4 pb-6">
          <div className="w-full rounded-3xl border border-white/20 bg-white/90 p-5 shadow-[0_24px_48px_rgba(15,23,42,0.25)] backdrop-blur md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[rgb(var(--navy))]/15 bg-white">
                  {data.logoUrl ? (
                    <Image
                      src={data.logoUrl}
                      alt={data.agencyName}
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-sm font-extrabold text-[rgb(var(--navy))]">
                      {data.agencyInitials}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--gold))]/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
                    <Sparkles size={12} />
                    Vitrine agence
                  </div>
                  <h1
                    className="mt-2 truncate text-2xl font-extrabold md:text-3xl"
                    style={{ color: data.brandPrimaryColor }}
                  >
                    {title}
                  </h1>
                  <p className="mt-1 text-sm text-black/70">{subtitle}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-black/65">
                {data.agencyCity || data.agencyAddress ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2.5 py-1">
                    <MapPin size={12} />
                    {[data.agencyAddress, data.agencyCity].filter(Boolean).join(" - ")}
                  </span>
                ) : null}
                {data.contactEmail ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2.5 py-1">
                    <Mail size={12} />
                    {data.contactEmail}
                  </span>
                ) : null}
                {data.agencyWebsite ? (
                  <a
                    href={data.agencyWebsite}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2.5 py-1 hover:bg-black/5"
                  >
                    <Globe2 size={12} />
                    Site web
                  </a>
                ) : null}
              </div>
            </div>

            <StorefrontSectionNav
              slug={data.slug}
              active={active}
              sectionOrder={data.sectionOrder}
              showServicesSection={data.showServicesSection}
              showContactSection={data.showContactSection}
              showMarketplaceSection={data.showMarketplaceSection}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12 pt-28 md:pt-20">{children}</section>
    </main>
  );
}
