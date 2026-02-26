import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hasSiteAdminSessionFromRequest } from "@/lib/site-builder/auth";
import { getPageHref } from "@/lib/site-builder/defaults";
import { toSlug } from "@/lib/site-builder/slug";

const updatePageSchema = z.object({
  title: z.string().min(2).max(120).optional(),
  slug: z.string().max(120).optional(),
  seoTitle: z.string().max(160).optional().nullable(),
  seoDesc: z.string().max(320).optional().nullable(),
  isPublished: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

async function uniqueSlug(baseValue: string, currentPageId: string) {
  const base = toSlug(baseValue) || `page-${Date.now()}`;
  let candidate = base;
  let counter = 2;

  while (true) {
    const existing = await prisma.page.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === currentPageId) return candidate;
    candidate = `${base}-${counter}`;
    counter += 1;
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!hasSiteAdminSessionFromRequest(request)) return unauthorized();

  try {
    const { id } = await context.params;
    const existing = await prisma.page.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Page not found." }, { status: 404 });
    }

    const parsed = updatePageSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const payload = parsed.data;
    const slug =
      payload.slug !== undefined ? await uniqueSlug(payload.slug, existing.id) : existing.slug;

    const page = await prisma.page.update({
      where: { id: existing.id },
      data: {
        title: payload.title ?? existing.title,
        slug,
        seoTitle: payload.seoTitle ?? existing.seoTitle,
        seoDesc: payload.seoDesc ?? existing.seoDesc,
        isPublished: payload.isPublished ?? existing.isPublished,
        order: payload.order ?? existing.order,
      },
    });

    await prisma.navItem.upsert({
      where: { pageId: page.id },
      update: {
        label: page.title,
        href: getPageHref(page.slug),
        order: page.order,
      },
      create: {
        label: page.title,
        href: getPageHref(page.slug),
        order: page.order,
        pageId: page.id,
      },
    });

    const fullPage = await prisma.page.findUnique({
      where: { id: page.id },
      include: { sections: { orderBy: { order: "asc" } }, navItem: true },
    });

    return NextResponse.json({ page: fullPage });
  } catch {
    return NextResponse.json({ error: "Unable to update page." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!hasSiteAdminSessionFromRequest(request)) return unauthorized();

  try {
    const { id } = await context.params;
    const existing = await prisma.page.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Page not found." }, { status: 404 });
    }

    await prisma.page.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to delete page." }, { status: 500 });
  }
}
