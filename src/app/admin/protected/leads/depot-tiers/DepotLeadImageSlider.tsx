"use client";

import { useMemo, useState } from "react";

export default function DepotLeadImageSlider({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  const safeImages = useMemo(() => images.filter(Boolean), [images]);
  const hasMultiple = safeImages.length > 1;
  const active = safeImages[Math.min(activeIndex, Math.max(0, safeImages.length - 1))] ?? null;

  function goPrev() {
    if (!hasMultiple) return;
    setActiveIndex((prev) => (prev <= 0 ? safeImages.length - 1 : prev - 1));
  }

  function goNext() {
    if (!hasMultiple) return;
    setActiveIndex((prev) => (prev >= safeImages.length - 1 ? 0 : prev + 1));
  }

  if (!safeImages.length) return null;

  return (
    <div className="space-y-3 rounded-xl border border-black/10 bg-white p-3">
      <div className="relative overflow-hidden rounded-xl border border-black/10 bg-slate-50">
        <div className="relative aspect-[16/10]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={active ?? ""}
            alt={title}
            className="absolute inset-0 h-full w-full object-contain object-center"
          />
          {hasMultiple ? (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-lg bg-black/60 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-black/75"
                aria-label="Image precedente"
              >
                {"<"}
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-black/60 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-black/75"
                aria-label="Image suivante"
              >
                {">"}
              </button>
            </>
          ) : null}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-md bg-black/60 px-2 py-1 text-[11px] font-semibold text-white">
            {Math.min(activeIndex + 1, safeImages.length)} / {safeImages.length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-7">
        {safeImages.map((url, idx) => (
          <button
            key={`${url}-${idx}`}
            type="button"
            onClick={() => setActiveIndex(idx)}
            className={[
              "relative aspect-[4/3] overflow-hidden rounded-lg border bg-white transition",
              idx === activeIndex
                ? "ring-2 ring-slate-900 ring-offset-1"
                : "border-black/10 hover:-translate-y-0.5 hover:opacity-90",
            ].join(" ")}
            title={`Image ${idx + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Image ${idx + 1}`} className="h-full w-full object-contain object-center" />
            <span className="absolute bottom-1 right-1 rounded-md bg-black/60 px-1 py-0.5 text-[10px] font-semibold text-white">
              {idx + 1}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={active ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-lg border border-black/15 bg-black/[0.03] px-2.5 py-1.5 text-xs font-semibold text-[rgb(var(--navy))] hover:bg-black/[0.06]"
        >
          Ouvrir l&apos;image active
        </a>
      </div>
    </div>
  );
}
