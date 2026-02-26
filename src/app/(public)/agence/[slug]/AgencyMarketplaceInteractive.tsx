"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Bath, BedDouble, Heart, Image as ImageIcon, MessageCircle, Ruler, Scale, SlidersHorizontal, X } from "lucide-react";
import type { AgencyMarketplaceItem } from "./storefront-data";

function numericPrice(input: string) {
  const n = Number(String(input || "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function numericArea(input: string) {
  const n = Number(String(input || "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function readStoredIds(storageKey: string) {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export default function AgencyMarketplaceInteractive({
  slug,
  items,
  brandPrimaryColor,
  ctaHref,
  ctaLabel,
  whatsappHref,
}: {
  slug: string;
  items: AgencyMarketplaceItem[];
  brandPrimaryColor: string;
  ctaHref: string;
  ctaLabel: string;
  whatsappHref: string;
}) {
  const [activeTransaction, setActiveTransaction] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"default" | "price-asc" | "price-desc" | "area-desc">("default");
  const [savedIds, setSavedIds] = useState<string[]>(() => readStoredIds(`agency-market-saved:${slug}`));
  const [compareIds, setCompareIds] = useState<string[]>(() => readStoredIds(`agency-market-compare:${slug}`));
  const [quickItem, setQuickItem] = useState<AgencyMarketplaceItem | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(`agency-market-saved:${slug}`, JSON.stringify(savedIds));
      window.localStorage.setItem(`agency-market-compare:${slug}`, JSON.stringify(compareIds));
    } catch {
      // ignore localStorage issues
    }
  }, [slug, savedIds, compareIds]);

  const transactionOptions = useMemo(() => {
    const out = new Set<string>();
    for (const item of items) {
      const key = String(item.transaction || "").trim();
      if (key) out.add(key);
    }
    return ["all", ...Array.from(out)];
  }, [items]);

  const filteredItems = useMemo(() => {
    let out = items;
    if (activeTransaction !== "all") {
      out = out.filter((item) => (item.transaction || "").trim() === activeTransaction);
    }
    if (sortBy === "price-asc") {
      out = [...out].sort((a, b) => numericPrice(a.price) - numericPrice(b.price));
    } else if (sortBy === "price-desc") {
      out = [...out].sort((a, b) => numericPrice(b.price) - numericPrice(a.price));
    } else if (sortBy === "area-desc") {
      out = [...out].sort((a, b) => numericArea(b.area) - numericArea(a.area));
    }
    return out;
  }, [items, activeTransaction, sortBy]);

  const compareItems = useMemo(
    () => compareIds.map((id) => items.find((item) => item.id === id)).filter((item): item is AgencyMarketplaceItem => Boolean(item)),
    [compareIds, items]
  );

  function toggleSaved(itemId: string) {
    setSavedIds((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [itemId, ...prev].slice(0, 40)));
  }

  function toggleCompare(itemId: string) {
    setCompareIds((prev) => {
      if (prev.includes(itemId)) return prev.filter((id) => id !== itemId);
      if (prev.length >= 3) return prev;
      return [...prev, itemId];
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            <SlidersHorizontal size={12} />
            Filtres
          </span>
          {transactionOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setActiveTransaction(option)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                activeTransaction === option ? "text-white" : "border border-slate-200 bg-white text-slate-600"
              }`}
              style={activeTransaction === option ? { backgroundColor: brandPrimaryColor } : undefined}
            >
              {option === "all" ? "Tous" : option}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600"
          >
            <option value="default">Tri par defaut</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix decroissant</option>
            <option value="area-desc">Surface max</option>
          </select>
        </div>
      </div>

      {compareItems.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Comparaison ({compareItems.length}/3)
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {compareItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs">
                <div className="line-clamp-2 font-semibold text-slate-800">{item.title}</div>
                <div className="mt-1 text-slate-600">{item.price}</div>
                <div className="mt-1 text-slate-500">{item.area}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
          Aucun bien correspond aux filtres selectionnes.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item, index) => {
            const isSaved = savedIds.includes(item.id);
            const isCompared = compareIds.includes(item.id);
            return (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.22 }}
                transition={{ duration: 0.42, delay: Math.min(0.24, index * 0.03) }}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_40px_-28px_rgba(15,23,42,0.5)] transition duration-300 hover:-translate-y-1"
              >
                <div className="relative h-44 bg-slate-100">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 33vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-black/40">
                      <ImageIcon size={20} />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleSaved(item.id)}
                    className={`absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border text-white ${
                      isSaved ? "border-transparent bg-rose-500" : "border-white/40 bg-black/25"
                    }`}
                  >
                    <Heart size={14} />
                  </button>
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-2 text-base font-bold" style={{ color: brandPrimaryColor }}>
                    {item.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{item.location || "-"}</p>
                  <div className="mt-3 text-lg font-extrabold" style={{ color: brandPrimaryColor }}>
                    {item.price}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
                      <Ruler size={12} />
                      {item.area}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
                      <BedDouble size={12} />
                      {item.beds}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
                      <Bath size={12} />
                      {item.baths}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleCompare(item.id)}
                      className={`inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-xs font-semibold ${
                        isCompared ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      <Scale size={12} />
                      Comparer
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickItem(item)}
                      className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                    >
                      <MessageCircle size={12} />
                      Inquiry
                    </button>
                    {item.ref ? (
                      <Link
                        href={`/biens?ref=${encodeURIComponent(item.ref)}`}
                        className="ml-auto inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                      >
                        Voir
                        <ArrowUpRight size={12} />
                      </Link>
                    ) : null}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {quickItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.08em] text-slate-500">Quick inquiry</div>
                <h3 className="mt-1 text-lg font-bold text-slate-900">{quickItem.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickItem(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500"
              >
                <X size={14} />
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              {quickItem.location} • {quickItem.price}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {whatsappHref ? (
                <a
                  href={`${whatsappHref}?text=${encodeURIComponent(`Bonjour, je souhaite plus d'informations sur ${quickItem.title}.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold text-white"
                  style={{ backgroundColor: brandPrimaryColor }}
                >
                  <MessageCircle size={14} />
                  WhatsApp
                </a>
              ) : null}
              {ctaHref ? (
                <Link
                  href={ctaHref}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700"
                >
                  {ctaLabel || "Nous contacter"}
                  <ArrowUpRight size={14} />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
