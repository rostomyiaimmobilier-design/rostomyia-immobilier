import Image from "next/image";
import type { Metadata } from "next";
import { Building2, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import Reveal from "@/components/site-builder/public/Reveal";
import AgencyMarketplaceInteractive from "../AgencyMarketplaceInteractive";
import { buildStorefrontMetadata } from "../metadata";
import NativeStudioBlocks from "../NativeStudioBlocks";
import StorefrontBuilderContent from "../StorefrontBuilderContent";
import StorefrontSectionLayout from "../StorefrontSectionLayout";
import { nativeCardClass, nativeImageObjectPosition } from "../native-studio";
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
  const data = await getAgencyStorefrontData(slug, { includeMarketplace: true });
  if (!data) return {};

  return buildStorefrontMetadata(data, {
    pageTitle: data.marketplaceTitle || "Marketplace",
    pageDescription: `${data.marketplace.length} bien(s) disponibles chez ${data.agencyName}.`,
    pathSuffix: "/marketplace",
  });
}

export default async function AgencyMarketplacePage({
  params,
  searchParams,
}: {
  params: Promise<RouteParams>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug } = await params;
  const { lang } = await searchParams;
  const locale = lang === "ar" ? "ar" : "fr";
  const data = await getAgencyStorefrontData(slug, { includeMarketplace: true, locale });
  if (!data) notFound();
  const cardClass = nativeCardClass(data.nativeStudio);
  const pageContent = data.nativeStudio.page_content.marketplace;
  const avgArea =
    data.marketplace.length > 0
      ? Math.round(
          data.marketplace.reduce((total, item) => {
            const area = Number(String(item.area || "").replace(/[^\d]/g, ""));
            return total + (Number.isFinite(area) ? area : 0);
          }, 0) / Math.max(1, data.marketplace.length)
        )
      : 0;

  return (
    <StorefrontSectionLayout
      data={data}
      locale={locale}
    >
      {data.builderType !== "native" ? (
        <StorefrontBuilderContent data={data} page="marketplace" />
      ) : !data.showMarketplaceSection ? (
        <>
          <article className="rounded-3xl border border-dashed border-slate-300 bg-white/90 p-6 text-sm text-slate-500">
            Cette section est desactivee par l&apos;agence.
          </article>
          <Reveal delay={0.08}>
            <NativeStudioBlocks data={data} section="marketplace" />
          </Reveal>
        </>
      ) : (
        <>
          <Reveal>
            <article className={`${cardClass} overflow-hidden p-0`}>
              {pageContent.image_url ? (
                <div className="relative h-[320px] w-full bg-slate-100">
                  <Image
                    src={pageContent.image_url}
                    alt={pageContent.image_alt || pageContent.title || data.marketplaceTitle || "Marketplace"}
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
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-900/45 to-slate-900/10" />
                  <div className="absolute inset-0 flex items-end p-6">
                    <div className="max-w-2xl text-white">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] backdrop-blur">
                        <Sparkles size={12} />
                        Catalogue immobilier
                      </div>
                      <h2 className="mt-3 text-3xl font-extrabold">
                        {pageContent.title || data.marketplaceTitle}
                      </h2>
                      <p className="mt-2 text-sm text-white/85">{pageContent.intro}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </article>
          </Reveal>

          <Reveal delay={0.05}>
            <section className="grid gap-4 md:grid-cols-3">
              <article className={cardClass}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Annonces actives</div>
                <div className="mt-2 text-2xl font-extrabold" style={{ color: data.brandPrimaryColor }}>
                  {data.marketplace.length}
                </div>
              </article>
              <article className={cardClass}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Surface moyenne</div>
                <div className="mt-2 text-2xl font-extrabold" style={{ color: data.brandPrimaryColor }}>
                  {avgArea > 0 ? `${avgArea} m2` : "-"}
                </div>
              </article>
              <article className={cardClass}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Disponibilite</div>
                <div className="mt-2 text-sm font-semibold text-slate-700">
                  Mise a jour continue des opportunites qualifiees.
                </div>
              </article>
            </section>
          </Reveal>

          <article className={cardClass}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="inline-flex items-center gap-2 text-xl font-bold" style={{ color: data.brandPrimaryColor }}>
                <Building2 size={18} />
                Biens disponibles
              </h3>
              <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-black/65">
                {data.marketplace.length} bien{data.marketplace.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="mt-4">
              <AgencyMarketplaceInteractive
                slug={data.slug}
                items={data.marketplace}
                brandPrimaryColor={data.brandPrimaryColor}
                ctaHref={data.ctaHref}
                ctaLabel={data.ctaLabel}
                whatsappHref={data.whatsappHref}
              />
            </div>
          </article>

          <Reveal delay={0.1}>
            <NativeStudioBlocks data={data} section="marketplace" />
          </Reveal>
        </>
      )}
    </StorefrontSectionLayout>
  );
}
