import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Building2, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Reveal from "@/components/site-builder/public/Reveal";
import NativeStudioBlocks from "../NativeStudioBlocks";
import StorefrontBuilderContent from "../StorefrontBuilderContent";
import StorefrontSectionLayout from "../StorefrontSectionLayout";
import { buildStorefrontMetadata } from "../metadata";
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
    pageTitle: "A propos",
    pageDescription: data.agencyDescription || data.seoDescription,
    pathSuffix: "/a-propos",
  });
}

export default async function AgencyAboutPage({
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
  const pageContent = data.nativeStudio.page_content.about;
  const keyStats = [
    { label: "Services actifs", value: String(Math.max(1, data.services.length)) },
    { label: "Points forts", value: String(Math.max(1, data.highlights.length)) },
    { label: "Langues", value: data.languagesSpoken ? String(data.languagesSpoken.split(",").filter(Boolean).length || 1) : "1" },
    { label: "Biens vitrine", value: String(Math.max(1, data.marketplace.length)) },
  ];

  return (
    <StorefrontSectionLayout
      data={data}
      locale={locale}
    >
      {data.builderType !== "native" ? (
        <StorefrontBuilderContent data={data} page="about" />
      ) : (
        <>
          <Reveal>
            <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <article className={`${cardClass} overflow-hidden p-0`}>
                {pageContent.image_url ? (
                  <div className="relative h-[320px] w-full bg-slate-100">
                    <Image
                      src={pageContent.image_url}
                      alt={pageContent.image_alt || pageContent.title || data.aboutTitle || "A propos"}
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
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/20 to-transparent"
                      aria-hidden
                    />
                    <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-white backdrop-blur">
                      <Sparkles size={12} />
                      Positionnement premium
                    </div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <h2 className="text-2xl font-extrabold text-white">
                        {pageContent.title || data.aboutTitle}
                      </h2>
                      <p className="mt-2 line-clamp-2 text-sm text-white/85">
                        {pageContent.intro || data.agencyDescription}
                      </p>
                    </div>
                  </div>
                ) : null}
              </article>

              <article className={`${cardClass} flex flex-col justify-between`}>
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600">
                    <Building2 size={12} />
                    A propos de l&apos;agence
                  </div>
                  <h3 className="mt-3 text-xl font-bold" style={{ color: data.brandPrimaryColor }}>
                    {pageContent.title || data.aboutTitle}
                  </h3>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                    {pageContent.intro || data.agencyDescription || "Aucune description n'est disponible pour le moment."}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  {keyStats.map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                      <div className="text-lg font-extrabold" style={{ color: data.brandPrimaryColor }}>
                        {stat.value}
                      </div>
                      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>

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

          <Reveal delay={0.08}>
            <section className="grid gap-4 md:grid-cols-3">
              <article className={cardClass}>
                <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-500">Approche conseil</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  <li className="inline-flex items-start gap-2">
                    <BadgeCheck size={14} className="mt-0.5 shrink-0" style={{ color: data.brandAccentColor }} />
                    Analyse du besoin et cadrage budget avant chaque visite.
                  </li>
                  <li className="inline-flex items-start gap-2">
                    <BadgeCheck size={14} className="mt-0.5 shrink-0" style={{ color: data.brandAccentColor }} />
                    Plan de commercialisation adapte au type de bien.
                  </li>
                </ul>
              </article>

              <article className={cardClass}>
                <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-500">Zone d&apos;intervention</h3>
                <p className="mt-3 text-sm text-slate-600">
                  {data.serviceAreas || "Intervention locale et regionale selon votre projet immobilier."}
                </p>
              </article>

              <article className={cardClass}>
                <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-500">Disponibilite</h3>
                <p className="mt-3 text-sm text-slate-600">
                  {data.businessHours || "Du lundi au samedi de 09:00 a 18:00, avec support digital."}
                </p>
              </article>
            </section>
          </Reveal>

          <Reveal delay={0.12}>
            <NativeStudioBlocks data={data} section="about" />
          </Reveal>
        </>
      )}
    </StorefrontSectionLayout>
  );
}
