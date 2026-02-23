"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent,
  type WheelEvent,
} from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Search, ZoomIn, ZoomOut, X } from "lucide-react";
import { propertyImageBlurDataURL } from "@/lib/property-image-url";

type Props = {
  images: string[];
  alt: string;
  aspectClassName?: string;
  sizes?: string;
  priority?: boolean;
  showThumbs?: boolean;
  className?: string;
  enableZoom?: boolean;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.35;
const FOCUS_ZOOM_SCALE = 2;

function clampZoom(value: number) {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(value.toFixed(2))));
}

export default function PropertyImageSlider({
  images,
  alt,
  aspectClassName = "aspect-[4/3]",
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority = false,
  showThumbs = false,
  className = "",
  enableZoom = true,
}: Props) {
  const safeImages = useMemo(() => images.filter(Boolean), [images]);
  const blurDataURL = useMemo(() => propertyImageBlurDataURL(), []);
  const [index, setIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [allPhotosOpen, setAllPhotosOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [hoverZoom, setHoverZoom] = useState({ active: false, x: 50, y: 50 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const count = safeImages.length;

  const canSlide = count > 1;
  const current = safeImages[index] ?? null;
  const hasMoreThanNine = count > 9;
  const thumbLimit = hasMoreThanNine ? 9 : count;
  const thumbs = safeImages.slice(0, thumbLimit);
  const showAllLabel = "Show all photos";
  const currentLabel = "Current";

  const rootRef = useRef<HTMLDivElement | null>(null);
  const touchX = useRef<number | null>(null);

  const resetZoomState = useCallback(() => {
    setZoomScale(1);
    setPan({ x: 0, y: 0 });
    setIsPanning(false);
  }, []);

  const closeZoom = useCallback(() => {
    setZoomOpen(false);
    resetZoomState();
  }, [resetZoomState]);

  const openZoom = useCallback(() => {
    if (!enableZoom) return;
    if (!current) return;
    setZoomOpen(true);
    resetZoomState();
  }, [current, enableZoom, resetZoomState]);

  const focusZoomAtPoint = useCallback((clientX: number, clientY: number, rect: DOMRect, scale = FOCUS_ZOOM_SCALE) => {
    const offsetX = clientX - rect.left - rect.width / 2;
    const offsetY = clientY - rect.top - rect.height / 2;
    const nextScale = clampZoom(scale);
    setZoomScale(nextScale);
    setPan({ x: -offsetX, y: -offsetY });
  }, []);

  const openZoomAtFocus = useCallback(
    (clientX: number, clientY: number, rect: DOMRect) => {
      if (!enableZoom) return;
      if (!current) return;
      setZoomOpen(true);
      setIsPanning(false);
      focusZoomAtPoint(clientX, clientY, rect);
    },
    [current, enableZoom, focusZoomAtPoint]
  );

  const applyZoom = useCallback((next: number) => {
    const clamped = clampZoom(next);
    setZoomScale(clamped);
    if (clamped === 1) setPan({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => {
    setZoomScale((prev) => {
      const next = clampZoom(prev + ZOOM_STEP);
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const zoomOut = useCallback(() => {
    setZoomScale((prev) => {
      const next = clampZoom(prev - ZOOM_STEP);
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

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

  // Keyboard navigation when focused.
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

  useEffect(() => {
    if (!enableZoom) return;
    if (!zoomOpen) return;

    function onKeyDown(ev: KeyboardEvent) {
      if (ev.key === "Escape") closeZoom();
      if (ev.key === "+" || ev.key === "=") zoomIn();
      if (ev.key === "-") zoomOut();
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeZoom, enableZoom, zoomIn, zoomOpen, zoomOut]);

  useEffect(() => {
    if (!allPhotosOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [allPhotosOpen]);

  // Swipe.
  function onTouchStart(e: TouchEvent) {
    if (!canSlide || zoomOpen) return;
    touchX.current = e.touches[0]?.clientX ?? null;
  }

  function onTouchEnd(e: TouchEvent) {
    if (!canSlide || zoomOpen) return;
    const start = touchX.current;
    const end = e.changedTouches[0]?.clientX ?? null;
    touchX.current = null;
    if (start == null || end == null) return;

    const dx = end - start;
    if (Math.abs(dx) < 40) return;
    if (dx > 0) prev();
    else next();
  }

  function updateHoverZoom(clientX: number, clientY: number, rect: DOMRect) {
    const xPct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    setHoverZoom({ active: true, x: xPct, y: yPct });
  }

  function onZoomWheel(e: WheelEvent<HTMLDivElement>) {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  }

  function onPanStart(e: ReactPointerEvent<HTMLDivElement>) {
    if (zoomScale <= 1) return;
    e.preventDefault();
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPanMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!isPanning || zoomScale <= 1) return;
    e.preventDefault();
    setPan({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y });
  }

  function onPanEnd(e: ReactPointerEvent<HTMLDivElement>) {
    if (!isPanning) return;
    setIsPanning(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  function onZoomDoubleClick(e: ReactPointerEvent<HTMLDivElement>) {
    if (zoomScale > 1) {
      applyZoom(1);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    focusZoomAtPoint(e.clientX, e.clientY, rect);
  }

  function onZoomAreaClick(e: ReactPointerEvent<HTMLDivElement>) {
    if (zoomScale > 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    focusZoomAtPoint(e.clientX, e.clientY, rect);
  }

  function onMainImageMouseMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!enableZoom) return;
    const rect = e.currentTarget.getBoundingClientRect();
    updateHoverZoom(e.clientX, e.clientY, rect);
  }

  function onMainImageMouseLeave() {
    if (!enableZoom) return;
    setHoverZoom((prev) => ({ ...prev, active: false }));
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
              onMouseMove={onMainImageMouseMove}
              onMouseLeave={onMainImageMouseLeave}
              onClick={(e) => {
                if (!enableZoom) return;
                const rect = e.currentTarget.getBoundingClientRect();
                openZoomAtFocus(e.clientX, e.clientY, rect);
              }}
            >
              <Image
                src={current}
                alt={alt}
                fill
                placeholder="blur"
                blurDataURL={blurDataURL}
                className="object-cover transition-transform duration-200"
                style={{
                  transform:
                    enableZoom && hoverZoom.active ? `scale(${Math.max(FOCUS_ZOOM_SCALE, 2.2)})` : "scale(1)",
                  transformOrigin: `${hoverZoom.x}% ${hoverZoom.y}%`,
                }}
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

        {current && enableZoom ? (
          <button
            type="button"
            onClick={openZoom}
            className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/82 px-3 py-1.5 text-xs font-semibold text-[rgb(var(--navy))] shadow-sm backdrop-blur ring-1 ring-black/8 transition hover:bg-white"
            aria-label="Zoom image"
          >
            <Search size={13} />
            Zoom
          </button>
        ) : null}

        {enableZoom && hoverZoom.active ? (
          <div
            className="pointer-events-none absolute z-[2] h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/70 bg-white/15 shadow-[0_0_0_1px_rgba(0,0,0,0.08)] backdrop-blur-[1px]"
            style={{ left: `${hoverZoom.x}%`, top: `${hoverZoom.y}%` }}
            aria-hidden="true"
          />
        ) : null}

        {canSlide ? (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2
                         text-[rgb(var(--navy))] shadow-sm backdrop-blur ring-1 ring-black/5
                         opacity-100 transition-opacity duration-200 md:opacity-0 md:group-hover/slider:opacity-100"
              aria-label="Image precedente"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2
                         text-[rgb(var(--navy))] shadow-sm backdrop-blur ring-1 ring-black/5
                         opacity-100 transition-opacity duration-200 md:opacity-0 md:group-hover/slider:opacity-100"
              aria-label="Image suivante"
            >
              <ChevronRight size={18} />
            </button>

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
                  aria-label={`Aller a l'image ${i + 1}`}
                />
              ))}
            </div>

            <div className="absolute bottom-3 right-3 rounded-full bg-white/75 px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--navy))] backdrop-blur ring-1 ring-black/5">
              {index + 1}/{count}
            </div>

            {count > 1 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setAllPhotosOpen(true);
                }}
                className="absolute bottom-3 left-3 rounded-full bg-white/82 px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--navy))] backdrop-blur ring-1 ring-black/8 transition hover:bg-white"
                aria-label={`${showAllLabel} (${count})`}
              >
                {showAllLabel}
              </button>
            ) : null}

          </>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {showThumbs && count > 1 ? (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {thumbs.map((src, i) => {
            const isShowAllThumb = hasMoreThanNine && i === 8;
            const remaining = count - 8;

            if (isShowAllThumb) {
              return (
                <button
                  key={`show-all-${i}`}
                  type="button"
                  onClick={() => {
                    setIndex(i);
                    setAllPhotosOpen(true);
                  }}
                  className="relative aspect-[4/3] overflow-hidden rounded-xl ring-1 ring-black/10 transition-transform duration-200 hover:scale-[1.02]"
                  aria-label={`${showAllLabel} (${count})`}
                >
                  <Image
                    src={src}
                    alt={`${alt} ${i + 1}`}
                    fill
                    placeholder="blur"
                    blurDataURL={blurDataURL}
                    className="object-cover"
                    sizes="20vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/50" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-2 text-center text-white">
                    <span className="text-base font-semibold">+{remaining}</span>
                    <span className="text-[11px] font-semibold uppercase tracking-wide">{showAllLabel}</span>
                  </div>
                </button>
              );
            }

            return (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              className={`relative aspect-[4/3] overflow-hidden rounded-xl ring-1 ring-black/10 transition-all duration-200 ${
                i === index ? "ring-2 ring-[rgb(var(--gold))]" : "opacity-85 hover:opacity-100 hover:scale-[1.02]"
              }`}
              aria-label={`Miniature ${i + 1}`}
            >
              <Image
                src={src}
                alt={`${alt} ${i + 1}`}
                fill
                placeholder="blur"
                blurDataURL={blurDataURL}
                className="object-cover"
                sizes="20vw"
              />
              {i === index ? <div className="pointer-events-none absolute inset-0 bg-[rgb(var(--gold))]/10" /> : null}
            </button>
            );
          })}
        </div>
      ) : null}

      <AnimatePresence>
        {enableZoom && zoomOpen && current ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[90] bg-black/92 p-3 md:p-6"
            onClick={closeZoom}
          >
            <div
              className="mx-auto flex h-full w-full max-w-7xl flex-col gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/15 bg-black/35 px-3 py-2 backdrop-blur">
                <div className="text-xs font-medium text-white/85 md:text-sm">
                  {index + 1}/{count} | {zoomScale.toFixed(2)}x
                </div>
                <div className="hidden text-xs text-white/60 md:block">Zoom with +/- or mouse wheel, then drag.</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={zoomOut}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                    aria-label="Dezoomer"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={zoomIn}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                    aria-label="Zoomer"
                  >
                    <ZoomIn size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={closeZoom}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                    aria-label="Fermer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div
                role="dialog"
                aria-modal="true"
                className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/50"
                onWheel={onZoomWheel}
                onPointerDown={onPanStart}
                onPointerMove={onPanMove}
                onPointerUp={onPanEnd}
                onPointerCancel={onPanEnd}
                onDoubleClick={onZoomDoubleClick}
                onClick={onZoomAreaClick}
                style={{ touchAction: zoomScale > 1 ? "none" : "pan-y" }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={current}
                    alt={alt}
                    draggable={false}
                    className={`max-h-full max-w-full select-none object-contain ${
                      zoomScale > 1 ? (isPanning ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
                    }`}
                    style={{
                      transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoomScale})`,
                      transition: isPanning ? "none" : "transform 140ms ease-out",
                      transformOrigin: "center center",
                    }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {allPhotosOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[95] bg-black/92 p-3 md:p-6"
            onClick={() => setAllPhotosOpen(false)}
          >
            <div
              className="mx-auto flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-black/35 backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-2 border-b border-white/15 bg-white/5 px-3 py-2 text-white md:px-4">
                <div>
                  <div className="text-sm font-semibold">All photos ({count})</div>
                  <div className="text-[11px] text-white/65">Select any photo to set it as current.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setAllPhotosOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                  aria-label="Close all photos"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-hidden p-3 md:p-4">
                <div className="grid h-full gap-3 md:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="relative min-h-[260px] overflow-hidden rounded-2xl border border-white/15 bg-black/55 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.9)]">
                    {current ? (
                      <>
                        <Image
                          src={current}
                          alt={`${alt} ${index + 1}`}
                          fill
                          placeholder="blur"
                          blurDataURL={blurDataURL}
                          className="object-contain transition-transform duration-300"
                          sizes="(max-width: 768px) 100vw, 70vw"
                          priority
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
                        <div className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-1 text-xs font-semibold text-white">
                          {index + 1}/{count}
                        </div>
                        <div className="pointer-events-none absolute right-2 top-2 rounded-full bg-[rgb(var(--gold))] px-2 py-1 text-xs font-semibold text-[rgb(var(--navy))]">
                          {currentLabel}
                        </div>

                        {canSlide ? (
                          <>
                            <button
                              type="button"
                              onClick={prev}
                              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/88 p-2 text-[rgb(var(--navy))] shadow-sm ring-1 ring-black/10 transition hover:bg-white"
                              aria-label="Image precedente"
                            >
                              <ChevronLeft size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={next}
                              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/88 p-2 text-[rgb(var(--navy))] shadow-sm ring-1 ring-black/10 transition hover:bg-white"
                              aria-label="Image suivante"
                            >
                              <ChevronRight size={16} />
                            </button>
                          </>
                        ) : null}
                      </>
                    ) : null}
                  </div>

                  <div className="overflow-y-auto rounded-2xl border border-white/15 bg-black/35 p-2">
                    <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">
                      Photo grid
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {safeImages.map((src, i) => (
                        <button
                          key={`${src}-all-${i}`}
                          type="button"
                          onClick={() => setIndex(i)}
                          className={`relative aspect-[4/3] overflow-hidden rounded-xl ring-1 transition-all duration-200 ${
                            i === index
                              ? "ring-[rgb(var(--gold))] ring-2"
                              : "ring-white/15 opacity-90 hover:scale-[1.02] hover:opacity-100"
                          }`}
                          aria-label={`Photo ${i + 1}`}
                        >
                          <Image
                            src={src}
                            alt={`${alt} ${i + 1}`}
                            fill
                            placeholder="blur"
                            blurDataURL={blurDataURL}
                            className="object-cover"
                            sizes="(max-width: 768px) 45vw, 280px"
                          />
                          {i === index ? (
                            <div className="pointer-events-none absolute inset-0 border-2 border-[rgb(var(--gold))] bg-[rgb(var(--gold))]/10" />
                          ) : null}
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent px-2 py-1 text-left text-[10px] font-semibold text-white/90">
                            {i + 1}/{count}
                          </div>
                          {i === index ? (
                            <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-[rgb(var(--gold))] px-2 py-0.5 text-[10px] font-semibold text-[rgb(var(--navy))]">
                              {currentLabel}
                            </div>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
