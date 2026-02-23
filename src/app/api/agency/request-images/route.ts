import { NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { propertyImageUrl } from "@/lib/property-image-url";

const MAX_FILES = 20;

function safeSegment(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || "request";
}

function isAgencyAllowed(metadata: Record<string, unknown> | null | undefined) {
  const meta = metadata ?? {};
  const accountType = String(meta.account_type ?? "").toLowerCase();
  const status = String(meta.agency_status ?? "pending").toLowerCase();
  return accountType === "agency" && status === "active";
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAgencyAllowed(user.user_metadata as Record<string, unknown> | undefined)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const form = await req.formData();
  const refRaw = String(form.get("ref") || "");
  const files = form.getAll("files") as File[];

  if (!files.length) {
    return NextResponse.json({ error: "No files" }, { status: 400 });
  }

  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Too many files (max ${MAX_FILES})` }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const bucket = "property-images";
  const ref = safeSegment(refRaw || `lead-${Date.now()}`);
  const folder = `agency-requests/${user.id}/${ref}`;

  const uploadedPaths: string[] = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;

    const path = `${folder}/${crypto.randomUUID()}.jpg`;
    const inputBuffer = Buffer.from(await file.arrayBuffer());

    let compressed: Buffer;
    try {
      compressed = await sharp(inputBuffer)
        .resize({ width: 1600, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Image processing failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const { error: uploadError } = await admin.storage.from(bucket).upload(path, compressed, {
      contentType: "image/jpeg",
      upsert: false,
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }

    uploadedPaths.push(path);
  }

  if (!uploadedPaths.length) {
    return NextResponse.json({ error: "No valid image files" }, { status: 400 });
  }

  const urls = uploadedPaths.map((path) => propertyImageUrl(path));
  return NextResponse.json({ paths: uploadedPaths, urls });
}
