import Link from "next/link";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  MapPin,
  BedDouble,
  Bath,
  Ruler,
  ArrowUpRight,
  Heart,
  Sparkles,
  PhoneCall,
  Scale,
  Clock3,
} from "lucide-react";
import type { PropertyItem } from "@/app/(public)/biens/ListingsClient";
import PropertyImageSlider from "@/components/PropertyImageSlider";
import { formatPaymentLabel } from "@/lib/payment-fallback";

function parseMoneyToNumber(input: string): number | null {
  const s = (input || "").toString().toLowerCase().trim();
  if (!s) return null;

  // "2.5M" / "2,5m"
  const mMatch = s.match(/(\d+(?:[.,]\d+)?)\s*(m|million)\b/);
  if (mMatch) {
    const val = Number(mMatch[1].replace(",", "."));
    if (Number.isFinite(val)) return Math.round(val * 1_000_000);
  }

  const digits = s.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

function formatCompact(n: number): string {
  // simple compact display (DA)
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${n}`;
}

function formatPublishedAgo(createdAt: string | undefined, nowTs: number): string {
  if (!createdAt) return "Recently";
  const createdTs = new Date(createdAt).getTime();
  if (!Number.isFinite(createdTs)) return "Recently";

  const diffMs = Math.max(0, nowTs - createdTs);
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 60) {
    const minutes = Math.max(1, diffMinutes);
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

export default function PropertyCard({
  property,
  isCompared = false,
  isFavorite = false,
  onToggleCompare,
  onToggleFavorite,
  onQuickContact,
  onOpen,
  // optional props for marketplace behaviors:
  // view = "grid",
  // aiScore,
  // onToggleSave,
  // isSaved,
}: {
  property: PropertyItem;
  isCompared?: boolean;
  isFavorite?: boolean;
  onToggleCompare?: (property: PropertyItem) => void;
  onToggleFavorite?: (property: PropertyItem) => void;
  onQuickContact?: (property: PropertyItem) => void;
  onOpen?: (property: PropertyItem) => void;
  // view?: "grid" | "list";
  // aiScore?: number; // 0..100
  // isSaved?: boolean;
  // onToggleSave?: (id: string) => void;
}) {
  const p = parseMoneyToNumber(property.price);
  const [nowTs] = useState(() => Date.now());
  const ppm2 =
    p != null && property.area > 0 ? Math.round(p / property.area) : null;
  const searchable = `${property.title} ${property.location} ${(property.amenities ?? []).join(" ")}`.toLowerCase();
  const hasResidence = searchable.includes("residence");
  const hasParking =
    searchable.includes("parking") ||
    searchable.includes("box") ||
    searchable.includes("garage");
  const paymentLabel = formatPaymentLabel({
    rawPayment: null,
    locationType: property.locationType,
    undefinedLabel: "A preciser",
    isArabic: false,
  });

  const topAmenities =
    Array.isArray(property.amenities) && property.amenities.length > 0
      ? property.amenities.slice(0, 3)
      : [];
  const publishedAgo = useMemo(
    () => formatPublishedAgo(property.createdAt, nowTs),
    [property.createdAt, nowTs]
  );

  return (
    <Link
      href={`/biens/${property.ref}`}
      className="block"
      onClick={() => {
        onOpen?.(property);
      }}
    >
      <motion.article
        whileHover={{ y: -6 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="group relative overflow-hidden rounded-[22px] border border-black/5 bg-white/85 shadow-sm backdrop-blur
                   hover:shadow-[0_24px_56px_rgba(10,18,35,0.12)] md:hover:shadow-[0_30px_70px_rgba(10,18,35,0.14)]"
      >
        {/* premium subtle frame */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-black/5" />

        {/* hover shine */}
        <div
          className="pointer-events-none absolute -inset-x-24 -top-40 h-72 rotate-12 bg-gradient-to-r
                     from-transparent via-[rgb(var(--gold))]/18 to-transparent opacity-0 blur-2xl
                     transition-opacity duration-500 group-hover:opacity-100"
        />

        <div className="relative bg-black/5">
          <PropertyImageSlider
            images={property.images}
            alt={property.title}
            aspectClassName="aspect-[4/3]"
            sizes="(max-width: 768px) 100vw, 33vw"
            className="p-0"
            enableZoom={false}
          />

          {/* image overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/0 opacity-80" />

          {/* Type badge */}
          <div className="absolute left-2.5 top-2.5 flex max-w-[78%] flex-wrap items-center gap-1.5 md:left-3 md:top-3 md:max-w-[72%] md:gap-2">
            <span
              className="inline-flex items-center gap-2 rounded-full
                         bg-white/85 px-3 py-1 text-xs font-semibold text-[rgb(var(--navy))]
                         shadow-sm backdrop-blur"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--gold))]" />
              {property.type}
            </span>
            <span className="inline-flex rounded-full bg-[rgb(var(--gold))]/90 px-3 py-1 text-xs font-semibold text-[rgb(var(--navy))] shadow-sm">
              {paymentLabel}
            </span>
            {hasResidence ? (
              <span className="hidden rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-[rgb(var(--navy))] shadow-sm backdrop-blur sm:inline-flex">
                Residence
              </span>
            ) : null}
            {hasParking ? (
              <span className="hidden rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-[rgb(var(--navy))] shadow-sm backdrop-blur sm:inline-flex">
                Parking
              </span>
            ) : null}
            <span className="hidden rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-semibold text-white shadow-sm sm:inline-flex">
              Disponible
            </span>
          </div>

          {/* AI badge (UI-ready; wire later) */}
          <div
            className="absolute left-3 bottom-3 inline-flex items-center gap-2 rounded-full
                       bg-black/55 px-3 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur"
            title="AI Match (bientôt)"
          >
            <Sparkles size={14} className="text-[rgb(var(--gold))]" />
            AI Match
          </div>

          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleCompare?.(property);
              }}
              className={`inline-flex items-center justify-center rounded-full p-2 shadow-sm backdrop-blur transition ${
                isCompared ? "bg-[rgb(var(--navy))] text-white" : "bg-white/85 text-[rgb(var(--navy))] hover:bg-white"
              }`}
              aria-label="Comparer"
              title="Comparer"
            >
              <Scale size={16} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onQuickContact?.(property);
              }}
              className="inline-flex items-center justify-center rounded-full bg-[rgb(var(--gold))]/90 p-2 text-[rgb(var(--navy))] shadow-sm backdrop-blur transition hover:bg-[rgb(var(--gold))]"
              aria-label="Contact rapide"
              title="Contact rapide"
            >
              <PhoneCall size={16} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite?.(property);
              }}
              className={`inline-flex items-center justify-center rounded-full p-2 shadow-sm backdrop-blur transition ${
                isFavorite ? "bg-rose-500 text-white hover:bg-rose-600" : "bg-white/85 text-[rgb(var(--navy))] hover:bg-white"
              }`}
              aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
              title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              <Heart size={16} className={isFavorite ? "fill-current" : ""} />
            </button>
          </div>

          {/* corner action */}
          <div
            className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-full
                       bg-white/85 px-3 py-1 text-xs font-semibold text-[rgb(var(--navy))]
                       shadow-sm backdrop-blur opacity-0 transition-opacity duration-300
                       group-hover:opacity-100"
            aria-hidden="true"
          >
            Voir <ArrowUpRight size={14} />
          </div>
        </div>

        <div className="p-3.5 md:p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-[rgb(var(--navy))] md:line-clamp-1">
              {property.title}
            </h3>

            <span
              className="shrink-0 rounded-full bg-[rgb(var(--gold))]/20 px-2.5 py-1 text-[11px] font-semibold
                         text-[rgb(var(--navy))] ring-1 ring-[rgb(var(--gold))]/25"
              title="Prix"
            >
              {property.price}
            </span>
          </div>

          <div>
            <p className="inline-flex items-center gap-2.5 pl-1 line-clamp-1 text-xs text-black/55">
              <MapPin size={14} className="shrink-0 text-[rgb(var(--gold))]" />
              {property.location}
            </p>
            <p className="inline-flex items-center gap-2.5 pl-1 text-xs text-black/55">
              <Clock3 size={14} className="shrink-0 text-[rgb(var(--gold))]" />
              {publishedAgo}
            </p>
          </div>

          {/* Metrics row */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[rgb(var(--navy))] sm:mt-4 sm:flex sm:flex-wrap">
            <span className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1">
              <BedDouble size={14} className="text-[rgb(var(--gold))]" />
              {property.beds}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1">
              <Bath size={14} className="text-[rgb(var(--gold))]" />
              {property.baths}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1">
              <Ruler size={14} className="text-[rgb(var(--gold))]" />
              {property.area} m²
            </span>

            {ppm2 != null && (
              <span
                className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1"
                title="Prix au m²"
              >
                <span className="text-[rgb(var(--gold))]">㎡</span>
                {formatCompact(ppm2)}/m²
              </span>
            )}
          </div>

          {/* Amenities pills (if data exists) */}
          {topAmenities.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5 md:mt-3 md:gap-2">
              {topAmenities.map((k) => (
                <span
                  key={k}
                  className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] text-black/70 shadow-sm md:px-3 md:text-xs"
                >
                  {k.replaceAll("_", " ")}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* bottom premium accent */}
        <div className="h-1 w-full bg-gradient-to-r from-[rgb(var(--gold))]/30 via-[rgb(var(--gold))]/70 to-[rgb(var(--gold))]/30 opacity-60" />
      </motion.article>
    </Link>
  );
}
