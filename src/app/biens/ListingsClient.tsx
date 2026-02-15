"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import PropertyCard from "@/components/PropertyCard";
import { useLang } from "@/components/LanguageProvider";

const AMENITY_OPTIONS = [
  { key: "residence_fermee", label: "Residence fermee" },
  { key: "double_ascenseur", label: "Double ascenseur" },
  { key: "chauffage_central", label: "Chauffage central" },
  { key: "climatisation", label: "Climatisation" },
  { key: "cuisine_equipee", label: "Cuisine equipee" },
  { key: "sdb_italienne", label: "Salle de bain italienne" },
  { key: "deux_balcons", label: "Deux balcons" },
  { key: "interphone", label: "Interphone" },
  { key: "fibre", label: "Wifi fibre optique" },
  { key: "lumineux", label: "Appartement tres lumineux" },
  { key: "securite_h24", label: "Agent de securite H24" },
  { key: "vue_ville", label: "Vue ville" },
  { key: "vue_mer", label: "Vue mer" },
] as const;

const ROOMS_OPTIONS = [
  "",
  "Studio",
  "T1",
  "T2",
  "T3",
  "T4",
  "T5",
  "T6+",
  "F2",
  "F3",
  "F4",
  "F5",
  "F6+",
] as const;

const ORAN_COMMUNES = [
  "Oran",
  "Bir El Djir",
  "Es Senia",
  "Arzew",
  "Bethioua",
  "Gdyel",
  "Hassi Bounif",
  "Hassi Ben Okba",
  "Hassi Mefsoukh",
  "Sidi Chami",
  "Ben Freha",
  "Oued Tlelat",
  "El Kerma",
  "Ain El Turk",
  "Bousfer",
  "El Ançor",
  "Mers El Kebir",
  "Boutlelis",
  "Ain Biya",
  "Marsat El Hadjadj",
  "Sidi Ben Yebka",
  "Tafraoui",
  "Messerghine",
] as const;

type DealType =
  | "Tous"
  | "Vente"
  | "Location"
  | "par_mois"
  | "six_mois"
  | "douze_mois"
  | "par_nuit"
  | "court_sejour";

const TRANSACTION_SUGGESTIONS = [
  {
    dealType: "Vente",
    terms: ["vente", "vendre", "sale", "buy", "achat", "بيع"],
  },
  {
    dealType: "Location",
    terms: ["location", "louer", "rent", "rental", "lease", "كراء", "ايجار"],
  },
  {
    dealType: "par_mois",
    terms: ["par mois", "mensuel", "monthly", "mois"],
  },
  {
    dealType: "six_mois",
    terms: ["6 mois", "six mois", "6mois"],
  },
  {
    dealType: "douze_mois",
    terms: ["12 mois", "douze mois", "12mois", "annuel", "yearly"],
  },
  {
    dealType: "par_nuit",
    terms: ["par nuit", "par nuite", "nuit", "nightly"],
  },
  {
    dealType: "court_sejour",
    terms: ["court sejour", "court séjour", "short stay", "vacance", "weekend"],
  },
] as const;

const CATEGORY_SUGGESTIONS = [
  {
    label: "Appartement",
    terms: [
      "appartement",
      "appart",
      "apartment",
      "studio",
      "f2",
      "f3",
      "f4",
      "f5",
      "f6",
      "t1",
      "t2",
      "t3",
      "t4",
      "t5",
      "t6",
      "شقة",
    ],
  },
  {
    label: "Villa",
    terms: ["villa", "house", "maison", "فيلا"],
  },
  {
    label: "Terrain",
    terms: ["terrain", "lot", "parcelle", "land", "ارض"],
  },
  {
    label: "Local",
    terms: ["local", "commercial", "commerce", "shop", "boutique", "magasin", "محل"],
  },
  {
    label: "Bureau",
    terms: ["bureau", "office", "administratif", "مكتب"],
  },
] as const;

type AmenityKey = (typeof AMENITY_OPTIONS)[number]["key"];
type Lang = "fr" | "ar";
type ViewMode = "grid" | "list";
type SortMode = "relevance" | "newest" | "price_asc" | "price_desc" | "area_desc";

export type PropertyItem = {
  id: string;
  ref: string;
  title: string;
  type: "Vente" | "Location";
  category?: string | null;
  price: string;
  location: string; // examples: "Canastel, Bir El Djir" OR "Oran/Maraval"
  beds: number;
  baths: number;
  area: number;
  images: string[];
  amenities?: AmenityKey[];
};

const dict: Record<
  Lang,
  {
    title: string;
    sub: string;
    searchPh: string;
    results: string;
    filters: string;
    reset: string;
    sort: string;
    grid: string;
    list: string;
    transactionType: string;
    commune: string;
    district: string;
    sale: string;
    rent: string;
    rentPerMonth: string;
    rent6Months: string;
    rent12Months: string;
    rentPerNight: string;
    rentShortStay: string;
    all: string;
    budget: string;
    min: string;
    max: string;
    area: string;
    rooms: string;
    beds: string;
    baths: string;
    amenities: string;
    amenitySearch: string;
    aiFilters: string;
    aiFamily: string;
    aiRemote: string;
    aiSea: string;
    activeFilters: string;
    allCommunes: string;
    allDistricts: string;
    allRooms: string;
    selectCommuneFirst: string;
  }
