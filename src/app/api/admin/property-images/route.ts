import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import sharp from "sharp";

export async function POST(req: Request) {
  // Use admin client (service role) for storage + DB writes.
  const supabase = supabaseAdmin();


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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Image processing failed";
      return NextResponse.json({ error: message }, { status: 500 });
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

  // Insert DB rows (align with schema: uses "sort").
  // For existing properties, append at max(sort)+1 to keep stable ordering.
  let hasExistingImages = false;
  let nextSort = 0;
  try {
    const { data: existing, error: selErr } = await supabase
      .from("property_images")
      .select("sort")
      .eq("property_id", propertyId)
      .order("sort", { ascending: false })
      .limit(1);

    if (selErr) {
      hasExistingImages = false;
      nextSort = 0;
    } else {
      hasExistingImages = Array.isArray(existing) && existing.length > 0;
      const maxSort = hasExistingImages ? Number(existing?.[0]?.sort ?? 0) : 0;
      nextSort = Number.isFinite(maxSort) ? maxSort + 1 : 0;
    }
  } catch {
    hasExistingImages = false;
    nextSort = 0;
  }

  const rows = uploadedPaths.map((path, idx) => ({
    property_id: propertyId,
    path,
    sort: nextSort + idx,
    is_cover: !hasExistingImages && idx === 0,
  }));

  const { error: dbErr } = await supabase.from("property_images").insert(rows);
  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 400 });
  }

  return NextResponse.json({ paths: uploadedPaths });
}
