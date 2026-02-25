import { Clock3, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildStorefrontMetadata } from "../metadata";
import StorefrontSectionLayout from "../StorefrontSectionLayout";
import StorefrontLeadForm from "../StorefrontLeadForm";
import { getAgencyStorefrontData } from "../storefront-data";

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
    pageTitle: "Contact",
    pageDescription:
      data.contactPhone || data.contactEmail
        ? `Contactez ${data.agencyName}: ${data.contactPhone || data.contactEmail}`
        : data.seoDescription,
    pathSuffix: "/contact",
  });
}

export default async function AgencyContactPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;
  const data = await getAgencyStorefrontData(slug);
  if (!data) notFound();

  return (
    <StorefrontSectionLayout
      data={data}
      active="contact"
      title="Contact agence"
      subtitle="Coordonnees completes et canaux de communication"
    >
      {!data.showContactSection ? (
        <article className="rounded-3xl border border-dashed border-black/15 bg-white/85 p-6 text-sm text-black/60">
          Cette section est desactivee par l&apos;agence.
        </article>
      ) : (
        <section className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.contactPhone ? (
            <a
              href={`tel:${data.contactPhone}`}
              className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-black/75 shadow-sm hover:bg-black/5"
            >
              <Phone size={14} />
              {data.contactPhone}
            </a>
          ) : null}
          {data.contactEmail ? (
            <a
              href={`mailto:${data.contactEmail}`}
              className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-black/75 shadow-sm hover:bg-black/5"
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
              className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-black/75 shadow-sm hover:bg-black/5"
            >
              <Phone size={14} />
              WhatsApp: {data.agencyWhatsapp}
            </a>
          ) : data.agencyWhatsapp ? (
            <div className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-black/75 shadow-sm">
              <Phone size={14} />
              WhatsApp: {data.agencyWhatsapp}
            </div>
          ) : null}
          {data.agencyAddress ? (
            <div className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-black/75 shadow-sm">
              <MapPin size={14} />
              {data.agencyAddress}
            </div>
          ) : null}
          {data.businessHours ? (
            <div className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-black/75 shadow-sm">
              <Clock3 size={14} />
              {data.businessHours}
            </div>
          ) : null}
          {data.ctaHref ? (
            <a
              href={data.ctaHref}
              target={data.ctaHref.startsWith("http") ? "_blank" : undefined}
              rel={data.ctaHref.startsWith("http") ? "noreferrer" : undefined}
              className="inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95"
              style={{ backgroundColor: data.brandPrimaryColor }}
            >
              {data.ctaLabel}
            </a>
          ) : null}
          </div>
          <StorefrontLeadForm slug={data.slug} brandPrimaryColor={data.brandPrimaryColor} />
        </section>
      )}
    </StorefrontSectionLayout>
  );
}
