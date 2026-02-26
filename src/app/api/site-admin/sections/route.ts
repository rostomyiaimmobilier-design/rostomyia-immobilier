import { NextRequest, NextResponse } from "next/server";
import { SectionType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hasSiteAdminSessionFromRequest } from "@/lib/site-builder/auth";
import { defaultSectionContent } from "@/lib/site-builder/defaults";

const createSectionSchema = z.object({
  pageId: z.string().min(1),
  type: z.nativeEnum(SectionType),
});

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

export async function POST(request: NextRequest) {
  if (!hasSiteAdminSessionFromRequest(request)) return unauthorized();

  try {
    const parsed = createSectionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const { pageId, type } = parsed.data;
    const page = await prisma.page.findUnique({ where: { id: pageId } });
    if (!page) {
      return NextResponse.json({ error: "Page not found." }, { status: 404 });
    }

    const maxOrder = await prisma.section.aggregate({
      where: { pageId },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const section = await prisma.section.create({
      data: {
        pageId,
        type,
        order: nextOrder,
        isHidden: false,
        content: defaultSectionContent(type),
      },
    });

    return NextResponse.json({ section }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create section." }, { status: 500 });
  }
}

