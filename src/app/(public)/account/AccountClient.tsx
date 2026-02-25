"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { propertyImageUrl } from "@/lib/property-image-url";
import {
  Archive,
  ArrowUpRight,
  CheckCircle2,
  BellRing,
  Bookmark,
  CalendarDays,
  CalendarClock,
  Clock3,
  Heart,
  Hotel,
  ImageIcon,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Smartphone,
  Sparkles,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";

type AccountUser = {
  id: string;
  email: string | null;
  phone: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  metadata: Record<string, unknown>;
};

type SavedSearchFilters = {
  q?: string;
  dealType?: string;
  commune?: string;
  district?: string;
  rooms?: string;
  priceMin?: string;
  priceMax?: string;
  areaMin?: string;
  areaMax?: string;
};

type SavedSearchItem = {
  createdAt: string;
  channel: string;
  target: string;
  filters: SavedSearchFilters;
};

type FavoriteItem = {
  ref: string;
  title: string | null;
  location: string | null;
  price: string | null;
  coverImage: string | null;
};

type ReservationHistoryItem = {
  id: string;
  status: string | null;
  property_ref: string | null;
  property_title: string | null;
  property_location: string | null;
  property_price: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  nights: number | null;
  reservation_option_label: string | null;
  created_at: string | null;
  coverImage: string | null;
};

type PhoneModalStep = "phone" | "otp";

const SAVED_SEARCHES_KEY = "rostomyia_saved_searches";
const FAVORITES_KEYS = [
  "rostomyia_favorites",
  "rostomyia_favorite_properties",
  "rostomyia_favorite_refs",
] as const;

function readJsonArray(value: string | null): unknown[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const ts = new Date(value);
  if (Number.isNaN(ts.getTime())) return "-";
  return ts.toLocaleString("fr-FR");
}

function formatDateOnly(value: string | null | undefined) {
  if (!value) return "-";
  const ts = new Date(`${value}T00:00:00`);
  if (Number.isNaN(ts.getTime())) return value;
  return ts.toLocaleDateString("fr-FR");
}

function nonEmpty(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizePhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) {
    return `+${trimmed.slice(1).replace(/\D/g, "")}`;
  }
  return `+${trimmed.replace(/\D/g, "")}`;
}

function formatPriceWithCurrency(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/(dzd|da|دج|dinars?)/i.test(trimmed)) return trimmed;

  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return `${trimmed} DZD`;

  const n = Number(digits);
  if (!Number.isFinite(n)) return `${trimmed} DZD`;
  return `${n.toLocaleString("fr-FR")} DZD`;
}

function reservationStatusLabel(status: string | null | undefined) {
  const normalized = String(status ?? "new").trim().toLowerCase();
  if (normalized === "hold") return "En attente";
  if (normalized === "contacted") return "Contacte";
  if (normalized === "confirmed") return "Confirme";
  if (normalized === "cancelled") return "Annule";
  if (normalized === "closed") return "Cloture";
  return "Nouveau";
}

