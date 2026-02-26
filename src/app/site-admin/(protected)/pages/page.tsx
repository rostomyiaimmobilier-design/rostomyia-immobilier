import { ensureDefaults } from "@/lib/site-builder/defaults";
import { prisma } from "@/lib/prisma";
import SiteAdminPagesManager from "@/components/site-builder/admin/SiteAdminPagesManager";

export const dynamic = "force-dynamic";

export default async function SiteAdminPagesPage() {
  await ensureDefaults();

  const [pages, settings] = await Promise.all([
    prisma.page.findMany({
      orderBy: { order: "asc" },
      include: { sections: { select: { id: true } }, navItem: true },
    }),
    prisma.siteSettings.findUnique({ where: { id: "default" } }),
  ]);

  if (!settings) {
    return <p className="text-sm text-slate-500">Unable to load site settings.</p>;
  }

  return (
    <SiteAdminPagesManager
      initialPages={JSON.parse(JSON.stringify(pages))}
      initialSettings={JSON.parse(JSON.stringify(settings))}
    />
  );
}

