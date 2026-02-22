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
  const [zoomScale, setZoomScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [hoverZoom, setHoverZoom] = useState({ active: false, x: 50, y: 50 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const count = safeImages.length;

  const canSlide = count > 1;
  const current = safeImages[index] ?? null;

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
          </>
        ) : null}

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
          ))}
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
    </div>
  );
}