function reservationStatusClass(status: string | null | undefined) {
  const normalized = String(status ?? "new").trim().toLowerCase();
  if (normalized === "hold") return "border-violet-200 bg-violet-50 text-violet-700";
  if (normalized === "contacted") return "border-sky-200 bg-sky-50 text-sky-700";
  if (normalized === "confirmed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized === "cancelled") return "border-rose-200 bg-rose-50 text-rose-700";
  if (normalized === "closed") return "border-slate-300 bg-slate-100 text-slate-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function stableCoverImageUrl(value: unknown): string | null {
  if (!nonEmpty(value)) return null;
  const raw = String(value).trim();
  const marker = "/storage/v1/render/image/public/property-images/";
  if (!raw.includes(marker)) return raw;
  const withoutQuery = raw.split("?")[0];
  return withoutQuery.replace(marker, "/storage/v1/object/public/property-images/");
}

function buildSavedSearchHref(filters: SavedSearchFilters) {
  const params = new URLSearchParams();
  if (nonEmpty(filters.q)) params.set("q", String(filters.q).trim());
  if (nonEmpty(filters.dealType) && String(filters.dealType).trim() !== "Tous") {
    params.set("dealType", String(filters.dealType).trim());
  }
  if (nonEmpty(filters.commune)) params.set("commune", String(filters.commune).trim());
  if (nonEmpty(filters.district)) params.set("district", String(filters.district).trim());
  if (nonEmpty(filters.rooms)) params.set("rooms", String(filters.rooms).trim());
  if (nonEmpty(filters.priceMin)) params.set("priceMin", String(filters.priceMin).trim());
  if (nonEmpty(filters.priceMax)) params.set("priceMax", String(filters.priceMax).trim());
  if (nonEmpty(filters.areaMin)) params.set("areaMin", String(filters.areaMin).trim());
  if (nonEmpty(filters.areaMax)) params.set("areaMax", String(filters.areaMax).trim());
  params.set("source", "account_saved_search");
  return params.toString() ? `/biens?${params.toString()}` : "/biens";
}

function savedSearchSummary(filters: SavedSearchFilters) {
  const parts: string[] = [];
  if (nonEmpty(filters.q)) parts.push(`Mot-cle: ${String(filters.q).trim()}`);
  if (nonEmpty(filters.dealType) && String(filters.dealType).trim() !== "Tous") {
    parts.push(`Type: ${String(filters.dealType).trim()}`);
  }
  if (nonEmpty(filters.commune)) parts.push(`Commune: ${String(filters.commune).trim()}`);
  if (nonEmpty(filters.district)) parts.push(`Quartier: ${String(filters.district).trim()}`);
  if (nonEmpty(filters.rooms)) parts.push(`Pieces: ${String(filters.rooms).trim()}`);
  if (nonEmpty(filters.priceMin) || nonEmpty(filters.priceMax)) {
    parts.push(`Budget: ${filters.priceMin || "0"} - ${filters.priceMax || "max"}`);
  }
  if (nonEmpty(filters.areaMin) || nonEmpty(filters.areaMax)) {
    parts.push(`Surface: ${filters.areaMin || "0"} - ${filters.areaMax || "max"} m2`);
  }
  return parts.length ? parts.join(" | ") : "Recherche enregistree";
}

function channelLabel(channel: string) {
  const normalized = channel.trim().toLowerCase();
  if (normalized === "whatsapp") return "WhatsApp";
  if (normalized === "sms") return "SMS";
  return "Email";
}

function savedSearchTags(filters: SavedSearchFilters) {
  const tags: string[] = [];
  if (nonEmpty(filters.dealType) && String(filters.dealType).trim() !== "Tous") {
    tags.push(String(filters.dealType).trim());
  }
  if (nonEmpty(filters.commune)) tags.push(`Commune: ${String(filters.commune).trim()}`);
  if (nonEmpty(filters.district)) tags.push(`Quartier: ${String(filters.district).trim()}`);
  if (nonEmpty(filters.rooms)) tags.push(`Pieces: ${String(filters.rooms).trim()}`);
  if (nonEmpty(filters.priceMin) || nonEmpty(filters.priceMax)) {
    tags.push(`Budget: ${filters.priceMin || "0"} - ${filters.priceMax || "max"}`);
  }
  if (nonEmpty(filters.areaMin) || nonEmpty(filters.areaMax)) {
    tags.push(`Surface: ${filters.areaMin || "0"} - ${filters.areaMax || "max"} m2`);
  }
  return tags.slice(0, 4);
}

function normalizeSavedSearch(value: unknown): SavedSearchItem | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const createdAt = nonEmpty(row.createdAt) ? String(row.createdAt) : new Date().toISOString();
  const channel = nonEmpty(row.channel) ? String(row.channel) : "email";
  const target = nonEmpty(row.target) ? String(row.target) : "-";
  const filtersRaw = row.filters && typeof row.filters === "object" ? (row.filters as Record<string, unknown>) : {};
  const filters: SavedSearchFilters = {
    q: nonEmpty(filtersRaw.q) ? String(filtersRaw.q) : undefined,
    dealType: nonEmpty(filtersRaw.dealType) ? String(filtersRaw.dealType) : undefined,
    commune: nonEmpty(filtersRaw.commune) ? String(filtersRaw.commune) : undefined,
    district: nonEmpty(filtersRaw.district) ? String(filtersRaw.district) : undefined,
    rooms: nonEmpty(filtersRaw.rooms) ? String(filtersRaw.rooms) : undefined,
    priceMin: nonEmpty(filtersRaw.priceMin) ? String(filtersRaw.priceMin) : undefined,
    priceMax: nonEmpty(filtersRaw.priceMax) ? String(filtersRaw.priceMax) : undefined,
    areaMin: nonEmpty(filtersRaw.areaMin) ? String(filtersRaw.areaMin) : undefined,
    areaMax: nonEmpty(filtersRaw.areaMax) ? String(filtersRaw.areaMax) : undefined,
  };
  return { createdAt, channel, target, filters };
}

