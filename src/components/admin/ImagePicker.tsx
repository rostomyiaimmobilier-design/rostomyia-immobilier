"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Picked = {
  id: string;
  file: File;
  url: string; // object URL
};

function humanSize(bytes: number) {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${Math.round(kb)} KB`;
}

export default function ImagePicker({
  value,
  onChange,
  maxFiles = 20,
}: {
  value: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [active, setActive] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  // Build previews from File[] (stable across renders)
  const picked = useMemo<Picked[]>(() => {
    return value.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      file,
      url: URL.createObjectURL(file),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      picked.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [picked]);

  // Keep active index in bounds
  useEffect(() => {
    if (!picked.length) setActive(0);
    else if (active > picked.length - 1) setActive(picked.length - 1);
  }, [picked.length, active]);

  function addFiles(files: File[]) {
    if (!files.length) return;

    const onlyImages = files.filter((f) => f.type.startsWith("image/"));
    const merged = [...value, ...onlyImages].slice(0, maxFiles);

    onChange(merged);
    setActive(Math.max(0, merged.length - onlyImages.length)); // jump near new ones
  }

  function onBrowse() {
    inputRef.current?.click();
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    addFiles(files);
    e.target.value = ""; // allow re-picking same file
  }

  function removeAt(i: number) {
    const next = value.filter((_, idx) => idx !== i);
    onChange(next);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    onChange(next);
    setActive(to);
  }

  function setCover(i: number) {
    // cover = first item
    if (i === 0) return;
    move(i, 0);
    setActive(0);
  }

  function prev() {
    setActive((a) => Math.max(0, a - 1));
  }
  function next() {
    setActive((a) => Math.min(picked.length - 1, a + 1));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    addFiles(files);
  }

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">Photos</div>
          <div className="text-xs text-slate-500">
            Glissez-déposez ou cliquez. Cover = première image.
          </div>
        </div>

        <button
          type="button"
          onClick={onBrowse}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
        >
          Ajouter
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onInputChange}
          className="hidden"
        />
      </div>

      {/* Dropzone */}
      <div
        onClick={onBrowse}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={[
          "cursor-pointer rounded-2xl border-2 border-dashed p-6 transition",
          dragOver ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:bg-slate-50",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-slate-900">
              {picked.length ? `${picked.length} photo(s) sélectionnée(s)` : "Déposez vos images ici"}
            </div>
            <div className="text-xs text-slate-500">
              PNG/JPG/WebP. Max {maxFiles} fichiers.
            </div>
          </div>

          <div className="text-xs text-slate-500">
            {picked.length ? "Cliquez pour ajouter + " : "Cliquez pour parcourir"}
          </div>
        </div>
      </div>

      {/* Slider */}
      {picked.length > 0 && (
        <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border overflow-hidden bg-slate-100">
            <div className="relative aspect-[16/10]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={picked[active]?.url}
                alt={picked[active]?.file.name ?? "preview"}
                className="absolute inset-0 h-full w-full object-cover"
              />

              {/* Controls */}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={prev}
                    disabled={active === 0}
                    className="rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    disabled={active === picked.length - 1}
                    className="rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
                  >
                    ▶
                  </button>

                  <div className="ml-2 rounded-xl bg-black/60 px-3 py-2 text-xs text-white">
                    {active + 1} / {picked.length}
                    {active === 0 ? " • Cover" : ""}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCover(active)}
                    disabled={active === 0}
                    className="rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
                  >
                    Définir cover
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAt(active)}
                    className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:opacity-95"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Active file info + quick reorder */}
          <div className="rounded-2xl border p-4 space-y-3">
            <div className="text-sm font-semibold text-slate-900">Détails</div>
            <div className="text-sm text-slate-700">
              <div className="font-medium truncate">{picked[active]?.file.name}</div>
              <div className="text-xs text-slate-500">
                {picked[active] ? humanSize(picked[active].file.size) : null}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-700 mb-2">Réordonner</div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => move(active, active - 1)}
                  disabled={active === 0}
                  className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => move(active, active + 1)}
                  disabled={active === picked.length - 1}
                  className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
                >
                  →
                </button>
                <button
                  type="button"
                  onClick={() => setCover(active)}
                  disabled={active === 0}
                  className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
                >
                  Mettre en cover
                </button>
              </div>
            </div>

            {/* Thumbnails */}
            <div className="grid grid-cols-4 gap-2">
              {picked.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActive(idx)}
                  className={[
                    "relative aspect-[4/3] overflow-hidden rounded-xl border bg-slate-100",
                    idx === active ? "ring-2 ring-slate-900" : "hover:opacity-90",
                  ].join(" ")}
                  title={p.file.name}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.file.name} className="h-full w-full object-cover" />
                  {idx === 0 && (
                    <span className="absolute left-1 top-1 rounded-lg bg-black/70 px-2 py-1 text-[10px] font-semibold text-white">
                      COVER
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
