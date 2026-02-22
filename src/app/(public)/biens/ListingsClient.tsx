"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import {
  ArrowUpDown,
  BadgeCheck,
  BookmarkPlus,
  Brain,
  ChevronRight,
  Building2,
  Laptop,
  MapPin,
  Search,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
  Waves,
  X,
  Zap,
} from "lucide-react";
import PropertyCard from "@/components/PropertyCard";
import { useLang } from "@/components/LanguageProvider";
import { ORAN_COMMUNES } from "@/lib/oran-locations";
import { formatPaymentLabel } from "@/lib/payment-fallback";
import AppDropdown from "@/components/ui/app-dropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const AMENITY_OPTIONS = [
  { key: "residence_fermee", label: "Residence fermee" },
  { key: "parking_sous_sol", label: "Parking sous-sol" },
  { key: "garage", label: "Garage" },
  { key: "box", label: "Box" },
  { key: "luxe", label: "Luxe" },
  { key: "haut_standing", label: "Haut standing" },
  { key: "domotique", label: "Domotique" },
  { key: "double_ascenseur", label: "Double ascenseur" },
  { key: "concierge", label: "Concierge" },
  { key: "camera_surveillance", label: "Camera de surveillance" },
  { key: "groupe_electrogene", label: "Groupe electrogene" },
  { key: "chauffage_central", label: "Chauffage central" },
  { key: "climatisation", label: "Climatisation" },
  { key: "cheminee", label: "Cheminee" },
  { key: "dressing", label: "Dressing" },
  { key: "porte_blindee", label: "Porte blindee" },
  { key: "cuisine_equipee", label: "Cuisine equipee" },
  { key: "sdb_italienne", label: "Salle de bain italienne" },
  { key: "deux_balcons", label: "Deux balcons" },
  { key: "terrasse", label: "Terrasse" },
  { key: "jardin", label: "Jardin" },
  { key: "piscine", label: "Piscine" },
  { key: "salle_sport", label: "Salle de sport" },
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
type DisplayMode = "cards" | "map";
type AlertChannel = "email" | "whatsapp";
type PublishedWithin = "all" | "7" | "30" | "90";

const SEARCH_NEGATION_PREFIXES = ["sans", "without", "no", "pas de", "بدون", "بلا"] as const;

const SEARCH_ALIAS_MAP: Record<string, string[]> = {
  oran: ["wahran", "وهران"],
  wahran: ["oran", "وهران"],
  "وهران": ["oran", "wahran"],
  "bir el djir": ["bir eldjir", "بير الجير", "bir djir"],
  "bir eldjir": ["bir el djir", "بير الجير"],
  "بير الجير": ["bir el djir", "bir eldjir"],
  canastel: ["canastl", "kanastel", "كاناستيل"],
  canastl: ["canastel", "kanastel"],
  "es senia": ["essenia", "السنية", "el senia"],
  essenia: ["es senia", "السنية"],
  "sidi chahmi": ["sidi chehmi", "سيدي الشحمي"],
  appartement: ["appartement", "appart", "apartment", "شقة"],
  villa: ["villa", "maison", "house", "فيلا"],
  terrain: ["terrain", "lot", "parcelle", "land", "ارض"],
  vente: ["vente", "sale", "buy", "achat", "بيع"],
  location: ["location", "rent", "rental", "lease", "كراء", "ايجار"],
};

const AMENITY_NEGATION_TERMS: Record<AmenityKey, string[]> = {
  residence_fermee: ["residence fermee", "residence", "résidence", "اقامة مغلقة"],
  parking_sous_sol: ["parking", "sous sol", "parking sous sol"],
  garage: ["garage"],
  box: ["box"],
  luxe: ["luxe"],
  haut_standing: ["haut standing", "standing"],
  domotique: ["domotique", "smart home"],
  double_ascenseur: ["ascenseur", "double ascenseur", "elevator"],
  concierge: ["concierge", "gardien"],
  camera_surveillance: ["camera", "surveillance"],
  groupe_electrogene: ["groupe electrogene", "generateur"],
  chauffage_central: ["chauffage", "chauffage central"],
  climatisation: ["clim", "climatisation", "ac"],
  cheminee: ["cheminee", "cheminee"],
  dressing: ["dressing"],
  porte_blindee: ["porte blindee"],
  cuisine_equipee: ["cuisine equipee", "cuisine"],
  sdb_italienne: ["italienne", "salle de bain italienne"],
  deux_balcons: ["balcon", "deux balcons"],
  terrasse: ["terrasse"],
  jardin: ["jardin"],
  piscine: ["piscine", "pool"],
  salle_sport: ["salle de sport", "gym"],
  interphone: ["interphone"],
  fibre: ["fibre", "wifi", "internet"],
  lumineux: ["lumineux", "lumineuse"],
  securite_h24: ["securite", "h24", "security"],
  vue_ville: ["vue ville", "city view"],
  vue_mer: ["vue mer", "sea view", "mer"],
};

export type PropertyItem = {
  id: string;
  ref: string;
  title: string;
  type: "Vente" | "Location";
  locationType?: string | null;
  category?: string | null;
  description?: string | null;
  price: string;
  location: string; // examples: "Canastel, Bir El Djir" OR "Oran/Maraval"
  beds: number;
  baths: number;
  area: number;
  createdAt?: string;
  images: string[];
  amenities?: AmenityKey[];
};

export type DbQuartierItem = {
  name: string;
  commune: string | null;
};

type ListingsClientProps = {
  items: PropertyItem[];
  communes?: string[];
  quartiers?: DbQuartierItem[];
  currentUserId?: string | null;
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
    categoryFilter: string;
    allCategories: string;
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
    aiFiltersHint: string;
    aiFamily: string;
    aiRemote: string;
    aiSea: string;
    activeFilters: string;
    allCommunes: string;
    allDistricts: string;
    allRooms: string;
    selectCommuneFirst: string;
    sortRelevance: string;
    sortNewest: string;
    sortPriceAsc: string;
    sortPriceDesc: string;
    sortAreaDesc: string;
    publishedWithin: string;
    anytime: string;
    last7Days: string;
    last30Days: string;
    last90Days: string;
    photosOnly: string;
    quickFilters: string;
    mobileFilters: string;
    mapMode: string;
    listMode: string;
    mapBoundLabel: string;
    mapNoCommune: string;
    saveSearch: string;
    saveSearchTitle: string;
    saveSearchSub: string;
    alertMethod: string;
    alertTarget: string;
    alertPlaceholderEmail: string;
    alertPlaceholderWhatsapp: string;
    saveAction: string;
    cancel: string;
    compare: string;
    compareNow: string;
    compareClear: string;
    compareLimit: string;
    comparePrice: string;
    compareArea: string;
    compareBeds: string;
    compareBaths: string;
    comparePayment: string;
    quickContact: string;
    callNow: string;
    whatsappNow: string;
    scheduleVisit: string;
    emptyTitle: string;
    emptySub: string;
    clearAmenity: string;
    clearBudget: string;
    clearLocation: string;
    breadcrumbsHome: string;
    breadcrumbsListings: string;
  }
> = {
  fr: {
    title: "Nos biens à Oran",
    sub: "Découvrez les meilleures offres de Rostomyia Immobilier.",
    searchPh: "Recherche intelligente: transaction, categorie, pieces, commune, quartier…",
    results: "résultat(s)",
    filters: "Filtres",
    reset: "Réinitialiser",
    sort: "Trier",
    grid: "Grille",
    list: "Liste",
    transactionType: "Type de transaction",
    categoryFilter: "Catégorie",
    allCategories: "Toutes les catégories",
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
    aiFiltersHint: "Presets intelligents: cliquez pour appliquer des combinaisons d'équipements en un geste.",
    aiFamily: "Famille",
    aiRemote: "Télétravail",
    aiSea: "Vue mer",
    activeFilters: "Filtres actifs",
    allCommunes: "Toutes les communes",
    allDistricts: "Tous les quartiers",
    allRooms: "Toutes",
    selectCommuneFirst: "Choisissez une commune d’abord",
    sortRelevance: "Pertinence",
    sortNewest: "Plus récent",
    sortPriceAsc: "Prix ↑",
    sortPriceDesc: "Prix ↓",
    sortAreaDesc: "Surface ↓",
    publishedWithin: "Publication",
    anytime: "N'importe quand",
    last7Days: "7 derniers jours",
    last30Days: "30 derniers jours",
    last90Days: "90 derniers jours",
    photosOnly: "Avec photos uniquement",
    quickFilters: "Filtres rapides",
    mobileFilters: "Filtres",
    mapMode: "Carte",
    listMode: "Liste",
    mapBoundLabel: "Limiter aux zones visibles sur la carte",
    mapNoCommune: "Aucune commune détectée pour la carte.",
    saveSearch: "Enregistrer la recherche",
    saveSearchTitle: "Alerte nouveaux biens",
    saveSearchSub: "Recevez les nouvelles annonces qui matchent ces filtres.",
    alertMethod: "Canal",
    alertTarget: "Email ou WhatsApp",
    alertPlaceholderEmail: "exemple@email.com",
    alertPlaceholderWhatsapp: "+213...",
    saveAction: "Activer l'alerte",
    cancel: "Annuler",
    compare: "Comparer",
    compareNow: "Comparer maintenant",
    compareClear: "Vider",
    compareLimit: "Vous pouvez comparer jusqu'à 3 biens.",
    comparePrice: "Prix",
    compareArea: "Surface",
    compareBeds: "Chambres",
    compareBaths: "SDB",
    comparePayment: "Paiement",
    quickContact: "Contact rapide",
    callNow: "Appeler",
    whatsappNow: "WhatsApp",
    scheduleVisit: "Programmer une visite",
    emptyTitle: "Aucun bien trouvé",
    emptySub: "Essayez d'élargir vos critères pour voir plus d'options.",
    clearAmenity: "Retirer équipements",
    clearBudget: "Retirer budget",
    clearLocation: "Retirer lieu",
    breadcrumbsHome: "Accueil",
    breadcrumbsListings: "Biens",
  },
  ar: {
    title: "عقاراتنا في وهران",
    sub: "تصفح أفضل عروض روستوميا للعقار.",
    searchPh: "بحث ذكي: نوع المعاملة، الفئة، الغرف، البلدية، الحي…",
    results: "نتيجة",
    filters: "الفلاتر",
    reset: "إعادة ضبط",
    sort: "ترتيب",
    grid: "شبكة",
    list: "قائمة",
    transactionType: "نوع المعاملة",
    categoryFilter: "الفئة",
    allCategories: "كل الفئات",
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
    aiFiltersHint: "خيارات ذكية جاهزة: اضغط لتطبيق مجموعات تجهيزات بسرعة.",
    aiFamily: "عائلة",
    aiRemote: "عمل عن بعد",
    aiSea: "إطلالة بحر",
    activeFilters: "الفلاتر النشطة",
    allCommunes: "كل البلديات",
    allDistricts: "كل الأحياء",
    allRooms: "الكل",
    selectCommuneFirst: "اختر البلدية أولاً",
    sortRelevance: "الأكثر صلة",
    sortNewest: "الأحدث",
    sortPriceAsc: "السعر تصاعدي",
    sortPriceDesc: "السعر تنازلي",
    sortAreaDesc: "المساحة تنازلي",
    publishedWithin: "تاريخ النشر",
    anytime: "أي وقت",
    last7Days: "آخر 7 أيام",
    last30Days: "آخر 30 يوم",
    last90Days: "آخر 90 يوم",
    photosOnly: "صور فقط",
    quickFilters: "فلاتر سريعة",
    mobileFilters: "الفلاتر",
    mapMode: "خريطة",
    listMode: "قائمة",
    mapBoundLabel: "حصر النتائج ضمن حدود الخريطة",
    mapNoCommune: "لا توجد بلديات متاحة للخريطة.",
    saveSearch: "حفظ البحث",
    saveSearchTitle: "تنبيه عقارات جديدة",
    saveSearchSub: "سنرسل لك الإعلانات المطابقة لهذه المعايير.",
    alertMethod: "القناة",
    alertTarget: "البريد أو واتساب",
    alertPlaceholderEmail: "example@email.com",
    alertPlaceholderWhatsapp: "+213...",
    saveAction: "تفعيل التنبيه",
    cancel: "إلغاء",
    compare: "مقارنة",
    compareNow: "ابدأ المقارنة",
    compareClear: "مسح",
    compareLimit: "يمكنك مقارنة حتى 3 عقارات.",
    comparePrice: "السعر",
    compareArea: "المساحة",
    compareBeds: "الغرف",
    compareBaths: "الحمامات",
    comparePayment: "الدفع",
    quickContact: "تواصل سريع",
    callNow: "اتصال",
    whatsappNow: "واتساب",
    scheduleVisit: "حجز زيارة",
    emptyTitle: "لا توجد نتائج",
    emptySub: "وسع الفلاتر قليلاً لعرض خيارات أكثر.",
    clearAmenity: "إزالة التجهيزات",
    clearBudget: "إزالة الميزانية",
    clearLocation: "إزالة الموقع",
    breadcrumbsHome: "الرئيسية",
    breadcrumbsListings: "العقارات",
  },
};

type AiPresetSource = "curated" | "generated" | "custom";

type AiPreset = {
  key: string;
  icon: string;
  label: string;
  amenities: AmenityKey[];
  source: AiPresetSource;
  generated?: boolean;
};

type AiPresetStats = {
  clicks: number;
  contacts: number;
  saves: number;
  lastUsedAt?: string;
};

const AI_STATS_STORAGE_KEY = "rostomyia_ai_preset_stats_v1";
const AI_CUSTOM_STORAGE_KEY = "rostomyia_ai_custom_presets_v1";
const AI_MAX_CUSTOM_PRESETS = 12;
const SEARCH_METRICS_STORAGE_KEY = "rostomyia_search_metrics_v1";
const SEARCH_BEHAVIOR_STORAGE_KEY = "rostomyia_search_behavior_v1";
const BEHAVIOR_EVENTS_ENABLED = process.env.NEXT_PUBLIC_BEHAVIOR_EVENTS_ENABLED === "true";
const SEMANTIC_SEARCH_ENABLED = process.env.NEXT_PUBLIC_SEMANTIC_SEARCH_ENABLED === "true";
const FAVORITES_STORAGE_KEYS = [
  "rostomyia_favorites",
  "rostomyia_favorite_properties",
  "rostomyia_favorite_refs",
] as const;
const DEFAULT_FAVORITES_STORAGE_KEY = String(FAVORITES_STORAGE_KEYS[0]);

type SearchMetricsState = {
  queries: number;
  zeroResults: number;
  suggestionClicks: number;
  contactsFromSearch: number;
  lastUpdatedAt?: string;
};

type SearchBehaviorState = {
  views: Record<string, number>;
  favorites: Record<string, number>;
  contacts: Record<string, number>;
  recentQueries: string[];
  updatedAt?: string;
};

const DEFAULT_SEARCH_METRICS: SearchMetricsState = {
  queries: 0,
  zeroResults: 0,
  suggestionClicks: 0,
  contactsFromSearch: 0,
};

const DEFAULT_SEARCH_BEHAVIOR: SearchBehaviorState = {
  views: {},
  favorites: {},
  contacts: {},
  recentQueries: [],
};

type FavoriteStorageItem = {
  ref: string;
  title: string | null;
  location: string | null;
  price: string | null;
  coverImage: string | null;
};

function amenityLabel(key: AmenityKey): string {
  return AMENITY_OPTIONS.find((x) => x.key === key)?.label ?? key.replaceAll("_", " ");
}

function serializeAmenities(amenities: AmenityKey[]): string {
  return [...amenities].sort().join("|");
}

function combinationsOf(amenities: AmenityKey[], size: number): AmenityKey[][] {
  const out: AmenityKey[][] = [];
  const arr = Array.from(new Set(amenities));
  if (arr.length < size) return out;

  const recur = (start: number, path: AmenityKey[]) => {
    if (path.length === size) {
      out.push([...path]);
      return;
    }
    for (let i = start; i < arr.length; i += 1) {
      path.push(arr[i]);
      recur(i + 1, path);
      path.pop();
    }
  };

  recur(0, []);
  return out;
}

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function stableCoverImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim();
  const marker = "/storage/v1/render/image/public/property-images/";
  if (!raw.includes(marker)) return raw;
  const withoutQuery = raw.split("?")[0];
  return withoutQuery.replace(marker, "/storage/v1/object/public/property-images/");
}

