import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasSiteAdminSessionFromRequest } from "@/lib/site-builder/auth";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function GET(request: NextRequest) {
  if (!hasSiteAdminSessionFromRequest(request)) return unauthorized();

  const media = await prisma.media.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ media });
}

export async function POST(request: NextRequest) {
  if (!hasSiteAdminSessionFromRequest(request)) return unauthorized();

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const altRaw = formData.get("alt");
    const alt = typeof altRaw === "string" ? altRaw : null;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "site-builder");
    await mkdir(uploadDir, { recursive: true });

    const ext = path.extname(file.name) || ".bin";
    const base = sanitizeFileName(path.basename(file.name, ext));
    const filename = `${Date.now()}-${base}-${randomUUID().slice(0, 8)}${ext}`;
    const absolutePath = path.join(uploadDir, filename);

    const arrayBuffer = await file.arrayBuffer();
    await writeFile(absolutePath, Buffer.from(arrayBuffer));

    const relativePath = `/uploads/site-builder/${filename}`;
    const media = await prisma.media.create({
      data: {
        path: relativePath,
        alt,
      },
    });

    return NextResponse.json({ media }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to upload media." }, { status: 500 });
  }
}

