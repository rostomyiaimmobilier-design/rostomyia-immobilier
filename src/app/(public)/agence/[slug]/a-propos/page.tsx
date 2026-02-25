import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StorefrontSectionLayout from "../StorefrontSectionLayout";
import { buildStorefrontMetadata } from "../metadata";
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
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;
  const data = await getAgencyStorefrontData(slug);
  if (!data) notFound();

  return (
    <StorefrontSectionLayout
      data={data}
      active="about"
      title={data.aboutTitle || "A propos"}
      subtitle={data.agencyTagline || "Presentation detaillee de l'agence"}
    >
      <article className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-sm">
        <h2 className="text-xl font-bold" style={{ color: data.brandPrimaryColor }}>
          {data.aboutTitle}
        </h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-black/75">
          {data.agencyDescription || "Aucune description n'est disponible pour le moment."}
        </p>
      </article>
    </StorefrontSectionLayout>
  );
}
