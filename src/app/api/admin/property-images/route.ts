import { NextResponse } from "next/server";
import sharp from "sharp";
import { hasAdminWriteAccess } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type PropertyImageRow = {
  id: string;
  property_id: string;
  path: string;
  sort: number | null;
  is_cover: boolean | null;
};

const BUCKET = "property-images";

async function ensureAdminOrError() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const canWrite = await hasAdminWriteAccess(supabase, user);
  if (!canWrite) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { error: null };
}

function parseError(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function isNotFoundStorageError(message: string | undefined) {
  const m = String(message ?? "").toLowerCase();
  return m.includes("not found") || m.includes("no such file");
}

async function compressImageToJpeg(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const input = Buffer.from(arrayBuffer);
  return sharp(input)
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
}

function makePath(ref: string) {
  return `${ref}/${crypto.randomUUID()}.jpg`;
}

async function getImageById(admin: ReturnType<typeof supabaseAdmin>, imageId: string) {
  const { data, error } = await admin
    .from("property_images")
    .select("id, property_id, path, sort, is_cover")
    .eq("id", imageId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Image introuvable.");
  return data as PropertyImageRow;
}

async function ensureSingleCover(admin: ReturnType<typeof supabaseAdmin>, propertyId: string) {
  const { data: rows, error } = await admin
    .from("property_images")
    .select("id, is_cover, sort")
    .eq("property_id", propertyId)
    .order("sort", { ascending: true });

  if (error) throw new Error(error.message);
  const images = (rows ?? []) as Array<{ id: string; is_cover: boolean | null; sort: number | null }>;
  if (!images.length) return;

  const hasCover = images.some((x) => !!x.is_cover);
  if (hasCover) return;

  const first = images[0];
  const { error: coverErr } = await admin.from("property_images").update({ is_cover: true }).eq("id", first.id);
  if (coverErr) throw new Error(coverErr.message);
}

export async function POST(req: Request) {
  const guard = await ensureAdminOrError();
  if (guard.error) return guard.error;

  const admin = supabaseAdmin();
  const form = await req.formData();

  const propertyId = String(form.get("propertyId") || "").trim();
  const ref = String(form.get("ref") || "").trim();
  if (!propertyId || !ref) {
    return NextResponse.json({ error: "Missing propertyId/ref" }, { status: 400 });
  }

  const files = form.getAll("files") as File[];
  if (!files.length) {
    return NextResponse.json({ error: "No files" }, { status: 400 });
  }

  const uploadedPaths: string[] = [];

  try {
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;

      const path = makePath(ref);
      const compressed = await compressImageToJpeg(file);

      const { error: upErr } = await admin.storage.from(BUCKET).upload(path, compressed, {
        contentType: "image/jpeg",
        upsert: false,
      });
      if (upErr) throw new Error(upErr.message);
      uploadedPaths.push(path);
    }

    if (!uploadedPaths.length) {
      return NextResponse.json({ error: "No valid image files" }, { status: 400 });
    }

    const { data: existingRows, error: existingErr } = await admin
      .from("property_images")
      .select("id, sort")
      .eq("property_id", propertyId);
    if (existingErr) throw new Error(existingErr.message);

    const maxSort = (existingRows ?? []).reduce((max, row) => {
      const parsed = Number((row as { sort: number | null }).sort);
      return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
    }, -1);
    const baseSort = maxSort + 1;
    const isFirstBatch = (existingRows?.length ?? 0) === 0;

    const rows = uploadedPaths.map((path, idx) => ({
      property_id: propertyId,
      path,
      sort: baseSort + idx,
      is_cover: isFirstBatch && idx === 0,
    }));

    const { error: dbErr } = await admin.from("property_images").insert(rows);
    if (dbErr) throw new Error(dbErr.message);

    await ensureSingleCover(admin, propertyId);
    return NextResponse.json({ paths: uploadedPaths });
  } catch (err: unknown) {
    return NextResponse.json({ error: parseError(err, "Upload failed") }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const guard = await ensureAdminOrError();
  if (guard.error) return guard.error;

  const admin = supabaseAdmin();

  try {
    const body = await req.json();
    const imageId = String(body?.imageId ?? "").trim();
    if (!imageId) {
      return NextResponse.json({ error: "Missing imageId" }, { status: 400 });
    }

    const image = await getImageById(admin, imageId);

    const { error: storageErr } = await admin.storage.from(BUCKET).remove([image.path]);
    if (storageErr && !isNotFoundStorageError(storageErr.message)) {
      throw new Error(storageErr.message);
    }

    const { error: deleteErr } = await admin.from("property_images").delete().eq("id", image.id);
    if (deleteErr) throw new Error(deleteErr.message);

    await ensureSingleCover(admin, image.property_id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: parseError(err, "Delete failed") }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const guard = await ensureAdminOrError();
  if (guard.error) return guard.error;

  const admin = supabaseAdmin();

  try {
    const body = await req.json();
    const propertyId = String(body?.propertyId ?? "").trim();
    if (!propertyId) {
      return NextResponse.json({ error: "Missing propertyId" }, { status: 400 });
    }

    const orderedImageIds = Array.isArray(body?.orderedImageIds)
      ? body.orderedImageIds.map((x: unknown) => String(x)).filter(Boolean)
      : null;
    const coverImageId = String(body?.coverImageId ?? "").trim() || null;

    const { data: rows, error: rowsErr } = await admin
      .from("property_images")
      .select("id")
      .eq("property_id", propertyId);
    if (rowsErr) throw new Error(rowsErr.message);

    const existingIds = new Set((rows ?? []).map((x) => String((x as { id: string }).id)));

    if (orderedImageIds) {
      if (orderedImageIds.length !== existingIds.size) {
        return NextResponse.json({ error: "orderedImageIds must include all property images" }, { status: 400 });
      }
      for (const id of orderedImageIds) {
        if (!existingIds.has(id)) {
          return NextResponse.json({ error: "orderedImageIds contains invalid image id" }, { status: 400 });
        }
      }

      for (let i = 0; i < orderedImageIds.length; i += 1) {
        const id = orderedImageIds[i];
        const { error: sortErr } = await admin.from("property_images").update({ sort: i }).eq("id", id);
        if (sortErr) throw new Error(sortErr.message);
      }
    }

    if (coverImageId) {
      if (!existingIds.has(coverImageId)) {
        return NextResponse.json({ error: "coverImageId does not belong to property" }, { status: 400 });
      }

      const { error: resetCoverErr } = await admin
        .from("property_images")
        .update({ is_cover: false })
        .eq("property_id", propertyId);
      if (resetCoverErr) throw new Error(resetCoverErr.message);

      const { error: setCoverErr } = await admin
        .from("property_images")
        .update({ is_cover: true })
        .eq("id", coverImageId);
      if (setCoverErr) throw new Error(setCoverErr.message);
    }

    await ensureSingleCover(admin, propertyId);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: parseError(err, "Patch failed") }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  const guard = await ensureAdminOrError();
  if (guard.error) return guard.error;

  const admin = supabaseAdmin();
  const form = await req.formData();

  const imageId = String(form.get("imageId") || "").trim();
  const ref = String(form.get("ref") || "").trim();
  const file = form.get("file");

  if (!imageId || !ref || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing imageId/ref/file" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }

  try {
    const image = await getImageById(admin, imageId);

    const nextPath = makePath(ref);
    const compressed = await compressImageToJpeg(file);
    const { error: upErr } = await admin.storage.from(BUCKET).upload(nextPath, compressed, {
      contentType: "image/jpeg",
      upsert: false,
    });
    if (upErr) throw new Error(upErr.message);

    const { error: updateErr } = await admin
      .from("property_images")
      .update({ path: nextPath })
      .eq("id", image.id);
    if (updateErr) throw new Error(updateErr.message);

    const { error: removeOldErr } = await admin.storage.from(BUCKET).remove([image.path]);
    if (removeOldErr && !isNotFoundStorageError(removeOldErr.message)) {
      throw new Error(removeOldErr.message);
    }

    return NextResponse.json({ ok: true, path: nextPath });
  } catch (err: unknown) {
    return NextResponse.json({ error: parseError(err, "Replace failed") }, { status: 400 });
  }
}
