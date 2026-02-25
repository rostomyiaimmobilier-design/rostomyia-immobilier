import { CheckCircle2, Clock3, Languages, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildStorefrontMetadata } from "../metadata";
import StorefrontSectionLayout from "../StorefrontSectionLayout";
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
    pageTitle: "Services",
    pageDescription: data.services.join(", ") || data.seoDescription,
    pathSuffix: "/services",
  });
}

export default async function AgencyServicesPage({
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
      active="services"
      title="Services et points forts"
      subtitle="Offres, expertises et informations pratiques"
    >
      {!data.showServicesSection ? (
        <article className="rounded-3xl border border-dashed border-black/15 bg-white/85 p-6 text-sm text-black/60">
          Cette section est desactivee par l&apos;agence.
        </article>
      ) : (
        <section className="grid gap-4 lg:grid-cols-3">
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

          <article className="rounded-3xl border border-black/10 bg-white/90 p-5 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wide text-black/55">Points forts</h3>
            {data.showHighlightsSection && data.highlights.length > 0 ? (
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
      )}
    </StorefrontSectionLayout>
  );
}
