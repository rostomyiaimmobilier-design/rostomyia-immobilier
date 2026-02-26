import { notFound } from "next/navigation";
import SitePageView from "@/components/site-builder/public/SitePageView";
import { getPublishedPageBySlug } from "@/lib/site-builder/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPublishedPageBySlug(slug);

  if (!page) {
    return { title: "Page not found" };
  }

  return {
    title: page.seoTitle || page.title,
    description: page.seoDesc || undefined,
  };
}

export default async function SiteDynamicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (slug === "home") {
    notFound();
  }

  return <SitePageView slug={slug} />;
}
