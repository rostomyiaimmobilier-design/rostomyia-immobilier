import Link from "next/link";
import { motion } from "framer-motion";
import {
  MapPin,
  BedDouble,
  Bath,
  Ruler,
  ArrowUpRight,
  Heart,
  Sparkles,
} from "lucide-react";
import type { PropertyItem } from "@/app/biens/ListingsClient";
import PropertyImageSlider from "@/components/PropertyImageSlider";

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

export default function PropertyCard({
  property,
  // optional props for marketplace behaviors:
  // view = "grid",
  // aiScore,
  // onToggleSave,
  // isSaved,
}: {
  property: PropertyItem;
  // view?: "grid" | "list";
  // aiScore?: number; // 0..100
  // isSaved?: boolean;
  // onToggleSave?: (id: string) => void;
}) {
  const p = parseMoneyToNumber(property.price);
  const ppm2 =
    p != null && property.area > 0 ? Math.round(p / property.area) : null;

  const topAmenities =
    Array.isArray(property.amenities) && property.amenities.length > 0
      ? property.amenities.slice(0, 3)
      : [];

  return (
    <Link href={`/biens/${property.ref}`} className="block">
      <motion.article
        whileHover={{ y: -6 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="group relative overflow-hidden rounded-2xl border border-black/5 bg-white/70 shadow-sm backdrop-blur
                   hover:shadow-[0_30px_70px_rgba(10,18,35,0.14)]"
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
          />

          {/* image overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/0 opacity-80" />

          {/* Type badge */}
          <div
            className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full
                       bg-white/85 px-3 py-1 text-xs font-semibold text-[rgb(var(--navy))]
                       shadow-sm backdrop-blur"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--gold))]" />
            {property.type}
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

          {/* Save button (UI only for now) */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // onToggleSave?.(property.id);
            }}
            className="absolute right-3 bottom-3 inline-flex items-center justify-center rounded-full
                       bg-white/85 p-2 shadow-sm backdrop-blur transition
                       hover:bg-white"
            aria-label="Save"
            title="Sauvegarder"
          >
            <Heart size={16} className="text-[rgb(var(--navy))]" />
          </button>

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

        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-1 text-sm font-semibold text-[rgb(var(--navy))]">
              {property.title}
            </h3>

            <span
              className="shrink-0 rounded-full bg-[rgb(var(--gold))]/20 px-3 py-1 text-xs font-semibold
                         text-[rgb(var(--navy))] ring-1 ring-[rgb(var(--gold))]/25"
              title="Prix"
            >
              {property.price}
            </span>
          </div>

          <p className="mt-1 inline-flex items-center gap-2 line-clamp-1 text-xs text-black/55">
            <MapPin size={14} className="text-[rgb(var(--gold))]" />
            {property.location}
          </p>

          {/* Metrics row */}
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-[rgb(var(--navy))]">
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
            <div className="mt-3 flex flex-wrap gap-2">
              {topAmenities.map((k) => (
                <span
                  key={k}
                  className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-black/70 shadow-sm"
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