function normalizeFavorites(source: unknown[]): FavoriteItem[] {
  const rows: FavoriteItem[] = [];

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
    const refCandidate = nonEmpty(row.ref)
      ? String(row.ref)
      : nonEmpty(row.id)
      ? String(row.id)
      : null;
    if (!refCandidate) return;

    rows.push({
      ref: refCandidate.trim(),
      title: nonEmpty(row.title) ? String(row.title).trim() : null,
      location: nonEmpty(row.location) ? String(row.location).trim() : null,
      price: nonEmpty(row.price) ? String(row.price).trim() : null,
      coverImage: stableCoverImageUrl(
        nonEmpty(row.coverImage) ? String(row.coverImage).trim() :
        nonEmpty(row.image) ? String(row.image).trim() :
        nonEmpty(row.imageUrl) ? String(row.imageUrl).trim() :
        null
      ),
    });
  });

  const seen = new Set<string>();
  return rows.filter((item) => {
    const key = item.ref.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeReservationHistory(source: unknown[]): ReservationHistoryItem[] {
  const rows: ReservationHistoryItem[] = [];
  source.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    const row = entry as Record<string, unknown>;
    if (!nonEmpty(row.id)) return;
    rows.push({
      id: String(row.id),
      status: nonEmpty(row.status) ? String(row.status) : null,
      property_ref: nonEmpty(row.property_ref) ? String(row.property_ref) : null,
      property_title: nonEmpty(row.property_title) ? String(row.property_title) : null,
      property_location: nonEmpty(row.property_location) ? String(row.property_location) : null,
      property_price: nonEmpty(row.property_price) ? String(row.property_price) : null,
      check_in_date: nonEmpty(row.check_in_date) ? String(row.check_in_date) : null,
      check_out_date: nonEmpty(row.check_out_date) ? String(row.check_out_date) : null,
      nights: typeof row.nights === "number" ? row.nights : null,
      reservation_option_label: nonEmpty(row.reservation_option_label)
        ? String(row.reservation_option_label)
        : null,
      created_at: nonEmpty(row.created_at) ? String(row.created_at) : null,
      coverImage: stableCoverImageUrl(
        nonEmpty(row.cover_image)
          ? String(row.cover_image)
          : nonEmpty(row.coverImage)
          ? String(row.coverImage)
          : null
      ),
    });
  });
  return rows;
}

