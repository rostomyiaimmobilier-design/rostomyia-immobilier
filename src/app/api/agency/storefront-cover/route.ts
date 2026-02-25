import { NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";

export const runtime = "nodejs";

const BUCKET = "property-images";
const MAX_FILE_BYTES = 8 * 1024 * 1024;

function dateFolder() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function publicUrl(path: string) {
  const { url } = getPublicSupabaseEnv();
  const cleanPath = String(path).replace(/^\/+/, "");
  return `${url}/storage/v1/object/public/${BUCKET}/${cleanPath}`;
}

function isAgencyUser(user: { user_metadata?: Record<string, unknown> | null } | null) {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const accountType = String(meta.account_type ?? "").trim().toLowerCase();
  const status = String(meta.agency_status ?? "pending").trim().toLowerCase();
  if (accountType !== "agency") return false;
  return status !== "suspended";
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!isAgencyUser(user)) {
      return NextResponse.json({ error: "Permission denied." }, { status: 403 });
    }

    const formData = await req.formData();
    const raw = formData.get("file");

    if (!(raw instanceof File)) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    if (!raw.type.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid image format." }, { status: 400 });
    }

    if (raw.size <= 0 || raw.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "Image is too large (max 8 MB)." }, { status: 400 });
    }

    const inputBuffer = Buffer.from(await raw.arrayBuffer());
    const optimized = await sharp(inputBuffer)
      .rotate()
      .resize({ width: 1800, height: 1200, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 86 })
      .toBuffer();

    const path = `agency-storefronts/${user.id}/covers/${dateFolder()}/${crypto.randomUUID()}.webp`;

    const admin = supabaseAdmin();
    const { error } = await admin.storage.from(BUCKET).upload(path, optimized, {
      contentType: "image/webp",
      upsert: false,
      cacheControl: "31536000",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ path, url: publicUrl(path) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Cover upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
