"use client";

import Image from "next/image";
import { useState } from "react";

export type MediaItem = {
  id: string;
  path: string;
  alt: string | null;
};

type MediaPickerModalProps = {
  open: boolean;
  media: MediaItem[];
  onClose: () => void;
  onPick: (item: MediaItem) => void;
  onMediaCreated: (item: MediaItem) => void;
};

export default function MediaPickerModal({
  open,
  media,
  onClose,
  onPick,
  onMediaCreated,
}: MediaPickerModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile() {
    if (!file) return;
    setPending(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("alt", alt);

      const response = await fetch("/api/site-admin/media", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as { media?: MediaItem; error?: string };
      if (!response.ok || !data.media) {
        setError(data.error || "Unable to upload media.");
        return;
      }

      onMediaCreated(data.media);
      setFile(null);
      setAlt("");
    } catch {
      setError("Unable to upload media.");
    } finally {
      setPending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_35px_80px_-30px_rgba(15,23,42,0.7)]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900">Media Library</h3>
          <button onClick={onClose} className="rounded-md px-3 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            Close
          </button>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1.3fr]">
          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Upload New Image</p>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
            />
            <input
              placeholder="Alt text (optional)"
              value={alt}
              onChange={(event) => setAlt(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            />
            <button
              onClick={uploadFile}
              disabled={!file || pending}
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Uploading..." : "Upload"}
            </button>
            {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
          </div>

          <div className="max-h-[62vh] overflow-y-auto rounded-xl border border-slate-200 p-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {media.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onPick(item)}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white text-left transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] bg-slate-100">
                    <Image src={item.path} alt={item.alt || "Media image"} fill className="object-cover" sizes="300px" />
                  </div>
                  <p className="truncate px-3 py-2 text-xs text-slate-600">{item.alt || item.path}</p>
                </button>
              ))}
            </div>
            {media.length === 0 ? <p className="p-4 text-sm text-slate-500">No media uploaded yet.</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

