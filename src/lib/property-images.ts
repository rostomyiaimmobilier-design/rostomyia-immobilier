import { supabaseBrowser } from "@/lib/supabase/browser";
import { makeImagePath } from "@/lib/storage";

export async function uploadPropertyImages(params: {
  propertyId: string;
  ref: string;
  files: File[];
}) {
  const supabase = supabaseBrowser();
  const bucket = "property-images";

  const uploadedPaths: string[] = [];

  for (const file of params.files) {
    // Compress image in browser (skip for non-images or small files)
    const fileToUpload = await compressImageIfNeeded(file);

    const path = makeImagePath(params.ref, fileToUpload);

    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(path, fileToUpload, {
        cacheControl: "3600",
        upsert: false,
        contentType: fileToUpload.type || undefined,
      });

    if (upErr) throw upErr;
    uploadedPaths.push(path);
  }

  // Send uploaded paths to server API to insert DB rows (avoids RLS errors
  // when running from an unauthenticated browser client).
  const resp = await fetch("/api/admin/property-images", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ propertyId: params.propertyId, paths: uploadedPaths }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Failed to register images: ${err}`);
  }

  return uploadedPaths;
}

async function compressImageIfNeeded(file: File, maxWidth = 1600, quality = 0.8) {
  try {
    if (!file.type.startsWith("image/")) return file;
    // skip tiny files
    if (file.size < 150 * 1024) return file;

    const imgBitmap = await createImageBitmap(file);
    const ratio = Math.min(1, maxWidth / imgBitmap.width);
    const width = Math.max(1, Math.round(imgBitmap.width * ratio));
    const height = Math.max(1, Math.round(imgBitmap.height * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(imgBitmap, 0, 0, width, height);

    // Prefer webp/jpeg for better compression
    const mime = file.type === "image/png" ? "image/png" : "image/jpeg";

    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob((b) => res(b), mime, quality)
    );

    if (!blob) return file;

    // Create a new File so Supabase storage gets a proper filename/type
    const ext = mime === "image/png" ? ".png" : ".jpg";
    const name = file.name.replace(/\.[a-z0-9]+$/i, ext);
    return new File([blob], name, { type: blob.type });
  } catch (err) {
    // On any error, fall back to original file
    console.error("compressImageIfNeeded failed", err);
    return file;
  }
}

export async function deletePropertyImage(imageId: string, path: string) {
  const supabase = supabaseBrowser();
  const bucket = "property-images";

  const { error: stErr } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (stErr) throw stErr;

  const { error: dbErr } = await supabase
    .from("property_images")
    .delete()
    .eq("id", imageId);

  if (dbErr) throw dbErr;
}