function normalizeFavoriteRows(source: unknown[]): FavoriteStorageItem[] {
  const rows: FavoriteStorageItem[] = [];

  source.forEach((entry) => {
    if (typeof entry === "string" && entry.trim()) {
      rows.push({
        ref: entry.trim(),
        title: null,
        location: null,
        price: null,
        coverImage: null,
      });
      return;
    }

    if (!entry || typeof entry !== "object") return;
    const row = entry as Record<string, unknown>;
    const refCandidate =
      typeof row.ref === "string" && row.ref.trim()
        ? row.ref.trim()
        : typeof row.id === "string" && row.id.trim()
          ? row.id.trim()
          : "";
    if (!refCandidate) return;

    rows.push({
      ref: refCandidate,
      title: typeof row.title === "string" ? row.title.trim() : null,
      location: typeof row.location === "string" ? row.location.trim() : null,
      price: typeof row.price === "string" ? row.price.trim() : null,
      coverImage:
        stableCoverImageUrl(
          typeof row.coverImage === "string" && row.coverImage.trim()
            ? row.coverImage
            : typeof row.image === "string" && row.image.trim()
              ? row.image
              : typeof row.imageUrl === "string" && row.imageUrl.trim()
                ? row.imageUrl
                : null
        ),
    });
  });

  const seen = new Set<string>();
  return rows.filter((item) => {
    const key = normalizeText(item.ref);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

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

function normalizeDisplayText(value: string | null | undefined): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeStoredLocationType(value: string | null | undefined): DealType | null {
  const normalized = normalizeText(value || "");
  if (!normalized) return null;

  if (normalized.includes("vente") || normalized.includes("sale")) return "Vente";
  if (
    normalized.includes("par_nuit") ||
    normalized.includes("par nuit") ||
    normalized.includes("par nuite") ||
    normalized.includes("night")
  ) {
    return "par_nuit";
  }
  if (
    normalized.includes("court_sejour") ||
    normalized.includes("court sejour") ||
    normalized.includes("short stay") ||
    normalized.includes("vacance") ||
    normalized.includes("weekend")
  ) {
    return "court_sejour";
  }
  if (
    normalized.includes("douze_mois") ||
    normalized.includes("douze mois") ||
    normalized.includes("12 mois") ||
    normalized.includes("12mois") ||
    normalized.includes("annuel") ||
    normalized.includes("year")
  ) {
    return "douze_mois";
  }
  if (
    normalized.includes("six_mois") ||
    normalized.includes("six mois") ||
    normalized.includes("6 mois") ||
    normalized.includes("6mois")
  ) {
    return "six_mois";
  }
  if (
    normalized.includes("par_mois") ||
    normalized.includes("par mois") ||
    normalized.includes("mensuel") ||
    normalized.includes("monthly")
  ) {
    return "par_mois";
  }
  if (
    normalized.includes("location") ||
    normalized.includes("louer") ||
    normalized.includes("rent") ||
    normalized.includes("rental") ||
    normalized.includes("lease") ||
    normalized.includes("كراء") ||
    normalized.includes("ايجار")
  ) {
    return "Location";
  }

  const fromSuggestion = TRANSACTION_SUGGESTIONS.find((entry) =>
    entry.terms.some((term) => normalized.includes(normalizeText(term)))
  );
  return fromSuggestion?.dealType ?? null;
}

type CommuneMatcher = {
  raw: string;
  norm: string;
};

const ORAN_COMMUNES_NORM: CommuneMatcher[] = ORAN_COMMUNES.map((c) => ({
  raw: c,
  norm: normalizeText(c),
}));

function smartParseLocation(
  location: string,
  communeMatchers: readonly CommuneMatcher[] = ORAN_COMMUNES_NORM
): { commune: string; district: string } {
  // Supports:
  // - "Canastel, Bir El Djir" (district first, commune second)
  // - "Oran/Maraval" (commune first, district second)
  // - "Maraval - Oran" (district first, commune second)
  // - "Bir El Djir - Canastel - Residence X" (commune, quartier, detail)
  // - "Oran · Canastel" (older separator variant)
  const parts = (location || "")
    .split(/[-,|/·•–—]/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return { commune: "", district: "" };
  if (parts.length === 1) {
    // If single token matches a commune, treat it as commune, no district.
    const n = normalizeText(parts[0]);
    const found = communeMatchers.find((c) => c.norm === n);
    return found ? { commune: found.raw, district: "" } : { commune: "", district: parts[0] };
  }

  // Find which part is a commune (match against the official list)
  const idx = parts.findIndex((p) =>
    communeMatchers.some((c) => c.norm === normalizeText(p))
  );

  if (idx >= 0) {
    const commune = communeMatchers.find((c) => c.norm === normalizeText(parts[idx]))!.raw;
    // Keep only the first non-commune token as district (quartier),
    // ignore trailing address details.
    const district =
      parts.find(
        (part, partIndex) =>
          partIndex !== idx &&
          !communeMatchers.some((communeItem) => communeItem.norm === normalizeText(part))
      ) ??
      parts.find((_, partIndex) => partIndex !== idx) ??
      "";
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

type RoomQueryInfo = {
  raw: string;
  family: "t" | "f" | "studio";
  pieces: number | null;
  plus: boolean;
};

function parseRoomQueryToken(value: string | null | undefined): RoomQueryInfo | null {
  const normalized = normalizeText(value ?? "");
  if (!normalized) return null;
  if (normalized === "studio") {
    return { raw: "Studio", family: "studio", pieces: 1, plus: false };
  }

  const tokenMatch = normalized.match(/^([tf])\s*([1-9])(\+)?$/);
  if (tokenMatch) {
    return {
      raw: `${tokenMatch[1].toUpperCase()}${tokenMatch[2]}${tokenMatch[3] ?? ""}`,
      family: tokenMatch[1] as "t" | "f",
      pieces: Number(tokenMatch[2]),
      plus: tokenMatch[3] === "+",
    };
  }

  const piecesMatch = normalized.match(/\b([1-9])\s*(piece|pieces|pi[eè]ce|pi[eè]ces|room|rooms)\b/);
  if (piecesMatch) {
    const pieces = Number(piecesMatch[1]);
    return {
      raw: `F${pieces}`,
      family: "f",
      pieces,
      plus: false,
    };
  }

  return null;
}

function roomMatchesProperty(property: PropertyItem, roomQuery: string, searchableText: string): boolean {
  const roomNorm = normalizeText(roomQuery);
  if (!roomNorm) return true;
  if (searchableText.includes(roomNorm)) return true;

  const parsed = parseRoomQueryToken(roomQuery);
  if (!parsed) return false;

  const beds = Number(property.beds ?? 0);
  if (parsed.family === "studio") {
    if (searchableText.includes("studio")) return true;
    return beds > 0 ? beds <= 1 : false;
  }

  const pieces = Number(parsed.pieces ?? 0);
  if (!Number.isFinite(pieces) || pieces <= 0 || beds <= 0) return false;

  const expectedBeds = Math.max(1, pieces - 1);
  if (parsed.plus) return beds >= expectedBeds;
  return beds === expectedBeds || beds === pieces;
}

function getTokenVariants(token: string): string[] {
  const norm = normalizeText(token);
  if (!norm) return [];

  const compact = norm.replace(/[\s-]+/g, "");
  const aliases = SEARCH_ALIAS_MAP[norm] ?? [];
  const aliasCompacts = aliases.map((value) => normalizeText(value).replace(/[\s-]+/g, ""));
  return Array.from(new Set([norm, compact, ...aliases.map(normalizeText), ...aliasCompacts]));
}

function levenshteinDistanceWithin(a: string, b: string, maxDistance: number): number {
  if (a === b) return 0;
  const lenA = a.length;
  const lenB = b.length;
  if (Math.abs(lenA - lenB) > maxDistance) return maxDistance + 1;
  if (!lenA || !lenB) return Math.max(lenA, lenB);

  let previous = Array.from({ length: lenB + 1 }, (_, i) => i);
  for (let i = 1; i <= lenA; i += 1) {
    const current = [i];
    let rowMin = current[0];
    for (let j = 1; j <= lenB; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost
      );
      current[j] = value;
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > maxDistance) return maxDistance + 1;
    previous = current;
  }
  return previous[lenB];
}

function tokenMatchesListingText(hay: string, token: string): boolean {
  if (!token) return false;
  const variants = getTokenVariants(token);
  if (variants.some((variant) => hay.includes(variant))) return true;

  const compactHay = hay.replace(/[\s-]+/g, "");
  if (variants.some((variant) => compactHay.includes(variant.replace(/[\s-]+/g, "")))) return true;

  const plain = normalizeText(token);
  if (plain.length < 4) return false;

  const words = hay.split(" ").filter(Boolean);
  const maxDistance = plain.length >= 8 ? 2 : 1;
  for (const word of words) {
    if (Math.abs(word.length - plain.length) > maxDistance) continue;
    if (levenshteinDistanceWithin(word, plain, maxDistance) <= maxDistance) return true;
  }
  return false;
}

function findNegatedAmenities(query: string): Set<AmenityKey> {
  const qNorm = normalizeText(query);
  if (!qNorm) return new Set<AmenityKey>();

  const found = new Set<AmenityKey>();
  (Object.entries(AMENITY_NEGATION_TERMS) as Array<[AmenityKey, string[]]>).forEach(
    ([amenityKey, terms]) => {
      const hasNegation = terms.some((term) =>
        SEARCH_NEGATION_PREFIXES.some((prefix) =>
          qNorm.includes(`${normalizeText(prefix)} ${normalizeText(term)}`)
        )
      );
      if (hasNegation) found.add(amenityKey);
    }
  );
  return found;
}

function expandSemanticTokens(tokens: string[]): string[] {
  const expanded = new Set<string>();
  tokens.forEach((token) => {
    getTokenVariants(token).forEach((variant) => {
      if (variant) expanded.add(variant);
    });
  });
  return Array.from(expanded);
}

function normalizeRef(ref: string): string {
  return normalizeText(ref || "");
}

function inferListingCategories(item: Pick<PropertyItem, "title" | "category">): string[] {
  const text = normalizeText(`${item.title} ${item.category ?? ""}`);
  if (!text) return [];

  const found = CATEGORY_SUGGESTIONS.filter((category) =>
    category.terms.some((term) => text.includes(normalizeText(term)))
  ).map((category) => category.label);

  return Array.from(new Set(found));
}

function inferPrimaryCategory(item: Pick<PropertyItem, "title" | "category">): string {
  const explicit = normalizeDisplayText(item.category ?? "");
  if (explicit) return explicit;
  return inferListingCategories(item)[0] ?? "";
}

function inferRoomLabelForSuggestion(item: Pick<PropertyItem, "title" | "beds">): string {
  const title = normalizeDisplayText(item.title ?? "");
  const fromTitle = title.match(/\b([TF]\s*[1-9]\+?|Studio)\b/i)?.[1];
  if (fromTitle) {
    const compact = fromTitle.replace(/\s+/g, "");
    return compact.toLowerCase() === "studio" ? "Studio" : compact.toUpperCase();
  }

  const beds = Number(item.beds ?? 0);
  if (Number.isFinite(beds) && beds > 0) {
    const pieces = beds + 1;
    if (pieces >= 6) return "F6+";
    return `F${pieces}`;
  }

  return "";
}

function inferCategoryContext(query: string, explicitCategory?: string): string {
  const explicit = normalizeDisplayText(explicitCategory ?? "");
  if (explicit) return explicit;

  const qNorm = normalizeText(query);
  if (!qNorm) return "";
  const matched = CATEGORY_SUGGESTIONS.find((category) =>
    category.terms.some((term) => qNorm.includes(normalizeText(term)))
  );
  return matched?.label ?? "";
}

function categorySupportsRoomSuggestions(categoryText: string): boolean {
  const n = normalizeText(categoryText);
  if (!n) return true;

  const nonRoomTerms = [
    "terrain",
    "lot",
    "parcelle",
    "land",
    "local",
    "commercial",
    "commerce",
    "shop",
    "boutique",
    "magasin",
    "bureau",
    "office",
    "ارض",
    "محل",
    "مكتب",
  ];
  if (nonRoomTerms.some((term) => n.includes(normalizeText(term)))) return false;

  return true;
}

function categoryAwareRoomOptions(categoryContext: string): string[] {
  const rooms = ROOMS_OPTIONS.filter(Boolean) as string[];
  if (!categoryContext) return rooms;
  if (!categorySupportsRoomSuggestions(categoryContext)) return [];

  const n = normalizeText(categoryContext);
  const studio = rooms.filter((room) => normalizeText(room) === "studio");
  const fRooms = rooms.filter((room) => normalizeText(room).startsWith("f"));
  const tRooms = rooms.filter((room) => normalizeText(room).startsWith("t"));

  if (["appartement", "appart", "apartment", "studio", "شقة"].some((term) => n.includes(normalizeText(term)))) {
    return [...studio, ...fRooms, ...tRooms];
  }
  if (["villa", "maison", "house", "فيلا"].some((term) => n.includes(normalizeText(term)))) {
    return [...tRooms, ...fRooms, ...studio];
  }
  return rooms;
}

function buildSearchableListingText(
  item: PropertyItem,
  communeMatchers: readonly CommuneMatcher[] = ORAN_COMMUNES_NORM
): string {
  const parsed = smartParseLocation(item.location, communeMatchers);
  const categories = inferListingCategories(item);
  const amenityLabels = (item.amenities ?? []).flatMap((key) => {
    const label = AMENITY_OPTIONS.find((a) => a.key === key)?.label;
    return label ? [label] : [];
  });

  const normalizedLocationType = normalizeStoredLocationType(item.locationType);
  const effectiveDealType = normalizedLocationType ?? item.type;
  const transactionTerms = (
    TRANSACTION_SUGGESTIONS.find((entry) => entry.dealType === effectiveDealType)?.terms ?? []
  ).join(" ");
  const transactionLabel = effectiveDealType === "Vente" ? "Vente" : effectiveDealType;

  return normalizeText(
    [
      item.title,
      item.category ?? "",
      item.description ?? "",
      item.type,
      item.locationType ?? "",
      item.price,
      item.location,
      parsed.commune,
      parsed.district,
      categories.join(" "),
      transactionLabel,
      transactionTerms,
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
  category: string;
  publishedWithin: PublishedWithin;
  withPhotosOnly: boolean;

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
  excludedAmenities: Set<AmenityKey>;

  view: ViewMode;
  sort: SortMode;
};

type SearchSuggestionType =
  | "smart_query"
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
  matchCount: number;
  dealType?: Filters["dealType"];
  category?: string;
  commune?: string;
  district?: string;
  room?: string;
  amenity?: AmenityKey;
};

type SemanticApiPayload = {
  enabled?: boolean;
  reason?: string;
  results?: Array<{ ref?: string; score?: number }>;
};

type BackgroundRecommendation = {
  ref: string;
  score: number;
  rank: number;
  reason: string;
};

type BehaviorEventType = "view" | "favorite" | "contact" | "search_click";

type BackgroundRecommendationApiPayload = {
  ok?: boolean;
  source?: string;
  recommendations?: Array<{
    ref?: string;
    score?: number;
    reason?: string;
    rank?: number;
    generatedAt?: string | null;
  }>;
};

type RecoveryAction = {
  key: string;
  label: string;
  hint: string;
  apply: (current: Filters) => Filters;
};

const SEARCH_SUGGESTION_LABELS: Record<
  Lang,
  Record<SearchSuggestionType, string>
> = {
  fr: {
    smart_query: "Recherche intelligente",
    commune: "Commune",
    district: "Quartier",
    room: "Pièces",
    amenity: "Équipement",
    transaction: "Type",
    category: "Catégorie",
  },
  ar: {
    smart_query: "بحث ذكي",
    commune: "بلدية",
    district: "حي",
    room: "غرف",
    amenity: "تجهيز",
    transaction: "معاملة",
    category: "فئة",
  },
};

function suggestionHint(suggestion: SearchSuggestion, lang: Lang): string {
  if (suggestion.type === "smart_query") {
    return lang === "ar" ? "اقتراح مبني على بيانات العقارات" : "Suggestion basee sur les biens";
  }
  if (suggestion.type === "district" && suggestion.commune) {
    return lang === "ar" ? `بلدية: ${suggestion.commune}` : `Commune: ${suggestion.commune}`;
  }
  if (suggestion.type === "transaction") {
    return "";
  }
  if (suggestion.type === "commune") {
    return lang === "ar" ? "فلترة حسب البلدية" : "Filtrer par commune";
  }
  if (suggestion.type === "category") {
    return lang === "ar" ? "نوع العقار" : "Type de bien";
  }
  if (suggestion.type === "room") {
    return lang === "ar" ? "عدد الغرف" : "Nombre de pieces";
  }
  if (suggestion.type === "amenity") {
    return lang === "ar" ? "تجهيزات مميزة" : "Equipement distinctif";
  }
  return lang === "ar" ? "نوع المعاملة" : "Type de transaction";
}

function suggestionIcon(suggestion: SearchSuggestion) {
  if (suggestion.type === "smart_query") return <Sparkles size={14} />;
  if (suggestion.type === "commune" || suggestion.type === "district") return <MapPin size={14} />;
  if (suggestion.type === "amenity") return <Shield size={14} />;
  if (suggestion.type === "transaction") return <Zap size={14} />;
  return <Building2 size={14} />;
}

export default function ListingsClient({
  items,
  communes = [],
  quartiers = [],
  currentUserId = null,
}: ListingsClientProps) {
  const searchParams = useSearchParams();
  const { lang, dir } = useLang();
  const t = dict[lang];
  const smartSearchExamples = useMemo(
    () =>
      lang === "ar"
        ? [
            "بيع شقة F4 بير الجير كاناستيل",
            "كراء فيلا T5 وهران حاسي بن عقبة",
            "كراء / بالشهر شقة T3 السانية",
            "بيع أرض وهران",
          ]
        : [
            "Vente Appartement F4 Bir El Djir Canastel",
            "Location Villa T5 Oran Hassi Ben Okba",
            "Location / par mois Appartement T3 Es Senia",
            "Vente Terrain Oran",
          ],
    [lang]
  );
  const communeOptions = useMemo(() => {
    const byNorm = new Map<string, string>();
    const source = communes.length > 0 ? communes : [...ORAN_COMMUNES];
    source.forEach((value) => {
      const clean = normalizeDisplayText(value);
      const norm = normalizeText(clean);
      if (!clean || !norm || byNorm.has(norm)) return;
      byNorm.set(norm, clean);
    });

    if (!byNorm.size) {
      ORAN_COMMUNES.forEach((commune) => byNorm.set(normalizeText(commune), commune));
    }

    return Array.from(byNorm.values()).sort((a, b) =>
      a.localeCompare(b, "fr", { sensitivity: "base" })
    );
  }, [communes]);

  const communeMatchers = useMemo<CommuneMatcher[]>(
    () => communeOptions.map((commune) => ({ raw: commune, norm: normalizeText(commune) })),
    [communeOptions]
  );

  const quartiersCatalog = useMemo(() => {
    const communeByNorm = new Map<string, string>(
      communeMatchers.map((item) => [item.norm, item.raw])
    );
    const byKey = new Map<string, { name: string; commune: string }>();

    quartiers.forEach((row) => {
      const district = normalizeDisplayText(row.name);
      const rawCommune = normalizeDisplayText(row.commune);
      if (!district || !rawCommune) return;

      const normalizedCommune = normalizeText(rawCommune);
      const commune = communeByNorm.get(normalizedCommune) ?? rawCommune;
      const key = `${normalizeText(commune)}|${normalizeText(district)}`;
      if (byKey.has(key)) return;
      byKey.set(key, { name: district, commune });
    });

    return Array.from(byKey.values()).sort((a, b) => {
      const byCommune = a.commune.localeCompare(b.commune, "fr", { sensitivity: "base" });
      if (byCommune !== 0) return byCommune;
      return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
    });
  }, [quartiers, communeMatchers]);

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

  const sortOptions = useMemo<Array<{ value: SortMode; label: string }>>(
    () => [
      { value: "relevance", label: t.sortRelevance },
      { value: "newest", label: t.sortNewest },
      { value: "price_asc", label: t.sortPriceAsc },
      { value: "price_desc", label: t.sortPriceDesc },
      { value: "area_desc", label: t.sortAreaDesc },
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
    category: "",
    publishedWithin: "all",
    withPhotosOnly: false,
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
    excludedAmenities: new Set<AmenityKey>(),
    view: "grid",
    sort: "relevance",
  });
  const hasAppliedQueryFilters = useRef(false);

  const [amenitySearch, setAmenitySearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchActiveIndex, setSearchActiveIndex] = useState(-1);
  const [displayMode] = useState<DisplayMode>("cards");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mapBoundsOnly, setMapBoundsOnly] = useState(false);
  const [mapCommuneBounds, setMapCommuneBounds] = useState<string[]>([]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [alertChannel, setAlertChannel] = useState<AlertChannel>("email");
  const [alertTarget, setAlertTarget] = useState("");
  const [compareRefs, setCompareRefs] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [quickContactRef, setQuickContactRef] = useState<string | null>(null);
  const [favoriteRefs, setFavoriteRefs] = useState<Set<string>>(new Set());
  const [favoritesStorageKey, setFavoritesStorageKey] = useState<string>(DEFAULT_FAVORITES_STORAGE_KEY);
  const [aiPresetStats, setAiPresetStats] = useState<Record<string, AiPresetStats>>({});
  const [customAiPresets, setCustomAiPresets] = useState<AiPreset[]>([]);
  const [customAiPresetName, setCustomAiPresetName] = useState("");
  const [aiTrendNow, setAiTrendNow] = useState(0);
  const [filterNowTs] = useState(() => Date.now());
  const [aiStorageReady, setAiStorageReady] = useState(false);
  const [searchMetrics, setSearchMetrics] = useState<SearchMetricsState>(DEFAULT_SEARCH_METRICS);
  const [searchBehavior, setSearchBehavior] = useState<SearchBehaviorState>(DEFAULT_SEARCH_BEHAVIOR);
  const [searchStatsReady, setSearchStatsReady] = useState(false);
  const [semanticRefScores, setSemanticRefScores] = useState<Record<string, number>>({});
  const [semanticPending, setSemanticPending] = useState(false);
  const [semanticEnabled, setSemanticEnabled] = useState(false);
  const [semanticReason, setSemanticReason] = useState<string>("");
  const [backgroundRecommendations, setBackgroundRecommendations] = useState<BackgroundRecommendation[]>([]);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const lastTrackedQueryRef = useRef("");
  const zeroResultQueryRef = useRef("");
  const [searchPanelRect, setSearchPanelRect] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);
  const activeSortLabel = useMemo(
    () => sortOptions.find((option) => option.value === filters.sort)?.label ?? t.sortRelevance,
    [filters.sort, sortOptions, t.sortRelevance]
  );
  const overlayFadeTransition = { duration: 0.16, ease: [0.22, 1, 0.36, 1] as const };
  const modalPopTransition = { type: "spring" as const, stiffness: 340, damping: 30, mass: 0.84 };
  const sheetPopTransition = { type: "spring" as const, stiffness: 320, damping: 28, mass: 0.9 };

  const toBehaviorPayload = (property: PropertyItem) => {
    const parsed = smartParseLocation(property.location, communeMatchers);
    return {
      title: property.title,
      category: property.category ?? "",
      commune: parsed.commune ?? "",
      district: parsed.district ?? "",
      dealType: normalizeStoredLocationType(property.locationType) ?? property.type,
      amenities: property.amenities ?? [],
      price: property.price,
    };
  };

  const postBehaviorEvent = (
    eventType: BehaviorEventType,
    options?: {
      propertyRef?: string;
      payload?: Record<string, unknown>;
    }
  ) => {
    if (!BEHAVIOR_EVENTS_ENABLED) return;
    if (!currentUserId) return;
    void fetch("/api/behavior/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventType,
        propertyRef: options?.propertyRef ?? "",
        payload: options?.payload ?? {},
      }),
    }).catch(() => undefined);
  };

  const bumpSearchMetric = (
    key: keyof Omit<SearchMetricsState, "lastUpdatedAt">,
    delta = 1
  ) => {
    setSearchMetrics((prev) => ({
      ...prev,
      [key]: Math.max(0, (prev[key] ?? 0) + delta),
      lastUpdatedAt: new Date().toISOString(),
    }));
  };

  const recordBehaviorRef = (
    bucket: "views" | "favorites" | "contacts",
    propertyRef: string,
    delta = 1
  ) => {
    const normRef = normalizeRef(propertyRef);
    if (!normRef) return;
    setSearchBehavior((prev) => {
      const nextBucket = { ...(prev[bucket] ?? {}) };
      nextBucket[normRef] = Math.max(0, (nextBucket[normRef] ?? 0) + delta);
      if (nextBucket[normRef] === 0) delete nextBucket[normRef];
      return {
        ...prev,
        [bucket]: nextBucket,
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const recordRecentQuery = (query: string) => {
    const qNorm = normalizeText(query);
    if (!qNorm) return;
    setSearchBehavior((prev) => {
      const nextQueries = [qNorm, ...prev.recentQueries.filter((entry) => entry !== qNorm)].slice(0, 18);
      return {
        ...prev,
        recentQueries: nextQueries,
        updatedAt: new Date().toISOString(),
      };
    });
  };

  useEffect(() => {
    if (!mobileFiltersOpen) return;
    if (window.innerWidth >= 768) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileFiltersOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileFiltersOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileFiltersOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileFiltersOpen]);

  useEffect(() => {
    if (!searchOpen) return;

    const updatePanelRect = () => {
      const container = searchContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setSearchPanelRect({
        left: rect.left,
        top: rect.bottom + 8,
        width: rect.width,
      });
    };

    updatePanelRect();
    window.addEventListener("resize", updatePanelRect);
    window.addEventListener("scroll", updatePanelRect, true);
    return () => {
      window.removeEventListener("resize", updatePanelRect);
      window.removeEventListener("scroll", updatePanelRect, true);
    };
  }, [searchOpen, filters.q]);

  useEffect(() => {
    if (hasAppliedQueryFilters.current) return;
    hasAppliedQueryFilters.current = true;

    const getNumberParam = (key: string) => {
      const raw = (searchParams.get(key) ?? "").trim();
      if (!raw) return "";
      const digits = raw.replace(/[^\d]/g, "");
      return digits || "";
    };

    const q = (searchParams.get("q") ?? "").trim();
    const category = (searchParams.get("category") ?? "").trim();
    const commune = (searchParams.get("commune") ?? "").trim();
    const resolvedCommune =
      communeMatchers.find((item) => item.norm === normalizeText(commune))?.raw ?? commune;
    const district = (searchParams.get("district") ?? "").trim();
    const rooms = (searchParams.get("rooms") ?? "").trim();
    const rawDealType =
      (searchParams.get("dealType") ?? searchParams.get("transaction") ?? "").trim() as DealType | "";
    const allowedDealTypes: DealType[] = [
      "Tous",
      "Vente",
      "Location",
      "par_mois",
      "six_mois",
      "douze_mois",
      "par_nuit",
      "court_sejour",
    ];
    const dealType: DealType = allowedDealTypes.includes(rawDealType as DealType)
      ? (rawDealType as DealType)
      : "Tous";

    const priceMin = getNumberParam("priceMin");
    const priceMax = getNumberParam("priceMax");
    const areaMin = getNumberParam("areaMin");
    const areaMax = getNumberParam("areaMax");

    const hasAny =
      Boolean(q) ||
      Boolean(category) ||
      Boolean(resolvedCommune) ||
      Boolean(district) ||
      Boolean(rooms) ||
      Boolean(priceMin) ||
      Boolean(priceMax) ||
      Boolean(areaMin) ||
      Boolean(areaMax) ||
      dealType !== "Tous";

    if (!hasAny) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilters((f) => ({
      ...f,
      q,
      dealType,
      category,
      commune: resolvedCommune,
      district,
      rooms,
      priceMin,
      priceMax,
      areaMin,
      areaMax,
      sort: "relevance",
    }));
  }, [searchParams, communeMatchers]);

  useEffect(() => {
    let selectedKey = DEFAULT_FAVORITES_STORAGE_KEY;
    let selectedRows: FavoriteStorageItem[] = [];

    for (const key of FAVORITES_STORAGE_KEYS) {
      const rows = normalizeFavoriteRows(safeJsonParse<unknown[]>(localStorage.getItem(key), []));
      if (rows.length > 0) {
        selectedKey = key;
        selectedRows = rows;
        break;
      }
    }

    setFavoritesStorageKey(selectedKey);
    setFavoriteRefs(new Set(selectedRows.map((row) => normalizeText(row.ref))));
  }, []);

  useEffect(() => {
    const storedMetrics = safeJsonParse<SearchMetricsState>(
      localStorage.getItem(SEARCH_METRICS_STORAGE_KEY),
      DEFAULT_SEARCH_METRICS
    );
    const storedBehavior = safeJsonParse<SearchBehaviorState>(
      localStorage.getItem(SEARCH_BEHAVIOR_STORAGE_KEY),
      DEFAULT_SEARCH_BEHAVIOR
    );

    setSearchMetrics({
      queries: Math.max(0, Number(storedMetrics.queries ?? 0)),
      zeroResults: Math.max(0, Number(storedMetrics.zeroResults ?? 0)),
      suggestionClicks: Math.max(0, Number(storedMetrics.suggestionClicks ?? 0)),
      contactsFromSearch: Math.max(0, Number(storedMetrics.contactsFromSearch ?? 0)),
      lastUpdatedAt: storedMetrics.lastUpdatedAt,
    });
    setSearchBehavior({
      views: storedBehavior.views ?? {},
      favorites: storedBehavior.favorites ?? {},
      contacts: storedBehavior.contacts ?? {},
      recentQueries: Array.isArray(storedBehavior.recentQueries) ? storedBehavior.recentQueries.slice(0, 18) : [],
      updatedAt: storedBehavior.updatedAt,
    });
    setSearchStatsReady(true);
  }, []);

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

    quartiersCatalog.forEach((entry) => {
      getLocationAliases(entry.name).forEach((alias) => {
        addHint(alias, entry.commune, entry.name);
      });
    });

    items.forEach((item) => {
      const parsed = smartParseLocation(item.location, communeMatchers);
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
  }, [items, quartiersCatalog, communeMatchers]);

  const searchSuggestions = useMemo(() => {
    const qNorm = normalizeText(filters.q);
    if (!qNorm) return [] as SearchSuggestion[];
    const qTokens = tokenizeSearchQuery(filters.q);
    const categoryContext = inferCategoryContext(filters.q, filters.category);
    const roomOptionsForSuggestions = categoryAwareRoomOptions(categoryContext);

    const dynamicCategoryLabels = Array.from(
      new Set(
        items
          .flatMap((item) => [...inferListingCategories(item), normalizeDisplayText(item.category ?? "")])
          .filter(Boolean)
      )
    );
    const categoryOptions = Array.from(
      new Set([...CATEGORY_SUGGESTIONS.map((entry) => entry.label), ...dynamicCategoryLabels])
    );
    const smartQueryProfiles = (() => {
      const byKey = new Map<string, { label: string; searchText: string; matchCount: number }>();

      const upsertPhrase = (parts: string[], searchTokens: string[]) => {
        const cleanParts = parts.map((part) => normalizeDisplayText(part)).filter(Boolean);
        if (cleanParts.length < 2) return;
        const label = cleanParts.join(" ");
        const key = normalizeText(label);
        if (!key) return;

        const searchText = normalizeDisplayText([label, ...searchTokens].filter(Boolean).join(" "));
        const existing = byKey.get(key);
        if (existing) {
          existing.matchCount += 1;
          return;
        }
        byKey.set(key, { label, searchText, matchCount: 1 });
      };

      items.forEach((item) => {
        const parsed = smartParseLocation(item.location, communeMatchers);
        const dealType = normalizeStoredLocationType(item.locationType) ?? item.type;
        const dealLabel = dealType ? dealTypeLabelMap.get(dealType as DealType) ?? String(dealType) : "";
        const category = inferPrimaryCategory(item);
        const room = inferRoomLabelForSuggestion(item);
        const district = normalizeDisplayText(parsed.district);
        const commune = normalizeDisplayText(parsed.commune);

        const baseTokens = [dealLabel, category, room, district, commune];
        upsertPhrase(baseTokens, [
          ...baseTokens,
          ...getLocationAliases(district),
          ...getLocationAliases(commune),
        ]);

        upsertPhrase([dealLabel, category, room, commune], [
          dealLabel,
          category,
          room,
          commune,
          ...getLocationAliases(commune),
        ]);
      });

      return Array.from(byKey.values()).sort(
        (a, b) => b.matchCount - a.matchCount || a.label.localeCompare(b.label, "fr", { sensitivity: "base" })
      );
    })();

    const countMatches = (suggestion: Omit<SearchSuggestion, "matchCount">) => {
      if (suggestion.type === "smart_query") {
        return 1;
      }
      if (suggestion.type === "transaction" && suggestion.dealType) {
        return items.reduce((count, item) => {
          const effectiveDealType = normalizeStoredLocationType(item.locationType) ?? item.type;
          if (suggestion.dealType === "Vente") return effectiveDealType === "Vente" ? count + 1 : count;
          if (suggestion.dealType === "Location") return effectiveDealType !== "Vente" ? count + 1 : count;
          return effectiveDealType === suggestion.dealType ? count + 1 : count;
        }, 0);
      }
      if (suggestion.type === "category" && suggestion.category) {
        const categoryNorm = normalizeText(suggestion.category);
        return items.reduce((count, item) => {
          const hay = buildSearchableListingText(item, communeMatchers);
          return hay.includes(categoryNorm) ? count + 1 : count;
        }, 0);
      }
      if (suggestion.type === "commune" && suggestion.commune) {
        const communeNormValue = normalizeText(suggestion.commune);
        return items.reduce((count, item) => {
          const parsed = smartParseLocation(item.location, communeMatchers);
          return normalizeText(parsed.commune) === communeNormValue ? count + 1 : count;
        }, 0);
      }
      if (suggestion.type === "district" && suggestion.district) {
        const districtNormValue = normalizeText(suggestion.district);
        const communeNormValue = normalizeText(suggestion.commune ?? "");
        return items.reduce((count, item) => {
          const parsed = smartParseLocation(item.location, communeMatchers);
          const districtMatch = normalizeText(parsed.district) === districtNormValue;
          const communeMatch = !communeNormValue || normalizeText(parsed.commune) === communeNormValue;
          return districtMatch && communeMatch ? count + 1 : count;
        }, 0);
      }
      if (suggestion.type === "room" && suggestion.room) {
        const roomValue = suggestion.room;
        return items.reduce((count, item) => {
          const hay = buildSearchableListingText(item, communeMatchers);
          return roomMatchesProperty(item, roomValue, hay) ? count + 1 : count;
        }, 0);
      }
      return 0;
    };

    const candidates: Array<
      SearchSuggestion & { searchText: string; score: number }
    > = [];

    const push = (
      base: Omit<SearchSuggestion, "matchCount">,
      searchText: string,
      matchCountOverride?: number
    ) => {
      const textNorm = normalizeText(searchText);
      const matchesQuery =
        textNorm.includes(qNorm) ||
        (qTokens.length > 0 && qTokens.every((token) => tokenMatchesListingText(textNorm, token)));
      if (!matchesQuery) return;

      const matchCount = Number.isFinite(Number(matchCountOverride))
        ? Number(matchCountOverride)
        : countMatches(base);
      if (matchCount <= 0) return;

      const labelNorm = normalizeText(base.label);
      let score = 3;
      if (labelNorm === qNorm || textNorm === qNorm) score = 0;
      else if (labelNorm.startsWith(qNorm) || textNorm.startsWith(qNorm)) score = 1;
      else if (labelNorm.includes(qNorm)) score = 2;

      candidates.push({ ...base, matchCount, searchText, score });
    };

    smartQueryProfiles.forEach((profile) => {
      push(
        {
          key: `smart:${normalizeText(profile.label)}`,
          type: "smart_query",
          label: profile.label,
          value: profile.label,
        },
        profile.searchText,
        profile.matchCount
      );
    });

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

    categoryOptions.forEach((categoryLabel) => {
      const matchedSeed = CATEGORY_SUGGESTIONS.find(
        (entry) => normalizeText(entry.label) === normalizeText(categoryLabel)
      );
      const terms = matchedSeed?.terms ?? [categoryLabel];
      push(
        {
          key: `category:${normalizeText(categoryLabel)}`,
          type: "category",
          label: categoryLabel,
          value: categoryLabel,
          category: categoryLabel,
        },
        `${categoryLabel} ${terms.join(" ")}`
      );
    });

    communeOptions.forEach((commune) => {
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

    roomOptionsForSuggestions.forEach((room) => {
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

    const typePriority: Record<SearchSuggestionType, number> = {
      smart_query: 0,
      transaction: 1,
      category: 2,
      commune: 3,
      district: 4,
      room: 5,
      amenity: 5,
    };
    candidates.sort(
      (a, b) =>
        typePriority[a.type] - typePriority[b.type] ||
        a.score - b.score ||
        b.matchCount - a.matchCount ||
        a.label.localeCompare(b.label)
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
          matchCount: candidate.matchCount,
        });
      }
    });

    return Array.from(deduped.values()).slice(0, 12);
  }, [filters.q, filters.category, districtCommuneHints, dealTypeLabelMap, communeOptions, items, communeMatchers]);

  const applySearchSuggestion = (suggestion: SearchSuggestion) => {
    bumpSearchMetric("suggestionClicks", 1);
    postBehaviorEvent("search_click", {
      payload: {
        query: filters.q,
        suggestionType: suggestion.type,
        suggestionLabel: suggestion.label,
        suggestionValue: suggestion.value,
      },
    });
    setFilters((f) => {
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
        category: suggestion.type === "category" ? suggestion.category ?? f.category : f.category,
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

  const applySmartExampleQuery = (query: string) => {
    setFilters((f) => ({ ...f, q: query }));
    bumpSearchMetric("suggestionClicks", 1);
    postBehaviorEvent("search_click", {
      payload: {
        query,
        source: "smart_example",
      },
    });
    setSearchOpen(false);
    setSearchActiveIndex(-1);
    searchInputRef.current?.focus();
  };

  const searchSuggestionsContent = (
    <>
      <div className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/45">
        {lang === "ar" ? "اقتراحات البحث" : "Suggestions"}
      </div>
      {(
        [
          "smart_query",
          "transaction",
          "category",
          "commune",
          "district",
          "room",
        ] as SearchSuggestionType[]
      ).map((type) => {
        const groupItems = searchSuggestions
          .map((suggestion, index) => ({ suggestion, index }))
          .filter((row) => row.suggestion.type === type);
        if (groupItems.length === 0) return null;

        return (
          <div key={`suggestion-group-${type}`} className="mb-1">
            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/40">
              {SEARCH_SUGGESTION_LABELS[lang][type]}
            </div>
            {groupItems.map(({ suggestion, index }) => {
              const active = index === searchActiveIndex;
              const hint = suggestionHint(suggestion, lang);
              return (
                <button
                  key={suggestion.key}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applySearchSuggestion(suggestion);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-start text-sm transition",
                    active ? "bg-[rgb(var(--navy))]/9 text-[rgb(var(--navy))]" : "hover:bg-black/5"
                  )}
                >
                  <div className="min-w-0 flex items-center gap-2.5">
                    <span
                      className={cn(
                        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
                        active
                          ? "border-[rgb(var(--navy))]/25 bg-[rgb(var(--navy))]/10 text-[rgb(var(--navy))]"
                          : "border-black/10 bg-white text-black/55"
                      )}
                    >
                      {suggestionIcon(suggestion)}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{suggestion.label}</div>
                      {hint ? <div className="truncate text-[11px] text-black/50">{hint}</div> : null}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <span className="rounded-full border border-black/10 bg-white px-2 py-0.5 text-[10px] font-semibold text-black/55">
                      {suggestion.matchCount}
                    </span>
                    <ChevronRight size={14} className="text-black/35" />
                  </div>
                </button>
              );
            })}
          </div>
        );
      })}
    </>
  );

  // District options depend on selected commune and current data
  const districtOptions = useMemo(() => {
    if (!filters.commune) return [];
    const wanted = normalizeText(filters.commune);

    const set = new Set<string>();
    quartiersCatalog.forEach((entry) => {
      if (normalizeText(entry.commune) === wanted) {
        set.add(entry.name);
      }
    });

    if (!set.size) {
      items.forEach((p) => {
        const parsed = smartParseLocation(p.location, communeMatchers);
        if (!parsed.commune || !parsed.district) return;
        if (normalizeText(parsed.commune) === wanted) set.add(parsed.district);
      });
    }

    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
  }, [items, filters.commune, quartiersCatalog, communeMatchers]);

  const categoryOptions = useMemo(() => {
    const byNorm = new Map<string, string>();
    const add = (label: string | null | undefined) => {
      const clean = (label ?? "").trim();
      if (!clean) return;
      const norm = normalizeText(clean);
      if (!norm || byNorm.has(norm)) return;
      byNorm.set(norm, clean);
    };

    CATEGORY_SUGGESTIONS.forEach((category) => add(category.label));
    items.forEach((item) => {
      add(item.category);
      inferListingCategories(item).forEach(add);
    });

    return Array.from(byNorm.values()).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const publishedWithinOptions = useMemo<Array<{ value: PublishedWithin; label: string }>>(
    () => [
      { value: "all", label: t.anytime },
      { value: "7", label: t.last7Days },
      { value: "30", label: t.last30Days },
      { value: "90", label: t.last90Days },
    ],
    [t]
  );

  // AI parsing for query
  useEffect(() => {
    const q = filters.q.toLowerCase();
    const qNorm = normalizeText(filters.q);

    const kw: Array<[RegExp, AmenityKey]> = [
      [/vue\s*mer|mer\b/, "vue_mer"],
      [/vue\s*ville|ville\b/, "vue_ville"],
      [/fibre|wifi/, "fibre"],
      [/lumineux|lumi(n|ne)u/, "lumineux"],
      [/parking|sous[-\s]?sol/, "parking_sous_sol"],
      [/garage/, "garage"],
      [/box/, "box"],
      [/luxe/, "luxe"],
      [/haut\s*standing/, "haut_standing"],
      [/domotique|smart\s*home/, "domotique"],
      [/clim|climatisation/, "climatisation"],
      [/chauffage|central/, "chauffage_central"],
      [/cheminee/, "cheminee"],
      [/dressing/, "dressing"],
      [/porte\s*blindee/, "porte_blindee"],
      [/résidence\s*fermée|residence\s*fermee|fermee/, "residence_fermee"],
      [/sécurité|securite|h24/, "securite_h24"],
      [/ascenseur/, "double_ascenseur"],
      [/concierge|gardien/, "concierge"],
      [/camera|surveillance/, "camera_surveillance"],
      [/groupe\s*electrogene|generateur/, "groupe_electrogene"],
      [/balcon/, "deux_balcons"],
      [/terrasse/, "terrasse"],
      [/jardin/, "jardin"],
      [/piscine/, "piscine"],
      [/salle\s*de\s*sport|gym/, "salle_sport"],
      [/interphone/, "interphone"],
      [/cuisine\s*(é|e)quip(é|e)e|cuisine equipee/, "cuisine_equipee"],
      [/italienne|douche/, "sdb_italienne"],
    ];

    const negatedAmenities = findNegatedAmenities(qNorm);
    setFilters((f) => {
      const currentNegated = Array.from(f.excludedAmenities);
      const nextNegated = Array.from(negatedAmenities);
      const sameNegated =
        currentNegated.length === nextNegated.length &&
        currentNegated.every((value) => negatedAmenities.has(value));
      if (sameNegated) return f;
      return { ...f, excludedAmenities: new Set(negatedAmenities) };
    });

    if (kw.some(([re]) => re.test(qNorm))) {
      setFilters((f) => {
        const next = new Set(f.amenities);
        kw.forEach(([re, key]) => {
          if (re.test(qNorm) && !negatedAmenities.has(key)) next.add(key);
        });
        negatedAmenities.forEach((key) => next.delete(key));
        return { ...f, amenities: next };
      });
    }

    const roomInfo = parseRoomQueryToken(q);
    if (roomInfo) {
      setFilters((f) => ({ ...f, rooms: roomInfo.raw }));
    }

    const maxMatch = q.match(/\b(max|<=)\s*([\d.,\s]+m|\d[\d\s.,]*)\b/);
    if (maxMatch) {
      const n = parseMoneyToNumber(maxMatch[2]);
      if (n) {
        setFilters((f) => ({ ...f, priceMax: String(n) }));
      }
    }

    const minMatch = q.match(/\b(min|>=)\s*([\d.,\s]+m|\d[\d\s.,]*)\b/);
    if (minMatch) {
      const n = parseMoneyToNumber(minMatch[2]);
      if (n) {
        setFilters((f) => ({ ...f, priceMin: String(n) }));
      }
    }

    const m2Max = q.match(/\b(max|<=)\s*(\d{2,4})\s*m2\b/);
    if (m2Max) {
      setFilters((f) => ({ ...f, areaMax: m2Max[2] }));
    }
    const m2Min = q.match(/\b(min|>=)\s*(\d{2,4})\s*m2\b/);
    if (m2Min) {
      setFilters((f) => ({ ...f, areaMin: m2Min[2] }));
    }

    if (!qNorm) return;

    const transactionMention = TRANSACTION_SUGGESTIONS.find((entry) => {
      const label = dealTypeLabelMap.get(entry.dealType) ?? entry.dealType;
      return (
        qNorm.includes(normalizeText(label)) ||
        entry.terms.some((term) => qNorm.includes(normalizeText(term)))
      );
    });
    if (transactionMention) {
      setFilters((f) =>
        f.dealType === transactionMention.dealType ? f : { ...f, dealType: transactionMention.dealType }
      );
    }

    const categoryMention =
      CATEGORY_SUGGESTIONS.find((entry) => {
        return (
          qNorm.includes(normalizeText(entry.label)) ||
          entry.terms.some((term) => qNorm.includes(normalizeText(term)))
        );
      })?.label ??
      categoryOptions.find((category) => qNorm.includes(normalizeText(category)));
    if (categoryMention) {
      setFilters((f) =>
        normalizeText(f.category) === normalizeText(categoryMention) ? f : { ...f, category: categoryMention }
      );
    }

    const communeMention = communeMatchers.find((c) => qNorm.includes(c.norm));
    if (communeMention) {
      setFilters((f) =>
        normalizeText(f.commune) === communeMention.norm
          ? f
          : { ...f, commune: communeMention.raw, district: "" }
      );
    }

    const districtMention = districtCommuneHints.find((h) => qNorm.includes(h.alias));
    if (districtMention) {
      setFilters((f) =>
        normalizeText(f.commune) === normalizeText(districtMention.commune) &&
        normalizeText(f.district) === normalizeText(districtMention.district)
          ? f
          : { ...f, commune: districtMention.commune, district: districtMention.district }
      );
    }
  }, [filters.q, districtCommuneHints, communeMatchers, categoryOptions, dealTypeLabelMap]);

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
    const publishedWithinLabelMap: Record<PublishedWithin, string> = {
      all: t.anytime,
      "7": t.last7Days,
      "30": t.last30Days,
      "90": t.last90Days,
    };

    if (filters.dealType !== "Tous") {
      chips.push({
        key: "dealType",
        label: `🏷️ ${dealTypeLabelMap.get(filters.dealType) ?? filters.dealType}`,
        remove: () => setFilters((f) => ({ ...f, dealType: "Tous" })),
      });
    }
    if (filters.category) {
      chips.push({
        key: "category",
        label: `🏢 ${filters.category}`,
        remove: () => setFilters((f) => ({ ...f, category: "" })),
      });
    }
    if (filters.publishedWithin !== "all") {
      chips.push({
        key: "publishedWithin",
        label: `🕒 ${publishedWithinLabelMap[filters.publishedWithin]}`,
        remove: () => setFilters((f) => ({ ...f, publishedWithin: "all" })),
      });
    }
    if (filters.withPhotosOnly) {
      chips.push({
        key: "withPhotosOnly",
        label: `🖼️ ${t.photosOnly}`,
        remove: () => setFilters((f) => ({ ...f, withPhotosOnly: false })),
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
    filters.excludedAmenities.forEach((key) => {
      const opt = AMENITY_OPTIONS.find((a) => a.key === key);
      if (!opt) return;
      chips.push({
        key: `excludedAmenity:${key}`,
        label: `🚫 ${opt.label}`,
        remove: () =>
          setFilters((f) => {
            const next = new Set(f.excludedAmenities);
            next.delete(key);
            return { ...f, excludedAmenities: next };
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
  }, [filters, dealTypeLabelMap, setFilters, t]);

  const backgroundRecommendationBoostByRef = useMemo(() => {
    const map = new Map<string, number>();
    if (!currentUserId || backgroundRecommendations.length === 0) return map;

    const maxScore = Math.max(
      1,
      ...backgroundRecommendations.map((entry) =>
        Number.isFinite(entry.score) ? Math.max(0, entry.score) : 0
      )
    );
    const total = Math.max(1, backgroundRecommendations.length);

    backgroundRecommendations.forEach((entry, index) => {
      const refKey = normalizeRef(entry.ref);
      if (!refKey) return;
      const normalizedScore = Math.max(0, entry.score) / maxScore;
      const rankBoost = Math.max(0, 1 - index / total);
      map.set(refKey, normalizedScore * 30 + rankBoost * 12);
    });

    return map;
  }, [backgroundRecommendations, currentUserId]);

  const filteredLists = useMemo(() => {
    const qTokens = tokenizeSearchQuery(filters.q);
    const semanticTokens = expandSemanticTokens(qTokens);
    const structuredQueryTokens = new Set<string>();
    const addStructuredTokens = (value: string) => {
      tokenizeSearchQuery(value).forEach((token) => structuredQueryTokens.add(token));
    };

    const priceMin = parseMoneyToNumber(filters.priceMin);
    const priceMax = parseMoneyToNumber(filters.priceMax);

    const areaMin = Number(filters.areaMin || "");
    const areaMax = Number(filters.areaMax || "");

    const bedsMin = Number(filters.bedsMin || "");
    const bathsMin = Number(filters.bathsMin || "");

    const categoryNorm = normalizeText(filters.category);
    const publishedWithinDays = Number(filters.publishedWithin || "0");

    const communeNorm = normalizeText(filters.commune);
    const districtNorm = normalizeText(filters.district);

    if (filters.dealType !== "Tous") {
      const selectedDealLabel = dealTypeLabelMap.get(filters.dealType) ?? filters.dealType;
      addStructuredTokens(selectedDealLabel);
      const transactionTerms =
        TRANSACTION_SUGGESTIONS.find((entry) => entry.dealType === filters.dealType)?.terms ?? [];
      transactionTerms.forEach((term) => addStructuredTokens(term));
    }

    if (filters.category) {
      addStructuredTokens(filters.category);
      const matchingCategory = CATEGORY_SUGGESTIONS.find(
        (entry) =>
          normalizeText(entry.label) === categoryNorm ||
          entry.terms.some((term) => normalizeText(term) === categoryNorm)
      );
      matchingCategory?.terms.forEach((term) => addStructuredTokens(term));
    }

    if (filters.rooms) {
      addStructuredTokens(filters.rooms);
      const roomNorm = normalizeText(filters.rooms);
      if (roomNorm.startsWith("t")) addStructuredTokens(roomNorm.replace(/^t/, "f"));
      if (roomNorm.startsWith("f")) addStructuredTokens(roomNorm.replace(/^f/, "t"));
    }

    if (filters.commune) {
      getLocationAliases(filters.commune).forEach((alias) => addStructuredTokens(alias));
    }

    if (filters.district) {
      getLocationAliases(filters.district).forEach((alias) => addStructuredTokens(alias));
      districtCommuneHints.forEach((hint) => {
        const sameDistrict = normalizeText(hint.district) === districtNorm;
        const sameCommune = !communeNorm || normalizeText(hint.commune) === communeNorm;
        if (sameDistrict && sameCommune) addStructuredTokens(hint.alias);
      });
    }

    const relevanceScoreByRef = new Map<string, number>();

    const matchesBaseFilters = (p: PropertyItem, includeAmenityFilters: boolean) => {
      const hay = buildSearchableListingText(p, communeMatchers);
      const refKey = normalizeRef(p.ref);
      const semanticApiScore = semanticRefScores[refKey] ?? 0;
      const normalizedLocationType = normalizeStoredLocationType(p.locationType);
      const effectiveDealType = normalizedLocationType ?? p.type;
      const byDeal =
        filters.dealType === "Tous"
          ? true
          : filters.dealType === "Vente"
          ? effectiveDealType === "Vente"
          : filters.dealType === "Location"
          ? effectiveDealType !== "Vente"
          : effectiveDealType === filters.dealType ||
            (effectiveDealType === "Location" &&
              (TRANSACTION_SUGGESTIONS.find((entry) => entry.dealType === filters.dealType)?.terms ?? []).some(
                (term) => hay.includes(normalizeText(term))
              ));
      const tokenMatches = qTokens.reduce((count, token) => {
        if (structuredQueryTokens.has(token)) return count + 1;
        return tokenMatchesListingText(hay, token) ? count + 1 : count;
      }, 0);
      const semanticHits = semanticTokens.reduce((count, token) => {
        return tokenMatchesListingText(hay, token) ? count + 1 : count;
      }, 0);
      const requiredMatches =
        qTokens.length <= 2 ? qTokens.length : Math.max(1, Math.ceil(qTokens.length * 0.6));
      const semanticThreshold =
        semanticTokens.length === 0 ? 0 : Math.max(1, Math.ceil(semanticTokens.length * 0.45));
      const byQ =
        qTokens.length === 0
          ? true
          : tokenMatches >= requiredMatches || semanticHits >= semanticThreshold || semanticApiScore >= 0.61;
      const byCategory = categoryNorm ? hay.includes(categoryNorm) : true;

      const parsed = smartParseLocation(p.location, communeMatchers);
      const byCommune = filters.commune ? normalizeText(parsed.commune) === communeNorm : true;
      const byDistrict = filters.district ? normalizeText(parsed.district) === districtNorm : true;

      const byRooms = filters.rooms ? roomMatchesProperty(p, filters.rooms, hay) : true;

      const pPrice = parseMoneyToNumber(p.price);
      const byPriceMin = priceMin != null && pPrice != null ? pPrice >= priceMin : true;
      const byPriceMax = priceMax != null && pPrice != null ? pPrice <= priceMax : true;

      const byAreaMin = Number.isFinite(areaMin) && areaMin > 0 ? p.area >= areaMin : true;
      const byAreaMax = Number.isFinite(areaMax) && areaMax > 0 ? p.area <= areaMax : true;

      const byBeds = Number.isFinite(bedsMin) && bedsMin > 0 ? p.beds >= bedsMin : true;
      const byBaths = Number.isFinite(bathsMin) && bathsMin > 0 ? p.baths >= bathsMin : true;
      const byPhotos = filters.withPhotosOnly ? Array.isArray(p.images) && p.images.length > 0 : true;
      const byPublishedWithin =
        filters.publishedWithin === "all"
          ? true
          : (() => {
              if (!Number.isFinite(publishedWithinDays) || publishedWithinDays <= 0) return true;
              const createdTs = p.createdAt ? new Date(p.createdAt).getTime() : NaN;
              if (!Number.isFinite(createdTs)) return true;
              return filterNowTs - createdTs <= publishedWithinDays * 24 * 60 * 60 * 1000;
            })();

      const byAmenities =
        !includeAmenityFilters || filters.amenities.size === 0
          ? true
          : Array.isArray(p.amenities)
          ? Array.from(filters.amenities).every((k) => p.amenities!.includes(k))
          : true;
      const byExcludedAmenities =
        filters.excludedAmenities.size === 0
          ? true
          : Array.isArray(p.amenities)
          ? !Array.from(filters.excludedAmenities).some((key) => p.amenities!.includes(key))
          : true;

      const viewCount = searchBehavior.views[refKey] ?? 0;
      const favoriteCount = searchBehavior.favorites[refKey] ?? 0;
      const contactCount = searchBehavior.contacts[refKey] ?? 0;
      const engagementScore = viewCount * 0.7 + favoriteCount * 1.9 + contactCount * 3.1;
      const backgroundBoostRaw = backgroundRecommendationBoostByRef.get(refKey) ?? 0;
      const backgroundBoost = qTokens.length === 0 ? backgroundBoostRaw : backgroundBoostRaw * 0.42;
      const freshnessScore = (() => {
        const createdTs = p.createdAt ? new Date(p.createdAt).getTime() : NaN;
        if (!Number.isFinite(createdTs)) return 0;
        const ageDays = Math.max(0, (filterNowTs - createdTs) / (24 * 60 * 60 * 1000));
        return Math.max(0, 12 - ageDays * 0.16);
      })();
      const photoScore = Math.min(Array.isArray(p.images) ? p.images.length : 0, 6) * 1.05;
      const textualScore =
        qTokens.length === 0
          ? semanticApiScore * 14
          : (tokenMatches / qTokens.length) * 42 +
            (semanticHits / Math.max(1, semanticTokens.length)) * 18 +
            semanticApiScore * 44;
      const structuredScore =
        (byDeal ? 5 : 0) + (byCategory ? 4 : 0) + (byCommune ? 3 : 0) + (byDistrict ? 2 : 0) + (byRooms ? 2 : 0);
      relevanceScoreByRef.set(
        refKey,
        textualScore + structuredScore + freshnessScore + photoScore + engagementScore + backgroundBoost
      );

      return (
        byDeal &&
        byQ &&
        byCategory &&
        byCommune &&
        byDistrict &&
        byRooms &&
        byPriceMin &&
        byPriceMax &&
        byAreaMin &&
        byAreaMax &&
        byBeds &&
        byBaths &&
        byPhotos &&
        byPublishedWithin &&
        byAmenities &&
        byExcludedAmenities
      );
    };

    const sortList = (list: PropertyItem[]) => {
      const sort = filters.sort;
      if (sort === "relevance") {
        return [...list].sort((a, b) => {
          const aScore = relevanceScoreByRef.get(normalizeRef(a.ref)) ?? 0;
          const bScore = relevanceScoreByRef.get(normalizeRef(b.ref)) ?? 0;
          return bScore - aScore;
        });
      }
      return [...list].sort((a, b) => {
        const ap = parseMoneyToNumber(a.price) ?? 0;
        const bp = parseMoneyToNumber(b.price) ?? 0;
        if (sort === "price_asc") return ap - bp;
        if (sort === "price_desc") return bp - ap;
        if (sort === "area_desc") return b.area - a.area;
        if (sort === "newest") {
          const at = new Date(a.createdAt ?? 0).getTime();
          const bt = new Date(b.createdAt ?? 0).getTime();
          return bt - at;
        }
        return 0;
      });
    };

    const withAmenities = sortList(items.filter((p) => matchesBaseFilters(p, true)));
    const withoutAmenities = sortList(items.filter((p) => matchesBaseFilters(p, false)));

    return { withAmenities, withoutAmenities, relevanceScoreByRef };
  }, [
    items,
    filters,
    filterNowTs,
    communeMatchers,
    districtCommuneHints,
    dealTypeLabelMap,
    searchBehavior,
    semanticRefScores,
    backgroundRecommendationBoostByRef,
  ]);

  const computed = filteredLists.withAmenities;
  const contextResults = filteredLists.withoutAmenities;

  const mapCommunes = useMemo(() => {
    const set = new Set<string>();
    computed.forEach((item) => {
      const parsed = smartParseLocation(item.location, communeMatchers);
      if (parsed.commune) set.add(parsed.commune);
    });
    return Array.from(set);
  }, [computed, communeMatchers]);

  const effectiveMapCommuneBounds = useMemo(
    () => (mapCommuneBounds.length > 0 ? mapCommuneBounds : mapCommunes.slice(0, 6)),
    [mapCommuneBounds, mapCommunes]
  );

  const boundedResults = useMemo(() => {
    if (displayMode !== "map" || !mapBoundsOnly || effectiveMapCommuneBounds.length === 0) return computed;
    const allowed = new Set(effectiveMapCommuneBounds.map((c) => normalizeText(c)));
    return computed.filter((item) => {
      const parsed = smartParseLocation(item.location, communeMatchers);
      return parsed.commune && allowed.has(normalizeText(parsed.commune));
    });
  }, [computed, displayMode, mapBoundsOnly, effectiveMapCommuneBounds, communeMatchers]);

  useEffect(() => {
    if (!searchStatsReady) return;
    const qNorm = normalizeText(filters.q);
    if (!qNorm) {
      lastTrackedQueryRef.current = "";
      zeroResultQueryRef.current = "";
      return;
    }
    const timeout = window.setTimeout(() => {
      if (lastTrackedQueryRef.current === qNorm) return;
      lastTrackedQueryRef.current = qNorm;
      zeroResultQueryRef.current = "";
      bumpSearchMetric("queries", 1);
      recordRecentQuery(qNorm);
    }, 380);
    return () => window.clearTimeout(timeout);
  }, [filters.q, searchStatsReady]);

  useEffect(() => {
    if (!searchStatsReady) return;
    const qNorm = normalizeText(filters.q);
    if (!qNorm || boundedResults.length > 0) return;
    if (zeroResultQueryRef.current === qNorm) return;
    zeroResultQueryRef.current = qNorm;
    bumpSearchMetric("zeroResults", 1);
  }, [boundedResults.length, filters.q, searchStatsReady]);

  const searchQuality = useMemo(() => {
    const queryCount = Math.max(1, searchMetrics.queries);
    const zeroRate = (searchMetrics.zeroResults / queryCount) * 100;
    const suggestionCtr = (searchMetrics.suggestionClicks / queryCount) * 100;
    const contactConversion = (searchMetrics.contactsFromSearch / queryCount) * 100;
    return {
      zeroRate,
      suggestionCtr,
      contactConversion,
    };
  }, [searchMetrics]);

  const mapQuery = useMemo(() => {
    const chosen = effectiveMapCommuneBounds.length > 0 ? effectiveMapCommuneBounds : mapCommunes.slice(0, 4);
    if (chosen.length === 0) return "";
    return `${chosen.slice(0, 4).join(" | ")}, Oran, Algeria`;
  }, [effectiveMapCommuneBounds, mapCommunes]);

  const quickContactProperty = useMemo(
    () => (quickContactRef ? items.find((item) => item.ref === quickContactRef) ?? null : null),
    [items, quickContactRef]
  );

  const comparedItems = useMemo(
    () => compareRefs.map((ref) => items.find((item) => item.ref === ref)).filter(Boolean) as PropertyItem[],
    [compareRefs, items]
  );

  const zeroResultRecoveryActions = useMemo<RecoveryAction[]>(() => {
    const actions: RecoveryAction[] = [];

    if (filters.district) {
      actions.push({
        key: "drop-district",
        label: lang === "ar" ? "إزالة الحي" : "Retirer le quartier",
        hint: lang === "ar" ? "توسيع إلى كامل البلدية" : "Elargir a toute la commune",
        apply: (current) => ({ ...current, district: "" }),
      });
    }

    if (filters.commune) {
      actions.push({
        key: "drop-commune",
        label: lang === "ar" ? "إزالة البلدية" : "Retirer la commune",
        hint: lang === "ar" ? "البحث على مستوى وهران" : "Rechercher sur tout Oran",
        apply: (current) => ({ ...current, commune: "", district: "" }),
      });
    }

    if (filters.rooms) {
      const roomToken = normalizeText(filters.rooms);
      const roomMatch = roomToken.match(/([tf])(\d+)/);
      if (roomMatch) {
        const roomType = roomMatch[1].toUpperCase();
        const roomNum = Number(roomMatch[2]);
        if (Number.isFinite(roomNum) && roomNum > 1) {
          actions.push({
            key: "room-minus",
            label: lang === "ar" ? "غرفة أقل" : "Une piece de moins",
            hint: `${roomType}${roomNum - 1}`,
            apply: (current) => ({ ...current, rooms: `${roomType}${roomNum - 1}` }),
          });
        }
        if (Number.isFinite(roomNum) && roomNum < 6) {
          actions.push({
            key: "room-plus",
            label: lang === "ar" ? "غرفة إضافية" : "Une piece de plus",
            hint: `${roomType}${roomNum + 1}`,
            apply: (current) => ({ ...current, rooms: `${roomType}${roomNum + 1}` }),
          });
        }
      }
    }

    const currentMax = parseMoneyToNumber(filters.priceMax);
    if (currentMax && currentMax > 0) {
      actions.push({
        key: "raise-budget",
        label: lang === "ar" ? "زيادة الميزانية 15%" : "Augmenter budget +15%",
        hint: `${formatMoneyDzd(Math.round(currentMax * 1.15), lang)}`,
        apply: (current) => ({ ...current, priceMax: String(Math.round(currentMax * 1.15)) }),
      });
    }

    if (filters.amenities.size > 0) {
      actions.push({
        key: "drop-amenities",
        label: lang === "ar" ? "إزالة التجهيزات" : "Retirer equipements",
        hint: lang === "ar" ? "توسيع النتائج" : "Elargir les resultats",
        apply: (current) => ({ ...current, amenities: new Set<AmenityKey>() }),
      });
    }

    if (filters.excludedAmenities.size > 0) {
      actions.push({
        key: "drop-excluded-amenities",
        label: lang === "ar" ? "إلغاء الاستبعاد" : "Retirer exclusions",
        hint: lang === "ar" ? "إظهار كل التجهيزات" : "Afficher tous les equipements",
        apply: (current) => ({ ...current, excludedAmenities: new Set<AmenityKey>() }),
      });
    }

    if (actions.length === 0 && activeChips.length > 0) {
      actions.push({
        key: "reset-all",
        label: lang === "ar" ? "إعادة ضبط الكل" : "Reinitialiser tout",
        hint: lang === "ar" ? "البحث بدون قيود" : "Revenir a une recherche ouverte",
        apply: (current) => ({
          ...current,
          q: "",
          dealType: "Tous",
          category: "",
          publishedWithin: "all",
          withPhotosOnly: false,
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
          excludedAmenities: new Set<AmenityKey>(),
          sort: "relevance",
        }),
      });
    }

    return actions.slice(0, 4);
  }, [filters, lang, activeChips.length]);

  const filteredCount = activeChips.length;
  const smartParsedSummary = useMemo(() => {
    const rows: string[] = [];
    if (filters.dealType !== "Tous") rows.push(dealTypeLabelMap.get(filters.dealType) ?? filters.dealType);
    if (filters.category) rows.push(filters.category);
    if (filters.rooms) rows.push(filters.rooms);
    if (filters.commune) rows.push(filters.commune);
    if (filters.district) rows.push(filters.district);
    if (filters.excludedAmenities.size > 0) {
      const labels = Array.from(filters.excludedAmenities)
        .map((key) => AMENITY_OPTIONS.find((row) => row.key === key)?.label)
        .filter(Boolean) as string[];
      if (labels.length > 0) rows.push(`-${labels.slice(0, 2).join(", ")}`);
    }
    return rows;
  }, [filters, dealTypeLabelMap]);
  const listingInsights = useMemo(() => {
    const visible = boundedResults.length > 0 ? boundedResults : computed;
    const communes = new Set<string>();
    let minPrice = Number.POSITIVE_INFINITY;
    let maxPrice = Number.NEGATIVE_INFINITY;

    visible.forEach((item) => {
      const parsed = smartParseLocation(item.location, communeMatchers);
      if (parsed.commune) communes.add(parsed.commune);

      const priceValue = parseMoneyToNumber(item.price);
      if (priceValue == null) return;
      if (priceValue < minPrice) minPrice = priceValue;
      if (priceValue > maxPrice) maxPrice = priceValue;
    });

    return {
      total: items.length,
      visible: boundedResults.length,
      communes: communes.size,
      minPrice: Number.isFinite(minPrice) ? minPrice : null,
      maxPrice: Number.isFinite(maxPrice) ? maxPrice : null,
    };
  }, [items, boundedResults, computed, communeMatchers]);

  const phone = process.env.NEXT_PUBLIC_PHONE ?? "+213559712981";
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP ?? "+213559712981";
  const waDigits = whatsapp.replace(/\D/g, "");

  const saveSearch = () => {
    if (!alertTarget.trim()) return;
    const payload = {
      createdAt: new Date().toISOString(),
      channel: alertChannel,
      target: alertTarget.trim(),
      filters: {
        q: filters.q,
        dealType: filters.dealType,
        commune: filters.commune,
        district: filters.district,
        rooms: filters.rooms,
        priceMin: filters.priceMin,
        priceMax: filters.priceMax,
        areaMin: filters.areaMin,
        areaMax: filters.areaMax,
        aiPresetKeys: activeAiPresetKeys,
        excludedAmenities: Array.from(filters.excludedAmenities),
      },
    };

    const key = "rostomyia_saved_searches";
    const current = JSON.parse(localStorage.getItem(key) || "[]") as unknown[];
    localStorage.setItem(key, JSON.stringify([payload, ...current].slice(0, 20)));
    updateAiStats(activeAiPresetKeys, "saves");

    const summary = activeChips.map((chip) => chip.label).join(", ") || filters.q || "Biens Oran";
    if (alertChannel === "email") {
      window.location.assign(`mailto:${encodeURIComponent(alertTarget.trim())}?subject=${encodeURIComponent(
        "Alerte nouveaux biens Rostomyia"
      )}&body=${encodeURIComponent(`Recherche enregistree: ${summary}`)}`);
    } else {
      const targetDigits = alertTarget.replace(/\D/g, "");
      if (targetDigits) {
        window.open(
          `https://wa.me/${targetDigits}?text=${encodeURIComponent(`Alerte biens enregistree: ${summary}`)}`,
          "_blank"
        );
      }
    }
    setSaveModalOpen(false);
  };

  const toggleCompare = (property: PropertyItem) => {
    setCompareRefs((prev) => {
      if (prev.includes(property.ref)) return prev.filter((ref) => ref !== property.ref);
      if (prev.length >= 3) return prev;
      return [...prev, property.ref];
    });
  };

  const handleOpenProperty = (property: PropertyItem) => {
    recordBehaviorRef("views", property.ref, 1);
    postBehaviorEvent("view", {
      propertyRef: property.ref,
      payload: toBehaviorPayload(property),
    });
  };

  const toggleFavorite = (property: PropertyItem) => {
    const storageRows = normalizeFavoriteRows(
      safeJsonParse<unknown[]>(localStorage.getItem(favoritesStorageKey), [])
    );
    const targetRef = normalizeText(property.ref);
    const exists = storageRows.some((row) => normalizeText(row.ref) === targetRef);

    const nextRows = exists
      ? storageRows.filter((row) => normalizeText(row.ref) !== targetRef)
      : [
          {
            ref: property.ref,
            title: property.title || null,
            location: property.location || null,
            price: property.price || null,
            coverImage: stableCoverImageUrl(
              Array.isArray(property.images)
                ? property.images.find((img) => typeof img === "string" && img.trim().length > 0) ?? null
                : null
            ),
          },
          ...storageRows.filter((row) => normalizeText(row.ref) !== targetRef),
        ];

    localStorage.setItem(favoritesStorageKey, JSON.stringify(nextRows));
    setFavoriteRefs(new Set(nextRows.map((row) => normalizeText(row.ref))));
    recordBehaviorRef("favorites", property.ref, exists ? -1 : 1);
    if (!exists) {
      postBehaviorEvent("favorite", {
        propertyRef: property.ref,
        payload: toBehaviorPayload(property),
      });
    }
  };

  const hasCompareBar = compareRefs.length > 0;
  const hasOverlayOpen = saveModalOpen || compareOpen || Boolean(quickContactProperty);

  useEffect(() => {
    if (!hasOverlayOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [hasOverlayOpen]);

  useEffect(() => {
    if (!hasOverlayOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSaveModalOpen(false);
      setCompareOpen(false);
      setQuickContactRef(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hasOverlayOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTypingContext =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        Boolean(target?.isContentEditable);
      if (isTypingContext) return;

      if (event.key === "/") {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const savedStats = safeJsonParse<Record<string, AiPresetStats>>(
      localStorage.getItem(AI_STATS_STORAGE_KEY),
      {}
    );
    const savedCustom = safeJsonParse<Array<{ key: string; label: string; amenities: AmenityKey[] }>>(
      localStorage.getItem(AI_CUSTOM_STORAGE_KEY),
      []
    );
    const normalizedCustom = savedCustom
      .map((preset) => ({
        key: preset.key,
        icon: "⭐",
        label: preset.label,
        amenities: (preset.amenities ?? []).filter((amenity): amenity is AmenityKey =>
          AMENITY_OPTIONS.some((x) => x.key === amenity)
        ),
        source: "custom" as const,
      }))
      .filter((preset) => preset.amenities.length > 0)
      .slice(0, AI_MAX_CUSTOM_PRESETS);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAiPresetStats(savedStats);
    setCustomAiPresets(normalizedCustom);
    setAiTrendNow(Date.now());
    setAiStorageReady(true);
  }, []);

  useEffect(() => {
    if (!aiStorageReady) return;
    localStorage.setItem(AI_STATS_STORAGE_KEY, JSON.stringify(aiPresetStats));
  }, [aiPresetStats, aiStorageReady]);

  useEffect(() => {
    if (!aiStorageReady) return;
    const payload = customAiPresets.map((preset) => ({
      key: preset.key,
      label: preset.label,
      amenities: preset.amenities,
    }));
    localStorage.setItem(AI_CUSTOM_STORAGE_KEY, JSON.stringify(payload));
  }, [customAiPresets, aiStorageReady]);

  useEffect(() => {
    if (!searchStatsReady) return;
    localStorage.setItem(SEARCH_METRICS_STORAGE_KEY, JSON.stringify(searchMetrics));
  }, [searchMetrics, searchStatsReady]);

  useEffect(() => {
    if (!searchStatsReady) return;
    localStorage.setItem(SEARCH_BEHAVIOR_STORAGE_KEY, JSON.stringify(searchBehavior));
  }, [searchBehavior, searchStatsReady]);

  useEffect(() => {
    if (!SEMANTIC_SEARCH_ENABLED) {
      setSemanticRefScores({});
      setSemanticPending(false);
      setSemanticEnabled(false);
      setSemanticReason("paused");
      return;
    }

    const qNorm = normalizeText(filters.q);
    if (qNorm.length < 3) {
      setSemanticRefScores({});
      setSemanticPending(false);
      setSemanticEnabled(false);
      setSemanticReason("");
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setSemanticPending(true);
        const response = await fetch("/api/search/semantic", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: filters.q,
            limit: 80,
            minSimilarity: 0.41,
          }),
          signal: controller.signal,
          cache: "no-store",
        });

        const payload = (await response.json()) as SemanticApiPayload;
        if (controller.signal.aborted) return;

        const nextScores: Record<string, number> = {};
        (payload.results ?? []).forEach((row) => {
          const ref = normalizeRef(typeof row?.ref === "string" ? row.ref : "");
          const score = typeof row?.score === "number" ? row.score : NaN;
          if (!ref || !Number.isFinite(score)) return;
          nextScores[ref] = Math.max(0, Math.min(1, score));
        });

        setSemanticRefScores(nextScores);
        setSemanticEnabled(Boolean(payload.enabled));
        setSemanticReason(String(payload.reason ?? ""));
      } catch {
        if (controller.signal.aborted) return;
        setSemanticRefScores({});
        setSemanticEnabled(false);
        setSemanticReason("semantic_fetch_failed");
      } finally {
        if (!controller.signal.aborted) {
          setSemanticPending(false);
        }
      }
    }, 460);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [filters.q]);

  useEffect(() => {
    if (!currentUserId) {
      setBackgroundRecommendations([]);
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      try {
        const response = await fetch("/api/recommendations/me", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("background_recommendations_failed");

        const payload = (await response.json()) as BackgroundRecommendationApiPayload;
        if (controller.signal.aborted) return;

        const resolved = (payload.recommendations ?? [])
          .map((row) => {
            const ref = normalizeRef(typeof row?.ref === "string" ? row.ref : "");
            if (!ref) return null;
            return {
              ref,
              rank: Number.isFinite(Number(row?.rank)) ? Number(row?.rank) : 0,
              reason:
                typeof row?.reason === "string" && row.reason.trim()
                  ? row.reason
                  : "Suggestion personnalisee",
              score: typeof row?.score === "number" ? row.score : 0,
            } as BackgroundRecommendation;
          })
          .filter((entry): entry is BackgroundRecommendation => Boolean(entry))
          .sort((a, b) => {
            if (a.rank > 0 && b.rank > 0 && a.rank !== b.rank) return a.rank - b.rank;
            return b.score - a.score;
          });

        setBackgroundRecommendations(resolved);
      } catch {
        if (controller.signal.aborted) return;
        setBackgroundRecommendations([]);
      }
    };

    void load();

    return () => {
      controller.abort();
    };
  }, [currentUserId]);

  const resetAll = () => {
    setFilters((f) => ({
      ...f,
      q: "",
      dealType: "Tous",
      category: "",
      publishedWithin: "all",
      withPhotosOnly: false,
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
      excludedAmenities: new Set<AmenityKey>(),
      sort: "relevance",
    }));
    setMapBoundsOnly(false);
    setMapCommuneBounds([]);
    setMobileFiltersOpen(false);
  };

  const curatedAiPresets = useMemo<AiPreset[]>(
    () => [
      {
        key: "family",
        icon: "👨‍👩‍👧",
        label: t.aiFamily,
        amenities: ["residence_fermee", "securite_h24", "double_ascenseur"],
        source: "curated",
      },
      {
        key: "remote",
        icon: "💻",
        label: t.aiRemote,
        amenities: ["fibre", "lumineux"],
        source: "curated",
      },
      {
        key: "sea",
        icon: "🌊",
        label: t.aiSea,
        amenities: ["vue_mer", "deux_balcons"],
        source: "curated",
      },
      {
        key: "comfort",
        icon: "🛋️",
        label: lang === "ar" ? "راحة" : "Confort",
        amenities: ["climatisation", "chauffage_central", "cuisine_equipee"],
        source: "curated",
      },
      {
        key: "secure",
        icon: "🛡️",
        label: lang === "ar" ? "أمان" : "Securise",
        amenities: ["residence_fermee", "securite_h24", "interphone"],
        source: "curated",
      },
      {
        key: "modern",
        icon: "✨",
        label: lang === "ar" ? "حديث" : "Moderne",
        amenities: ["double_ascenseur", "sdb_italienne", "cuisine_equipee"],
        source: "curated",
      },
      {
        key: "cityView",
        icon: "🌆",
        label: lang === "ar" ? "إطلالة مدينة" : "Vue ville",
        amenities: ["vue_ville", "lumineux"],
        source: "curated",
      },
    ],
    [lang, t.aiFamily, t.aiRemote, t.aiSea]
  );

  const generatedAiPresets = useMemo<AiPreset[]>(() => {
    const comboCounts = new Map<string, { amenities: AmenityKey[]; count: number }>();

    items.forEach((item) => {
      const itemAmenities = Array.from(new Set(item.amenities ?? []));
      if (itemAmenities.length < 2) return;

      const pairs = combinationsOf(itemAmenities, 2);
      pairs.forEach((pair) => {
        const signature = serializeAmenities(pair);
        const existing = comboCounts.get(signature);
        if (existing) existing.count += 1;
        else comboCounts.set(signature, { amenities: [...pair], count: 1 });
      });
    });

    return Array.from(comboCounts.entries())
      .filter(([, value]) => value.count >= 2)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 4)
      .map(([signature, value]) => ({
        key: `generated:${signature}`,
        icon: "⚡",
        label: `${amenityLabel(value.amenities[0])} + ${amenityLabel(value.amenities[1])}`,
        amenities: value.amenities,
        source: "generated",
        generated: true,
      }));
  }, [items]);

  const aiPresets = useMemo<AiPreset[]>(() => {
    const merged = [...curatedAiPresets, ...generatedAiPresets, ...customAiPresets];
    const deduped = new Map<string, AiPreset>();
    merged.forEach((preset) => {
      if (!deduped.has(preset.key)) deduped.set(preset.key, preset);
    });
    return Array.from(deduped.values());
  }, [curatedAiPresets, generatedAiPresets, customAiPresets]);

  const aiPresetAmenitySet = useMemo(
    () => new Set(aiPresets.flatMap((preset) => preset.amenities)),
    [aiPresets]
  );

  const aiPresetCounts = useMemo(() => {
    const counts = new Map<string, number>();
    aiPresets.forEach((preset) => {
      const count = contextResults.reduce((acc, property) => {
        if (!Array.isArray(property.amenities) || property.amenities.length === 0) return acc;
        return preset.amenities.every((amenity) => property.amenities!.includes(amenity)) ? acc + 1 : acc;
      }, 0);
      counts.set(preset.key, count);
    });
    return counts;
  }, [aiPresets, contextResults]);

  const aiPresetTrends = useMemo(() => {
    const now = aiTrendNow;
    if (!now) return new Map<string, number>();
    const msInDay = 24 * 60 * 60 * 1000;
    const recentStart = now - 7 * msInDay;
    const previousStart = now - 14 * msInDay;
    const trendMap = new Map<string, number>();

    aiPresets.forEach((preset) => {
      let recent = 0;
      let previous = 0;
      contextResults.forEach((property) => {
        if (!Array.isArray(property.amenities) || property.amenities.length === 0) return;
        if (!preset.amenities.every((amenity) => property.amenities!.includes(amenity))) return;

        const ts = property.createdAt ? new Date(property.createdAt).getTime() : NaN;
        if (!Number.isFinite(ts)) return;
        if (ts >= recentStart) recent += 1;
        else if (ts >= previousStart && ts < recentStart) previous += 1;
      });

      trendMap.set(preset.key, recent - previous);
    });
    return trendMap;
  }, [aiPresets, contextResults, aiTrendNow]);

  const updateAiStats = (presetKeys: string[], metric: "clicks" | "contacts" | "saves") => {
    if (presetKeys.length === 0) return;
    setAiPresetStats((prev) => {
      const next = { ...prev };
      presetKeys.forEach((key) => {
        const current = next[key] ?? { clicks: 0, contacts: 0, saves: 0 };
        next[key] = {
          ...current,
          [metric]: (current[metric] ?? 0) + 1,
          lastUsedAt: new Date().toISOString(),
        };
      });
      return next;
    });
  };

  const orderedAiPresets = useMemo(() => {
    return [...aiPresets].sort((a, b) => {
      const statsA = aiPresetStats[a.key] ?? { clicks: 0, contacts: 0, saves: 0 };
      const statsB = aiPresetStats[b.key] ?? { clicks: 0, contacts: 0, saves: 0 };
      const countA = aiPresetCounts.get(a.key) ?? 0;
      const countB = aiPresetCounts.get(b.key) ?? 0;
      const activeA = a.amenities.every((amenity) => filters.amenities.has(amenity));
      const activeB = b.amenities.every((amenity) => filters.amenities.has(amenity));
      const scoreA =
        (activeA ? 1000 : 0) +
        countA * 4 +
        statsA.clicks * 1.2 +
        statsA.contacts * 3.5 +
        statsA.saves * 2 +
        (a.source === "custom" ? 1.2 : a.source === "generated" ? 0.7 : 0);
      const scoreB =
        (activeB ? 1000 : 0) +
        countB * 4 +
        statsB.clicks * 1.2 +
        statsB.contacts * 3.5 +
        statsB.saves * 2 +
        (b.source === "custom" ? 1.2 : b.source === "generated" ? 0.7 : 0);
      return scoreB - scoreA;
    });
  }, [aiPresets, aiPresetStats, aiPresetCounts, filters.amenities]);

  const activeAiPresetKeys = orderedAiPresets
    .filter((preset) => preset.amenities.every((amenity) => filters.amenities.has(amenity)))
    .map((preset) => preset.key);

  const relatedPresetMap = useMemo(() => {
    const map = new Map<string, string[]>();

    const matchesPreset = (property: PropertyItem, preset: AiPreset) =>
      Array.isArray(property.amenities) && preset.amenities.every((amenity) => property.amenities!.includes(amenity));

    orderedAiPresets.forEach((basePreset) => {
      const baseCount = contextResults.reduce((acc, property) => (matchesPreset(property, basePreset) ? acc + 1 : acc), 0);
      if (baseCount === 0) {
        map.set(basePreset.key, []);
        return;
      }

      const related = orderedAiPresets
        .filter((candidate) => candidate.key !== basePreset.key)
        .map((candidate) => {
          const bothCount = contextResults.reduce(
            (acc, property) => (matchesPreset(property, basePreset) && matchesPreset(property, candidate) ? acc + 1 : acc),
            0
          );
          const score = bothCount / baseCount;
          return { key: candidate.key, score };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
        .map((x) => x.key);

      map.set(basePreset.key, related);
    });

    return map;
  }, [orderedAiPresets, contextResults]);

  const relatedFromActive = (() => {
    if (activeAiPresetKeys.length === 0) return [] as AiPreset[];
    const scoreByKey = new Map<string, number>();

    activeAiPresetKeys.forEach((activeKey) => {
      (relatedPresetMap.get(activeKey) ?? []).forEach((relatedKey, idx) => {
        scoreByKey.set(relatedKey, (scoreByKey.get(relatedKey) ?? 0) + (4 - idx));
      });
    });

    return orderedAiPresets
      .filter((preset) => !activeAiPresetKeys.includes(preset.key))
      .map((preset) => ({ preset, score: scoreByKey.get(preset.key) ?? 0 }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((x) => x.preset);
  })();

  const isAiPresetActive = (amenities: AmenityKey[]) =>
    amenities.every((amenity) => filters.amenities.has(amenity));

  const toggleAiPreset = (preset: AiPreset, options?: { relaxConflicts?: boolean }) => {
    const currentlyActive = isAiPresetActive(preset.amenities);
    setFilters((f) => {
      const next = new Set(f.amenities);
      if (currentlyActive) {
        preset.amenities.forEach((amenity) => next.delete(amenity));
        return { ...f, amenities: next };
      }

      preset.amenities.forEach((amenity) => next.add(amenity));
      if (options?.relaxConflicts) {
        return {
          ...f,
          q: "",
          category: "",
          publishedWithin: "all",
          withPhotosOnly: false,
          commune: "",
          district: "",
          rooms: "",
          priceMin: "",
          priceMax: "",
          areaMin: "",
          areaMax: "",
          bedsMin: "",
          bathsMin: "",
          amenities: next,
          excludedAmenities: new Set<AmenityKey>(),
        };
      }
      return { ...f, amenities: next };
    });

    if (!currentlyActive) updateAiStats([preset.key], "clicks");
  };

  const clearAiPresets = () => {
    setFilters((f) => {
      const next = new Set(f.amenities);
      aiPresetAmenitySet.forEach((amenity) => next.delete(amenity));
      return { ...f, amenities: next };
    });
  };

  const saveCustomAiPreset = () => {
    const amenities = Array.from(filters.amenities);
    if (amenities.length < 2) return;
    const label = customAiPresetName.trim() || `Preset IA ${customAiPresets.length + 1}`;
    const preset: AiPreset = {
      key: `custom:${Date.now()}`,
      icon: "⭐",
      label,
      amenities,
      source: "custom",
    };
    setCustomAiPresets((prev) => [preset, ...prev].slice(0, AI_MAX_CUSTOM_PRESETS));
    setCustomAiPresetName("");
  };

  const activeAiPresetCount = useMemo(
    () => orderedAiPresets.filter((preset) => preset.amenities.every((amenity) => filters.amenities.has(amenity))).length,
    [orderedAiPresets, filters.amenities]
  );

  const aiPresetIcon = (preset: AiPreset) => {
    if (preset.key === "family") return <Users size={14} />;
    if (preset.key === "remote") return <Laptop size={14} />;
    if (preset.key === "sea") return <Waves size={14} />;
    if (preset.key === "secure") return <Shield size={14} />;
    if (preset.key === "modern") return <Sparkles size={14} />;
    if (preset.source === "generated") return <Zap size={14} />;
    if (preset.source === "custom") return <Star size={14} />;
    return <BadgeCheck size={14} />;
  };

  const heroBackgroundImage =
    String(process.env.NEXT_PUBLIC_BIENS_HERO_BG_URL ?? "").trim() || "/images/hero-oran.jpg";

  return (
    <main
      dir={dir}
      className="relative overflow-hidden bg-[linear-gradient(180deg,rgba(248,250,252,0.92)_0%,rgba(245,248,252,0.95)_48%,rgba(241,245,250,0.98)_100%)]"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[rgb(var(--gold))] blur-3xl opacity-15" />
        <div className="absolute -right-52 top-0 h-[620px] w-[620px] rounded-full bg-[rgb(var(--navy))] blur-3xl opacity-[0.06]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_10%,rgba(255,255,255,0.75),transparent_45%)]" />
      </div>

      <nav aria-label="Breadcrumb" className="relative mx-auto hidden max-w-6xl px-4 pt-5 text-xs text-black/60 md:block">
        <ol className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 shadow-sm backdrop-blur">
          <li>{t.breadcrumbsHome}</li>
          <li>/</li>
          <li className="font-semibold text-[rgb(var(--navy))]">{t.breadcrumbsListings}</li>
        </ol>
      </nav>

      {/* Sticky topbar */}
      <div
        className="sticky top-0 z-30 border-b border-black/10 bg-slate-900/35"
        style={{
          backgroundImage: `url(${heroBackgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(112deg,rgba(10,20,38,0.86),rgba(10,20,38,0.72)_42%,rgba(10,20,38,0.58)_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(212,175,55,0.24),transparent_46%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgb(var(--gold))]/80 to-transparent" />
        <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 md:gap-5 md:py-4 md:flex-row md:items-center md:justify-between">
          <div
            className="relative w-full overflow-hidden rounded-3xl border border-white/20 bg-black/30 shadow-sm backdrop-blur md:max-w-[560px]"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[rgb(var(--navy))]/68 via-[rgb(var(--navy))]/52 to-black/18" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(255,255,255,0.18),transparent_48%)]" />
            <div className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full bg-[rgb(var(--gold))]/25 blur-2xl" />
            <div className="relative p-3.5 md:p-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white shadow-sm backdrop-blur">
                <Building2 size={14} className="text-[rgb(var(--gold))]" />
                Rostomyia Selection
              </div>
              <h1 className="mt-2 text-xl font-semibold tracking-tight text-white md:text-3xl">{t.title}</h1>
              <p className="mt-1 text-xs text-white/85 md:text-sm">{t.sub}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] md:mt-3 md:gap-2 md:text-[11px]">
                <span className="rounded-full border border-white/20 bg-white/12 px-2.5 py-1 font-semibold text-white backdrop-blur">
                  {listingInsights.visible} {t.results}
                </span>
                <span className="rounded-full border border-white/20 bg-white/12 px-2.5 py-1 font-semibold text-white backdrop-blur">
                  {lang === "ar" ? "بلديات" : "Communes"}: {listingInsights.communes}
                </span>
                <span className="rounded-full border border-[rgb(var(--gold))]/45 bg-[rgb(var(--gold))]/20 px-2.5 py-1 font-semibold text-white backdrop-blur">
                  {lang === "ar" ? "مختار بعناية" : "Selection premium"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 md:w-[560px]">
            <div className="flex w-full flex-col gap-2 md:flex-row">
              <div
                ref={searchContainerRef}
                className="relative flex h-11 w-full items-center gap-2 rounded-xl border border-black/10 bg-white/80 px-3 text-sm shadow-sm backdrop-blur transition focus-within:border-[rgb(var(--gold))]/60 focus-within:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
              >
                <Search size={16} className="text-black/50" />
                <input
                  ref={searchInputRef}
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
                {filters.q.trim() ? (
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setFilters((f) => ({ ...f, q: "" }));
                      setSearchOpen(false);
                      setSearchActiveIndex(-1);
                      searchInputRef.current?.focus();
                    }}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-white/85 text-black/55 transition hover:bg-neutral-100 hover:text-black"
                    aria-label={lang === "ar" ? "مسح البحث" : "Effacer la recherche"}
                    title={lang === "ar" ? "مسح البحث" : "Effacer la recherche"}
                  >
                    <X size={14} />
                  </button>
                ) : null}
                <span className="hidden rounded-md border border-black/10 bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-black/45 md:inline-flex">
                  /
                </span>

                {searchOpen && searchSuggestions.length > 0 && (
                  <div
                    className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 hidden max-h-[46vh] overflow-y-auto overflow-x-hidden rounded-2xl border border-black/10 bg-white/95 p-1.5 shadow-xl backdrop-blur md:block"
                    role="listbox"
                  >
                    {searchSuggestionsContent}
                  </div>
                )}
              </div>

              <AppDropdown
                value={filters.dealType}
                onValueChange={(value) =>
                  setFilters((f) => ({ ...f, dealType: value as DealType }))
                }
                options={dealTypeOptions}
                className="md:w-40"
                triggerClassName="h-11 border-white/30 bg-white/75 backdrop-blur focus-visible:border-white/60"
              />
            </div>

            {filters.q.trim() && smartParsedSummary.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-white/85">
                <span className="rounded-full border border-white/25 bg-white/12 px-2 py-0.5 font-semibold uppercase tracking-[0.11em]">
                  {lang === "ar" ? "تحليل" : "Parsed"}
                </span>
                {smartParsedSummary.map((entry) => (
                  <span
                    key={`parsed-${entry}`}
                    className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 font-medium"
                  >
                    {entry}
                  </span>
                ))}
              </div>
            ) : null}
            {filters.q.trim() && SEMANTIC_SEARCH_ENABLED ? (
              <div className="flex items-center gap-2 text-[10px] text-white/85">
                <span className="rounded-full border border-white/25 bg-white/12 px-2 py-0.5 font-semibold uppercase tracking-[0.11em]">
                  {lang === "ar" ? "الذكاء الدلالي" : "Semantic AI"}
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 font-medium",
                    semanticPending
                      ? "border-white/35 bg-white/12"
                      : semanticEnabled
                      ? "border-emerald-300/45 bg-emerald-500/25"
                      : "border-white/25 bg-white/10"
                  )}
                >
                  {semanticPending
                    ? lang === "ar"
                      ? "جاري التحليل..."
                      : "Analyzing..."
                    : semanticEnabled
                    ? lang === "ar"
                      ? "مفعل"
                      : "Enabled"
                    : lang === "ar"
                    ? "وضع احتياطي"
                    : "Fallback"}
                </span>
                {!semanticPending && !semanticEnabled && semanticReason ? (
                  <span className="text-white/65">{semanticReason}</span>
                ) : null}
              </div>
            ) : null}

          </div>
        </div>

        <div className="relative z-10 mx-auto space-y-3 px-4 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/75 px-3 py-1 text-sm text-black/70 shadow-sm backdrop-blur">
              <Building2 size={14} className="text-[rgb(var(--gold))]" />
              {boundedResults.length} {t.results}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSaveModalOpen(true)}
                aria-label={t.saveSearch}
                title={t.saveSearch}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-black/10 bg-white/80 text-[rgb(var(--navy))] shadow-sm backdrop-blur hover:bg-white"
              >
                <BookmarkPlus size={16} />
                <span className="sr-only">{t.saveSearch}</span>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`${t.sort}: ${activeSortLabel}`}
                    title={`${t.sort}: ${activeSortLabel}`}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-black/10 bg-white/80 text-[rgb(var(--navy))] shadow-sm backdrop-blur hover:bg-white"
                  >
                    <ArrowUpDown size={16} />
                    <span className="sr-only">{`${t.sort}: ${activeSortLabel}`}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-52 rounded-xl border border-black/10 bg-white/95 p-1 shadow-[0_16px_30px_-14px_rgba(15,23,42,0.45)] backdrop-blur"
                >
                  <DropdownMenuRadioGroup
                    value={filters.sort}
                    onValueChange={(value) => setFilters((f) => ({ ...f, sort: value as SortMode }))}
                  >
                    {sortOptions.map((option) => (
                      <DropdownMenuRadioItem
                        key={option.value}
                        value={option.value}
                        className="rounded-lg px-3 py-2 text-sm text-[rgb(var(--navy))] focus:bg-[rgb(var(--navy))]/7"
                      >
                        {option.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="hidden items-center gap-2 rounded-2xl border border-black/10 bg-white/70 p-1 shadow-sm backdrop-blur md:flex">
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

          <div className="space-y-2 md:hidden">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
                aria-label={`${t.mobileFilters} (${filteredCount})`}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-black/10 bg-white/85 text-[rgb(var(--navy))] shadow-sm backdrop-blur"
              >
                <SlidersHorizontal size={18} />
                {filteredCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[rgb(var(--navy))] px-1 text-[10px] font-semibold text-white">
                    {filteredCount}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={resetAll}
                className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white/85 px-3 py-2 text-sm font-medium text-black/70 shadow-sm backdrop-blur"
              >
                {t.reset}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-20 mx-auto max-w-6xl px-4 pt-2 md:hidden">
        <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
          {[
            { value: "Tous" as DealType, label: t.all },
            { value: "Vente" as DealType, label: t.sale },
            { value: "Location" as DealType, label: t.rent },
          ].map((option) => {
            const active = filters.dealType === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilters((f) => ({ ...f, dealType: option.value }))}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                  active
                    ? "border-[rgb(var(--navy))] bg-[rgb(var(--navy))] text-white"
                    : "border-black/10 bg-white text-black/70"
                )}
              >
                {option.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() =>
              setFilters((f) => ({
                ...f,
                withPhotosOnly: !f.withPhotosOnly,
              }))
            }
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              filters.withPhotosOnly
                ? "border-[rgb(var(--navy))] bg-[rgb(var(--navy))] text-white"
                : "border-black/10 bg-white text-black/70"
            )}
          >
            {t.photosOnly}
          </button>

          <button
            type="button"
            onClick={() =>
              setFilters((f) => ({
                ...f,
                sort: f.sort === "newest" ? "relevance" : "newest",
              }))
            }
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              filters.sort === "newest"
                ? "border-[rgb(var(--navy))] bg-[rgb(var(--navy))] text-white"
                : "border-black/10 bg-white text-black/70"
            )}
          >
            {t.sortNewest}
          </button>
        </div>

        {activeChips.length > 0 && (
          <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
            {activeChips.slice(0, 6).map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.remove}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] font-medium text-black/70"
              >
                <span className="max-w-[140px] truncate">{chip.label}</span>
                <span className="text-black/45">×</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {typeof document !== "undefined" &&
      searchOpen &&
      searchSuggestions.length > 0 &&
      searchPanelRect
        ? createPortal(
            <>
              <button
                type="button"
                aria-label="Close search suggestions"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setSearchOpen(false);
                  setSearchActiveIndex(-1);
                }}
                className="fixed inset-0 z-[70] bg-black/25 md:hidden"
              />
              <div
                className="fixed z-[71] max-h-[52vh] overflow-y-auto overflow-x-hidden rounded-2xl border border-black/10 bg-white/96 p-1.5 shadow-2xl backdrop-blur md:hidden"
                style={{
                  left: searchPanelRect.left,
                  top: searchPanelRect.top,
                  width: searchPanelRect.width,
                }}
                role="listbox"
              >
                {searchSuggestionsContent}
              </div>
            </>,
            document.body
          )
        : null}

      {mobileFiltersOpen && (
        <button
          type="button"
          aria-label="Close filters overlay"
          onClick={() => setMobileFiltersOpen(false)}
          className="fixed inset-0 z-40 bg-black/35 md:hidden"
        />
      )}

      {/* Body */}
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-start gap-4 px-4 py-5 md:mx-0 md:max-w-none md:gap-7 md:py-8 md:pl-3 md:pr-6 md:[direction:ltr] md:grid-cols-[260px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
        {/* Sidebar */}
        <motion.aside
          dir={dir}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className={cn(
            "space-y-3 md:sticky md:top-[11.5rem] md:pr-2",
            mobileFiltersOpen
              ? "fixed inset-x-2 bottom-0 top-[5.5rem] z-50 overflow-y-auto rounded-t-3xl border border-black/10 bg-[rgb(248,250,252)] p-3 shadow-2xl md:static md:top-[11.5rem] md:overflow-visible md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none"
              : "hidden md:block"
          )}
        >
          <div
            className={cn(
              "flex items-center justify-between",
              mobileFiltersOpen &&
                "sticky top-0 z-10 -mx-3 mb-3 border-b border-black/10 bg-[rgb(248,250,252)]/95 px-3 pb-3 pt-1 backdrop-blur md:static md:mx-0 md:mb-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-0"
            )}
          >
            <div className="flex items-center gap-2">
              {mobileFiltersOpen ? (
                <span className="h-1.5 w-10 rounded-full bg-black/20 md:hidden" />
              ) : null}
              <div className="text-base font-semibold text-[rgb(var(--navy))]">{t.filters}</div>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={resetAll} className="text-sm text-black/60 hover:text-black">
                {t.reset}
              </button>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="rounded-lg border border-black/10 px-2 py-1 text-xs md:hidden"
              >
                {t.cancel}
              </button>
            </div>
          </div>

          <Section title={t.transactionType}>
            <AppDropdown
              value={filters.dealType}
              onValueChange={(value) =>
                setFilters((f) => ({ ...f, dealType: value as DealType }))
              }
              triggerClassName="h-10 bg-white"
              options={dealTypeOptions}
            />
          </Section>

          <Section title={t.categoryFilter}>
            <AppDropdown
              value={filters.category}
              onValueChange={(value) => setFilters((f) => ({ ...f, category: value }))}
              triggerClassName="h-10 bg-white"
              options={[
                { value: "", label: t.allCategories },
                ...categoryOptions.map((category) => ({ value: category, label: category })),
              ]}
            />
          </Section>

          <Section title={t.commune}>
            <AppDropdown
              value={filters.commune}
              onValueChange={(value) =>
                setFilters((f) => ({ ...f, commune: value, district: "" }))
              }
              triggerClassName="h-10 bg-white"
              options={[
                { value: "", label: t.allCommunes },
                ...communeOptions.map((c) => ({ value: c, label: c })),
              ]}
            />
          </Section>

          <Section title={t.district}>
            <AppDropdown
              value={filters.district}
              onValueChange={(value) => setFilters((f) => ({ ...f, district: value }))}
              disabled={!filters.commune}
              triggerClassName={cn("h-10 bg-white", !filters.commune && "opacity-60")}
              options={[
                { value: "", label: filters.commune ? t.allDistricts : t.selectCommuneFirst },
                ...districtOptions.map((d) => ({ value: d, label: d })),
              ]}
            />
          </Section>

          <Section title={t.rooms}>
            <AppDropdown
              value={filters.rooms}
              onValueChange={(value) => setFilters((f) => ({ ...f, rooms: value }))}
              triggerClassName="h-10 bg-white"
              options={[
                { value: "", label: t.allRooms },
                ...ROOMS_OPTIONS.filter(Boolean).map((r) => ({ value: r, label: r })),
              ]}
            />
          </Section>

          <Section title={t.publishedWithin}>
            <div className="space-y-3">
              <AppDropdown
                value={filters.publishedWithin}
                onValueChange={(value) =>
                  setFilters((f) => ({
                    ...f,
                    publishedWithin: value as PublishedWithin,
                  }))
                }
                triggerClassName="h-10 bg-white"
                options={publishedWithinOptions}
              />

              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-neutral-50">
                <span>{t.photosOnly}</span>
                <input
                  type="checkbox"
                  checked={filters.withPhotosOnly}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      withPhotosOnly: e.target.checked,
                    }))
                  }
                />
              </label>
            </div>
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
                          const nextExcluded = new Set(f.excludedAmenities);
                          if (e.target.checked) next.add(a.key);
                          else next.delete(a.key);
                          if (e.target.checked) nextExcluded.delete(a.key);
                          return { ...f, amenities: next, excludedAmenities: nextExcluded };
                        })
                      }
                    />
                  </label>
                );
              })}
            </div>
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

          {mobileFiltersOpen && (
            <div className="sticky bottom-0 z-10 -mx-3 mt-4 border-t border-black/10 bg-[rgb(248,250,252)]/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.85rem)] pt-3 backdrop-blur md:hidden">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={resetAll}
                  className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium text-black/70"
                >
                  {t.reset}
                </button>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="rounded-xl bg-[rgb(var(--navy))] px-3 py-2 text-sm font-semibold text-white"
                >
                  {lang === "ar" ? "عرض النتائج" : "Voir résultats"} ({boundedResults.length})
                </button>
              </div>
            </div>
          )}

        </motion.aside>

        {/* Results */}
        <section dir={dir} className={cn("space-y-3 md:space-y-4", hasCompareBar ? "pb-28 md:pb-8" : "")}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/90 p-3.5 shadow-sm backdrop-blur md:p-5"
          >
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[rgb(var(--gold))]/15 blur-2xl" />
            <div className="pointer-events-none absolute -left-8 -bottom-10 h-32 w-32 rounded-full bg-[rgb(var(--navy))]/10 blur-2xl" />

            <div className="relative space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
                  <Brain size={14} className="text-[rgb(var(--gold))]" />
                  {t.aiFilters}
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs font-semibold text-black/60">
                    {lang === "ar" ? "نشط" : "Actifs"}: {activeAiPresetCount}
                  </span>
                  <button
                    type="button"
                    onClick={clearAiPresets}
                    disabled={activeAiPresetCount === 0}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-semibold transition",
                      activeAiPresetCount > 0
                        ? "border-black/10 bg-white text-[rgb(var(--navy))] hover:bg-neutral-100"
                        : "cursor-not-allowed border-black/10 bg-white/60 text-black/35"
                    )}
                  >
                    {lang === "ar" ? "مسح IA" : "Reset IA"}
                  </button>
                </div>
              </div>
              <p className="text-xs text-black/60">{t.aiFiltersHint}</p>

              <div className="-mx-1 overflow-x-auto pb-1">
                <div className="flex min-w-max items-center gap-3 px-1">
                  {orderedAiPresets.map((preset) => {
                    const active = isAiPresetActive(preset.amenities);
                    const count = aiPresetCounts.get(preset.key) ?? 0;
                    const trend = aiPresetTrends.get(preset.key) ?? 0;
                    const stats = aiPresetStats[preset.key] ?? { clicks: 0, contacts: 0, saves: 0 };
                    const lowInventory = count <= 2;
                    const description = `${
                      lang === "ar" ? "يشمل" : "Inclut"
                    }: ${preset.amenities.map((a) => amenityLabel(a)).join(", ")} · ${count} ${t.results}${
                      trend !== 0 ? ` · ${lang === "ar" ? "اتجاه" : "Tendance"} ${trend > 0 ? `+${trend}` : trend}` : ""
                    }`;
                    return (
                      <div key={preset.key} className="group relative">
                        <button
                          type="button"
                          onClick={() =>
                            count === 0 && !active
                              ? toggleAiPreset(preset, { relaxConflicts: true })
                              : toggleAiPreset(preset)
                          }
                          className={cn(
                            "relative flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border text-center shadow-sm transition",
                            active
                              ? "border-[rgb(var(--navy))] bg-[rgb(var(--navy))] text-white"
                              : "border-black/10 bg-white text-[rgb(var(--navy))] hover:bg-neutral-100"
                          )}
                          title={`${preset.label} - ${description}`}
                        >
                          <span className={cn("mb-1 inline-flex h-7 w-7 items-center justify-center rounded-full", active ? "bg-white/15" : "bg-black/5")}>
                            {aiPresetIcon(preset)}
                          </span>
                          <span className="line-clamp-2 px-2 text-[11px] font-semibold leading-tight">{preset.label}</span>
                          <span className={cn("mt-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold", active ? "bg-white/20 text-white" : "bg-black/5 text-black/60")}>
                            {count}
                          </span>
                          {trend !== 0 ? (
                            <span
                              className={cn(
                                "absolute -right-1 -top-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                                trend > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                              )}
                            >
                              {trend > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                              {trend > 0 ? `+${trend}` : trend}
                            </span>
                          ) : null}
                          {lowInventory && !active ? (
                            <span className="absolute -left-1 -top-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                              Low
                            </span>
                          ) : null}
                          {stats.clicks > 0 ? (
                            <span className="absolute -bottom-1 right-0 rounded-full bg-[rgb(var(--gold))]/20 px-1.5 py-0.5 text-[9px] font-semibold text-[rgb(var(--navy))]">
                              {stats.clicks}
                            </span>
                          ) : null}
                        </button>
                        <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-56 -translate-x-1/2 rounded-xl border border-black/10 bg-white p-2 text-[11px] text-black/70 shadow-lg group-hover:block group-focus-within:block">
                          {description}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {relatedFromActive.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-black/60">
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <Sparkles size={12} />
                    {lang === "ar" ? "اقتراحات" : "Suggestions"}:
                  </span>
                  {relatedFromActive.slice(0, 3).map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => toggleAiPreset(preset)}
                      className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2 py-0.5 font-medium text-[rgb(var(--navy))] hover:bg-neutral-100"
                    >
                      {aiPresetIcon(preset)}
                      {preset.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  value={customAiPresetName}
                  onChange={(e) => setCustomAiPresetName(e.target.value)}
                  placeholder={lang === "ar" ? "اسم preset IA" : "Nom preset IA"}
                  className="h-9 w-full rounded-full border border-black/10 bg-white px-3 text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={saveCustomAiPreset}
                  className="h-9 shrink-0 rounded-full border border-black/10 bg-white px-3 text-xs font-semibold text-[rgb(var(--navy))] hover:bg-neutral-100"
                >
                  <span className="inline-flex items-center gap-1">
                    <Star size={12} />
                    {lang === "ar" ? "حفظ" : "Save"}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: 0.02 }}
            className="rounded-2xl border border-black/10 bg-white/70 p-3.5 backdrop-blur"
          >
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
              {lang === "ar" ? "مؤشرات البحث الذكي" : "Smart Search Metrics"}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
              <div className="rounded-xl border border-black/10 bg-white px-2.5 py-2">
                <div className="text-black/45">{lang === "ar" ? "الاستعلامات" : "Queries"}</div>
                <div className="font-semibold text-[rgb(var(--navy))]">{searchMetrics.queries}</div>
              </div>
              <div className="rounded-xl border border-black/10 bg-white px-2.5 py-2">
                <div className="text-black/45">{lang === "ar" ? "بدون نتائج" : "Zero Result %"}</div>
                <div className="font-semibold text-[rgb(var(--navy))]">{searchQuality.zeroRate.toFixed(1)}%</div>
              </div>
              <div className="rounded-xl border border-black/10 bg-white px-2.5 py-2">
                <div className="text-black/45">{lang === "ar" ? "نقرات الاقتراح" : "Suggestion CTR"}</div>
                <div className="font-semibold text-[rgb(var(--navy))]">{searchQuality.suggestionCtr.toFixed(1)}%</div>
              </div>
              <div className="rounded-xl border border-black/10 bg-white px-2.5 py-2">
                <div className="text-black/45">{lang === "ar" ? "تحويل للتواصل" : "Search -> Contact"}</div>
                <div className="font-semibold text-[rgb(var(--navy))]">
                  {searchQuality.contactConversion.toFixed(1)}%
                </div>
              </div>
            </div>
          </motion.div>

          {activeChips.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="rounded-2xl border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-[rgb(var(--navy))]">{t.activeFilters}</div>
                <button
                  type="button"
                  onClick={resetAll}
                  className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-black/70 transition hover:bg-black/5 hover:text-black"
                >
                  {t.reset}
                </button>
              </div>
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: 0.03 }}
            className="rounded-2xl border border-black/10 bg-white/70 p-3.5 shadow-sm backdrop-blur"
          >
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.11em] text-[rgb(var(--navy))]">
              {lang === "ar" ? "أمثلة بحث ذكي" : "Exemples Recherche Intelligente"}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {smartSearchExamples.map((example) => (
                <button
                  key={`results-example-${example}`}
                  type="button"
                  onClick={() => applySmartExampleQuery(example)}
                  className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--navy))] hover:bg-neutral-100"
                >
                  {example}
                </button>
              ))}
            </div>
          </motion.div>

          {displayMode === "map" && (
            <div className="rounded-2xl border border-black/10 bg-white/75 p-4 shadow-sm backdrop-blur">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-black/70">
                  <input
                    type="checkbox"
                    checked={mapBoundsOnly}
                    onChange={(e) => setMapBoundsOnly(e.target.checked)}
                  />
                  {t.mapBoundLabel}
                </label>
                {mapCommunes.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {mapCommunes.slice(0, 8).map((commune) => {
                      const checked = effectiveMapCommuneBounds.includes(commune);
                      return (
                        <button
                          key={commune}
                          type="button"
                          onClick={() =>
                            setMapCommuneBounds((prev) =>
                              (prev.length > 0 ? prev : effectiveMapCommuneBounds).includes(commune)
                                ? (prev.length > 0 ? prev : effectiveMapCommuneBounds).filter((x) => x !== commune)
                                : [...(prev.length > 0 ? prev : effectiveMapCommuneBounds), commune]
                            )
                          }
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs font-medium",
                            checked
                              ? "border-[rgb(var(--navy))] bg-[rgb(var(--navy))] text-white"
                              : "border-black/10 bg-white text-black/70"
                          )}
                        >
                          {commune}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-black/50">{t.mapNoCommune}</p>
                )}
              </div>

              <div className="overflow-hidden rounded-xl border border-black/10">
                <iframe
                  title="Biens map"
                  src={
                    mapQuery
                      ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`
                      : "https://www.google.com/maps?q=Oran%20Algeria&output=embed"
                  }
                  className="h-72 w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.05 }}
            className={cn(filters.view === "grid" ? "grid gap-4 sm:gap-5 md:grid-cols-2 md:gap-6 xl:grid-cols-3" : "space-y-3.5 md:space-y-4")}
          >
            {boundedResults.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                isCompared={compareRefs.includes(property.ref)}
                isFavorite={favoriteRefs.has(normalizeText(property.ref))}
                onOpen={handleOpenProperty}
                onToggleCompare={toggleCompare}
                onToggleFavorite={toggleFavorite}
                onQuickContact={(selected) => {
                  setQuickContactRef(selected.ref);
                  recordBehaviorRef("contacts", selected.ref, 1);
                  bumpSearchMetric("contactsFromSearch", 1);
                  postBehaviorEvent("contact", {
                    propertyRef: selected.ref,
                    payload: toBehaviorPayload(selected),
                  });
                  updateAiStats(activeAiPresetKeys, "contacts");
                }}
              />
            ))}
          </motion.div>

          {boundedResults.length === 0 && (
            <div className="rounded-2xl border border-black/10 bg-white/70 p-6 text-center text-black/60 shadow-sm backdrop-blur md:p-8">
              <h3 className="text-base font-semibold text-[rgb(var(--navy))]">{t.emptyTitle}</h3>
              <p className="mt-1">{t.emptySub}</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      amenities: new Set<AmenityKey>(),
                      excludedAmenities: new Set<AmenityKey>(),
                    }))
                  }
                  className="rounded-full border border-black/10 bg-white px-3 py-1 text-sm hover:bg-neutral-100"
                >
                  {t.clearAmenity}
                </button>
                <button
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, priceMin: "", priceMax: "" }))}
                  className="rounded-full border border-black/10 bg-white px-3 py-1 text-sm hover:bg-neutral-100"
                >
                  {t.clearBudget}
                </button>
                <button
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, commune: "", district: "" }))}
                  className="rounded-full border border-black/10 bg-white px-3 py-1 text-sm hover:bg-neutral-100"
                >
                  {t.clearLocation}
                </button>
              </div>
              {zeroResultRecoveryActions.length > 0 && (
                <div className="mt-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
                    {lang === "ar" ? "اقتراحات ذكية" : "Smart Recovery"}
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {zeroResultRecoveryActions.map((action) => (
                      <button
                        key={action.key}
                        type="button"
                        onClick={() => {
                          setFilters((current) => action.apply(current));
                          bumpSearchMetric("suggestionClicks", 1);
                        }}
                        className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-[rgb(var(--navy))] hover:bg-neutral-100"
                        title={action.hint}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                {smartSearchExamples.map((example) => (
                  <button
                    key={`empty-example-${example}`}
                    type="button"
                    onClick={() => applySmartExampleQuery(example)}
                    className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--navy))] hover:bg-neutral-100"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {compareRefs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={sheetPopTransition}
            className="fixed bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] left-1/2 z-40 flex w-[calc(100%-1rem)] max-w-3xl -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/92 px-3 py-2 shadow-lg backdrop-blur md:px-4 md:py-3"
          >
            <div className="text-xs font-medium text-[rgb(var(--navy))] md:text-sm">
              {t.compare}: {compareRefs.length}/3
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCompareRefs([])}
                className="rounded-xl border border-black/10 bg-white px-2.5 py-2 text-xs hover:bg-neutral-100 md:px-3 md:text-sm"
              >
                {t.compareClear}
              </button>
              <button
                type="button"
                onClick={() => setCompareOpen(true)}
                className="rounded-xl bg-[rgb(var(--navy))] px-2.5 py-2 text-xs font-semibold text-white md:px-3 md:text-sm"
              >
                {t.compareNow}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {saveModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={overlayFadeTransition}
            className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4"
            onClick={() => setSaveModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 22, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={modalPopTransition}
              className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-[rgb(var(--navy))]">{t.saveSearchTitle}</h3>
              <p className="mt-1 text-sm text-black/60">{t.saveSearchSub}</p>

              <label className="mt-4 block text-sm font-medium text-black/70">{t.alertMethod}</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAlertChannel("email")}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm",
                    alertChannel === "email" ? "border-[rgb(var(--navy))] bg-[rgb(var(--navy))] text-white" : "border-black/10"
                  )}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setAlertChannel("whatsapp")}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm",
                    alertChannel === "whatsapp" ? "border-[rgb(var(--navy))] bg-[rgb(var(--navy))] text-white" : "border-black/10"
                  )}
                >
                  WhatsApp
                </button>
              </div>

              <label className="mt-4 block text-sm font-medium text-black/70">{t.alertTarget}</label>
              <input
                value={alertTarget}
                onChange={(e) => setAlertTarget(e.target.value)}
                placeholder={alertChannel === "email" ? t.alertPlaceholderEmail : t.alertPlaceholderWhatsapp}
                className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30"
              />

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSaveModalOpen(false)}
                  className="rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-neutral-100"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={saveSearch}
                  className="rounded-xl bg-[rgb(var(--navy))] px-3 py-2 text-sm font-semibold text-white"
                >
                  {t.saveAction}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {compareOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={overlayFadeTransition}
            className="fixed inset-0 z-50 bg-black/35 p-4"
            onClick={() => setCompareOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={modalPopTransition}
              className="mx-auto max-h-[85vh] w-full max-w-5xl overflow-auto rounded-2xl border border-black/10 bg-white p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[rgb(var(--navy))]">{t.compare}</h3>
                <button
                  type="button"
                  onClick={() => setCompareOpen(false)}
                  className="rounded-lg border border-black/10 px-2 py-1 text-sm"
                >
                  {t.cancel}
                </button>
              </div>

              {comparedItems.length === 0 ? (
                <p className="text-sm text-black/60">{t.compareLimit}</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-3">
                  {comparedItems.map((item) => (
                    <article key={item.ref} className="rounded-xl border border-black/10 bg-white p-3">
                      <h4 className="line-clamp-1 text-sm font-semibold text-[rgb(var(--navy))]">{item.title}</h4>
                      <p className="mt-1 text-xs text-black/55">{item.location}</p>
                      <div className="mt-3 space-y-1 text-sm">
                        <p><span className="text-black/55">{t.comparePrice}: </span>{item.price}</p>
                        <p><span className="text-black/55">{t.compareArea}: </span>{item.area} m²</p>
                        <p><span className="text-black/55">{t.compareBeds}: </span>{item.beds}</p>
                        <p><span className="text-black/55">{t.compareBaths}: </span>{item.baths}</p>
                        <p>
                          <span className="text-black/55">{t.comparePayment}: </span>
                          {formatPaymentLabel({
                            rawPayment: null,
                            locationType: item.locationType,
                            undefinedLabel: "A preciser",
                            isArabic: lang === "ar",
                          })}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {quickContactProperty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={overlayFadeTransition}
            className="fixed inset-0 z-50 bg-black/25"
            onClick={() => setQuickContactRef(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 28 }}
              transition={sheetPopTransition}
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl border border-black/10 bg-white px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-2xl md:left-auto md:right-4 md:top-20 md:bottom-auto md:w-[360px] md:rounded-2xl md:px-5 md:py-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-black/15 md:hidden" />
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-[rgb(var(--navy))]">{t.quickContact}</h3>
                <button
                  type="button"
                  onClick={() => setQuickContactRef(null)}
                  className="rounded-lg border border-black/10 px-2 py-1 text-xs"
                >
                  {t.cancel}
                </button>
              </div>
              <p className="mt-1 line-clamp-1 text-sm text-black/60">{quickContactProperty.title}</p>
              <div className="mt-4 grid gap-2">
                <a
                  href={`tel:${phone}`}
                  className="rounded-xl bg-[rgb(var(--navy))] px-3 py-2 text-center text-sm font-semibold text-white"
                >
                  {t.callNow}
                </a>
                <a
                  href={`https://wa.me/${waDigits}?text=${encodeURIComponent(`Bonjour, je suis interesse par ${quickContactProperty.ref}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-black/10 px-3 py-2 text-center text-sm font-semibold text-[rgb(var(--navy))]"
                >
                  {t.whatsappNow}
                </a>
                <a
                  href={`/visite?ref=${encodeURIComponent(quickContactProperty.ref)}`}
                  className="rounded-xl border border-black/10 px-3 py-2 text-center text-sm font-semibold text-[rgb(var(--navy))]"
                >
                  {t.scheduleVisit}
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

