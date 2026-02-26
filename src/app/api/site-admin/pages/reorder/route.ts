import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hasSiteAdminSessionFromRequest } from "@/lib/site-builder/auth";

const reorderSchema = z.object({
  pageIds: z.array(z.string().min(1)).min(1),
});

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

export async function POST(request: NextRequest) {
  if (!hasSiteAdminSessionFromRequest(request)) return unauthorized();

  try {
    const parsed = reorderSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const { pageIds } = parsed.data;

    await prisma.$transaction([
      ...pageIds.map((pageId, index) =>
        prisma.page.update({
          where: { id: pageId },
          data: { order: index },
        })
      ),
      ...pageIds.map((pageId, index) =>
        prisma.navItem.updateMany({
          where: { pageId },
          data: { order: index },
        })
      ),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to reorder pages." }, { status: 500 });
  }
}

