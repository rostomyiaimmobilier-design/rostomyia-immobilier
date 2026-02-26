import Image from "next/image";
import { ArrowUpRight, Clock3, Languages, MapPin, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Reveal from "@/components/site-builder/public/Reveal";
import { buildStorefrontMetadata } from "../metadata";
import NativeStudioBlocks from "../NativeStudioBlocks";
import StorefrontBuilderContent from "../StorefrontBuilderContent";
import StorefrontSectionLayout from "../StorefrontSectionLayout";
import { nativeCardClass, nativeCtaClass, nativeImageObjectPosition } from "../native-studio";
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
  searchParams,
}: {
  params: Promise<RouteParams>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug } = await params;
  const { lang } = await searchParams;
  const locale = lang === "ar" ? "ar" : "fr";
  const data = await getAgencyStorefrontData(slug, { locale });
  if (!data) notFound();
  const cardClass = nativeCardClass(data.nativeStudio);
  const ctaClass = nativeCtaClass(data.nativeStudio);
  const pageContent = data.nativeStudio.page_content.services;
  const serviceList =
    data.services.length > 0
      ? data.services
      : [
          "Estimation immobiliere",
          "Vente residentielle",
          "Location et gestion",
          "Accompagnement juridique",
        ];

  return (
    <StorefrontSectionLayout
      data={data}
      locale={locale}
    >
      {data.builderType !== "native" ? (
        <StorefrontBuilderContent data={data} page="services" />
      ) : !data.showServicesSection ? (
        <>
          <article className="rounded-3xl border border-dashed border-slate-300 bg-white/90 p-6 text-sm text-slate-500">
            Cette section est desactivee par l&apos;agence.
          </article>
          <Reveal delay={0.08}>
            <NativeStudioBlocks data={data} section="services" />
          </Reveal>
        </>
      ) : (
        <>
          <Reveal>
            <section className={`${cardClass} overflow-hidden p-0`}>
              {pageContent.image_url ? (
                <div className="relative h-[320px] w-full bg-slate-100">
                  <Image
                    src={pageContent.image_url}
                    alt={pageContent.image_alt || pageContent.title || "Services"}
                    fill
                    sizes="1200px"
                    className="object-cover transition duration-700 hover:scale-105"
                    style={{
                      objectPosition: nativeImageObjectPosition(
                        pageContent.image_focal_x,
                        pageContent.image_focal_y
                      ),
                    }}
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-900/45 to-slate-900/20" />
                  <div className="absolute inset-0 flex items-end p-6">
                    <div className="max-w-2xl text-white">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] backdrop-blur">
                        <Sparkles size={12} />
                        Services premium
                      </div>
                      <h2 className="mt-3 text-3xl font-extrabold">{pageContent.title || "Services"}</h2>
                      <p className="mt-2 text-sm text-white/85">{pageContent.intro}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          </Reveal>

          <section className="grid gap-4 lg:grid-cols-3">
            {serviceList.map((item, index) => (
              <Reveal key={item} delay={0.04 * index}>
                <article className={`${cardClass} h-full transition duration-300 hover:-translate-y-1 hover:shadow-lg`}>
                  <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                    {index + 1}
                  </div>
                  <h3 className="mt-3 text-base font-bold" style={{ color: data.brandPrimaryColor }}>
                    {item}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Strategie dediee, qualification des leads et suivi precis jusqu&apos;a la finalisation.
                  </p>
                </article>
              </Reveal>
            ))}
          </section>

          <Reveal delay={0.06}>
            <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
              <article className={cardClass}>
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Informations utiles</h3>
                <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                  <div className="inline-flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <MapPin size={14} className="mt-0.5 shrink-0 text-slate-500" />
                    {data.serviceAreas || "Zone d'intervention a definir"}
                  </div>
                  <div className="inline-flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <Languages size={14} className="mt-0.5 shrink-0 text-slate-500" />
                    {data.languagesSpoken || "Francais, Arabe"}
                  </div>
                  <div className="inline-flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <Clock3 size={14} className="mt-0.5 shrink-0 text-slate-500" />
                    {data.businessHours || "09:00-18:00"}
                  </div>
                </div>
              </article>

              <article className={cardClass}>
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Points forts</h3>
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
                  <p className="mt-3 text-sm text-slate-500">Ajoutez des points forts pour renforcer la conversion.</p>
                )}

                {data.ctaHref ? (
                  <Link
                    href={data.ctaHref}
                    target={data.ctaHref.startsWith("http") ? "_blank" : undefined}
                    rel={data.ctaHref.startsWith("http") ? "noreferrer" : undefined}
                    className={`mt-4 inline-flex h-10 items-center justify-center gap-2 px-4 text-sm font-semibold ${ctaClass}`}
                    style={
                      data.nativeStudio.cta_style === "outline"
                        ? { borderColor: data.brandPrimaryColor, color: data.brandPrimaryColor }
                        : { backgroundColor: data.brandPrimaryColor }
                    }
                  >
                    {data.ctaLabel || "Nous contacter"}
                    <ArrowUpRight size={14} />
                  </Link>
                ) : null}
              </article>
            </section>
          </Reveal>

          <Reveal delay={0.1}>
            <NativeStudioBlocks data={data} section="services" />
          </Reveal>
        </>
      )}
    </StorefrontSectionLayout>
  );
}