> = {
  fr: {
    title: "Nos biens à Oran",
    sub: "Découvrez les meilleures offres de Rostomyia Immobilier.",
    searchPh: "Recherche: T3, Canastel, Villa… (essayez: “F4 vue mer max 2.5M fibre”)",
    results: "résultat(s)",
    filters: "Filtres",
    reset: "Réinitialiser",
    sort: "Trier",
    grid: "Grille",
    list: "Liste",
    transactionType: "Type de transaction",
    commune: "Commune",
    district: "Quartier",
    sale: "Vente",
    rent: "Location",
    rentPerMonth: "Location / par mois",
    rent6Months: "Location / 6 mois",
    rent12Months: "Location / 12 mois",
    rentPerNight: "Location / par nuit",
    rentShortStay: "Location / court séjour",
    all: "Tous",
    budget: "Budget",
    min: "Min",
    max: "Max",
    area: "Surface (m²)",
    rooms: "Pièces",
    beds: "Chambres",
    baths: "Salles de bain",
    amenities: "Équipements",
    amenitySearch: "Chercher un équipement…",
    aiFilters: "Filtres IA",
    aiFamily: "Famille",
    aiRemote: "Télétravail",
    aiSea: "Vue mer",
    activeFilters: "Filtres actifs",
    allCommunes: "Toutes les communes",
    allDistricts: "Tous les quartiers",
    allRooms: "Toutes",
    selectCommuneFirst: "Choisissez une commune d’abord",
  },
  ar: {
    title: "عقاراتنا في وهران",
    sub: "تصفح أفضل عروض روستوميا للعقار.",
    searchPh: "بحث: T3، كاناستيل، فيلا… (جرّب: “F4 vue mer 2.5M fibre”)",
    results: "نتيجة",
    filters: "الفلاتر",
    reset: "إعادة ضبط",
    sort: "ترتيب",
    grid: "شبكة",
    list: "قائمة",
    transactionType: "نوع المعاملة",
    commune: "البلدية",
    district: "الحي",
    sale: "بيع",
    rent: "كراء",
    rentPerMonth: "كراء / بالشهر",
    rent6Months: "كراء / 6 أشهر",
    rent12Months: "كراء / 12 شهر",
    rentPerNight: "كراء / بالليلة",
    rentShortStay: "كراء / إقامة قصيرة",
    all: "الكل",
    budget: "الميزانية",
    min: "أدنى",
    max: "أقصى",
    area: "المساحة (م²)",
    rooms: "الغرف",
    beds: "غرف النوم",
    baths: "الحمامات",
    amenities: "التجهيزات",
    amenitySearch: "ابحث عن تجهيز…",
    aiFilters: "فلاتر بالذكاء",
    aiFamily: "عائلة",
    aiRemote: "عمل عن بعد",
    aiSea: "إطلالة بحر",
    activeFilters: "الفلاتر النشطة",
    allCommunes: "كل البلديات",
    allDistricts: "كل الأحياء",
    allRooms: "الكل",
    selectCommuneFirst: "اختر البلدية أولاً",
  },
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function parseMoneyToNumber(input: string): number | null {
  const s = (input || "").toString().toLowerCase().trim();
  if (!s) return null;

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

function formatMoneyDzd(value: number, lang: Lang): string {
  const locale = lang === "ar" ? "ar-DZ" : "fr-DZ";
  if (!Number.isFinite(value)) return `0 DZD`;

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "DZD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return `${Math.round(value).toLocaleString(locale)} DZD`;
  }
}

function toPriceFilterValue(value: number, bound: number, kind: "min" | "max"): string {
  const rounded = Math.round(value);
  if (kind === "min" && rounded <= bound) return "";
  if (kind === "max" && rounded >= bound) return "";
  return String(rounded);
}

function normalizeText(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const ORAN_COMMUNES_NORM = ORAN_COMMUNES.map((c) => ({
  raw: c,
  norm: normalizeText(c),
}));

function smartParseLocation(location: string): { commune: string; district: string } {
  // Supports:
  // - "Canastel, Bir El Djir" (district first, commune second)
  // - "Oran/Maraval" (commune first, district second)
  // - "Maraval - Oran" (district first, commune second)
  // - "Oran · Canastel" (older separator variant)
  const parts = (location || "")
    .split(/[-,|/·•–—]/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return { commune: "", district: "" };
  if (parts.length === 1) {
    // If single token matches a commune, treat it as commune, no district.
    const n = normalizeText(parts[0]);
    const found = ORAN_COMMUNES_NORM.find((c) => c.norm === n);
    return found ? { commune: found.raw, district: "" } : { commune: "", district: parts[0] };
  }

  // Find which part is a commune (match against the official list)
  const idx = parts.findIndex((p) =>
    ORAN_COMMUNES_NORM.some((c) => c.norm === normalizeText(p))
  );

  if (idx >= 0) {
    const commune = ORAN_COMMUNES_NORM.find((c) => c.norm === normalizeText(parts[idx]))!.raw;
    const district = parts.filter((_, i) => i !== idx).join(" - ");
    return { commune, district };
  }

  // Fallback: assume last is commune-like (common for "Canastel, Bir El Djir")
  // but since it's not in the list, we store commune empty and keep district full
  return { commune: "", district: parts.join(" - ") };
}

function getLocationAliases(value: string): string[] {
  const normalized = normalizeText(value);
  if (!normalized) return [];

  const parts = normalized
    .split(/\s*[-,|/·•–—]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  return Array.from(new Set([normalized, ...parts]));
}

function tokenizeSearchQuery(query: string): string[] {
  const normalized = normalizeText(query);
  if (!normalized) return [];

  return normalized
    .split(/[\s,;|/]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function inferListingCategories(item: Pick<PropertyItem, "title" | "category">): string[] {
  const text = normalizeText(`${item.title} ${item.category ?? ""}`);
  if (!text) return [];

  const found = CATEGORY_SUGGESTIONS.filter((category) =>
    category.terms.some((term) => text.includes(normalizeText(term)))
  ).map((category) => category.label);

  return Array.from(new Set(found));
}

function buildSearchableListingText(item: PropertyItem): string {
  const parsed = smartParseLocation(item.location);
  const categories = inferListingCategories(item);
  const amenityLabels = (item.amenities ?? [])
    .map((key) => AMENITY_OPTIONS.find((a) => a.key === key)?.label)
    .filter((label): label is string => Boolean(label));

  const transactionTerms =
    item.type === "Vente"
      ? TRANSACTION_SUGGESTIONS[0].terms
      : TRANSACTION_SUGGESTIONS[1].terms;

  return normalizeText(
    [
      item.title,
      item.category ?? "",
      item.type,
      item.price,
      item.location,
      parsed.commune,
      parsed.district,
      categories.join(" "),
      transactionTerms.join(" "),
      amenityLabels.join(" "),
      `${item.beds} chambres beds`,
      `${item.baths} salles bain baths`,
      `${item.area} m2`,
    ].join(" ")
  );
}

function Chip({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove?: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-sm shadow-sm">
      <span className="truncate">{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full px-1 text-black/60 hover:text-black"
          aria-label="Remove"
        >
          ×
        </button>
      )}
    </span>
  );
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 shadow-sm backdrop-blur">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <div className="text-sm font-semibold text-[rgb(var(--navy))]">{title}</div>
        <div className="text-black/60">{open ? "–" : "+"}</div>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

type Filters = {
  q: string;
  dealType: DealType;

  commune: string;
  district: string;

  rooms: string;

  priceMin: string;
  priceMax: string;
  areaMin: string;
  areaMax: string;

  bedsMin: string;
  bathsMin: string;

  amenities: Set<AmenityKey>;

  view: ViewMode;
  sort: SortMode;
};

type SearchSuggestionType =
  | "commune"
  | "district"
  | "room"
  | "amenity"
  | "transaction"
  | "category";

type SearchSuggestion = {
  key: string;
  type: SearchSuggestionType;
  label: string;
  value: string;
  dealType?: Filters["dealType"];
  category?: string;
  commune?: string;
  district?: string;
  room?: string;
  amenity?: AmenityKey;
};

const SEARCH_SUGGESTION_LABELS: Record<
  Lang,
  Record<SearchSuggestionType, string>
> = {
  fr: {
    commune: "Commune",
    district: "Quartier",
    room: "Pièces",
    amenity: "Équipement",
    transaction: "Type",
    category: "Catégorie",
  },
  ar: {
    commune: "بلدية",
    district: "حي",
    room: "غرف",
    amenity: "تجهيز",
    transaction: "معاملة",
    category: "فئة",
  },
};

export default function ListingsClient({ items }: { items: PropertyItem[] }) {
  const { lang, dir } = useLang();
  const t = dict[lang];
  const dealTypeOptions = useMemo<Array<{ value: DealType; label: string }>>(
    () => [
      { value: "Tous", label: t.all },
      { value: "Vente", label: t.sale },
      { value: "Location", label: t.rent },
      { value: "par_mois", label: t.rentPerMonth },
      { value: "six_mois", label: t.rent6Months },
      { value: "douze_mois", label: t.rent12Months },
      { value: "par_nuit", label: t.rentPerNight },
      { value: "court_sejour", label: t.rentShortStay },
    ],
    [t]
  );

  const dealTypeLabelMap = useMemo(
    () => new Map<DealType, string>(dealTypeOptions.map((option) => [option.value, option.label])),
    [dealTypeOptions]
  );

  const [filters, setFilters] = useState<Filters>({
    q: "",
    dealType: "Tous",
    commune: "",
    district: "",
    rooms: "",
    priceMin: "",
    priceMax: "",
    areaMin: "",
    areaMax: "",
    bedsMin: "",
    bathsMin: "",
    amenities: new Set<AmenityKey>(),
    view: "grid",
    sort: "relevance",
  });

  const [amenitySearch, setAmenitySearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchActiveIndex, setSearchActiveIndex] = useState(-1);

  const priceSlider = useMemo(() => {
    let min = Number.POSITIVE_INFINITY;
    let maxRaw = Number.NEGATIVE_INFINITY;

    items.forEach((item) => {
      const value = parseMoneyToNumber(item.price);
      if (value == null) return;
      if (value < min) min = value;
      if (value > maxRaw) maxRaw = value;
    });

    if (!Number.isFinite(min) || !Number.isFinite(maxRaw)) {
      const fallbackMin = 0;
      const fallbackMax = 1_000_000;
      const fallbackStep = 50_000;
      return {
        min: fallbackMin,
        max: fallbackMax,
        step: fallbackStep,
        minValue: fallbackMin,
        maxValue: fallbackMax,
        leftPct: 0,
        rightPct: 100,
        hasData: false,
      };
    }

    const span = Math.max(maxRaw - min, 1);
    const step =
      span > 30_000_000 ? 500_000 : span > 10_000_000 ? 250_000 : span > 2_000_000 ? 100_000 : 50_000;
    const max = maxRaw === min ? min + step : maxRaw;

    const parsedMin = parseMoneyToNumber(filters.priceMin);
    const parsedMax = parseMoneyToNumber(filters.priceMax);

    let minValue = parsedMin ?? min;
    let maxValue = parsedMax ?? max;

    minValue = Math.max(min, Math.min(minValue, max));
    maxValue = Math.max(minValue, Math.min(maxValue, max));

    const range = Math.max(max - min, 1);
    const leftPct = ((minValue - min) / range) * 100;
    const rightPct = ((maxValue - min) / range) * 100;

    return {
      min,
      max,
      step,
      minValue,
      maxValue,
      leftPct,
      rightPct,
      hasData: true,
    };
  }, [items, filters.priceMin, filters.priceMax]);

  const districtCommuneHints = useMemo(() => {
    const hints = new Map<string, { commune: string; district: string }>();

    const addHint = (alias: string, commune: string, district: string) => {
      const aliasNorm = normalizeText(alias);
      if (!aliasNorm || !commune || !district) return;
      if (!hints.has(aliasNorm)) {
        hints.set(aliasNorm, { commune, district });
      }
    };

    items.forEach((item) => {
      const parsed = smartParseLocation(item.location);
      if (!parsed.commune || !parsed.district) return;

      getLocationAliases(parsed.district).forEach((alias) => {
        addHint(alias, parsed.commune, parsed.district);
      });
    });

    // Safety net for common typo and legacy records.
    addHint("canastel", "Bir El Djir", "Canastel");
    addHint("canastl", "Bir El Djir", "Canastel");

    return Array.from(hints.entries())
      .map(([alias, data]) => ({
        alias,
        commune: data.commune,
        district: data.district,
      }))
      .sort((a, b) => b.alias.length - a.alias.length);
  }, [items]);

  const searchSuggestions = useMemo(() => {
    const qNorm = normalizeText(filters.q);
    if (!qNorm) return [] as SearchSuggestion[];

    const candidates: Array<
      SearchSuggestion & { searchText: string; score: number }
    > = [];

    const push = (
      base: SearchSuggestion,
      searchText: string
    ) => {
      const textNorm = normalizeText(searchText);
      if (!textNorm.includes(qNorm)) return;

      const labelNorm = normalizeText(base.label);
      let score = 3;
      if (labelNorm === qNorm || textNorm === qNorm) score = 0;
      else if (labelNorm.startsWith(qNorm) || textNorm.startsWith(qNorm)) score = 1;
      else if (labelNorm.includes(qNorm)) score = 2;

      candidates.push({ ...base, searchText, score });
    };

    TRANSACTION_SUGGESTIONS.forEach((transaction) => {
      const label = dealTypeLabelMap.get(transaction.dealType) ?? transaction.dealType;
      push(
        {
          key: `transaction:${transaction.dealType}`,
          type: "transaction",
          label,
          value: label,
          dealType: transaction.dealType,
        },
        `${label} ${transaction.terms.join(" ")}`
      );
    });

    CATEGORY_SUGGESTIONS.forEach((category) => {
      push(
        {
          key: `category:${normalizeText(category.label)}`,
          type: "category",
          label: category.label,
          value: category.label,
          category: category.label,
        },
        `${category.label} ${category.terms.join(" ")}`
      );
    });

    ORAN_COMMUNES.forEach((commune) => {
      push(
        {
          key: `commune:${normalizeText(commune)}`,
          type: "commune",
          label: commune,
          value: commune,
          commune,
        },
        commune
      );
    });

    const districtMap = new Map<
      string,
      { commune: string; district: string; aliases: Set<string> }
    >();
    districtCommuneHints.forEach((hint) => {
      const key = `${normalizeText(hint.commune)}|${normalizeText(hint.district)}`;
      const existing = districtMap.get(key);
      if (existing) {
        existing.aliases.add(hint.alias);
      } else {
        districtMap.set(key, {
          commune: hint.commune,
          district: hint.district,
          aliases: new Set([hint.alias]),
        });
      }
    });

    districtMap.forEach((entry, key) => {
      push(
        {
          key: `district:${key}`,
          type: "district",
          label: `${entry.district} - ${entry.commune}`,
          value: entry.district,
          commune: entry.commune,
          district: entry.district,
        },
        `${entry.district} ${entry.commune} ${Array.from(entry.aliases).join(" ")}`
      );
    });

    ROOMS_OPTIONS.filter(Boolean).forEach((room) => {
      push(
        {
          key: `room:${room}`,
          type: "room",
          label: room,
          value: room,
          room,
        },
        room
      );
    });

    AMENITY_OPTIONS.forEach((amenity) => {
      push(
        {
          key: `amenity:${amenity.key}`,
          type: "amenity",
          label: amenity.label,
          value: amenity.label,
          amenity: amenity.key,
        },
        `${amenity.label} ${amenity.key.replaceAll("_", " ")}`
      );
    });

    candidates.sort(
      (a, b) => a.score - b.score || a.label.localeCompare(b.label)
    );

    const deduped = new Map<string, SearchSuggestion>();
    candidates.forEach((candidate) => {
      if (!deduped.has(candidate.key)) {
        deduped.set(candidate.key, {
          key: candidate.key,
          type: candidate.type,
          label: candidate.label,
          value: candidate.value,
          dealType: candidate.dealType,
          category: candidate.category,
          commune: candidate.commune,
          district: candidate.district,
          room: candidate.room,
          amenity: candidate.amenity,
        });
      }
    });

    return Array.from(deduped.values()).slice(0, 8);
  }, [filters.q, districtCommuneHints, dealTypeLabelMap]);

  const applySearchSuggestion = (suggestion: SearchSuggestion) => {
    setFilters((f) => {
      const nextAmenities = suggestion.amenity
        ? new Set([...f.amenities, suggestion.amenity])
        : f.amenities;

      return {
        ...f,
        q: suggestion.value,
        dealType:
          suggestion.type === "transaction" && suggestion.dealType
            ? suggestion.dealType
            : f.dealType,
        commune:
          suggestion.type === "commune" || suggestion.type === "district"
            ? suggestion.commune ?? f.commune
            : f.commune,
        district:
          suggestion.type === "district"
            ? suggestion.district ?? f.district
            : suggestion.type === "commune"
            ? ""
            : f.district,
        rooms: suggestion.type === "room" ? suggestion.room ?? f.rooms : f.rooms,
        amenities: nextAmenities,
      };
    });

    setSearchOpen(false);
    setSearchActiveIndex(-1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchSuggestions.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSearchOpen(true);
      setSearchActiveIndex((prev) =>
        prev < searchSuggestions.length - 1 ? prev + 1 : 0
      );
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSearchOpen(true);
      setSearchActiveIndex((prev) =>
        prev > 0 ? prev - 1 : searchSuggestions.length - 1
      );
      return;
    }

    if (e.key === "Enter" && searchOpen && searchActiveIndex >= 0) {
      const suggestion = searchSuggestions[searchActiveIndex];
      if (!suggestion) return;
      e.preventDefault();
      applySearchSuggestion(suggestion);
      return;
    }

    if (e.key === "Escape") {
      setSearchOpen(false);
      setSearchActiveIndex(-1);
    }
  };

  // District options depend on selected commune and current data
  const districtOptions = useMemo(() => {
    if (!filters.commune) return [];
    const wanted = normalizeText(filters.commune);

    const set = new Set<string>();
    items.forEach((p) => {
      const parsed = smartParseLocation(p.location);
      if (!parsed.commune || !parsed.district) return;
      if (normalizeText(parsed.commune) === wanted) set.add(parsed.district);
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items, filters.commune]);

  useEffect(() => {
    setFilters((f) => ({ ...f, district: "" }));
  }, [filters.commune]);

  // AI parsing for query
  useEffect(() => {
    const q = filters.q.toLowerCase();

    const kw: Array<[RegExp, AmenityKey]> = [
      [/vue\s*mer|mer\b/, "vue_mer"],
      [/vue\s*ville|ville\b/, "vue_ville"],
      [/fibre|wifi/, "fibre"],
      [/lumineux|lumi(n|ne)u/, "lumineux"],
      [/clim|climatisation/, "climatisation"],
      [/chauffage|central/, "chauffage_central"],
      [/résidence\s*fermée|residence\s*fermee|fermee/, "residence_fermee"],
      [/sécurité|securite|h24/, "securite_h24"],
      [/ascenseur/, "double_ascenseur"],
      [/balcon/, "deux_balcons"],
      [/interphone/, "interphone"],
      [/cuisine\s*(é|e)quip(é|e)e|cuisine equipee/, "cuisine_equipee"],
      [/italienne|douche/, "sdb_italienne"],
    ];

    if (kw.some(([re]) => re.test(q))) {
      setFilters((f) => {
        const next = new Set(f.amenities);
        kw.forEach(([re, k]) => {
          if (re.test(q)) next.add(k);
        });
        return { ...f, amenities: next };
      });
    }

    const roomsMatch = q.match(/\b(t[1-6]\+?|f[2-6]\+?|studio)\b/);
    if (roomsMatch) {
      const token = roomsMatch[1].toLowerCase();
      const normalized = token === "studio" ? "Studio" : token.toUpperCase();
      setFilters((f) => ({ ...f, rooms: normalized }));
    }

    const maxMatch = q.match(/\b(max|<=)\s*([\d.,\s]+m|\d[\d\s.,]*)\b/);
    if (maxMatch) {
      const n = parseMoneyToNumber(maxMatch[2]);
      if (n) setFilters((f) => ({ ...f, priceMax: String(n) }));
    }

    const minMatch = q.match(/\b(min|>=)\s*([\d.,\s]+m|\d[\d\s.,]*)\b/);
    if (minMatch) {
      const n = parseMoneyToNumber(minMatch[2]);
      if (n) setFilters((f) => ({ ...f, priceMin: String(n) }));
    }

    const m2Max = q.match(/\b(max|<=)\s*(\d{2,4})\s*m2\b/);
    if (m2Max) setFilters((f) => ({ ...f, areaMax: m2Max[2] }));
    const m2Min = q.match(/\b(min|>=)\s*(\d{2,4})\s*m2\b/);
    if (m2Min) setFilters((f) => ({ ...f, areaMin: m2Min[2] }));

    const qNorm = normalizeText(q);
    if (!qNorm) return;

    const communeMention = ORAN_COMMUNES_NORM.find((c) => qNorm.includes(c.norm));
    if (communeMention) {
      setFilters((f) =>
        normalizeText(f.commune) === communeMention.norm ? f : { ...f, commune: communeMention.raw }
      );
      return;
    }

    const districtMention = districtCommuneHints.find((h) => qNorm.includes(h.alias));
    if (districtMention) {
      setFilters((f) =>
        normalizeText(f.commune) === normalizeText(districtMention.commune)
          ? f
          : { ...f, commune: districtMention.commune }
      );
    }
  }, [filters.q, districtCommuneHints]);

  const handleMinPriceSlider = (value: number) => {
    const nextMin = Math.min(value, priceSlider.maxValue);
    setFilters((f) => {
      const currentMax = parseMoneyToNumber(f.priceMax) ?? priceSlider.max;
      const adjustedMax = currentMax < nextMin ? nextMin : currentMax;
      return {
        ...f,
        priceMin: toPriceFilterValue(nextMin, priceSlider.min, "min"),
        priceMax: toPriceFilterValue(adjustedMax, priceSlider.max, "max"),
      };
    });
  };

  const handleMaxPriceSlider = (value: number) => {
    const nextMax = Math.max(value, priceSlider.minValue);
    setFilters((f) => {
      const currentMin = parseMoneyToNumber(f.priceMin) ?? priceSlider.min;
      const adjustedMin = currentMin > nextMax ? nextMax : currentMin;
      return {
        ...f,
        priceMin: toPriceFilterValue(adjustedMin, priceSlider.min, "min"),
        priceMax: toPriceFilterValue(nextMax, priceSlider.max, "max"),
      };
    });
  };

  const filteredAmenities = useMemo(() => {
    const s = amenitySearch.trim().toLowerCase();
    if (!s) return AMENITY_OPTIONS;
    return AMENITY_OPTIONS.filter((a) => a.label.toLowerCase().includes(s));
  }, [amenitySearch]);

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; remove: () => void }> = [];

    if (filters.dealType !== "Tous") {
      chips.push({
        key: "dealType",
        label: `🏷️ ${dealTypeLabelMap.get(filters.dealType) ?? filters.dealType}`,
        remove: () => setFilters((f) => ({ ...f, dealType: "Tous" })),
      });
    }
    if (filters.commune) {
      chips.push({
        key: "commune",
        label: `📍 ${filters.commune}`,
        remove: () => setFilters((f) => ({ ...f, commune: "", district: "" })),
      });
    }
    if (filters.district) {
      chips.push({
        key: "district",
        label: `🏘️ ${filters.district}`,
        remove: () => setFilters((f) => ({ ...f, district: "" })),
      });
    }
    if (filters.rooms) {
      chips.push({
        key: "rooms",
        label: `🏠 ${filters.rooms}`,
        remove: () => setFilters((f) => ({ ...f, rooms: "" })),
      });
    }

    filters.amenities.forEach((k) => {
      const opt = AMENITY_OPTIONS.find((a) => a.key === k);
      if (!opt) return;
      chips.push({
        key: `amenity:${k}`,
        label: `✨ ${opt.label}`,
        remove: () =>
          setFilters((f) => {
            const next = new Set(f.amenities);
            next.delete(k);
            return { ...f, amenities: next };
          }),
      });
    });

    if (filters.priceMin || filters.priceMax) {
      chips.push({
        key: "price",
        label: `💰 ${filters.priceMin || "0"} → ${filters.priceMax || "∞"}`,
        remove: () => setFilters((f) => ({ ...f, priceMin: "", priceMax: "" })),
      });
    }
    if (filters.areaMin || filters.areaMax) {
      chips.push({
        key: "area",
        label: `📐 ${filters.areaMin || "0"} → ${filters.areaMax || "∞"} m²`,
        remove: () => setFilters((f) => ({ ...f, areaMin: "", areaMax: "" })),
      });
    }
    if (filters.bedsMin) {
      chips.push({
        key: "bedsMin",
        label: `🛏️ ${filters.bedsMin}+`,
        remove: () => setFilters((f) => ({ ...f, bedsMin: "" })),
      });
    }
    if (filters.bathsMin) {
      chips.push({
        key: "bathsMin",
        label: `🛁 ${filters.bathsMin}+`,
        remove: () => setFilters((f) => ({ ...f, bathsMin: "" })),
      });
    }

    return chips;
  }, [filters, dealTypeLabelMap, setFilters]);

  const computed = useMemo(() => {
    const qTokens = tokenizeSearchQuery(filters.q);

    const priceMin = parseMoneyToNumber(filters.priceMin);
    const priceMax = parseMoneyToNumber(filters.priceMax);

    const areaMin = Number(filters.areaMin || "");
    const areaMax = Number(filters.areaMax || "");

    const bedsMin = Number(filters.bedsMin || "");
    const bathsMin = Number(filters.bathsMin || "");

    const communeNorm = normalizeText(filters.commune);
    const districtNorm = normalizeText(filters.district);

    let list = items.filter((p) => {
      const hay = buildSearchableListingText(p);
      const byDeal =
        filters.dealType === "Tous"
          ? true
          : filters.dealType === "Vente"
          ? p.type === "Vente"
          : filters.dealType === "Location"
          ? p.type === "Location"
          : p.type === "Location" &&
            (TRANSACTION_SUGGESTIONS.find((entry) => entry.dealType === filters.dealType)?.terms ?? []).some(
              (term) => hay.includes(normalizeText(term))
            );
      const byQ = qTokens.length > 0 ? qTokens.every((token) => hay.includes(token)) : true;

      const parsed = smartParseLocation(p.location);
      const byCommune = filters.commune
        ? normalizeText(parsed.commune) === communeNorm
        : true;

      const byDistrict = filters.district
        ? normalizeText(parsed.district) === districtNorm
        : true;

      const byRooms = filters.rooms
        ? `${p.title} ${p.location}`.toLowerCase().includes(filters.rooms.toLowerCase())
        : true;

      const pPrice = parseMoneyToNumber(p.price);
      const byPriceMin = priceMin != null && pPrice != null ? pPrice >= priceMin : true;
      const byPriceMax = priceMax != null && pPrice != null ? pPrice <= priceMax : true;

      const byAreaMin = Number.isFinite(areaMin) && areaMin > 0 ? p.area >= areaMin : true;
      const byAreaMax = Number.isFinite(areaMax) && areaMax > 0 ? p.area <= areaMax : true;

      const byBeds = Number.isFinite(bedsMin) && bedsMin > 0 ? p.beds >= bedsMin : true;
      const byBaths = Number.isFinite(bathsMin) && bathsMin > 0 ? p.baths >= bathsMin : true;

      const byAmenities =
        filters.amenities.size === 0
          ? true
          : Array.isArray(p.amenities)
          ? Array.from(filters.amenities).every((k) => p.amenities!.includes(k))
          : true;

      return (
        byDeal &&
        byQ &&
        byCommune &&
        byDistrict &&
        byRooms &&
        byPriceMin &&
        byPriceMax &&
        byAreaMin &&
        byAreaMax &&
        byBeds &&
        byBaths &&
        byAmenities
      );
    });

    const sort = filters.sort;
    if (sort !== "relevance") {
      list = [...list].sort((a, b) => {
        const ap = parseMoneyToNumber(a.price) ?? 0;
        const bp = parseMoneyToNumber(b.price) ?? 0;
        if (sort === "price_asc") return ap - bp;
        if (sort === "price_desc") return bp - ap;
        if (sort === "area_desc") return b.area - a.area;
        if (sort === "newest") return (b.ref || b.id).localeCompare(a.ref || a.id);
        return 0;
      });
    }

    return list;
  }, [items, filters]);

  const resetAll = () =>
    setFilters((f) => ({
      ...f,
      q: "",
      dealType: "Tous",
      commune: "",
      district: "",
      rooms: "",
      priceMin: "",
      priceMax: "",
      areaMin: "",
      areaMax: "",
      bedsMin: "",
      bathsMin: "",
      amenities: new Set<AmenityKey>(),
      sort: "relevance",
    }));

  const applyAiFamily = () =>
    setFilters((f) => {
      const next = new Set(f.amenities);
      next.add("residence_fermee");
      next.add("securite_h24");
      next.add("double_ascenseur");
      return { ...f, amenities: next };
    });

  const applyAiRemote = () =>
    setFilters((f) => {
      const next = new Set(f.amenities);
      next.add("fibre");
      next.add("lumineux");
      return { ...f, amenities: next };
    });

  const applyAiSea = () =>
    setFilters((f) => {
      const next = new Set(f.amenities);
      next.add("vue_mer");
      return { ...f, amenities: next };
    });

  return (
    <main dir={dir} className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[rgb(var(--gold))] blur-3xl opacity-15" />
        <div className="absolute -right-52 top-0 h-[620px] w-[620px] rounded-full bg-[rgb(var(--navy))] blur-3xl opacity-[0.06]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_10%,rgba(255,255,255,0.75),transparent_45%)]" />
      </div>

      {/* Sticky topbar */}
      <div className="sticky top-0 z-30 border-b border-black/10 bg-white/70 backdrop-blur">
        <div className="relative mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[rgb(var(--navy))] md:text-3xl">
              {t.title}
            </h1>
            <p className="mt-1 text-sm text-black/60">{t.sub}</p>
          </div>

          <div className="flex w-full flex-col gap-2 md:w-[560px] md:flex-row">
            <div className="relative flex w-full items-center gap-2 rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm shadow-sm backdrop-blur focus-within:border-black/20">
              <span className="text-black/50">🔎</span>
              <input
                value={filters.q}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, q: e.target.value }));
                  setSearchOpen(true);
                  setSearchActiveIndex(-1);
                }}
                onFocus={() => {
                  if (searchSuggestions.length) setSearchOpen(true);
                }}
                onBlur={() => {
                  window.setTimeout(() => {
                    setSearchOpen(false);
                    setSearchActiveIndex(-1);
                  }, 120);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder={t.searchPh}
                className="w-full bg-transparent outline-none"
                aria-autocomplete="list"
              />

              {searchOpen && searchSuggestions.length > 0 && (
                <div
                  className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-2xl border border-black/10 bg-white/95 shadow-xl backdrop-blur"
                  role="listbox"
                >
                  {searchSuggestions.map((suggestion, index) => {
                    const active = index === searchActiveIndex;
                    return (
                      <button
                        key={suggestion.key}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applySearchSuggestion(suggestion);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 px-4 py-2 text-start text-sm",
                          active
                            ? "bg-[rgb(var(--navy))]/8 text-[rgb(var(--navy))]"
                            : "hover:bg-black/5"
                        )}
                      >
                        <span className="truncate">{suggestion.label}</span>
                        <span className="shrink-0 rounded-full border border-black/10 px-2 py-0.5 text-[10px] text-black/55">
                          {SEARCH_SUGGESTION_LABELS[lang][suggestion.type]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <select
              value={filters.dealType}
              onChange={(e) =>
                setFilters((f) => ({ ...f, dealType: e.target.value as DealType }))
              }
              className="rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm shadow-sm outline-none backdrop-blur focus:border-black/20"
            >
              {dealTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 pb-4">
          <div className="inline-flex rounded-full border border-black/5 bg-white/60 px-3 py-1 text-sm text-black/60 shadow-sm backdrop-blur">
            {computed.length} {t.results}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filters.sort}
              onChange={(e) =>
                setFilters((f) => ({ ...f, sort: e.target.value as SortMode }))
              }
              className="rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-sm shadow-sm outline-none backdrop-blur"
            >
              <option value="relevance">{t.sort}: Pertinence</option>
              <option value="newest">{t.sort}: Plus récent</option>
              <option value="price_asc">{t.sort}: Prix ↑</option>
              <option value="price_desc">{t.sort}: Prix ↓</option>
              <option value="area_desc">{t.sort}: Surface ↓</option>
            </select>

            <div className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white/70 p-1 shadow-sm backdrop-blur">
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, view: "grid" }))}
                className={cn(
                  "rounded-xl px-3 py-2 text-sm",
                  filters.view === "grid" ? "bg-black text-white" : "text-black/70 hover:bg-black/5"
                )}
              >
                {t.grid}
              </button>
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, view: "list" }))}
                className={cn(
                  "rounded-xl px-3 py-2 text-sm",
                  filters.view === "list" ? "bg-black text-white" : "text-black/70 hover:bg-black/5"
                )}
              >
                {t.list}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-8 md:grid-cols-[360px_1fr]">
        {/* Sidebar */}
        <motion.aside
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="text-base font-semibold text-[rgb(var(--navy))]">{t.filters}</div>
            <button type="button" onClick={resetAll} className="text-sm text-black/60 hover:text-black">
              {t.reset}
            </button>
          </div>

          <Section title={t.aiFilters}>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={applyAiFamily}
                className="rounded-full border border-black/10 bg-white px-3 py-1 text-sm shadow-sm hover:bg-neutral-100"
              >
                🤖 {t.aiFamily}
              </button>
              <button
                type="button"
                onClick={applyAiRemote}
                className="rounded-full border border-black/10 bg-white px-3 py-1 text-sm shadow-sm hover:bg-neutral-100"
              >
                🤖 {t.aiRemote}
              </button>
              <button
                type="button"
                onClick={applyAiSea}
                className="rounded-full border border-black/10 bg-white px-3 py-1 text-sm shadow-sm hover:bg-neutral-100"
              >
                🤖 {t.aiSea}
              </button>
            </div>
          </Section>

          <Section title={t.transactionType}>
            <select
              value={filters.dealType}
              onChange={(e) =>
                setFilters((f) => ({ ...f, dealType: e.target.value as DealType }))
              }
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none"
            >
              {dealTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Section>

          <Section title={t.amenities} defaultOpen>
            <input
              value={amenitySearch}
              onChange={(e) => setAmenitySearch(e.target.value)}
              placeholder={t.amenitySearch}
              className="mb-3 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none"
            />
            <div className="max-h-56 space-y-2 overflow-auto pr-1">
              {filteredAmenities.map((a) => {
                const checked = filters.amenities.has(a.key);
                return (
                  <label
                    key={a.key}
                    className="flex cursor-pointer items-center justify-between rounded-xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
                  >
                    <span>{a.label}</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setFilters((f) => {
                          const next = new Set(f.amenities);
                          if (e.target.checked) next.add(a.key);
                          else next.delete(a.key);
                          return { ...f, amenities: next };
                        })
                      }
                    />
                  </label>
                );
              })}
            </div>
          </Section>

          <Section title={t.commune}>
            <select
              value={filters.commune}
              onChange={(e) => setFilters((f) => ({ ...f, commune: e.target.value }))}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none"
            >
              <option value="">{t.allCommunes}</option>
              {ORAN_COMMUNES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Section>

          <Section title={t.district}>
            <select
              value={filters.district}
              onChange={(e) => setFilters((f) => ({ ...f, district: e.target.value }))}
              disabled={!filters.commune}
              className={cn(
                "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none",
                !filters.commune && "opacity-60"
              )}
            >
              <option value="">{filters.commune ? t.allDistricts : t.selectCommuneFirst}</option>
              {districtOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Section>

          <Section title={t.rooms}>
            <select
              value={filters.rooms}
              onChange={(e) => setFilters((f) => ({ ...f, rooms: e.target.value }))}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none"
            >
              <option value="">{t.allRooms}</option>
              {ROOMS_OPTIONS.filter(Boolean).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Section>

          <Section title={t.budget}>
            <div className="mb-3">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-black/60">
                <span>{formatMoneyDzd(priceSlider.minValue, lang)}</span>
                <span>{formatMoneyDzd(priceSlider.maxValue, lang)}</span>
              </div>

              <div className="relative h-7">
                <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-black/10" />
                <div
                  className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[rgb(var(--gold))]"
                  style={{
                    left: `${priceSlider.leftPct}%`,
                    right: `${100 - priceSlider.rightPct}%`,
                  }}
                />

                <input
                  type="range"
                  min={priceSlider.min}
                  max={priceSlider.max}
                  step={priceSlider.step}
                  value={priceSlider.minValue}
                  disabled={!priceSlider.hasData}
                  onChange={(e) => handleMinPriceSlider(Number(e.target.value))}
                  className="pointer-events-none absolute inset-0 z-20 h-7 w-full appearance-none bg-transparent
                             [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-transparent
                             [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                             [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
                             [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[rgb(var(--navy))]
                             [&::-webkit-slider-thumb]:bg-white
                             [&::-moz-range-track]:h-1 [&::-moz-range-track]:bg-transparent
                             [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4
                             [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border
                             [&::-moz-range-thumb]:border-[rgb(var(--navy))] [&::-moz-range-thumb]:bg-white"
                />

                <input
                  type="range"
                  min={priceSlider.min}
                  max={priceSlider.max}
                  step={priceSlider.step}
                  value={priceSlider.maxValue}
                  disabled={!priceSlider.hasData}
                  onChange={(e) => handleMaxPriceSlider(Number(e.target.value))}
                  className="pointer-events-none absolute inset-0 z-10 h-7 w-full appearance-none bg-transparent
                             [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-transparent
                             [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                             [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
                             [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[rgb(var(--gold))]
                             [&::-webkit-slider-thumb]:bg-white
                             [&::-moz-range-track]:h-1 [&::-moz-range-track]:bg-transparent
                             [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4
                             [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border
                             [&::-moz-range-thumb]:border-[rgb(var(--gold))] [&::-moz-range-thumb]:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                value={filters.priceMin}
                onChange={(e) => setFilters((f) => ({ ...f, priceMin: e.target.value }))}
                placeholder={t.min}
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none"
              />
              <input
                value={filters.priceMax}
                onChange={(e) => setFilters((f) => ({ ...f, priceMax: e.target.value }))}
                placeholder={t.max}
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none"
              />
            </div>
            <div className="mt-2 text-xs text-black/50">Ex: 2500000, 2.5M, 2 500 000</div>
          </Section>

          <Section title={t.area}>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={filters.areaMin}
                onChange={(e) => setFilters((f) => ({ ...f, areaMin: e.target.value }))}
                placeholder={t.min}
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none"
              />
              <input
                value={filters.areaMax}
                onChange={(e) => setFilters((f) => ({ ...f, areaMax: e.target.value }))}
                placeholder={t.max}
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none"
              />
            </div>
          </Section>

          <Section title={`${t.beds} / ${t.baths}`}>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={filters.bedsMin}
                onChange={(e) => setFilters((f) => ({ ...f, bedsMin: e.target.value }))}
                placeholder={`${t.beds} +`}
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none"
              />
              <input
                value={filters.bathsMin}
                onChange={(e) => setFilters((f) => ({ ...f, bathsMin: e.target.value }))}
                placeholder={`${t.baths} +`}
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none"
              />
            </div>
          </Section>

        </motion.aside>

        {/* Results */}
        <section className="space-y-4">
          {activeChips.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="rounded-2xl border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur"
            >
              <div className="mb-2 text-sm font-semibold text-[rgb(var(--navy))]">{t.activeFilters}</div>
              <div className="flex flex-wrap gap-2">
                {activeChips.map((c) => (
                  <Chip key={c.key} onRemove={c.remove}>
                    {c.label}
                  </Chip>
                ))}
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.05 }}
            className={cn(filters.view === "grid" ? "grid gap-6 md:grid-cols-2 xl:grid-cols-3" : "space-y-4")}
          >
            {computed.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </motion.div>

          {computed.length === 0 && (
            <div className="rounded-2xl border border-black/10 bg-white/70 p-8 text-center text-black/60 shadow-sm backdrop-blur">
              Aucun résultat — essayez d’enlever quelques filtres.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}


/*If you want next-level marketplace UX:

Autocomplete dropdown suggestions

Fuzzy typo correction (“canastl” → Canastel)

Price slider instead of inputs

Save filter state in URL

Map integration

Tell me which one you want next 👌*/
