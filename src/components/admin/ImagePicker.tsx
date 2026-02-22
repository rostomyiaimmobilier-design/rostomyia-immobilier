"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Picked = {
  id: string;
  file: File;
  url: string;
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
  showCoverTools = true,
  title = "Photos",
  subtitle,
}: {
  value: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  showCoverTools?: boolean;
  title?: string;
  subtitle?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [active, setActive] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const picked = useMemo<Picked[]>(() => {
    return value.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      file,
      url: URL.createObjectURL(file),
    }));
  }, [value]);

  useEffect(() => {
    return () => {
      picked.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [picked]);
  const activeIndex = picked.length ? Math.min(active, picked.length - 1) : 0;

  function addFiles(files: File[]) {
    if (!files.length) return;
    const onlyImages = files.filter((f) => f.type.startsWith("image/"));
    const merged = [...value, ...onlyImages].slice(0, maxFiles);
    onChange(merged);
    setActive(Math.max(0, merged.length - onlyImages.length));
  }

  function onBrowse() {
    inputRef.current?.click();
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    addFiles(files);
    e.target.value = "";
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
    if (i === 0) return;
    move(i, 0);
    setActive(0);
  }

  function prev() {
    if (!picked.length) return;
    setActive((a) => (a <= 0 ? picked.length - 1 : a - 1));
  }

  function next() {
    if (!picked.length) return;
    setActive((a) => (a >= picked.length - 1 ? 0 : a + 1));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    addFiles(files);
  }

  return (
    <section className="relative space-y-4 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[radial-gradient(65%_120%_at_50%_-20%,rgba(15,23,42,0.08),transparent)]"
      />
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="text-xs text-slate-500">
            {subtitle ??
              (showCoverTools
                ? "Glissez-deposez ou cliquez. Cover = premiere image."
                : "Ajout de nouvelles images seulement. Les images existantes se gerent au-dessus.")}
          </div>
        </div>

        <button
          type="button"
          onClick={onBrowse}
          className="rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
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

      <div
        onClick={onBrowse}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={[
          "group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed p-6 transition-all duration-300",
          dragOver
            ? "border-slate-900 bg-slate-50 shadow-[0_0_0_4px_rgba(15,23,42,0.06)]"
            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
        ].join(" ")}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-slate-300/25 blur-2xl transition group-hover:scale-110"
        />
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-slate-900">
              {picked.length ? `${picked.length} photo(s) selectionnee(s)` : "Deposez vos images ici"}
            </div>
            <div className="text-xs text-slate-500">
              PNG/JPG/WebP. Max {maxFiles} fichiers.
            </div>
          </div>

          <div className="text-xs text-slate-500">
            {picked.length ? "Cliquez pour ajouter +" : "Cliquez pour parcourir"}
          </div>
        </div>
      </div>

      {picked.length > 0 && (
        <div className="grid animate-in fade-in-0 zoom-in-95 gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-3">
            <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="relative aspect-[16/10]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={picked[activeIndex]?.url}
                  alt={picked[activeIndex]?.file.name ?? "preview"}
                  className="absolute inset-0 h-full w-full object-contain object-center"
                />
                {picked.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={prev}
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-xl bg-black/60 px-3 py-2 text-sm font-semibold text-white transition hover:bg-black/75"
                      aria-label="Image precedente"
                    >
                      {"<"}
                    </button>
                    <button
                      type="button"
                      onClick={next}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl bg-black/60 px-3 py-2 text-sm font-semibold text-white transition hover:bg-black/75"
                      aria-label="Image suivante"
                    >
                      {">"}
                    </button>
                  </>
                ) : null}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
                  {activeIndex + 1} / {picked.length}
                </div>
                {showCoverTools ? (
                  <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
                    {activeIndex === 0 ? "COVER" : `Image ${activeIndex + 1}`}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Galerie images
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-7">
                {picked.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActive(idx)}
                    className={[
                      "relative aspect-[4/3] overflow-hidden rounded-xl border bg-white transition",
                      idx === activeIndex
                        ? "ring-2 ring-slate-900 ring-offset-1"
                        : "border-slate-200 hover:-translate-y-0.5 hover:opacity-90",
                    ].join(" ")}
                    title={p.file.name}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={p.file.name} className="h-full w-full object-contain object-center" />
                    <span className="absolute bottom-1 right-1 rounded-md bg-black/60 px-1 py-0.5 text-[10px] font-semibold text-white">
                      {idx + 1}
                    </span>
                    {showCoverTools && idx === 0 ? (
                      <span className="absolute left-1 top-1 rounded-lg bg-black/70 px-2 py-1 text-[10px] font-semibold text-white">
                        COVER
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-slate-900">Actions image</div>
              <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                {showCoverTools && activeIndex === 0 ? "Cover active" : "Image standard"}
              </span>
            </div>
            <div className="text-sm text-slate-700">
              <div className="truncate font-medium">{picked[activeIndex]?.file.name}</div>
              <div className="text-xs text-slate-500">
                {picked[activeIndex] ? humanSize(picked[activeIndex].file.size) : null}
              </div>
            </div>

            {showCoverTools ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => move(activeIndex, activeIndex - 1)}
                  disabled={activeIndex === 0}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Deplacer gauche
                </button>
                <button
                  type="button"
                  onClick={() => move(activeIndex, activeIndex + 1)}
                  disabled={activeIndex === picked.length - 1}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Deplacer droite
                </button>
                <button
                  type="button"
                  onClick={() => setCover(activeIndex)}
                  disabled={activeIndex === 0}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:opacity-50 sm:col-span-2"
                >
                  Definir cover
                </button>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => removeAt(activeIndex)}
              className="w-full rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:opacity-95"
            >
              Supprimer
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
