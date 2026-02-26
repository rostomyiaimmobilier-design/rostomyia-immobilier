import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SiteAdminSectionsEditor from "@/components/site-builder/admin/SiteAdminSectionsEditor";

export const dynamic = "force-dynamic";

export default async function SiteAdminPageSectionsEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [page, media] = await Promise.all([
    prisma.page.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { order: "asc" },
        },
      },
    }),
    prisma.media.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  if (!page) notFound();

  return (
    <SiteAdminSectionsEditor
      initialPage={JSON.parse(JSON.stringify(page))}
      initialMedia={JSON.parse(JSON.stringify(media))}
    />
  );
}

