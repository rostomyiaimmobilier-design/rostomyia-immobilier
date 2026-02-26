import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hasSiteAdminSessionFromRequest } from "@/lib/site-builder/auth";
import { defaultSectionContent, getPageHref } from "@/lib/site-builder/defaults";
import { toSlug } from "@/lib/site-builder/slug";

const createPageSchema = z.object({
  title: z.string().min(2).max(120),
  slug: z.string().max(120).optional(),
  seoTitle: z.string().max(160).optional().or(z.literal("")),
  seoDesc: z.string().max(320).optional().or(z.literal("")),
  isPublished: z.boolean().optional(),
});

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

async function findAvailableSlug(input: string) {
  const base = toSlug(input) || `page-${Date.now()}`;
  let candidate = base;
  let counter = 2;

  while (true) {
    const existing = await prisma.page.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    candidate = `${base}-${counter}`;
    counter += 1;
  }
}

export async function GET(request: NextRequest) {
  if (!hasSiteAdminSessionFromRequest(request)) return unauthorized();

  const pages = await prisma.page.findMany({
    orderBy: { order: "asc" },
    include: {
      sections: { orderBy: { order: "asc" } },
      navItem: true,
    },
  });

  return NextResponse.json({ pages });
}

export async function POST(request: NextRequest) {
  if (!hasSiteAdminSessionFromRequest(request)) return unauthorized();

  try {
    const json = await request.json();
    const parsed = createPageSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const input = parsed.data;
    const slug = await findAvailableSlug(input.slug || input.title);

    const maxOrder = await prisma.page.aggregate({ _max: { order: true } });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const page = await prisma.page.create({
      data: {
        slug,
        title: input.title,
        seoTitle: input.seoTitle || null,
        seoDesc: input.seoDesc || null,
        isPublished: input.isPublished ?? true,
        order: nextOrder,
      },
    });

    await prisma.section.create({
      data: {
        pageId: page.id,
        type: "HERO",
        order: 0,
        isHidden: false,
        content: defaultSectionContent("HERO"),
      },
    });

    await prisma.navItem.create({
      data: {
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

    return NextResponse.json({ page: fullPage }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create page." }, { status: 500 });
  }
}
