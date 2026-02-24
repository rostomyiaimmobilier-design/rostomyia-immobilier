"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import {
  ArrowLeft,
  MapPin,
  CarFront,
  Building2,
  Ruler,
  Phone,
  MessageCircle,
  ChevronDown,
  CalendarDays,
  ExternalLink,
  ListChecks,
  FileText,
  MapPinned,
  CheckCircle2,
  Sparkles,
  BadgeCheck,
  Banknote,
  ReceiptText,
  Heart,
} from "lucide-react";
import PropertyImageSlider from "@/components/PropertyImageSlider";
import AppDropdown from "@/components/ui/app-dropdown";
import { formatPaymentLabel, normalizeFold } from "@/lib/payment-fallback";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isBackofficeAccount } from "@/lib/account-type";

type Dict = {
  back: string;
  contact: string;
  call: string;
  wa: string;
  book: string;
  ref: string;
  desc: string;
  descText: string;
  keyFeaturesTitle: string;
  keyFeatureSurface: string;
  keyFeatureParking: string;
  keyFeatureResidence: string;
  keyFeatureSeaView: string;
  keyFeatureYes: string;
  keyFeatureNotSpecified: string;
  viewMore: string;
  viewLess: string;
  details: string;
  locationLabel: string;
  priceLabel: string;
  commissionLabel: string;
  paymentLabel: string;
  undefinedLabel: string;
  cityCountry: string;
  bedsLabel: string;
  bathsLabel: string;
};

type DescriptionSection = {
  title?: string;
  paragraphs: string[];
  bullets: string[];
};

type PropertyPayload = {
  ref: string;
  title: string;
  type: string;
  category?: string | null;
  locationType?: string | null;
  price: string;
  location: string;
  beds: number;
  baths: number;
  area: number;
  description?: string | null;
};

type Props = {
  dir: "ltr" | "rtl";
  t: Dict & { otherOptions?: string };
  property: PropertyPayload;
  images: string[];
  waLink: string;
  phone: string;
  sections: DescriptionSection[];
  relatedProperties: Array<{
    ref: string;
    title: string;
    type: string;
    price: string | number | null;
    location: string;
    paymentTerms: string | null;
    locationType?: string | null;
    imageUrl: string | null;
  }>;
  reservationAvailability?: {
    isReserved: boolean;
    reservedUntil: string | null;
    nextAvailableCheckIn: string | null;
    blockedRanges?: Array<{
      checkInDate: string;
      checkOutDate: string;
      status: string | null;
      holdExpiresAt: string | null;
    }>;
  };
};

type FavoriteStorageItem = {
  ref: string;
  title: string | null;
  location: string | null;
  price: string | null;
  coverImage: string | null;
};

type ReservationOption = {
  value: string;
  label: string;
  nights: number | null;
};

type ReservationBlockedRange = {
  check_in_date: string;
  check_out_date: string;
  status: string | null;
  hold_expires_at: string | null;
};

const RESERVATION_BY_DATES_VALUE = "by_dates";

const FAVORITES_STORAGE_KEYS = [
  "rostomyia_favorites",
  "rostomyia_favorite_properties",
  "rostomyia_favorite_refs",
] as const;
const DEFAULT_FAVORITES_STORAGE_KEY = String(FAVORITES_STORAGE_KEYS[0]);

function stableCoverImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim();
  const marker = "/storage/v1/render/image/public/property-images/";
  if (!raw.includes(marker)) return raw;
  const withoutQuery = raw.split("?")[0];
  return withoutQuery.replace(marker, "/storage/v1/object/public/property-images/");
}

