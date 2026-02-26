import { NextRequest, NextResponse } from "next/server";
import { Prisma, SectionType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hasSiteAdminSessionFromRequest } from "@/lib/site-builder/auth";
import { defaultSectionContent } from "@/lib/site-builder/defaults";
import { normalizeSectionContent } from "@/lib/site-builder/types";

const updateSectionSchema = z.object({
  type: z.nativeEnum(SectionType).optional(),
  order: z.number().int().min(0).optional(),
  isHidden: z.boolean().optional(),
  content: z.unknown().optional(),
});

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!hasSiteAdminSessionFromRequest(request)) return unauthorized();

  try {
    const { id } = await context.params;
    const existing = await prisma.section.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Section not found." }, { status: 404 });
    }

    const parsed = updateSectionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const payload = parsed.data;
    const type = payload.type ?? existing.type;
    let content: Prisma.InputJsonValue = (existing.content ?? {}) as Prisma.InputJsonValue;

    if (payload.content !== undefined) {
      const normalized = normalizeSectionContent(type, payload.content);
      if (!normalized) {
        return NextResponse.json({ error: "Invalid content for this section type." }, { status: 400 });
      }
      content = normalized as Prisma.InputJsonValue;
    } else if (payload.type && payload.type !== existing.type) {
      content = defaultSectionContent(type) as unknown as Prisma.InputJsonValue;
    }

    const section = await prisma.section.update({
      where: { id: existing.id },
      data: {
        type,
        order: payload.order ?? existing.order,
        isHidden: payload.isHidden ?? existing.isHidden,
        content,
      },
    });

    return NextResponse.json({ section });
  } catch {
    return NextResponse.json({ error: "Unable to update section." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!hasSiteAdminSessionFromRequest(request)) return unauthorized();

  try {
    const { id } = await context.params;
    const existing = await prisma.section.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Section not found." }, { status: 404 });
    }

    await prisma.section.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to delete section." }, { status: 500 });
  }
}
