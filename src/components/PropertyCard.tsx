import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, BedDouble, Bath, Ruler, ArrowUpRight } from "lucide-react";
import type { PropertyItem } from "@/app/biens/ListingsClient";
import PropertyImageSlider from "@/components/PropertyImageSlider";

export default function PropertyCard({ property }: { property: PropertyItem }) {
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
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-black/0 to-black/0 opacity-80" />

          {/* Type badge */}
          <div
            className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full
                       bg-white/80 px-3 py-1 text-xs font-semibold text-[rgb(var(--navy))]
                       shadow-sm backdrop-blur"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--gold))]" />
            {property.type}
          </div>

          {/* corner action */}
          <div
            className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-full
                       bg-white/80 px-3 py-1 text-xs font-semibold text-[rgb(var(--navy))]
                       shadow-sm backdrop-blur opacity-0 transition-opacity duration-300
                       group-hover:opacity-100"
            aria-hidden="true"
          >
            Voir <ArrowUpRight size={14} />
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-1 text-sm font-semibold text-[rgb(var(--navy))]">{property.title}</h3>

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

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-[rgb(var(--navy))]">
            <span className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1">
              <BedDouble size={14} className="text-[rgb(var(--gold))]" />
              {property.beds} lits
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1">
              <Bath size={14} className="text-[rgb(var(--gold))]" />
              {property.baths} bains
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1">
              <Ruler size={14} className="text-[rgb(var(--gold))]" />
              {property.area} m²
            </span>
          </div>
        </div>

        {/* bottom premium accent */}
        <div className="h-1 w-full bg-gradient-to-r from-[rgb(var(--gold))]/30 via-[rgb(var(--gold))]/70 to-[rgb(var(--gold))]/30 opacity-60" />
      </motion.article>
    </Link>
  );
}