function readFavoriteRows(value: string | null): FavoriteStorageItem[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    const rows: FavoriteStorageItem[] = [];
    parsed.forEach((entry) => {
      if (typeof entry === "string" && entry.trim()) {
        rows.push({ ref: entry.trim(), title: null, location: null, price: null, coverImage: null });
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
        coverImage: stableCoverImageUrl(
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
      const key = normalizeFold(item.ref);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } catch {
    return [];
  }
}

function addDays(isoDate: string, days: number) {
  const base = dayjs(`${isoDate}T00:00:00`);
  if (!base.isValid()) return isoDate;
  return base.add(days, "day").format("YYYY-MM-DD");
}

function daysBetween(startIso: string, endIso: string) {
  const start = dayjs(`${startIso}T00:00:00`);
  const end = dayjs(`${endIso}T00:00:00`);
  if (!start.isValid() || !end.isValid()) return 0;
  return Math.max(0, end.diff(start, "day"));
}

function maxIsoDate(a: string, b: string) {
  return a >= b ? a : b;
}

function isDateInBlockedRange(dateIso: string, range: ReservationBlockedRange) {
  // check_out_date is exclusive for booking overlap rules.
  return dateIso >= range.check_in_date && dateIso < range.check_out_date;
}

function findBlockedOverlap(
  startIso: string,
  endIso: string,
  ranges: ReservationBlockedRange[]
) {
  return (
    ranges.find(
      (x) => startIso < x.check_out_date && endIso > x.check_in_date
    ) ?? null
  );
}

export default function PropertyDetailClient({
  dir,
  t,
  property,
  images,
  waLink,
  phone,
  sections,
  relatedProperties,
  reservationAvailability,
}: Props) {
  const isArabic = dir === "rtl";

  function normalizeText(input?: string | null) {
    return normalizeFold(input);
  }

  function formatDzd(raw: string | number | null | undefined) {
    const txt = String(raw ?? "").trim();
    if (!txt) return t.undefinedLabel;
    const digits = txt.replace(/[^\d]/g, "");
    if (!digits) return txt;
    const n = Number(digits);
    if (!Number.isFinite(n)) return txt;
    return `${n.toLocaleString("fr-DZ")} DZD`;
  }

  function formatPayment(raw: string | null | undefined) {
    return formatPaymentLabel({
      rawPayment: raw,
      undefinedLabel: t.undefinedLabel,
      isArabic,
    });
  }

  function parseMoneyToInt(raw: string | number | null | undefined) {
    const txt = String(raw ?? "").trim();
    if (!txt) return null;
    const digits = txt.replace(/[^\d]/g, "");
    if (!digits) return null;
    const n = Number(digits);
    return Number.isFinite(n) ? n : null;
  }

  function isShortStayLocationType(raw: string | null | undefined) {
    const n = normalizeText(raw);
    return (
      n.includes("par_nuit") ||
      n.includes("par nuit") ||
      n.includes("nuit") ||
      n.includes("court_sejour") ||
      n.includes("court sejour") ||
      n.includes("sejour")
    );
  }

  function sectionMeta(title?: string) {
    const v = (title ?? "").toLowerCase();
    if (v.includes("caracteristiques")) {
      return { icon: ListChecks, chip: "bg-[rgb(var(--gold))]/22 text-[rgb(var(--navy))] ring-[rgb(var(--gold))]/25" };
    }
    if (v.includes("emplacement")) {
      return { icon: MapPinned, chip: "bg-[rgb(var(--navy))]/6 text-[rgb(var(--navy))] ring-black/10" };
    }
    if (v.includes("description")) {
      return { icon: FileText, chip: "bg-black/5 text-[rgb(var(--navy))] ring-black/10" };
    }
    return { icon: FileText, chip: "bg-black/5 text-[rgb(var(--navy))] ring-black/10" };
  }

  const featureLineArabicMap: Record<string, string> = {
    "suite parentale": "جناح رئيسي",
    "residence fermee": "إقامة مغلقة",
    "parking sous-sol": "موقف سيارات تحت الارض",
    "parking sous sol": "موقف سيارات تحت الارض",
    garage: "مرآب",
    box: "مرآب",
    luxe: "فاخر",
    "haut standing": "رفيع المستوى",
    domotique: "نظام منزل ذكي",
    "double ascenseur": "مصعدان",
    concierge: "خدمة الاستقبال",
    "camera de surveillance": "كاميرات مراقبة",
    "groupe electrogene": "مولد كهربائي",
    "chauffage central": "تدفئة مركزية",
    climatisation: "تكييف",
    cheminee: "مدفاة",
    dressing: "غرفة ملابس",
    "porte blindee": "باب مصفح",
    "cuisine equipee": "مطبخ مجهز",
    "salle de bain italienne": "حمام عصري",
    "deux balcons": "شرفتان",
    terrasse: "شرفة كبيرة",
    jardin: "حديقة",
    piscine: "مسبح",
    "salle de sport": "قاعة رياضة",
    interphone: "إنترفون",
  };

  function translateTransactionValue(value: string) {
    const n = normalizeText(value);
    if ((n.includes("location") && n.includes("nuit")) || n.includes("par_nuit")) return "كراء / بالليلة";
    if ((n.includes("location") && n.includes("par mois")) || n.includes("par_mois")) return "كراء / بالشهر";
    if (n.includes("location") && (n.includes("6 mois") || n.includes("six mois") || n.includes("six_mois"))) {
      return "كراء / 6 أشهر";
    }
    if (
      n.includes("location") &&
      (n.includes("12 mois") || n.includes("douze mois") || n.includes("douze_mois"))
    ) {
      return "كراء / 12 شهر";
    }
    if (n.includes("vente")) return "بيع";
    if (n.includes("location")) return "كراء";
    return value;
  }

  function localizeFeatureLine(input: string) {
    if (!isArabic) return input;
    const raw = input.trim();
    const normalized = normalizeText(raw).replace(/\s+/g, " ");
    if (!normalized) return raw;

    const mapped = featureLineArabicMap[normalized];
    if (mapped) return mapped;

    if (normalized.startsWith("modalite")) {
      const parts = raw.split(":");
      if (parts.length > 1) {
        const value = parts.slice(1).join(":").trim();
        return `نوع المعاملة: ${translateTransactionValue(value)}`;
      }
      return "نوع المعاملة";
    }

    if (normalized.startsWith("etage")) {
      const parts = raw.split(":");
      if (parts.length > 1) {
        const value = parts.slice(1).join(":").trim();
        return `الطابق: ${value}`;
      }
      return "الطابق";
    }

    return raw;
  }

  function extractSidebarDetails() {
    let location = property.location;
    let paymentTerms = "";
    let agencyFees = "";
    let priceFromDesc = "";

    const lineValue = (line: string) => {
      const colon = line.split(":").slice(1).join(":").trim();
      if (colon) return colon;
      return line.split("-").slice(1).join("-").trim();
    };

    for (const s of sections) {
      const title = (s.title ?? "").toLowerCase();
      const lines = [...s.paragraphs, ...s.bullets];

      if (title.includes("emplacement") && lines.length) {
        location = lines[0];
      }

      for (const ln of lines) {
        const v = ln.toLowerCase();
        const n = normalizeText(ln);
        if (v.startsWith("emplacement")) location = lineValue(ln) || location;
        if (v.startsWith("loyer") || v.startsWith("prix")) priceFromDesc = lineValue(ln) || priceFromDesc;
        if (
          n.startsWith("paiement") ||
          n.startsWith("paiment") ||
          n.startsWith("payment") ||
          n.startsWith("modalites de paiement") ||
          n.startsWith("modalites paiement") ||
          n.startsWith("mode de paiement")
        ) {
          paymentTerms = lineValue(ln) || paymentTerms;
        }
        if (v.startsWith("frais d'agence") || v.startsWith("frais d agence")) {
          agencyFees = lineValue(ln) || agencyFees;
        }
      }
    }

    const cleanedAgencyFees = agencyFees
      .replace(/\s*[-|–—]?\s*rostomyia\s+immobilier\.?/gi, "")
      .trim();

    const priceSource = priceFromDesc || property.price;
    const priceNumber = parseMoneyToInt(priceSource);
    const agencyFeesNumber = parseMoneyToInt(cleanedAgencyFees);
    const shouldAddAgencyToPrice = isShortStayLocationType(property.locationType);
    const totalPrice =
      shouldAddAgencyToPrice && priceNumber != null && agencyFeesNumber != null
        ? priceNumber + agencyFeesNumber
        : null;
    const paymentWithUnit = formatPaymentLabel({
      rawPayment: paymentTerms.trim(),
      locationType: property.locationType,
      undefinedLabel: t.undefinedLabel,
      isArabic,
    });

    return {
      location,
      paymentTerms: paymentWithUnit,
      agencyFees:
        shouldAddAgencyToPrice && agencyFeesNumber != null
          ? formatDzd(agencyFeesNumber)
          : cleanedAgencyFees || t.undefinedLabel,
      priceLabel: formatDzd(totalPrice ?? priceSource),
    };
  }

  const sidebarDetails = extractSidebarDetails();
  const resolvedLocation = (sidebarDetails.location || property.location || "").trim();
  const mapQuery = resolvedLocation ? `${resolvedLocation}, Oran, Algeria` : "";
  const mapEmbedUrl = mapQuery
    ? `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=14&ie=UTF8&iwloc=&output=embed`
    : "";
  const mapHref = mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
    : "";
  const openMapLabel = dir === "rtl" ? "فتح الخريطة" : "Ouvrir sur la carte";
  const mapFallback = dir === "rtl" ? "الموقع غير محدد حالياً." : "Emplacement non precise pour le moment.";
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});
  const [showContactMenu, setShowContactMenu] = useState(false);
  const [reservationOpen, setReservationOpen] = useState(false);
  const [favoritesStorageKey, setFavoritesStorageKey] = useState<string>(DEFAULT_FAVORITES_STORAGE_KEY);
  const [isFavorite, setIsFavorite] = useState(false);
  const todayIso = dayjs().format("YYYY-MM-DD");
  const [reservationBlockedUntil, setReservationBlockedUntil] = useState<string | null>(
    reservationAvailability?.reservedUntil ?? null
  );
  const [reservationBlockedRanges, setReservationBlockedRanges] = useState<ReservationBlockedRange[]>(
    Array.isArray(reservationAvailability?.blockedRanges)
      ? reservationAvailability.blockedRanges
          .filter((x) => Boolean(x?.checkInDate) && Boolean(x?.checkOutDate))
          .map((x) => ({
            check_in_date: x.checkInDate,
            check_out_date: x.checkOutDate,
            status: x.status ?? null,
            hold_expires_at: x.holdExpiresAt ?? null,
          }))
      : []
  );
  const [reservationStartDate, setReservationStartDate] = useState(todayIso);
  const [reservationEndDate, setReservationEndDate] = useState(addDays(todayIso, 1));
  const [reservationOption, setReservationOption] = useState("");
  const [reservationSubmitting, setReservationSubmitting] = useState(false);
  const [reservationSubmitError, setReservationSubmitError] = useState<string | null>(null);
  const [reservationSubmitSuccess, setReservationSubmitSuccess] = useState<string | null>(null);
  const [isBackofficeBlocked, setIsBackofficeBlocked] = useState(false);
  const isReservationMode = isShortStayLocationType(property.locationType);
  const reservationModeNorm = normalizeText(property.locationType);
  const reservationPresetOptions: ReservationOption[] =
    reservationModeNorm.includes("par_nuit") || reservationModeNorm.includes("nuit")
      ? [
          { value: "par_nuit", label: isArabic ? "بالليلة" : "Par nuit", nights: 1 },
          { value: "weekend", label: isArabic ? "عطلة نهاية الأسبوع" : "Week-end", nights: 2 },
          { value: "semaine", label: isArabic ? "أسبوع" : "Semaine", nights: 7 },
        ]
      : [
          { value: "court_sejour", label: isArabic ? "إقامة قصيرة" : "Court sejour", nights: 3 },
          { value: "3_nuits", label: isArabic ? "3 ليالٍ" : "3 nuits", nights: 3 },
          { value: "7_nuits", label: isArabic ? "7 ليالٍ" : "7 nuits", nights: 7 },
        ];
  const reservationOptions: ReservationOption[] = [
    {
      value: RESERVATION_BY_DATES_VALUE,
      label: isArabic ? "حسب تواريخك" : "Selon vos dates",
      nights: null,
    },
    ...reservationPresetOptions,
  ];
  const reservationButtonLabel = isArabic ? "حجز" : "Reservation";
  const reservationModalTitle = isArabic ? "تأكيد الحجز" : "Confirmer la reservation";
  const reservationOptionLabel = isArabic ? "خيار الحجز" : "Option de reservation";
  const reservationStartDateLabel = isArabic ? "تاريخ الدخول" : "Date d'entree";
  const reservationEndDateLabel = isArabic ? "تاريخ الخروج" : "Date de sortie";
  const reservationNightsLabel = isArabic ? "عدد الليالي" : "Nombre de nuits";
  const reservationCancelLabel = isArabic ? "إلغاء" : "Annuler";
  const reservationConfirmLabel = isArabic ? "تأكيد الحجز" : "Confirmer";
  const reservationSavingLabel = isArabic ? "جارٍ الحفظ..." : "Enregistrement...";
  const reservationSavedLabel = isArabic ? "تم تسجيل الحجز بنجاح." : "Reservation enregistree avec succes.";
  const reservationFallbackErrorLabel = isArabic
    ? "تعذر تسجيل الحجز حالياً. حاول مرة اخرى."
    : "Impossible d'enregistrer la reservation pour le moment.";
  const reservationBlockedActionLabel = isArabic
    ? "Ce compte ne peut pas creer de reservations client."
    : "Ce compte ne peut pas creer de reservations client.";
  const reservationBlockedUntilLabel = isArabic
    ? "العقار محجوز حالياً حتى"
    : "Ce bien est reserve actuellement jusqu'au";
  const reservationNextAvailableLabel = isArabic
    ? "يمكن الحجز ابتداءً من"
    : "Reservation possible a partir du";
  const reservationStartMinIso =
    reservationBlockedUntil && reservationBlockedUntil >= todayIso
      ? addDays(reservationBlockedUntil, 1)
      : todayIso;
  const isPropertyReservedNow = Boolean(
    reservationBlockedUntil && reservationBlockedUntil >= todayIso
  );
  const rangeConflict = findBlockedOverlap(
    reservationStartDate,
    reservationEndDate,
    reservationBlockedRanges
  );
  const reservationNights = daysBetween(reservationStartDate, reservationEndDate);
  const reservationStartDay = reservationStartDate ? dayjs(reservationStartDate) : null;
  const reservationEndDay = reservationEndDate ? dayjs(reservationEndDate) : null;
  const reservationStartError = !reservationStartDate
    ? (isArabic ? "يرجى اختيار تاريخ الدخول" : "Choisissez la date d'entree")
    : reservationStartDate < reservationStartMinIso
      ? (
          isPropertyReservedNow
            ? `${reservationNextAvailableLabel} ${reservationStartMinIso}`
            : (isArabic ? "لا يمكن اختيار تاريخ سابق" : "La date d'entree ne peut pas etre passee")
        )
      : "";
  const reservationEndError = !reservationEndDate
    ? (isArabic ? "يرجى اختيار تاريخ الخروج" : "Choisissez la date de sortie")
    : reservationEndDate <= reservationStartDate
      ? (isArabic ? "يجب أن يكون تاريخ الخروج بعد تاريخ الدخول" : "La date de sortie doit etre apres la date d'entree")
      : rangeConflict
        ? (isArabic
          ? `الفترة غير متاحة: ${rangeConflict.check_in_date} -> ${rangeConflict.check_out_date}`
          : `Periode indisponible: ${rangeConflict.check_in_date} -> ${rangeConflict.check_out_date}`)
      : "";
  const isReservationRangeValid =
    Boolean(reservationStartDate) &&
    Boolean(reservationEndDate) &&
    reservationStartDate >= reservationStartMinIso &&
    reservationEndDate > reservationStartDate &&
    reservationNights > 0 &&
    !rangeConflict;
  const selectedReservationOption =
    reservationOptions.find((x) => x.value === reservationOption) ?? null;
  const fixedReservationNights =
    selectedReservationOption && selectedReservationOption.nights != null
      ? selectedReservationOption.nights
      : null;
  const shouldDisableStartDate = (value: Dayjs | null) => {
    if (!value || !value.isValid()) return false;
    const iso = value.format("YYYY-MM-DD");
    if (iso < reservationStartMinIso) return true;
    return reservationBlockedRanges.some((range) => isDateInBlockedRange(iso, range));
  };
  const shouldDisableEndDate = (value: Dayjs | null) => {
    if (!value || !value.isValid()) return false;
    const iso = value.format("YYYY-MM-DD");
    if (!reservationStartDate) return iso <= reservationStartMinIso;
    if (iso <= reservationStartDate) return true;
    return Boolean(findBlockedOverlap(reservationStartDate, iso, reservationBlockedRanges));
  };

  useEffect(() => {
    let selectedKey = DEFAULT_FAVORITES_STORAGE_KEY;
    let selectedRows: FavoriteStorageItem[] = [];

    for (const key of FAVORITES_STORAGE_KEYS) {
      const rows = readFavoriteRows(localStorage.getItem(key));
      if (rows.length > 0) {
        selectedKey = key;
        selectedRows = rows;
        break;
      }
    }
    if (selectedRows.length === 0) {
      selectedRows = readFavoriteRows(localStorage.getItem(selectedKey));
    }

    const refKey = normalizeFold(property.ref);
    setFavoritesStorageKey(selectedKey);
    setIsFavorite(selectedRows.some((row) => normalizeFold(row.ref) === refKey));
  }, [property.ref]);

  useEffect(() => {
    let alive = true;
    const supabase = createBrowserSupabaseClient();

    const applyUser = (user: {
      user_metadata?: Record<string, unknown> | null;
      app_metadata?: Record<string, unknown> | null;
    } | null) => {
      if (!alive) return;
      setIsBackofficeBlocked(isBackofficeAccount(user));
    };

    async function hydrate() {
      const sessionResult = await supabase.auth.getSession();
      if (!alive) return;
      const sessionUser = sessionResult.data.session?.user ?? null;
      if (sessionUser) {
        applyUser(sessionUser);
        return;
      }
      const userResult = await supabase.auth.getUser();
      if (!alive) return;
      applyUser(userResult.data.user ?? null);
    }

    hydrate().catch(() => null);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null);
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isReservationMode) return;
    if (!reservationOption || !reservationOptions.some((x) => x.value === reservationOption)) {
      setReservationOption(RESERVATION_BY_DATES_VALUE);
    }
  }, [isReservationMode, reservationOption, reservationOptions]);

  useEffect(() => {
    if (!isReservationMode || !property.ref) return;
    let cancelled = false;

    async function hydrateReservationAvailability() {
      try {
        const response = await fetch(
          `/api/reservations?property_ref=${encodeURIComponent(property.ref)}`,
          { method: "GET" }
        );
        if (!response.ok) return;
        const payload = (await response.json().catch(() => null)) as
          | {
              is_reserved?: boolean;
              reserved_until?: string | null;
              next_available_check_in?: string | null;
              blocked_ranges?: ReservationBlockedRange[] | null;
            }
          | null;
        if (cancelled) return;
        const isReserved = payload?.is_reserved === true;
        const reservedUntil = String(payload?.reserved_until ?? "").trim() || null;
        if (isReserved && reservedUntil) {
          setReservationBlockedUntil((prev) => {
            if (!prev) return reservedUntil;
            return maxIsoDate(prev, reservedUntil);
          });
        } else {
          setReservationBlockedUntil(null);
        }
        const blockedRanges = Array.isArray(payload?.blocked_ranges)
          ? payload.blocked_ranges.filter(
              (x) => Boolean(x?.check_in_date) && Boolean(x?.check_out_date)
            )
          : [];
        setReservationBlockedRanges(blockedRanges);
      } catch {
        // Keep reservation UI usable even if availability endpoint fails.
      }
    }

    hydrateReservationAvailability();
    return () => {
      cancelled = true;
    };
  }, [isReservationMode, property.ref]);

  useEffect(() => {
    if (!isReservationMode) return;
    if (!reservationStartDate || reservationStartDate < reservationStartMinIso) {
      setReservationStartDate(reservationStartMinIso);
    }
  }, [isReservationMode, reservationStartDate, reservationStartMinIso]);

  useEffect(() => {
    if (!isReservationMode) return;
    const selected = findReservationOption(reservationOption);
    if (!selected || selected.nights == null || !reservationStartDate) return;
    const expectedEnd = addDays(reservationStartDate, selected.nights);
    if (reservationEndDate !== expectedEnd) {
      setReservationEndDate(expectedEnd);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReservationMode, reservationOption, reservationStartDate]);

  const favoriteLabel = isArabic
    ? isFavorite
      ? "إزالة من المفضلة"
      : "إضافة للمفضلة"
    : isFavorite
      ? "Retirer des favoris"
      : "Ajouter aux favoris";

  function toggleFavorite() {
    const current = readFavoriteRows(localStorage.getItem(favoritesStorageKey));
    const refKey = normalizeFold(property.ref);
    const exists = current.some((row) => normalizeFold(row.ref) === refKey);

    const next = exists
      ? current.filter((row) => normalizeFold(row.ref) !== refKey)
      : [
          {
            ref: property.ref,
            title: property.title || null,
            location: property.location || null,
            price: property.price || null,
            coverImage: stableCoverImageUrl(
              Array.isArray(images)
                ? images.find((img) => typeof img === "string" && img.trim().length > 0) ?? null
                : null
            ),
          },
          ...current.filter((row) => normalizeFold(row.ref) !== refKey),
        ];

    localStorage.setItem(favoritesStorageKey, JSON.stringify(next));
    setIsFavorite(!exists);
  }

  function openReservationModal() {
    if (!isReservationMode) return;
    if (isBackofficeBlocked) {
      setReservationSubmitError(reservationBlockedActionLabel);
      setReservationSubmitSuccess(null);
      return;
    }
    if (!reservationStartDate || reservationStartDate < reservationStartMinIso) {
      setReservationStartDate(reservationStartMinIso);
    }
    const effectiveStart =
      reservationStartDate && reservationStartDate >= reservationStartMinIso
        ? reservationStartDate
        : reservationStartMinIso;
    if (!reservationEndDate || reservationEndDate <= effectiveStart) {
      setReservationEndDate(addDays(effectiveStart, 1));
    }
    if (!reservationOption) {
      setReservationOption(RESERVATION_BY_DATES_VALUE);
    }
    setReservationSubmitError(null);
    setReservationSubmitSuccess(null);
    setReservationOpen(true);
  }

  async function submitReservation() {
    if (!isReservationMode) return;
    if (!isReservationRangeValid || reservationSubmitting) return;
    if (isBackofficeBlocked) {
      setReservationSubmitError(reservationBlockedActionLabel);
      setReservationSubmitSuccess(null);
      return;
    }
    const optionLabel =
      reservationOptions.find((x) => x.value === reservationOption)?.label ||
      reservationOptions[0]?.label ||
      "";

    const reservationText = [
      isArabic
        ? `مرحباً، أرغب في حجز العقار ${property.ref} (${property.title}).`
        : `Bonjour, je souhaite reserver le bien ${property.ref} (${property.title}).`,
      isArabic ? `خيار الحجز: ${optionLabel}` : `Option de reservation: ${optionLabel}`,
      isArabic ? `تاريخ الدخول: ${reservationStartDate}` : `Date d'entree: ${reservationStartDate}`,
      isArabic ? `تاريخ الخروج: ${reservationEndDate}` : `Date de sortie: ${reservationEndDate}`,
      isArabic ? `عدد الليالي: ${reservationNights}` : `Nombre de nuits: ${reservationNights}`,
    ].join("\n");

    setReservationSubmitError(null);
    setReservationSubmitSuccess(null);
    setReservationSubmitting(true);
    let successMessage = reservationSavedLabel;

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_ref: property.ref,
          reservation_option: reservationOption || RESERVATION_BY_DATES_VALUE,
          reservation_option_label: optionLabel,
          check_in_date: reservationStartDate,
          check_out_date: reservationEndDate,
          message: reservationText,
          lang: isArabic ? "ar" : "fr",
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
          is_reserved?: boolean;
          reserved_until?: string;
          next_available_check_in?: string;
          conflicting_check_in?: string;
          conflicting_check_out?: string;
          blocked_ranges?: ReservationBlockedRange[];
        };
        const isReserved = payload.is_reserved === true;
        const reservedUntil = String(payload.reserved_until ?? "").trim();
        if (isReserved && reservedUntil) {
          setReservationBlockedUntil((prev) => (prev ? maxIsoDate(prev, reservedUntil) : reservedUntil));
        } else if (!isReserved) {
          setReservationBlockedUntil(null);
        }
        if (Array.isArray(payload.blocked_ranges)) {
          setReservationBlockedRanges(
            payload.blocked_ranges.filter(
              (x) => Boolean(x?.check_in_date) && Boolean(x?.check_out_date)
            )
          );
        }
        const nextAvailable = String(payload.next_available_check_in ?? "").trim();
        if (nextAvailable) {
          setReservationStartDate(nextAvailable);
          const selected = reservationOptions.find((x) => x.value === reservationOption);
          const nights = selected?.nights != null && selected.nights > 0 ? selected.nights : 1;
          setReservationEndDate(addDays(nextAvailable, nights));
        }
        const conflictIn = String(payload.conflicting_check_in ?? "").trim();
        const conflictOut = String(payload.conflicting_check_out ?? "").trim();
        const conflictReason =
          conflictIn && conflictOut
            ? isArabic
              ? `الفترة محجوزة: ${conflictIn} -> ${conflictOut}`
              : `Periode deja reservee: ${conflictIn} -> ${conflictOut}`
            : null;
        throw new Error(conflictReason || payload.error || reservationFallbackErrorLabel);
      }

      const payload = (await response.json().catch(() => ({}))) as {
        is_reserved?: boolean;
        reserved_until?: string;
        next_available_check_in?: string;
        blocked_ranges?: ReservationBlockedRange[];
        hold_expires_at?: string;
      };
      const isReserved = payload.is_reserved === true;
      const reservedUntil = String(payload.reserved_until ?? "").trim();
      if (isReserved && reservedUntil) {
        setReservationBlockedUntil((prev) => (prev ? maxIsoDate(prev, reservedUntil) : reservedUntil));
      } else if (!isReserved) {
        setReservationBlockedUntil(null);
      }
      if (Array.isArray(payload.blocked_ranges)) {
        setReservationBlockedRanges(
          payload.blocked_ranges.filter(
            (x) => Boolean(x?.check_in_date) && Boolean(x?.check_out_date)
          )
        );
      }
      const nextAvailable = String(payload.next_available_check_in ?? "").trim();
      if (nextAvailable) {
        setReservationStartDate(nextAvailable);
        const selected = reservationOptions.find((x) => x.value === reservationOption);
        const nights = selected?.nights != null && selected.nights > 0 ? selected.nights : 1;
        setReservationEndDate(addDays(nextAvailable, nights));
      }
      const holdExpiresAt = String(payload.hold_expires_at ?? "").trim();
      if (holdExpiresAt) {
        successMessage = isArabic
          ? `تم تسجيل الطلب مؤقتاً حتى ${holdExpiresAt}.`
          : `Reservation en attente jusqu'au ${holdExpiresAt}.`;
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : reservationFallbackErrorLabel;
      setReservationSubmitError(reason || reservationFallbackErrorLabel);
      setReservationSubmitting(false);
      return;
    }

    let finalLink = waLink;
    try {
      const url = new URL(waLink);
      const existingText = url.searchParams.get("text");
      const merged = [String(existingText ?? "").trim(), reservationText].filter(Boolean).join("\n");
      url.searchParams.set("text", merged);
      finalLink = url.toString();
    } catch {
      finalLink = waLink;
    }

    setReservationSubmitSuccess(successMessage);
    setReservationSubmitting(false);
    window.open(finalLink, "_blank", "noopener,noreferrer");
    setReservationOpen(false);
  }

  function handleReservationOptionChange(value: string) {
    setReservationOption(value);
    const selected = reservationOptions.find((x) => x.value === value);
    if (!selected || !reservationStartDate) return;
    if (selected.nights != null && selected.nights > 0) {
      setReservationEndDate(addDays(reservationStartDate, selected.nights));
      return;
    }
    if (!reservationEndDate || reservationEndDate <= reservationStartDate) {
      setReservationEndDate(addDays(reservationStartDate, 1));
    }
  }

  function toIsoOrEmpty(value: Dayjs | null) {
    if (!value || !value.isValid()) return "";
    return value.format("YYYY-MM-DD");
  }

  function findReservationOption(value: string) {
    return reservationOptions.find((x) => x.value === value) ?? null;
  }

  function isFeatureSectionTitle(input?: string) {
    const t = normalizeText(input);
    return t.includes("caracteristiques principales") || t.includes("caracteristiques");
  }

  const filteredSections = sections
    .map((s) => {
      const title = (s.title ?? "").toLowerCase();
      if (title.includes("emplacement")) return null;

      const keepLine = (line: string) => {
        const v = line.toLowerCase();
        const n = normalizeText(line);
        const isPaymentLine =
          n.startsWith("paiement") ||
          n.startsWith("paiment") ||
          n.startsWith("payment") ||
          n.startsWith("modalites de paiement") ||
          n.startsWith("modalites paiement") ||
          n.startsWith("mode de paiement");
        return !(
          v.startsWith("emplacement") ||
          v.startsWith("loyer") ||
          v.startsWith("prix") ||
          isPaymentLine ||
          v.startsWith("frais d'agence") ||
          v.startsWith("frais d agence") ||
          n.startsWith("type :") ||
          n.startsWith("configuration :") ||
          n.startsWith("superficie :")
        );
      };

      const paragraphs = s.paragraphs.filter(keepLine);
      const bullets = s.bullets.filter(keepLine);
      if (!s.title && !paragraphs.length && !bullets.length) return null;
      if (s.title && !paragraphs.length && !bullets.length) return null;
      return { ...s, paragraphs, bullets };
    })
    .filter(Boolean) as DescriptionSection[];
  const topFeatureBullets =
    filteredSections.find((s) => isFeatureSectionTitle(s.title))?.bullets.slice(0, 3) ?? [];
  const allDetailsText = [property.title, ...filteredSections.flatMap((s) => [s.title ?? "", ...s.paragraphs, ...s.bullets])]
    .join(" ")
    .trim();
  const normalizedDetails = normalizeText(allDetailsText);
  const normalizedCategory = normalizeText(property.category);
  const inferredCategory = (() => {
    if (
      normalizedCategory.includes("terrain") ||
      normalizedCategory.includes("land")
    ) {
      return "terrain" as const;
    }
    if (normalizedCategory.includes("local") || normalizedCategory.includes("shop")) {
      return "local" as const;
    }
    if (normalizedCategory.includes("bureau") || normalizedCategory.includes("office")) {
      return "bureau" as const;
    }

    const titleNorm = normalizeText(property.title);
    if (titleNorm.includes("terrain") || titleNorm.includes("land")) return "terrain" as const;
    if (titleNorm.includes("local") || titleNorm.includes("shop")) return "local" as const;
    if (titleNorm.includes("bureau") || titleNorm.includes("office")) return "bureau" as const;
    return "default" as const;
  })();

  const hasParkingSousSol = /parking\s+sous[-\s]?sol/.test(normalizedDetails);
  const hasResidence = normalizedDetails.includes("residence");
  const hasVueSurMer = /vue\s+(sur\s+)?mer/.test(normalizedDetails);
  const hasViabilise = /\b(viabilis|raccord|eau|gaz|electricit|reseau)\b/.test(normalizedDetails);
  const hasFacadeAcces = /\b(facade|angle|coin|acces|route|axe)\b/.test(normalizedDetails);
  const hasVitrine = /\b(vitrine|showroom|devanture|commercial)\b/.test(normalizedDetails);
  const hasSanitaire = /\b(sanitaire|wc|toilette|lavabo|salle d.?eau)\b/.test(normalizedDetails);
  const hasAscenseur = /\b(ascenseur|elevator)\b/.test(normalizedDetails);
  const hasOpenSpace = /\b(open\s*space|plateau|espace ouvert|bureau ouvert)\b/.test(normalizedDetails);

  const transactionValue = (() => {
    const n = normalizeText(property.locationType || property.type);
    if (n.includes("vente") || n.includes("sale") || n.includes("vendre")) {
      return isArabic ? "بيع" : "Vente";
    }
    if (
      n.includes("location") ||
      n.includes("rent") ||
      n.includes("par_mois") ||
      n.includes("six_mois") ||
      n.includes("douze_mois") ||
      n.includes("par_nuit") ||
      n.includes("court_sejour")
    ) {
      return isArabic ? "كراء" : "Location";
    }
    return property.type || t.keyFeatureNotSpecified;
  })();

  const surfaceValue = property.area > 0 ? `${property.area} m2` : t.keyFeatureNotSpecified;
  const transactionLabel = isArabic ? "نوع المعاملة" : "Transaction";
  const boolValue = (value: boolean) => (value ? t.keyFeatureYes : t.keyFeatureNotSpecified);

  const keyCharacteristics = (() => {
    if (inferredCategory === "terrain") {
      return [
        { icon: <Ruler size={15} />, label: t.keyFeatureSurface, value: surfaceValue },
        { icon: <ListChecks size={15} />, label: transactionLabel, value: transactionValue },
        { icon: <CheckCircle2 size={15} />, label: isArabic ? "مهيأ" : "Viabilise", value: boolValue(hasViabilise) },
        { icon: <MapPin size={15} />, label: isArabic ? "واجهة / مدخل" : "Facade / acces", value: boolValue(hasFacadeAcces) },
      ];
    }
    if (inferredCategory === "local") {
      return [
        { icon: <Ruler size={15} />, label: t.keyFeatureSurface, value: surfaceValue },
        { icon: <ListChecks size={15} />, label: transactionLabel, value: transactionValue },
        { icon: <Building2 size={15} />, label: isArabic ? "واجهة تجارية" : "Vitrine commerciale", value: boolValue(hasVitrine) },
        { icon: <CheckCircle2 size={15} />, label: isArabic ? "مرافق صحية" : "Sanitaire", value: boolValue(hasSanitaire) },
      ];
    }
    if (inferredCategory === "bureau") {
      return [
        { icon: <Ruler size={15} />, label: t.keyFeatureSurface, value: surfaceValue },
        { icon: <ListChecks size={15} />, label: transactionLabel, value: transactionValue },
        { icon: <Building2 size={15} />, label: isArabic ? "مصعد" : "Ascenseur", value: boolValue(hasAscenseur) },
        { icon: <CheckCircle2 size={15} />, label: isArabic ? "فضاء مفتوح" : "Open space", value: boolValue(hasOpenSpace) },
      ];
    }

    return [
      { icon: <Ruler size={15} />, label: t.keyFeatureSurface, value: surfaceValue },
      {
        icon: <CarFront size={15} />,
        label: t.keyFeatureParking,
        value: hasParkingSousSol ? t.keyFeatureYes : t.keyFeatureNotSpecified,
      },
      {
        icon: <Building2 size={15} />,
        label: t.keyFeatureResidence,
        value: hasResidence ? t.keyFeatureYes : t.keyFeatureNotSpecified,
      },
      {
        icon: <MapPin size={15} />,
        label: t.keyFeatureSeaView,
        value: hasVueSurMer ? t.keyFeatureYes : t.keyFeatureNotSpecified,
      },
    ];
  })();

  return (
    <main
      dir={dir}
      className="relative mx-auto max-w-6xl overflow-x-hidden px-4 py-10 pb-28 md:pb-10"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 -top-20 h-72 w-72 rounded-full bg-[rgb(var(--gold))]/18 blur-3xl" />
        <div className="absolute -right-28 top-24 h-80 w-80 rounded-full bg-[rgb(var(--navy))]/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-white to-transparent" />
      </div>

      <Link href="/biens" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:underline">
        <ArrowLeft size={16} />
        {t.back}
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-[1.35fr_0.65fr]">
        <div className="min-w-0">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <PropertyImageSlider
              images={images}
              alt={property.title}
              aspectClassName="aspect-[4/3] md:aspect-[16/9]"
              sizes="(max-width: 768px) 100vw, 70vw"
              priority
              showThumbs
              enableZoom={false}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mt-6 rounded-2xl bg-white/78 p-5 backdrop-blur ring-1 ring-black/5 md:p-6"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--gold))]/20 px-3 py-1 text-xs font-semibold text-[rgb(var(--navy))] ring-1 ring-[rgb(var(--gold))]/25">
                <Sparkles size={14} />
                {property.type}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-[rgb(var(--navy))] ring-1 ring-black/10">
                <BadgeCheck size={14} className="text-[rgb(var(--gold))]" />
                {t.ref}: {property.ref}
              </span>
              {isPropertyReservedNow && reservationBlockedUntil ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-300/70">
                  <CalendarDays size={14} />
                  {isArabic
                    ? `محجوز حتى ${reservationBlockedUntil}`
                    : `Reserve jusqu'au ${reservationBlockedUntil}`}
                </span>
              ) : null}
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-[rgb(var(--navy))]">{property.title}</h1>

            <p className="mt-2 inline-flex items-center gap-2 text-slate-600">
              <MapPin size={16} className="text-[rgb(var(--gold))]" />
              {property.location}
            </p>

            <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-black/8 pt-4">
              <p className="text-2xl font-bold text-[rgb(var(--navy))]">{sidebarDetails.priceLabel}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleFavorite}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                    isFavorite
                      ? "border-rose-300 bg-rose-50 text-rose-700"
                      : "border-black/10 bg-white text-[rgb(var(--navy))] hover:bg-black/5"
                  }`}
                  aria-label={favoriteLabel}
                  title={favoriteLabel}
                >
                  <Heart size={14} className={isFavorite ? "fill-current" : ""} />
                  {isArabic ? "مفضلة" : "Favori"}
                </button>
                <div className="h-1 w-44 rounded-full bg-gradient-to-r from-[rgb(var(--gold))]/25 via-[rgb(var(--gold))]/70 to-[rgb(var(--gold))]/25 opacity-70" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-6 overflow-hidden bg-[rgb(var(--navy))]/95 ring-1 ring-[rgb(var(--gold))]/35"
          >
            <div className="border-b border-[rgb(var(--gold))]/40 bg-[rgb(var(--gold))]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--gold))]">
              {t.keyFeaturesTitle}
            </div>

            <div className="grid grid-cols-1 divide-y divide-white/15 bg-[rgb(var(--navy))]/95 text-white sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              {keyCharacteristics.map((item) => (
                <KeyFeatureTile key={item.label} icon={item.icon} label={item.label} value={item.value} />
              ))}
            </div>

            {topFeatureBullets.length > 0 && (
              <div className="grid grid-cols-1 divide-y divide-[rgb(var(--navy))]/10 bg-white text-[rgb(var(--navy))] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {topFeatureBullets.map((item) => (
                  <div key={item} className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium">
                    <CheckCircle2 size={14} className="shrink-0 text-[rgb(var(--gold))]" />
                    <span>{localizeFeatureLine(item)}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-6 rounded-2xl bg-white/78 p-6 backdrop-blur ring-1 ring-black/5"
          >
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-[rgb(var(--navy))]">
              <FileText size={18} className="text-[rgb(var(--gold))]" />
              {t.desc}
            </h2>

            {filteredSections.length ? (
              <div className="mt-4 space-y-4">
                {filteredSections.map((s, idx) => (
                  <section
                    key={idx}
                    className={`rounded-2xl p-4 ring-1 ${isFeatureSectionTitle(s.title) ? "bg-[rgb(var(--navy))]/3 ring-[rgb(var(--navy))]/10" : "bg-white/85 ring-black/5"}`}
                  >
                    {s.title ? (
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--navy))]">
                          {(() => {
                            const meta = sectionMeta(s.title);
                            const Icon = meta.icon;
                            return (
                              <>
                                <span className={`inline-flex rounded-full px-2 py-1 ring-1 ${meta.chip}`}>
                                  <Icon size={14} />
                                </span>
                                {isFeatureSectionTitle(s.title) ? t.keyFeaturesTitle : s.title}
                              </>
                            );
                          })()}
                        </h3>

                        {isFeatureSectionTitle(s.title) && s.bullets.length > 6 ? (
                          <button
                            type="button"
                            onClick={() => setExpandedSections((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                            className="rounded-lg border border-black/10 bg-white px-2 py-1 text-[11px] font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
                          >
                            {expandedSections[idx] ? t.viewLess : t.viewMore}
                          </button>
                        ) : null}
                      </div>
                    ) : null}

                    {s.paragraphs.map((p) => (
                      <p key={p} className="mt-2 text-sm leading-relaxed text-slate-700">
                        {isFeatureSectionTitle(s.title) ? localizeFeatureLine(p) : p}
                      </p>
                    ))}

                    {s.bullets.length ? (
                      isFeatureSectionTitle(s.title) ? (
                        <ul className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                          {(expandedSections[idx] ? s.bullets : s.bullets.slice(0, 6)).map((b) => (
                            <li
                              key={b}
                              className="flex items-start gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-black/10"
                            >
                              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[rgb(var(--gold))]" />
                              <span>{localizeFeatureLine(b)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <ul className="mt-3 space-y-2 text-sm text-slate-700">
                          {s.bullets.map((b) => (
                            <li
                              key={b}
                              className="flex items-start gap-2 rounded-xl bg-black/3 px-3 py-2 ring-1 ring-black/5"
                            >
                              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[rgb(var(--gold))]" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      )
                    ) : null}
                  </section>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-slate-600">{t.descText}</p>
            )}
          </motion.div>

          <section className="mt-6 rounded-2xl bg-white/78 p-6 backdrop-blur ring-1 ring-black/5 md:hidden">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[rgb(var(--navy))]">{t.contact}</h2>
                <p className="mt-1 text-sm text-slate-600">{t.cityCountry}</p>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-[rgb(var(--gold))]/20 ring-1 ring-[rgb(var(--gold))]/25" />
            </div>

            <div className="mt-4 rounded-2xl bg-[rgb(var(--navy))]/95 p-4 text-white">
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white/12 p-3">
                  <div className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-white/70">
                    <Banknote size={12} className="text-[rgb(var(--gold))]" />
                    {t.priceLabel}
                  </div>
                  <div className="mt-1 text-base font-semibold text-white">{sidebarDetails.priceLabel}</div>
                </div>
                <div className="rounded-xl bg-white/12 p-3">
                  <div className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-white/70">
                    <ReceiptText size={12} className="text-[rgb(var(--gold))]" />
                    {t.commissionLabel}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white">{sidebarDetails.agencyFees}</div>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-[rgb(var(--gold))]/35 bg-[rgb(var(--gold))]/18 p-3">
                <div className="text-[11px] uppercase tracking-wide text-white/75">{t.paymentLabel}</div>
                <div className="mt-1 text-sm font-semibold text-[rgb(var(--gold))]">{sidebarDetails.paymentTerms}</div>
              </div>
            </div>

          </section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18 }}
            className="mt-6 rounded-2xl bg-white/78 p-6 backdrop-blur ring-1 ring-black/5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-[rgb(var(--navy))]">
                <MapPinned size={18} className="text-[rgb(var(--gold))]" />
                {t.locationLabel}
              </h2>
              {mapHref ? (
                <a
                  href={mapHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
                >
                  <ExternalLink size={13} />
                  {openMapLabel}
                </a>
              ) : null}
            </div>

            <p className="mt-2 text-sm text-slate-600">{resolvedLocation || t.undefinedLabel}</p>

            {mapEmbedUrl ? (
              <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-black/10">
                <iframe
                  title={`${t.locationLabel} - ${property.title}`}
                  src={mapEmbedUrl}
                  className="h-60 w-full md:h-72"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-black/15 bg-white p-4 text-sm text-slate-600">
                {mapFallback}
              </div>
            )}

            {relatedProperties.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
                  {t.otherOptions || "Autres biens"}
                </h3>
                <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2">
                  {relatedProperties.map((item) => (
                    <Link
                      key={item.ref}
                      href={`/biens/${encodeURIComponent(item.ref)}`}
                      className="min-w-0 basis-[78%] shrink-0 snap-start overflow-hidden rounded-2xl border border-black/10 bg-white transition hover:-translate-y-0.5 sm:basis-[52%] lg:basis-[38%] xl:basis-[32%]"
                    >
                      <div className="aspect-[4/3] w-full bg-slate-100">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-slate-200 via-slate-100 to-white" />
                        )}
                      </div>
                      <div className="space-y-2 p-3">
                        <div className="inline-flex items-center gap-1 rounded-full bg-[rgb(var(--gold))]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--navy))] ring-1 ring-[rgb(var(--gold))]/30">
                          {item.type || t.undefinedLabel}
                        </div>
                        <div className="line-clamp-1 text-sm font-semibold text-[rgb(var(--navy))]">{item.title}</div>
                        <div className="line-clamp-1 text-xs text-slate-600">{item.location || t.undefinedLabel}</div>
                        <div className="rounded-lg bg-[rgb(var(--navy))]/6 px-2 py-1 text-xs font-semibold text-[rgb(var(--navy))]">
                          <span className="text-black/60">{t.priceLabel}: </span>
                          {formatDzd(item.price)}
                        </div>
                        <div className="rounded-lg bg-[rgb(var(--gold))]/20 px-2 py-1 text-xs font-semibold text-[rgb(var(--navy))]">
                          <span className="text-black/60">{t.paymentLabel}: </span>
                          {formatPayment(item.paymentTerms || item.locationType)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </motion.section>
        </div>

        <motion.aside
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="hidden h-fit rounded-2xl bg-white/78 p-6 backdrop-blur ring-1 ring-black/5 md:block md:sticky md:top-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[rgb(var(--navy))]">{t.contact}</h2>
              <p className="mt-1 text-sm text-slate-600">{t.cityCountry}</p>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-[rgb(var(--gold))]/20 ring-1 ring-[rgb(var(--gold))]/25" />
          </div>

          <div className="mt-4 rounded-2xl bg-[rgb(var(--navy))]/95 p-4 text-white">
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white/12 p-3">
                <div className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-white/70">
                  <Banknote size={12} className="text-[rgb(var(--gold))]" />
                  {t.priceLabel}
                </div>
                <div className="mt-1 text-base font-semibold text-white">{sidebarDetails.priceLabel}</div>
              </div>
              <div className="rounded-xl bg-white/12 p-3">
                <div className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-white/70">
                  <ReceiptText size={12} className="text-[rgb(var(--gold))]" />
                  {t.commissionLabel}
                </div>
                <div className="mt-1 text-sm font-semibold text-white">{sidebarDetails.agencyFees}</div>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-[rgb(var(--gold))]/35 bg-[rgb(var(--gold))]/18 p-3">
              <div className="text-[11px] uppercase tracking-wide text-white/75">{t.paymentLabel}</div>
              <div className="mt-1 text-sm font-semibold text-[rgb(var(--gold))]">{sidebarDetails.paymentTerms}</div>
            </div>
          </div>

          <div className="mt-4 hidden space-y-3 md:block">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowContactMenu((v) => !v)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[rgb(var(--navy))]
                           px-4 py-3 text-white shadow-sm transition hover:translate-y-[-1px] hover:opacity-95"
              >
                <Phone size={16} />
                {t.call}
                <ChevronDown size={14} className={`transition ${showContactMenu ? "rotate-180" : ""}`} />
              </button>

              {showContactMenu && (
                <div className="absolute left-0 right-0 z-20 mt-2 rounded-xl border border-black/10 bg-white p-2 shadow-lg">
                  <a
                    href={`tel:${phone}`}
                    className="inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[rgb(var(--navy))] hover:bg-black/5"
                  >
                    <Phone size={15} />
                    {phone}
                  </a>
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[rgb(var(--navy))] hover:bg-black/5"
                  >
                    <MessageCircle size={15} />
                    WhatsApp
                  </a>
                </div>
              )}
            </div>

            {isReservationMode ? (
              <button
                type="button"
                onClick={openReservationModal}
                disabled={isBackofficeBlocked}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[rgb(var(--navy))] to-slate-900 px-4 py-3
                           font-semibold text-white shadow-sm ring-1 ring-black/10 transition hover:translate-y-[-1px] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CalendarDays size={16} className="text-[rgb(var(--gold))]" />
                {reservationButtonLabel}
                <span className="rounded-full bg-white/12 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/85">
                  Date
                </span>
              </button>
            ) : (
              <Link
                href={`/visite?ref=${encodeURIComponent(property.ref)}`}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[rgb(var(--navy))] to-slate-900 px-4 py-3
                           font-semibold text-white shadow-sm ring-1 ring-black/10 transition hover:translate-y-[-1px] hover:opacity-95"
              >
                <CalendarDays size={16} className="text-[rgb(var(--gold))]" />
                {t.book}
                <span className="rounded-full bg-white/12 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/85">
                  24h
                </span>
              </Link>
            )}
            <button
              type="button"
              onClick={toggleFavorite}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ring-1 transition ${
                isFavorite
                  ? "bg-rose-50 text-rose-700 ring-rose-200"
                  : "bg-white text-[rgb(var(--navy))] ring-black/10 hover:bg-black/5"
              }`}
              aria-label={favoriteLabel}
              title={favoriteLabel}
            >
              <Heart size={15} className={isFavorite ? "fill-current" : ""} />
              {isArabic ? "مفضلة" : "Favori"}
            </button>
          </div>

          <div className="mt-4 h-1 w-full rounded-full bg-gradient-to-r from-[rgb(var(--gold))]/30 via-[rgb(var(--gold))]/70 to-[rgb(var(--gold))]/30 opacity-70" />
        </motion.aside>
      </div>

      {isReservationMode && reservationOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 md:items-center"
          onClick={() => setReservationOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-3xl bg-white ring-1 ring-black/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-black/10 bg-[rgb(var(--navy))]/95 px-5 py-4 text-white md:px-6">
              <h3 className="text-lg font-semibold">{reservationModalTitle}</h3>
              <p className="mt-1 line-clamp-1 text-sm text-white/75">{property.title}</p>
            </div>

            <div className="space-y-4 p-5 md:p-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-black/55">
                  {reservationOptionLabel}
                </label>
                <div className="mt-1">
                  <AppDropdown
                    value={reservationOption}
                    onValueChange={handleReservationOptionChange}
                    options={reservationOptions.map((option) => ({
                      value: option.value,
                      label: (
                        <span className="inline-flex items-center gap-2">
                          <span>{option.label}</span>
                          {option.nights != null ? (
                            <span className="text-[11px] text-black/50">
                              ({option.nights} {isArabic ? "ليلة" : "nuit(s)"})
                            </span>
                          ) : null}
                        </span>
                      ),
                      searchText: `${option.label} ${option.nights ?? ""}`,
                    }))}
                    placeholder={reservationOptionLabel}
                  />
                </div>
                {fixedReservationNights != null ? (
                  <p className="mt-1 text-[11px] text-black/55">
                    {isArabic
                      ? `الخيار المحدد يضبط تاريخ الخروج تلقائياً (${fixedReservationNights} ليلة).`
                      : `Cette option ajuste automatiquement la date de sortie (${fixedReservationNights} nuit(s)).`}
                  </p>
                ) : null}
                {isPropertyReservedNow && reservationBlockedUntil ? (
                  <p className="mt-1 text-[11px] font-medium text-amber-700">
                    {reservationBlockedUntilLabel} {reservationBlockedUntil}. {reservationNextAvailableLabel}{" "}
                    {reservationStartMinIso}.
                  </p>
                ) : null}
                {reservationBlockedRanges.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {reservationBlockedRanges.slice(0, 8).map((range) => (
                      <span
                        key={`${range.check_in_date}-${range.check_out_date}-${range.status ?? "na"}`}
                        className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700"
                      >
                        {range.check_in_date} - {range.check_out_date}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-black/10 bg-[rgb(var(--navy))]/4 p-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-black/55">
                    {reservationStartDateLabel}
                  </label>
                  <div className="mt-1">
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <DatePicker
                        value={reservationStartDay}
                        minDate={dayjs(reservationStartMinIso)}
                        shouldDisableDate={shouldDisableStartDate}
                        format="DD/MM/YYYY"
                        onChange={(value) => {
                          const next = toIsoOrEmpty(value);
                          setReservationStartDate(next);
                          if (!next) return;
                          if (fixedReservationNights != null && fixedReservationNights > 0) {
                            setReservationEndDate(addDays(next, fixedReservationNights));
                            return;
                          }
                          if (!reservationEndDate || reservationEndDate <= next) {
                            setReservationEndDate(addDays(next, 1));
                          }
                        }}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            size: "small",
                            error: Boolean(reservationStartError),
                            helperText: reservationStartError || " ",
                            sx: {
                              "& .MuiOutlinedInput-root": {
                                borderRadius: "0.65rem",
                                backgroundColor: "#fff",
                              },
                              "& .MuiFormHelperText-root": {
                                marginLeft: "2px",
                                marginRight: "2px",
                              },
                            },
                          },
                          popper: {
                            sx: { zIndex: 60 },
                          },
                        }}
                      />
                    </LocalizationProvider>
                  </div>
                </div>

                <div className="rounded-xl border border-black/10 bg-[rgb(var(--navy))]/4 p-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-black/55">
                    {reservationEndDateLabel}
                  </label>
                  <div className="mt-1">
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <DatePicker
                        value={reservationEndDay}
                        minDate={
                          reservationStartDay && reservationStartDay.isValid()
                            ? reservationStartDay.add(
                                fixedReservationNights != null && fixedReservationNights > 0
                                  ? fixedReservationNights
                                  : 1,
                                "day"
                              )
                            : dayjs(todayIso).add(1, "day")
                        }
                        format="DD/MM/YYYY"
                        shouldDisableDate={shouldDisableEndDate}
                        onChange={(value) => setReservationEndDate(toIsoOrEmpty(value))}
                        disabled={fixedReservationNights != null && fixedReservationNights > 0}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            size: "small",
                            error: Boolean(reservationEndError),
                            helperText: reservationEndError || " ",
                            sx: {
                              "& .MuiOutlinedInput-root": {
                                borderRadius: "0.65rem",
                                backgroundColor: "#fff",
                              },
                              "& .MuiFormHelperText-root": {
                                marginLeft: "2px",
                                marginRight: "2px",
                              },
                            },
                          },
                          popper: {
                            sx: { zIndex: 60 },
                          },
                        }}
                      />
                    </LocalizationProvider>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[rgb(var(--gold))]/35 bg-[rgb(var(--gold))]/15 px-3 py-2 text-sm">
                <span className="font-semibold text-[rgb(var(--navy))]">{reservationNightsLabel}: </span>
                <span className="font-semibold text-[rgb(var(--navy))]">{reservationNights}</span>
              </div>

              {reservationSubmitError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {reservationSubmitError}
                </div>
              ) : null}
              {reservationSubmitSuccess ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                  {reservationSubmitSuccess}
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReservationOpen(false)}
                disabled={reservationSubmitting}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold text-[rgb(var(--navy))] transition hover:bg-black/5"
              >
                {reservationCancelLabel}
              </button>
              <button
                type="button"
                onClick={submitReservation}
                disabled={!isReservationRangeValid || reservationSubmitting || isBackofficeBlocked}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[rgb(var(--navy))] to-slate-900 px-4 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
              >
                {reservationSubmitting ? reservationSavingLabel : reservationConfirmLabel}
              </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur md:hidden">
        <div className="mx-auto max-w-6xl">
          <div className="relative grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setShowContactMenu((v) => !v)}
              className="inline-flex h-11 items-center justify-center gap-1 rounded-xl bg-[rgb(var(--navy))] px-2 text-xs font-semibold text-white"
            >
              <Phone size={14} />
              {t.call}
              <ChevronDown size={12} className={`transition ${showContactMenu ? "rotate-180" : ""}`} />
            </button>
            {isReservationMode ? (
              <button
                type="button"
                onClick={openReservationModal}
                disabled={isBackofficeBlocked}
                className="inline-flex h-11 items-center justify-center gap-1 rounded-xl border border-black/10 bg-white px-2 text-xs font-semibold text-[rgb(var(--navy))]"
              >
                <CalendarDays size={14} />
                {reservationButtonLabel}
              </button>
            ) : (
              <Link
                href={`/visite?ref=${encodeURIComponent(property.ref)}`}
                className="inline-flex h-11 items-center justify-center gap-1 rounded-xl border border-black/10 bg-white px-2 text-xs font-semibold text-[rgb(var(--navy))]"
              >
                <CalendarDays size={14} />
                {t.book}
              </Link>
            )}
            <button
              type="button"
              onClick={toggleFavorite}
              className={`inline-flex h-11 items-center justify-center gap-1 rounded-xl border px-2 text-xs font-semibold ${
                isFavorite
                  ? "border-rose-300 bg-rose-50 text-rose-700"
                  : "border-black/10 bg-white text-[rgb(var(--navy))]"
              }`}
              aria-label={favoriteLabel}
              title={favoriteLabel}
            >
              <Heart size={14} className={isFavorite ? "fill-current" : ""} />
              {isArabic ? "مفضلة" : "Favori"}
            </button>

            {showContactMenu && (
              <div className="absolute bottom-full left-0 right-0 z-30 mb-2 rounded-xl border border-black/10 bg-white p-2 shadow-lg">
                <a
                  href={`tel:${phone}`}
                  className="inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[rgb(var(--navy))] hover:bg-black/5"
                >
                  <Phone size={15} />
                  {phone}
                </a>
                <a
                  href={waLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[rgb(var(--navy))] hover:bg-black/5"
                >
                  <MessageCircle size={15} />
                  WhatsApp
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function KeyFeatureTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="px-4 py-3">
      <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-white/70">
        <span className="text-[rgb(var(--gold))]">{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
