"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent, type TouchEvent } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  images: string[];
  alt: string;
  aspectClassName?: string;
  sizes?: string;
  priority?: boolean;
  showThumbs?: boolean;
  className?: string;
};

export default function PropertyImageSlider({
  images,
  alt,
  aspectClassName = "aspect-[4/3]",
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority = false,
  showThumbs = false,
  className = "",
}: Props) {
  const safeImages = useMemo(() => images.filter(Boolean), [images]);
  const [index, setIndex] = useState(0);
  const count = safeImages.length;

  const canSlide = count > 1;
  const current = safeImages[index] ?? null;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const touchX = useRef<number | null>(null);

  function prev(e?: MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    if (!canSlide) return;
    setIndex((v) => (v - 1 + count) % count);
  }

  function next(e?: MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    if (!canSlide) return;
    setIndex((v) => (v + 1) % count);
  }

  // Keyboard navigation when focused
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    function onKeyDown(ev: KeyboardEvent) {
      if (!canSlide) return;
      if (ev.key === "ArrowLeft") prev();
      if (ev.key === "ArrowRight") next();
    }

    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSlide, count]);

  // Swipe
  function onTouchStart(e: TouchEvent) {
    if (!canSlide) return;
    touchX.current = e.touches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: TouchEvent) {
    if (!canSlide) return;
    const start = touchX.current;
    const end = e.changedTouches[0]?.clientX ?? null;
    touchX.current = null;
    if (start == null || end == null) return;

    const dx = end - start;
    if (Math.abs(dx) < 40) return;
    if (dx > 0) prev();
    else next();
  }

  return (
    <div className={className}>
      <div
        ref={rootRef}
        tabIndex={0}
        className={`group/slider relative w-full overflow-hidden rounded-2xl bg-black/5 outline-none ${aspectClassName}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        aria-label="Galerie images"
      >
        {/* premium vignette */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,215,120,0.18),transparent_55%)]" />

        <AnimatePresence mode="wait" initial={false}>
          {current ? (
            <motion.div
              key={current}
              initial={{ opacity: 0.0, scale: 1.01 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0.0, scale: 1.01 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <Image
                src={current}
                alt={alt}
                fill
                className="object-cover transition-transform duration-500 group-hover/slider:scale-[1.03]"
                sizes={sizes}
                priority={priority}
              />
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(10,18,35,0.10),transparent_50%)]"
            />
          )}
        </AnimatePresence>

        {/* Controls */}
        {canSlide ? (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2
                         text-[rgb(var(--navy))] shadow-sm backdrop-blur ring-1 ring-black/5
                         opacity-0 transition-opacity duration-200 group-hover/slider:opacity-100"
              aria-label="Image précédente"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2
                         text-[rgb(var(--navy))] shadow-sm backdrop-blur ring-1 ring-black/5
                         opacity-0 transition-opacity duration-200 group-hover/slider:opacity-100"
              aria-label="Image suivante"
            >
              <ChevronRight size={18} />
            </button>

            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1.5 backdrop-blur">
              {safeImages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIndex(i);
                  }}
                  className={`h-1.5 w-1.5 rounded-full transition-all ${
                    i === index ? "w-4 bg-white" : "bg-white/45 hover:bg-white/70"
                  }`}
                  aria-label={`Aller à l'image ${i + 1}`}
                />
              ))}
            </div>

            {/* Counter */}
            <div className="absolute right-3 bottom-3 rounded-full bg-white/75 px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--navy))] backdrop-blur ring-1 ring-black/5">
              {index + 1}/{count}
            </div>
          </>
        ) : null}

        {/* bottom gradient to help text overlay if used above */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {showThumbs && count > 1 ? (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {safeImages.slice(0, 8).map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setIndex(i)}
              className={`relative aspect-[4/3] overflow-hidden rounded-xl ring-1 ring-black/5 transition ${
                i === index ? "ring-2 ring-[rgb(var(--gold))]" : "opacity-85 hover:opacity-100"
              }`}
              aria-label={`Miniature ${i + 1}`}
            >
              <Image src={src} alt={`${alt} ${i + 1}`} fill className="object-cover" sizes="20vw" />
              {i === index ? (
                <div className="pointer-events-none absolute inset-0 bg-[rgb(var(--gold))]/10" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
