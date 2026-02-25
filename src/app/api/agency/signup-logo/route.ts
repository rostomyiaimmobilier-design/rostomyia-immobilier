import { NextResponse } from "next/server";
import sharp from "sharp";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";

export const runtime = "nodejs";

const BUCKET = "property-images";
const MAX_FILE_BYTES = 6 * 1024 * 1024;

function agencyLogoPublicUrl(path: string) {
  const { url } = getPublicSupabaseEnv();
  const cleanPath = String(path).replace(/^\/+/, "");
  return `${url}/storage/v1/object/public/${BUCKET}/${cleanPath}`;
}

function dateFolder() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const raw = formData.get("file");

    if (!(raw instanceof File)) {
      return NextResponse.json({ error: "Logo file is required." }, { status: 400 });
    }

    if (!raw.type.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid logo format. Use an image file." }, { status: 400 });
    }

    if (raw.size <= 0 || raw.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "Logo file is too large (max 6 MB)." }, { status: 400 });
    }

    const inputBuffer = Buffer.from(await raw.arrayBuffer());
    const optimized = await sharp(inputBuffer)
      .rotate()
      .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 86 })
      .toBuffer();

    const path = `agency-logos/signup/${dateFolder()}/${crypto.randomUUID()}.webp`;

    const admin = supabaseAdmin();
    const { error } = await admin.storage.from(BUCKET).upload(path, optimized, {
      contentType: "image/webp",
      upsert: false,
      cacheControl: "31536000",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      path,
      url: agencyLogoPublicUrl(path),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to upload logo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

