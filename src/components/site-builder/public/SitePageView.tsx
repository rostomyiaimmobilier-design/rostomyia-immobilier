import { notFound } from "next/navigation";
import SectionRenderer from "@/components/site-builder/public/SectionRenderer";
import { getPublishedPageBySlug } from "@/lib/site-builder/queries";

export default async function SitePageView({ slug }: { slug: string }) {
  const page = await getPublishedPageBySlug(slug);
  if (!page) notFound();

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-amber-100/45 to-transparent" />
      <SectionRenderer sections={page.sections} pageSlug={page.slug} />
    </div>
  );
}