export default function AccountClient({ user }: { user: AccountUser }) {
  const [savedSearches, setSavedSearches] = useState<SavedSearchItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [reservationsHistory, setReservationsHistory] = useState<ReservationHistoryItem[]>([]);
  const [reservationsLoading, setReservationsLoading] = useState(true);
  const [reservationsError, setReservationsError] = useState<string | null>(null);
  const [favoritesStorageKey, setFavoritesStorageKey] = useState<string>(String(FAVORITES_KEYS[0]));
  const supabase = useMemo(() => createClient(), []);
  const profilePhone = useMemo(() => {
    const metadataPhone =
      nonEmpty(user.metadata.phone) ? String(user.metadata.phone) :
      nonEmpty(user.metadata.agency_phone) ? String(user.metadata.agency_phone) :
      null;
    return metadataPhone || user.phone || "";
  }, [user.metadata, user.phone]);
  const [phone, setPhone] = useState(profilePhone);
  const [phoneDraft, setPhoneDraft] = useState(profilePhone);
  const [phoneMessage, setPhoneMessage] = useState<string | null>(null);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [phoneModalStep, setPhoneModalStep] = useState<PhoneModalStep>("phone");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [pendingPhone, setPendingPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneInfo, setPhoneInfo] = useState<string | null>(null);
  const [isPhoneLoading, setIsPhoneLoading] = useState(false);

  useEffect(() => {
    const rawSaved = readJsonArray(localStorage.getItem(SAVED_SEARCHES_KEY));
    setSavedSearches(rawSaved.map(normalizeSavedSearch).filter(Boolean) as SavedSearchItem[]);

    let selectedKey = String(FAVORITES_KEYS[0]);
    let favoriteRows: FavoriteItem[] = [];
    for (const key of FAVORITES_KEYS) {
      const raw = readJsonArray(localStorage.getItem(key));
      const normalized = normalizeFavorites(raw);
      if (normalized.length > 0) {
        selectedKey = key;
        favoriteRows = normalized;
        break;
      }
    }
    setFavoritesStorageKey(selectedKey);
    setFavorites(favoriteRows);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadReservationHistory() {
      setReservationsLoading(true);
      setReservationsError(null);
      try {
        const response = await fetch("/api/account/reservations", { method: "GET", cache: "no-store" });
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error || "reservation_history_failed");
        }
        const payload = (await response.json()) as { reservations?: ReservationHistoryItem[] };
        if (cancelled) return;
        setReservationsHistory(
          Array.isArray(payload.reservations) ? normalizeReservationHistory(payload.reservations) : []
        );
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Impossible de charger l'historique";
        setReservationsError(message);
      } finally {
        if (!cancelled) setReservationsLoading(false);
      }
    }

    loadReservationHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const missingRefs = reservationsHistory
      .filter((item) => !item.coverImage && nonEmpty(item.property_ref))
      .map((item) => String(item.property_ref));
    if (missingRefs.length === 0) return;

    let cancelled = false;
    async function hydrateReservationCovers() {
      const { data, error } = await supabase
        .from("properties")
        .select("ref, property_images(path, sort)")
        .in("ref", missingRefs);

      if (cancelled || error || !Array.isArray(data)) return;

      const coverByRef = new Map<string, string>();
      data.forEach((entry) => {
        const row = entry as Record<string, unknown>;
        if (!nonEmpty(row.ref)) return;

        const imagesRaw = Array.isArray(row.property_images) ? row.property_images : [];
        const sorted = imagesRaw
          .map((img) => (img && typeof img === "object" ? (img as Record<string, unknown>) : null))
          .filter(Boolean)
          .sort((a, b) => {
            const sa = typeof a?.sort === "number" ? a.sort : 0;
            const sb = typeof b?.sort === "number" ? b.sort : 0;
            return sa - sb;
          });

        const firstPath = sorted.find((img) => nonEmpty(img?.path))?.path ?? null;
        if (!nonEmpty(firstPath)) return;

        const cover = stableCoverImageUrl(
          propertyImageUrl(String(firstPath), { width: 1200, quality: 76, format: "webp" })
        );
        if (!cover) return;
        coverByRef.set(String(row.ref).toLowerCase(), cover);
      });

      if (coverByRef.size === 0) return;

      setReservationsHistory((prev) => {
        let changed = false;
        const next = prev.map((item) => {
          if (item.coverImage) return item;
          if (!item.property_ref) return item;
          const cover = coverByRef.get(String(item.property_ref).toLowerCase());
          if (!cover) return item;
          changed = true;
          return { ...item, coverImage: cover };
        });
        return changed ? next : prev;
      });
    }

    hydrateReservationCovers();
    return () => {
      cancelled = true;
    };
  }, [reservationsHistory, supabase]);

  useEffect(() => {
    setPhone(profilePhone);
    setPhoneDraft(profilePhone);
  }, [profilePhone]);

  useEffect(() => {
    const missingRefs = favorites
      .filter((item) => !item.coverImage && nonEmpty(item.ref))
      .map((item) => item.ref);
    if (missingRefs.length === 0) return;

    let cancelled = false;
    async function hydrateFavoriteCovers() {
      const { data, error } = await supabase
        .from("properties")
        .select("ref, property_images(path, sort)")
        .in("ref", missingRefs);
      if (cancelled || error || !Array.isArray(data)) return;

      const coverByRef = new Map<string, string>();
      data.forEach((entry) => {
        const row = entry as Record<string, unknown>;
        if (!nonEmpty(row.ref)) return;

        const imagesRaw = Array.isArray(row.property_images) ? row.property_images : [];
        const sorted = imagesRaw
          .map((img) => (img && typeof img === "object" ? (img as Record<string, unknown>) : null))
          .filter(Boolean)
          .sort((a, b) => {
            const sa = typeof a?.sort === "number" ? a.sort : 0;
            const sb = typeof b?.sort === "number" ? b.sort : 0;
            return sa - sb;
          });
        const firstPath =
          sorted.find((img) => nonEmpty(img?.path))?.path ??
          null;
        if (!nonEmpty(firstPath)) return;

        const cover = stableCoverImageUrl(propertyImageUrl(String(firstPath), { width: 1200, quality: 76, format: "webp" }));
        if (!cover) return;
        coverByRef.set(String(row.ref).toLowerCase(), cover);
      });

      if (coverByRef.size === 0) return;

      setFavorites((prev) => {
        let changed = false;
        const next = prev.map((item) => {
          if (item.coverImage) return item;
          const cover = coverByRef.get(item.ref.toLowerCase());
          if (!cover) return item;
          changed = true;
          return { ...item, coverImage: cover };
        });
        if (!changed) return prev;
        localStorage.setItem(favoritesStorageKey, JSON.stringify(next));
        return next;
      });
    }

    hydrateFavoriteCovers();
    return () => {
      cancelled = true;
    };
  }, [favorites, favoritesStorageKey, supabase]);

  const profile = useMemo(() => {
    const fullName =
      nonEmpty(user.metadata.full_name) ? String(user.metadata.full_name) :
      nonEmpty(user.metadata.username) ? String(user.metadata.username) :
      nonEmpty(user.metadata.name) ? String(user.metadata.name) :
      nonEmpty(user.metadata.agency_name) ? String(user.metadata.agency_name) :
      "-";

    return { fullName };
  }, [user.metadata]);

  function removeSavedSearch(index: number) {
    const next = savedSearches.filter((_, idx) => idx !== index);
    setSavedSearches(next);
    localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(next));
  }

  function clearSavedSearches() {
    setSavedSearches([]);
    localStorage.removeItem(SAVED_SEARCHES_KEY);
  }

  function removeFavorite(ref: string) {
    const next = favorites.filter((item) => item.ref !== ref);
    setFavorites(next);
    localStorage.setItem(favoritesStorageKey, JSON.stringify(next));
  }

  function clearFavorites() {
    setFavorites([]);
    localStorage.removeItem(favoritesStorageKey);
  }

  function openPhoneModal() {
    setIsPhoneModalOpen(true);
    setPhoneModalStep("phone");
    setPhoneDraft(phone);
    setPhoneOtp("");
    setPendingPhone("");
    setPhoneError(null);
    setPhoneInfo(null);
  }

  function closePhoneModal() {
    if (isPhoneLoading) return;
    setIsPhoneModalOpen(false);
    setPhoneModalStep("phone");
    setPhoneOtp("");
    setPendingPhone("");
    setPhoneError(null);
    setPhoneInfo(null);
  }

  async function sendPhoneChangeOtp() {
    const normalizedPhone = normalizePhone(phoneDraft);
    if (!/^\+\d{8,15}$/.test(normalizedPhone)) {
      setPhoneError("Telephone invalide. Exemple: +2135xxxxxxx");
      return;
    }

    setIsPhoneLoading(true);
    setPhoneError(null);
    setPhoneInfo(null);
    const { error } = await supabase.auth.updateUser({ phone: normalizedPhone });
    setIsPhoneLoading(false);

    if (error) {
      setPhoneError(error.message || "Impossible d'envoyer le code OTP.");
      return;
    }

    setPendingPhone(normalizedPhone);
    setPhoneModalStep("otp");
    setPhoneInfo("Code OTP envoye. Entrez le code pour confirmer le changement.");
  }

  async function confirmPhoneChangeOtp() {
    const token = phoneOtp.trim();
    if (!token) {
      setPhoneError("Entrez le code OTP.");
      return;
    }

    setIsPhoneLoading(true);
    setPhoneError(null);
    setPhoneInfo(null);

    const verify = await supabase.auth.verifyOtp({
      phone: pendingPhone,
      token,
      type: "phone_change",
    });

    let verifyError = verify.error;
    let verifyData = verify.data;

    if (verifyError) {
      const fallback = await supabase.auth.verifyOtp({
        phone: pendingPhone,
        token,
        type: "sms",
      });
      verifyError = fallback.error;
      verifyData = fallback.data;
    }

    setIsPhoneLoading(false);

    if (verifyError) {
      setPhoneError(verifyError.message || "Code OTP incorrect ou expire.");
      return;
    }

    const updatedPhone =
      nonEmpty(verifyData.user?.phone) ? String(verifyData.user?.phone) :
      nonEmpty(verifyData.user?.user_metadata?.phone) ? String(verifyData.user?.user_metadata?.phone) :
      nonEmpty(verifyData.user?.user_metadata?.agency_phone) ? String(verifyData.user?.user_metadata?.agency_phone) :
      pendingPhone;

    setPhone(updatedPhone);
    setPhoneDraft(updatedPhone);
    setPhoneMessage("Telephone mis a jour.");
    closePhoneModal();
  }

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-10">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-6 h-72 w-72 rounded-full bg-[rgb(var(--gold))]/18 blur-3xl" />
        <div className="absolute -right-24 top-16 h-80 w-80 rounded-full bg-[rgb(var(--navy))]/12 blur-3xl" />
      </div>

      <section className="relative overflow-hidden rounded-3xl border border-[rgb(var(--gold))]/35 bg-[linear-gradient(125deg,rgba(10,18,35,0.96),rgba(15,30,58,0.92))] p-6 text-white">
        <div className="absolute right-[-56px] top-[-56px] h-40 w-40 rounded-full bg-[rgb(var(--gold))]/25 blur-2xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white/90">
            <Sparkles size={13} className="text-[rgb(var(--gold))]" />
            Espace personnel
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Mon compte</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/75">
            Gestion du profil, sauvegardes et favoris en un seul endroit.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/85">
              <Mail size={12} className="text-[rgb(var(--gold))]" />
              {user.email || "-"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/85">
              <CalendarClock size={12} className="text-[rgb(var(--gold))]" />
              Creation: {formatDate(user.createdAt)}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link
              href="/biens"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[rgb(var(--navy))] transition hover:opacity-90"
            >
              Parcourir les biens
              <ArrowUpRight size={14} />
            </Link>
            <form action="/logout" method="post">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                <LogOut size={14} />
                Deconnexion
              </button>
            </form>
          </div>
        </div>
      </section>

      <div className="mt-6">
        <section className="rounded-3xl border border-[rgb(var(--navy))]/15 bg-[linear-gradient(175deg,rgba(255,255,255,0.98),rgba(247,249,252,0.94))] p-5 backdrop-blur sm:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--navy))]">
                <UserRound size={16} />
                Details du compte
              </div>
              <p className="mt-1 text-xs text-black/55">Informations personnelles et securite du contact.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--gold))]/30 bg-[rgb(var(--gold))]/10 px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--navy))]">
              <Sparkles size={12} />
              Profil actif
            </span>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-2xl border border-black/10 bg-white/95 p-4">
              <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.1em] text-black/50">
                <UserRound size={12} />
                Nom
              </div>
              <div className="mt-1.5 font-semibold text-[rgb(var(--navy))]">{profile.fullName}</div>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white/95 p-4">
              <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.1em] text-black/50">
                <Mail size={12} />
                Email
              </div>
              <div className="mt-1.5 font-semibold text-[rgb(var(--navy))]">{user.email || "-"}</div>
            </div>
            <div className="rounded-2xl border border-[rgb(var(--navy))]/15 bg-[linear-gradient(160deg,rgba(15,30,58,0.03),rgba(255,255,255,0.96))] p-4 sm:col-span-2">
              <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.1em] text-black/50">
                <Phone size={12} />
                Telephone
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="font-semibold text-[rgb(var(--navy))]">{phone || "-"}</div>
                <button
                  type="button"
                  onClick={openPhoneModal}
                  className="rounded-lg border border-[rgb(var(--navy))]/20 bg-white px-3 py-1.5 text-xs font-semibold text-[rgb(var(--navy))] hover:bg-[rgb(var(--navy))]/5"
                >
                  Modifier
                </button>
              </div>
              {phoneMessage ? (
                <p className="mt-2 text-xs text-emerald-700">{phoneMessage}</p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-black/10 bg-white/95 p-4">
              <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.1em] text-black/50">
                <CalendarClock size={12} />
                Creation
              </div>
              <div className="mt-1.5 font-semibold text-[rgb(var(--navy))]">{formatDate(user.createdAt)}</div>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white/95 p-4">
              <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.1em] text-black/50">
                <Clock3 size={12} />
                Derniere connexion
              </div>
              <div className="mt-1.5 font-semibold text-[rgb(var(--navy))]">{formatDate(user.lastSignInAt)}</div>
            </div>
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-3xl border border-[rgb(var(--navy))]/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,250,253,0.9))] p-5 backdrop-blur">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--navy))]">
              <Hotel size={16} />
              Historique des reservations
              <span className="rounded-full border border-[rgb(var(--navy))]/15 bg-[rgb(var(--navy))]/5 px-2 py-0.5 text-xs font-semibold text-[rgb(var(--navy))]">
                {reservationsHistory.length}
              </span>
            </div>
            <p className="mt-1 text-xs text-black/60">
              Suivi de vos reservations court sejour avec statuts et periodes.
            </p>
          </div>
        </div>

        <div className="mb-4 h-px w-full bg-[linear-gradient(90deg,rgba(2,6,23,0.1),rgba(2,6,23,0.03))]" />

        {reservationsLoading ? (
          <div className="rounded-2xl border border-dashed border-black/15 bg-white/95 px-4 py-6 text-center">
            <p className="text-sm text-black/60">Chargement de l&apos;historique...</p>
          </div>
        ) : reservationsError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
            Impossible de charger l&apos;historique des reservations.
          </div>
        ) : reservationsHistory.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/15 bg-white/95 px-4 py-6 text-center">
            <div className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-black/[0.03] text-black/55">
              <Hotel size={16} />
            </div>
            <p className="mt-2 text-sm text-black/60">Aucune reservation enregistree.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reservationsHistory.map((item) => {
              const normalizedStatus = String(item.status ?? "new").trim().toLowerCase();
              const StatusIcon =
                normalizedStatus === "confirmed"
                  ? CheckCircle2
                  : normalizedStatus === "cancelled"
                  ? XCircle
                  : normalizedStatus === "closed"
                  ? Archive
                  : Clock3;
              const propertyRef = item.property_ref ? String(item.property_ref) : null;
              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[rgb(var(--navy))]/12 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(246,248,252,0.94))] p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl border border-[rgb(var(--navy))]/18 bg-slate-100 shadow-[0_10px_22px_-16px_rgba(15,23,42,0.7)]">
                      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-7 bg-gradient-to-b from-black/28 to-transparent" />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-8 bg-gradient-to-t from-black/36 to-transparent" />
                      {item.coverImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.coverImage}
                          alt={item.property_title || propertyRef || "Reservation"}
                          className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-slate-200 via-slate-100 to-white text-[11px] font-semibold text-black/55">
                          <ImageIcon size={16} />
                          {propertyRef || "RES"}
                        </div>
                      )}
                      <span className="absolute left-1.5 top-1.5 z-[2] inline-flex items-center gap-1 rounded-md border border-white/35 bg-black/45 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        <ImageIcon size={10} />
                        Photo
                      </span>
                      <span className="absolute bottom-1.5 left-1.5 z-[2] max-w-[90%] truncate rounded-md border border-white/35 bg-black/45 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {propertyRef || "RES"}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold ${reservationStatusClass(
                            item.status
                          )}`}
                        >
                          <StatusIcon size={12} />
                          {reservationStatusLabel(item.status)}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-black/[0.03] px-2 py-0.5 text-black/65">
                          <CalendarClock size={12} />
                          {formatDate(item.created_at)}
                        </span>
                      </div>
                      <p className="truncate text-sm font-semibold text-[rgb(var(--navy))]">
                        {item.property_title || propertyRef || "Bien sans titre"}
                      </p>
                      <div className="mt-1.5 space-y-1.5">
                        <p className="inline-flex items-center gap-1.5 text-[13px] text-black/70">
                          <MapPin size={12} />
                          <span className="font-semibold tracking-[0.01em] text-[rgb(var(--navy))]">
                            {item.property_location || "-"}
                          </span>
                        </p>
                        <div className="space-y-1 text-[13px]">
                          <p className="inline-flex items-center gap-1.5 font-medium text-[rgb(var(--navy))]">
                            <CalendarDays size={12} />
                            Sejour: {formatDateOnly(item.check_in_date)} - {formatDateOnly(item.check_out_date)}
                            {typeof item.nights === "number" ? ` (${item.nights} nuit(s))` : ""}
                          </p>
                        </div>
                      </div>
                      {item.property_price ? (
                        <p className="mt-2 inline-flex items-center rounded-full border border-[rgb(var(--gold))]/45 bg-[rgb(var(--gold))]/16 px-3 py-1 text-sm font-extrabold tracking-wide text-[rgb(var(--navy))] shadow-[0_8px_18px_-14px_rgba(180,145,72,0.9)]">
                          {formatPriceWithCurrency(item.property_price) ?? item.property_price}
                        </p>
                      ) : null}
                      {propertyRef ? (
                        <Link
                          href={`/biens/${encodeURIComponent(propertyRef)}`}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[linear-gradient(135deg,rgba(var(--navy),1),rgba(20,50,95,1))] px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_12px_22px_-16px_rgba(15,30,58,0.9)] transition hover:brightness-105"
                        >
                          Voir bien
                          <ArrowUpRight size={12} />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-3xl border border-[rgb(var(--navy))]/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,250,253,0.9))] p-5 backdrop-blur">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--navy))]">
              <Bookmark size={16} />
              Recherches sauvegardees
              <span className="rounded-full border border-[rgb(var(--navy))]/15 bg-[rgb(var(--navy))]/5 px-2 py-0.5 text-xs font-semibold text-[rgb(var(--navy))]">
                {savedSearches.length}
              </span>
            </div>
            <p className="mt-1 text-xs text-black/60">
              Retrouver rapidement vos criteres pour relancer une recherche en 1 clic.
            </p>
          </div>
          {savedSearches.length > 0 ? (
            <button
              type="button"
              onClick={clearSavedSearches}
              className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-black/70 hover:bg-black/5"
            >
              <Trash2 size={13} />
              Vider
            </button>
          ) : null}
        </div>

        <div className="mb-4 h-px w-full bg-[linear-gradient(90deg,rgba(2,6,23,0.1),rgba(2,6,23,0.03))]" />

        {savedSearches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/15 bg-white/95 px-4 py-6 text-center">
            <div className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-black/[0.03] text-black/55">
              <BellRing size={16} />
            </div>
            <p className="mt-2 text-sm text-black/60">Aucune recherche sauvegardee pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedSearches.map((item, idx) => {
              const tags = savedSearchTags(item.filters);
              const channel = channelLabel(item.channel);
              const ChannelIcon = channel === "WhatsApp" ? MessageCircle : channel === "SMS" ? Smartphone : Mail;
              return (
                <article
                  key={`${item.createdAt}-${idx}`}
                  className="rounded-2xl border border-[rgb(var(--navy))]/12 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(246,248,252,0.94))] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-black/[0.03] px-2 py-0.5 text-black/65">
                          <CalendarClock size={12} />
                          {formatDate(item.createdAt)}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-[rgb(var(--gold))]/35 bg-[rgb(var(--gold))]/10 px-2 py-0.5 font-medium text-black/70">
                          <ChannelIcon size={12} />
                          {channel}
                        </span>
                      </div>
                      <p className="truncate text-sm font-semibold text-[rgb(var(--navy))]">
                        {savedSearchSummary(item.filters)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {tags.length > 0 ? (
                          tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-black/10 bg-white px-2 py-0.5 text-[11px] text-black/65"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="rounded-full border border-black/10 bg-white px-2 py-0.5 text-[11px] text-black/60">
                            Recherche generale
                          </span>
                        )}
                      </div>
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-black/60">
                        <MapPin size={12} />
                        <span className="font-medium text-black/70">{item.target}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={buildSavedSearchHref(item.filters)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[rgb(var(--navy))]/20 bg-white px-3 py-1.5 text-xs font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
                      >
                        Ouvrir
                        <ArrowUpRight size={12} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeSavedSearch(idx)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-black/70 hover:bg-black/5"
                      >
                        <Trash2 size={12} />
                        Supprimer
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="relative mt-6 overflow-hidden rounded-3xl border border-[rgb(var(--navy))]/14 bg-[linear-gradient(170deg,rgba(255,255,255,0.98),rgba(245,248,252,0.92))] p-5 backdrop-blur">
        <div className="pointer-events-none absolute -right-24 top-[-110px] h-56 w-56 rounded-full bg-[rgb(var(--gold))]/12 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-[-120px] h-52 w-52 rounded-full bg-[rgb(var(--navy))]/8 blur-3xl" />

        <div className="relative mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--navy))]">
              <Heart size={16} />
              Favoris
              <span className="rounded-full border border-[rgb(var(--navy))]/20 bg-[rgb(var(--navy))]/7 px-2 py-0.5 text-xs font-semibold text-[rgb(var(--navy))]">
                {favorites.length}
              </span>
            </div>
            <p className="mt-1 text-xs text-black/60">Votre selection de biens avec apercu photo et acces rapide.</p>
          </div>
          {favorites.length > 0 ? (
            <button
              type="button"
              onClick={clearFavorites}
              className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-black/70 hover:bg-black/5"
            >
              <Trash2 size={13} />
              Vider
            </button>
          ) : null}
        </div>

        <div className="mb-4 h-px w-full bg-[linear-gradient(90deg,rgba(2,6,23,0.12),rgba(2,6,23,0.02))]" />

        {favorites.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/15 bg-white/95 px-4 py-6 text-center">
            <div className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-black/[0.03] text-black/55">
              <Heart size={16} />
            </div>
            <p className="mt-2 text-sm text-black/60">Aucun favori pour le moment.</p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {favorites.map((item) => {
              const priceLabel = formatPriceWithCurrency(item.price);
              return (
                <article
                  key={item.ref}
                  className="group rounded-2xl border border-[rgb(var(--navy))]/12 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(246,248,252,0.94))] p-3 transition hover:border-[rgb(var(--navy))]/25"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-slate-100">
                      {item.coverImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.coverImage}
                          alt={item.title || item.ref}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 via-slate-100 to-white text-[11px] font-semibold text-black/55">
                          {item.ref}
                        </div>
                      )}
                      <span className="absolute left-2 top-2 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {item.ref}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-1 text-sm font-semibold text-[rgb(var(--navy))]">{item.title || item.ref}</div>
                      {item.location ? (
                        <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-black/60">
                          <MapPin size={12} />
                          <span className="line-clamp-1">{item.location}</span>
                        </div>
                      ) : null}
                      {priceLabel ? (
                        <div className="mt-1 block text-xs font-semibold text-[rgb(var(--navy))]">
                          {priceLabel}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-end gap-2">
                    <Link
                      href={`/biens/${encodeURIComponent(item.ref)}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[rgb(var(--navy))]/20 bg-white px-3 py-1.5 text-xs font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
                    >
                      Voir
                      <ArrowUpRight size={12} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeFavorite(item.ref)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-black/70 hover:bg-black/5"
                    >
                      <Trash2 size={12} />
                      Supprimer
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {phone ? (
        <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/85 px-3 py-2 text-xs text-black/65">
          <Phone size={13} />
          Contact principal: {phone}
        </div>
      ) : null}

      {isPhoneModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Fermer"
            onClick={closePhoneModal}
            className="absolute inset-0 bg-black/45"
          />
          <div className="relative w-full max-w-md rounded-2xl border border-black/10 bg-white p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[rgb(var(--navy))]">
              <Phone size={16} />
              Modifier le telephone
            </div>
            <p className="text-xs text-black/60">
              {phoneModalStep === "phone"
                ? "Entrez le nouveau numero pour recevoir un code OTP."
                : `Confirmez avec le code recu sur ${pendingPhone}.`}
            </p>

            {phoneModalStep === "phone" ? (
              <div className="mt-4 space-y-3">
                <input
                  type="tel"
                  value={phoneDraft}
                  onChange={(e) => {
                    setPhoneDraft(e.target.value);
                    if (phoneError) setPhoneError(null);
                    if (phoneInfo) setPhoneInfo(null);
                  }}
                  placeholder="+2135xxxxxxx"
                  className="w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[rgb(var(--navy))]/40 focus:ring-2 focus:ring-[rgb(var(--navy))]/15"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={closePhoneModal}
                    className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-black/70 hover:bg-black/5"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={sendPhoneChangeOtp}
                    disabled={isPhoneLoading}
                    className="rounded-lg bg-[rgb(var(--navy))] px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPhoneLoading ? "Envoi..." : "Envoyer le code"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  value={phoneOtp}
                  onChange={(e) => {
                    setPhoneOtp(e.target.value);
                    if (phoneError) setPhoneError(null);
                    if (phoneInfo) setPhoneInfo(null);
                  }}
                  placeholder="Code OTP"
                  className="w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm tracking-[0.18em] text-black outline-none transition focus:border-[rgb(var(--navy))]/40 focus:ring-2 focus:ring-[rgb(var(--navy))]/15"
                />
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneModalStep("phone");
                      setPhoneOtp("");
                      setPhoneError(null);
                      setPhoneInfo(null);
                    }}
                    className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-black/70 hover:bg-black/5"
                  >
                    Changer numero
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={closePhoneModal}
                      className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-black/70 hover:bg-black/5"
                    >
                      Fermer
                    </button>
                    <button
                      type="button"
                      onClick={confirmPhoneChangeOtp}
                      disabled={isPhoneLoading}
                      className="rounded-lg bg-[rgb(var(--navy))] px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPhoneLoading ? "Verification..." : "Confirmer"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {phoneError ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{phoneError}</p>
            ) : null}
            {phoneInfo ? (
              <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{phoneInfo}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
