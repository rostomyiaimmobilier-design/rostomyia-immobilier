import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Bath,
  BedDouble,
  Building2,
  CheckCircle2,
  Clock3,
  Globe2,
  Image as ImageIcon,
  Languages,
  Mail,
  MapPin,
  Phone,
  Ruler,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { buildStorefrontMetadata } from "./metadata";
import StorefrontLeadForm from "./StorefrontLeadForm";
import StorefrontSectionNav from "./StorefrontSectionNav";
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
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;
  const data = await getAgencyStorefrontData(slug, { includeMarketplace: true });
  if (!data) notFound();

  const sectionNodes: Record<"about" | "services" | "contact" | "marketplace", ReactNode> = {
    about: data.agencyDescription ? (
      <article className="mt-6 rounded-3xl border border-black/10 bg-white/90 p-6 shadow-sm">
        <h2 className="text-xl font-bold" style={{ color: data.brandPrimaryColor }}>
          {data.aboutTitle}
        </h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-black/75">{data.agencyDescription}</p>
      </article>
    ) : null,

    services:
      data.showServicesSection || data.showHighlightsSection || data.serviceAreas || data.languagesSpoken || data.businessHours ? (
        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          {data.showServicesSection ? (
            <article className="rounded-3xl border border-black/10 bg-white/90 p-5 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wide text-black/55">Services</h3>
              {data.services.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {data.services.map((item) => (
                    <li key={item} className="inline-flex w-full items-start gap-2 text-sm text-black/75">
                      <CheckCircle2 size={14} style={{ color: data.brandAccentColor }} className="mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-black/55">Aucun service renseigne.</p>
              )}
            </article>
          ) : null}

          {data.showHighlightsSection ? (
            <article className="rounded-3xl border border-black/10 bg-white/90 p-5 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wide text-black/55">Points forts</h3>
              {data.highlights.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.highlights.map((item) => (
                    <span
                      key={item}
                      className="inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold"
                      style={{
                        borderColor: `${data.brandAccentColor}55`,
                        backgroundColor: `${data.brandAccentColor}1A`,
                        color: data.brandPrimaryColor,
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-black/55">Aucun point fort renseigne.</p>
              )}
            </article>
          ) : null}

          <article className="rounded-3xl border border-black/10 bg-white/90 p-5 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wide text-black/55">Informations utiles</h3>
            <div className="mt-3 space-y-2 text-sm text-black/75">
              {data.serviceAreas ? (
                <div className="inline-flex items-start gap-2">
                  <MapPin size={14} className="mt-0.5 shrink-0 text-black/55" />
                  {data.serviceAreas}
                </div>
              ) : null}
              {data.languagesSpoken ? (
                <div className="inline-flex items-start gap-2">
                  <Languages size={14} className="mt-0.5 shrink-0 text-black/55" />
                  {data.languagesSpoken}
                </div>
              ) : null}
              {data.businessHours ? (
                <div className="inline-flex items-start gap-2">
                  <Clock3 size={14} className="mt-0.5 shrink-0 text-black/55" />
                  {data.businessHours}
                </div>
              ) : null}
              {!data.serviceAreas && !data.languagesSpoken && !data.businessHours ? (
                <p className="text-sm text-black/55">Aucune information complementaire.</p>
              ) : null}
            </div>
          </article>
        </section>
      ) : null,

    contact:
      data.showContactSection &&
      (data.contactPhone || data.contactEmail || data.agencyAddress || data.businessHours || data.agencyWhatsapp) ? (
        <section className="mt-6 space-y-4">
          <article className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-sm">
            <h2 className="inline-flex items-center gap-2 text-xl font-bold" style={{ color: data.brandPrimaryColor }}>
              <Phone size={18} />
              Contact agence
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.contactPhone ? (
                <a
                  href={`tel:${data.contactPhone}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black/75 hover:bg-black/5"
                >
                  <Phone size={14} />
                  {data.contactPhone}
                </a>
              ) : null}
              {data.contactEmail ? (
                <a
                  href={`mailto:${data.contactEmail}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black/75 hover:bg-black/5"
                >
                  <Mail size={14} />
                  {data.contactEmail}
                </a>
              ) : null}
              {data.whatsappHref ? (
                <a
                  href={data.whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black/75 hover:bg-black/5"
                >
                  <Phone size={14} />
                  WhatsApp: {data.agencyWhatsapp}
                </a>
              ) : data.agencyWhatsapp ? (
                <div className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black/75">
                  <Phone size={14} />
                  WhatsApp: {data.agencyWhatsapp}
                </div>
              ) : null}
              {data.agencyAddress ? (
                <div className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black/75">
                  <MapPin size={14} />
                  {data.agencyAddress}
                </div>
              ) : null}
              {data.businessHours ? (
                <div className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black/75">
                  <Clock3 size={14} />
                  {data.businessHours}
                </div>
              ) : null}
            </div>
          </article>
          <StorefrontLeadForm slug={data.slug} brandPrimaryColor={data.brandPrimaryColor} />
        </section>
      ) : null,

    marketplace: data.showMarketplaceSection ? (
      <article className="mt-6 rounded-3xl border border-black/10 bg-white/90 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="inline-flex items-center gap-2 text-xl font-bold" style={{ color: data.brandPrimaryColor }}>
            <Building2 size={18} />
            {data.marketplaceTitle}
          </h2>
          <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-black/65">
            {data.marketplace.length} bien{data.marketplace.length > 1 ? "s" : ""}
          </span>
        </div>

        {data.marketplace.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-black/15 bg-white/80 px-4 py-6 text-sm text-black/55">
            Aucun bien valide n&apos;est disponible pour le moment.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.marketplace.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
                <div className="relative h-44 bg-slate-100">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 33vw"
                      className="object-cover"
                      loading="lazy"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-black/40">
                      <ImageIcon size={20} />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-2 text-base font-bold" style={{ color: data.brandPrimaryColor }}>
                    {item.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-black/65">{item.location || "-"}</p>
                  <div className="mt-3 text-lg font-extrabold" style={{ color: data.brandPrimaryColor }}>
                    {item.price}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-black/65">
                    <span className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-white px-2 py-1">
                      <Ruler size={12} />
                      {item.area}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-white px-2 py-1">
                      <BedDouble size={12} />
                      {item.beds}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-white px-2 py-1">
                      <Bath size={12} />
                      {item.baths}
                    </span>
                  </div>
                  {item.ref ? (
                    <Link
                      href={`/biens?ref=${encodeURIComponent(item.ref)}`}
                      className="mt-3 inline-flex h-9 items-center rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold hover:bg-black/5"
                      style={{ color: data.brandPrimaryColor }}
                    >
                      Voir bien
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </article>
    ) : null,
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[rgb(var(--brand-bg))]" style={{ backgroundColor: data.brandSecondaryColor }}>
      <section className="relative">
        <div
          className="h-[360px] w-full bg-[linear-gradient(130deg,rgba(15,23,42,0.92),rgba(15,23,42,0.75))]"
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
        <div className="absolute inset-0 mx-auto flex max-w-6xl items-end px-4 pb-8">
          <div className="w-full rounded-3xl border border-white/20 bg-white/90 p-6 shadow-[0_24px_48px_rgba(15,23,42,0.25)] backdrop-blur md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <div
                  className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[rgb(var(--navy))]/15 bg-[linear-gradient(160deg,rgba(15,23,42,0.12),rgba(15,23,42,0.03))] text-lg font-extrabold tracking-wide text-[rgb(var(--navy))]"
                  style={
                    data.logoUrl
                      ? {
                          backgroundImage: `url("${data.logoUrl}")`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : undefined
                  }
                >
                  {data.logoUrl ? null : data.agencyInitials}
                </div>
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--gold))]/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
                    <Sparkles size={12} />
                    Vitrine agence
                  </div>
                  <h1 className="mt-2 truncate text-3xl font-extrabold md:text-4xl" style={{ color: data.brandPrimaryColor }}>
                    {data.heroTitle || data.agencyName}
                  </h1>
                  {data.heroTitle && data.heroTitle !== data.agencyName ? (
                    <p className="mt-1 text-sm font-semibold text-black/65">{data.agencyName}</p>
                  ) : null}
                  {data.heroSubtitle ? <p className="mt-2 text-sm text-black/70">{data.heroSubtitle}</p> : null}
                  {data.agencyTagline ? <p className="mt-2 text-sm font-medium text-black/70">{data.agencyTagline}</p> : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {data.contactPhone ? (
                  <a
                    href={`tel:${data.contactPhone}`}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-black/10 bg-white px-3.5 text-sm font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
                  >
                    <Phone size={14} />
                    Appeler
                  </a>
                ) : null}
                {data.whatsappHref ? (
                  <a
                    href={data.whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-black/10 bg-white px-3.5 text-sm font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
                  >
                    <Phone size={14} />
                    WhatsApp
                  </a>
                ) : null}
                {data.ctaHref ? (
                  <a
                    href={data.ctaHref}
                    target={data.ctaHref.startsWith("http") ? "_blank" : undefined}
                    rel={data.ctaHref.startsWith("http") ? "noreferrer" : undefined}
                    className="inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold text-white hover:opacity-95"
                    style={{ backgroundColor: data.brandPrimaryColor }}
                  >
                    <Globe2 size={14} />
                    {data.ctaLabel}
                  </a>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-black/65">
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
              {data.socialLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2.5 py-1 hover:bg-black/5"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12 pt-28 md:pt-24">
        <StorefrontSectionNav
          slug={data.slug}
          active="overview"
          sectionOrder={data.sectionOrder}
          showServicesSection={data.showServicesSection}
          showContactSection={data.showContactSection}
          showMarketplaceSection={data.showMarketplaceSection}
        />

        {data.sectionOrder.map((sectionKey) => (
          <div key={sectionKey}>{sectionNodes[sectionKey]}</div>
        ))}
      </section>
    </main>
  );
}
