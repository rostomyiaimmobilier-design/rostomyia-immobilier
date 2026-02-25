"use client";

import { useState } from "react";
import { uploadPropertyImages } from "@/lib/property-images";

export default function ImageUploader({
  propertyId,
  propertyRef,
  onUploaded,
}: {
  propertyId: string;
  propertyRef: string;
  onUploaded?: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || []);
    setFiles(picked);
    setError(null);
  }

  async function onUpload() {
    if (!files.length) return;
    setLoading(true);
    setError(null);

    try {
      await uploadPropertyImages({
        propertyId,
        ref: propertyRef,
        files,
      });

      setFiles([]);
      onUploaded?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="font-medium">Images</div>

      <input
        type="file"
        accept="image/*"
        multiple
        onChange={onPick}
        disabled={loading}
        className="block w-full text-sm"
      />

      {!!files.length && (
        <div className="text-sm text-muted-foreground">
          Selected: {files.length} file(s)
        </div>
      )}

      {error && <div className="text-sm text-red-600">{error}</div>}

      <button
        type="button"
        onClick={onUpload}
        disabled={loading || !files.length}
        className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
      >
        {loading ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
}
