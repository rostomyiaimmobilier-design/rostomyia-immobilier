import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Bath, BedDouble, Building2, Image as ImageIcon, Ruler } from "lucide-react";
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
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;
  const data = await getAgencyStorefrontData(slug, { includeMarketplace: true });
  if (!data) notFound();

  return (
    <StorefrontSectionLayout
      data={data}
      active="marketplace"
      title={data.marketplaceTitle}
      subtitle={`${data.marketplace.length} bien${data.marketplace.length > 1 ? "s" : ""} disponible(s)`}
    >
      {!data.showMarketplaceSection ? (
        <article className="rounded-3xl border border-dashed border-black/15 bg-white/85 p-6 text-sm text-black/60">
          Cette section est desactivee par l&apos;agence.
        </article>
      ) : (
        <article className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-sm">
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
      )}
    </StorefrontSectionLayout>
  );
}
