import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Clock3, Mail, MapPin, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Reveal from "@/components/site-builder/public/Reveal";
import { buildStorefrontMetadata } from "../metadata";
import NativeStudioBlocks from "../NativeStudioBlocks";
import StorefrontBuilderContent from "../StorefrontBuilderContent";
import StorefrontSectionLayout from "../StorefrontSectionLayout";
import StorefrontLeadForm from "../StorefrontLeadForm";
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
  const pageContent = data.nativeStudio.page_content.contact;

  return (
    <StorefrontSectionLayout
      data={data}
      locale={locale}
    >
      {data.builderType !== "native" ? (
        <StorefrontBuilderContent data={data} page="contact" />
      ) : !data.showContactSection ? (
        <>
          <article className="rounded-3xl border border-dashed border-slate-300 bg-white/90 p-6 text-sm text-slate-500">
            Cette section est desactivee par l&apos;agence.
          </article>
          <Reveal delay={0.08}>
            <NativeStudioBlocks data={data} section="contact" />
          </Reveal>
        </>
      ) : (
        <>
          <Reveal>
            <section className={`${cardClass} overflow-hidden p-0`}>
              {pageContent.image_url ? (
                <div className="relative h-[300px] w-full bg-slate-100">
                  <Image
                    src={pageContent.image_url}
                    alt={pageContent.image_alt || pageContent.title || "Contact"}
                    fill
                    sizes="1200px"
                    className="object-cover"
                    style={{
                      objectPosition: nativeImageObjectPosition(
                        pageContent.image_focal_x,
                        pageContent.image_focal_y
                      ),
                    }}
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-900/50 to-slate-900/20" />
                  <div className="absolute inset-0 flex items-end p-6">
                    <div className="max-w-2xl text-white">
                      <h2 className="text-3xl font-extrabold">{pageContent.title || "Contact"}</h2>
                      <p className="mt-2 text-sm text-white/85">{pageContent.intro}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          </Reveal>

          <section className="grid gap-4 lg:grid-cols-[1fr_1.25fr]">
            <Reveal delay={0.04}>
              <div className="space-y-4">
                <article className={cardClass}>
                  <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-500">Canaux rapides</h3>
                  <div className="mt-3 grid gap-2">
                    {data.contactPhone ? (
                      <a href={`tel:${data.contactPhone}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50">
                        <Phone size={14} />
                        {data.contactPhone}
                      </a>
                    ) : null}
                    {data.contactEmail ? (
                      <a href={`mailto:${data.contactEmail}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50">
                        <Mail size={14} />
                        {data.contactEmail}
                      </a>
                    ) : null}
                    {data.whatsappHref ? (
                      <a href={data.whatsappHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50">
                        <MessageCircle size={14} />
                        WhatsApp: {data.agencyWhatsapp}
                      </a>
                    ) : null}
                    {data.ctaHref ? (
                      <Link
                        href={data.ctaHref}
                        target={data.ctaHref.startsWith("http") ? "_blank" : undefined}
                        rel={data.ctaHref.startsWith("http") ? "noreferrer" : undefined}
                        className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${ctaClass}`}
                        style={
                          data.nativeStudio.cta_style === "outline"
                            ? { borderColor: data.brandPrimaryColor, color: data.brandPrimaryColor }
                            : { backgroundColor: data.brandPrimaryColor }
                        }
                      >
                        {data.ctaLabel}
                        <ArrowUpRight size={14} />
                      </Link>
                    ) : null}
                  </div>
                </article>

                <article className={cardClass}>
                  <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-500">Informations agence</h3>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    {data.agencyAddress ? (
                      <div className="inline-flex items-start gap-2">
                        <MapPin size={14} className="mt-0.5 shrink-0 text-slate-500" />
                        {data.agencyAddress}
                      </div>
                    ) : null}
                    {data.businessHours ? (
                      <div className="inline-flex items-start gap-2">
                        <Clock3 size={14} className="mt-0.5 shrink-0 text-slate-500" />
                        {data.businessHours}
                      </div>
                    ) : null}
                    <div className="inline-flex items-start gap-2">
                      <ShieldCheck size={14} className="mt-0.5 shrink-0 text-slate-500" />
                      Reponse en moins de 24h sur les demandes qualifiees.
                    </div>
                  </div>
                </article>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <article className={cardClass}>
                <StorefrontLeadForm slug={data.slug} brandPrimaryColor={data.brandPrimaryColor} />
              </article>
            </Reveal>
          </section>

          <Reveal delay={0.12}>
            <NativeStudioBlocks data={data} section="contact" />
          </Reveal>
        </>
      )}
    </StorefrontSectionLayout>
  );
}
