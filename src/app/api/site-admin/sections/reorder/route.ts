import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hasSiteAdminSessionFromRequest } from "@/lib/site-builder/auth";

const reorderSchema = z.object({
  pageId: z.string().min(1),
  sectionIds: z.array(z.string().min(1)).min(1),
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

    const { pageId, sectionIds } = parsed.data;
    const count = await prisma.section.count({ where: { pageId } });
    if (count !== sectionIds.length) {
      return NextResponse.json({ error: "Section list mismatch." }, { status: 400 });
    }

    await prisma.$transaction(
      sectionIds.map((sectionId, index) =>
        prisma.section.update({
          where: { id: sectionId },
          data: { order: index },
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to reorder sections." }, { status: 500 });
  }
}

