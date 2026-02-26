import { unlink } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hasSiteAdminSessionFromRequest } from "@/lib/site-builder/auth";

const updateMediaSchema = z.object({
  alt: z.string().max(240).nullable().optional(),
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
    const parsed = updateMediaSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const media = await prisma.media.update({
      where: { id },
      data: {
        alt: parsed.data.alt ?? null,
      },
    });

    return NextResponse.json({ media });
  } catch {
    return NextResponse.json({ error: "Unable to update media." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!hasSiteAdminSessionFromRequest(request)) return unauthorized();

  try {
    const { id } = await context.params;
    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) {
      return NextResponse.json({ error: "Media not found." }, { status: 404 });
    }

    if (media.path.startsWith("/uploads/")) {
      const absolute = path.join(process.cwd(), "public", media.path.replace(/^\//, ""));
      await unlink(absolute).catch(() => undefined);
    }

    await prisma.media.delete({ where: { id: media.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to delete media." }, { status: 500 });
  }
}

