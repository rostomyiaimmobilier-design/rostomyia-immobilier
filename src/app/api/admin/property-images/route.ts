import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import sharp from "sharp";

export async function POST(req: Request) {
  const apiKey = req.headers.get("x-admin-key");

  let supabase;

  // If admin API key provided, use admin client (service role)

    supabase = supabaseAdmin();


  const form = await req.formData();

  const propertyId = String(form.get("propertyId") || "");
  const ref = String(form.get("ref") || "");
  if (!propertyId || !ref) {
    return NextResponse.json({ error: "Missing propertyId/ref" }, { status: 400 });
  }

  const files = form.getAll("files") as File[];
  if (!files.length) {
    return NextResponse.json({ error: "No files" }, { status: 400 });
  }

  const bucket = "property-images";
  const uploadedPaths: string[] = [];

  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;

    // Compress/resize image server-side using sharp for smaller uploads
    const ext = "jpg";
    const path = `${ref}/${crypto.randomUUID()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    let compressedBuffer: Buffer;
    try {
      compressedBuffer = await sharp(inputBuffer)
        .resize({ width: 1600, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || "Image processing failed" }, { status: 500 });
    }

    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(path, compressedBuffer, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 400 });
    }

    uploadedPaths.push(path);
  }

  // insert DB rows (align with your schema: uses "sort")
  // If the property has no existing images, mark the first uploaded image as cover
  let hasExistingImages = false;
  try {
    const { data: existing, error: selErr } = await supabase
      .from("property_images")
      .select("id")
      .eq("property_id", propertyId)
      .limit(1);

    if (selErr) {
      // ignore select error and treat as no existing images
      hasExistingImages = false;
    } else {
      hasExistingImages = Array.isArray(existing) && existing.length > 0;
    }
  } catch (e) {
    hasExistingImages = false;
  }

  const rows = uploadedPaths.map((path, idx) => ({
    property_id: propertyId,
    path,
    sort: idx,
    is_cover: !hasExistingImages && idx === 0,
  }));

  const { error: dbErr } = await supabase.from("property_images").insert(rows);
  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 400 });
  }

  return NextResponse.json({ paths: uploadedPaths });
}
