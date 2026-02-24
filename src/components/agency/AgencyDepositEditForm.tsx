"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  Save,
} from "lucide-react";
import AppDropdown from "@/components/ui/app-dropdown";
import { Input } from "@/components/ui/input";
import { ORAN_COMMUNES } from "@/lib/oran-locations";
import { createClient } from "@/lib/supabase/client";
import UnsavedDescriptionModal from "@/components/admin/UnsavedDescriptionModal";
import { useUnsavedNavigationGuard } from "@/hooks/use-unsaved-navigation-guard";
import {
  getDescriptionMetrics,
  getDescriptionState,
  hasUnsavedDescriptionChanges,
} from "@/lib/description-editor";

type AgencyEditableLead = {
  id: string;
  title: string | null;
  property_type: string | null;
  transaction_type: string | null;
  location_type: string | null;
  commune: string | null;
  district: string | null;
  address: string | null;
  city: string | null;
  price: number | null;
  surface: number | null;
  rooms: number | null;
  baths: number | null;
  payment_terms: string | null;
  commission: string | null;
  amenities: string[] | null;
  message: string | null;
  photo_links: string | null;
};

type QuartiersByCommuneResponse = {
  items?: Array<{ id: string; name: string; commune: string | null }>;
  warning?: string;
  error?: string;
};

const TRANSACTION_OPTIONS = [
  { value: "vente", label: "Vente" },
  { value: "par_mois", label: "Location / par mois" },
  { value: "six_mois", label: "Location / 6 mois" },
  { value: "douze_mois", label: "Location / 12 mois" },
  { value: "par_nuit", label: "Location / par nuit" },
  { value: "court_sejour", label: "Location / court sejour" },
] as const;

const CATEGORY_OPTIONS = [
  { value: "appartement", label: "Appartement" },
  { value: "villa", label: "Villa" },
  { value: "terrain", label: "Terrain" },
  { value: "local", label: "Local" },
  { value: "bureau", label: "Bureau" },
] as const;

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

type AmenityKey = (typeof AMENITY_OPTIONS)[number]["key"];

const AMENITY_KEY_BY_ALIAS = (() => {
  const map = new Map<string, AmenityKey>();
  for (const option of AMENITY_OPTIONS) {
    const aliases = [option.key, option.key.replaceAll("_", " "), option.label];
    aliases.forEach((alias) => {
      map.set(normalizeText(alias), option.key);
    });
  }
  return map;
})();

function normalizeText(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeTransactionValue(value: string | null | undefined) {
  const raw = normalizeText(value);
  if (!raw) return "";
  if (raw === "vente" || raw === "sale") return "vente";
  if (raw === "par_mois" || raw === "par mois" || raw === "location" || raw === "rent") return "par_mois";
  if (raw === "six_mois" || raw === "six mois" || raw === "6 mois") return "six_mois";
  if (raw === "douze_mois" || raw === "douze mois" || raw === "12 mois") return "douze_mois";
  if (raw === "par_nuit" || raw === "par nuit" || raw === "par nuite") return "par_nuit";
  if (raw === "court_sejour" || raw === "court sejour") return "court_sejour";
  return "";
}

function normalizeCategoryValue(value: string | null | undefined) {
  const raw = normalizeText(value);
  if (!raw) return "";
  if (raw.includes("appartement")) return "appartement";
  if (raw.includes("villa")) return "villa";
  if (raw.includes("terrain")) return "terrain";
  if (raw.includes("local")) return "local";
  if (raw.includes("bureau")) return "bureau";
  return "";
}

function normalizeCommuneValue(value: string | null | undefined) {
  const raw = normalizeText(value);
  if (!raw) return "";
  const match = ORAN_COMMUNES.find((commune) => normalizeText(commune) === raw);
  return match ?? "";
}

function parsePhotoLinks(value: string | null | undefined) {
  return String(value ?? "")
    .split(/[\n,\s]+/g)
    .map((item) => item.trim())
    .filter((item) => /^https?:\/\//i.test(item));
}

function normalizeAmenities(value: string[] | null | undefined): AmenityKey[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<AmenityKey>(AMENITY_OPTIONS.map((option) => option.key));
  return Array.from(
    new Set(
      value
        .map((item) => String(item ?? "").trim())
        .filter((item): item is AmenityKey => allowed.has(item as AmenityKey))
    )
  );
}

function toAmenityKey(value: string): AmenityKey | null {
  return AMENITY_KEY_BY_ALIAS.get(normalizeText(value)) ?? null;
}

function amenityLabel(value: string) {
  const key = toAmenityKey(value);
  if (!key) return value.replaceAll("_", " ").trim();
  return AMENITY_OPTIONS.find((option) => option.key === key)?.label ?? value;
}

function lineValue(line: string) {
  const idx = line.indexOf(":");
  if (idx < 0) return "";
  return line.slice(idx + 1).trim();
}

function parseAgencyFeesFromDetails(message: string | null | undefined) {
  const lines = String(message ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\*\s*/, "").trim())
    .filter(Boolean);

  for (const line of lines) {
    const n = normalizeText(line);
    if (
      n.startsWith("frais d'agence") ||
      n.startsWith("frais d agence") ||
      n.startsWith("commission")
    ) {
      const parsed = lineValue(line);
      if (parsed) return parsed;
    }
  }

  return "";
}

function normalizeCommissionPercent(value: string | null | undefined) {
  const digits = String(value ?? "")
    .replace(/[^\d]/g, "")
    .trim();
  if (!digits) return "";
  const parsed = Number(digits);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) return "";
  return String(parsed);
}

function parseAmenitiesFromDetails(message: string | null | undefined): AmenityKey[] {
  const lines = String(message ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const candidates: string[] = [];

  for (const line of lines) {
    const cleaned = line.replace(/^\*\s*/, "").trim();
    if (!cleaned) continue;

    candidates.push(cleaned);

    const normalized = normalizeText(cleaned);
    if (normalized.startsWith("equipements:") || normalized.startsWith("equipements :")) {
      const values = lineValue(cleaned)
        .split(/[,|]/)
        .map((item) => item.trim())
        .filter(Boolean);
      candidates.push(...values);
    }
  }

  const matched = new Set<AmenityKey>();

  for (const candidate of candidates) {
    const direct = toAmenityKey(candidate);
    if (direct) {
      matched.add(direct);
      continue;
    }

    const normalizedCandidate = normalizeText(candidate);
    for (const option of AMENITY_OPTIONS) {
      const label = normalizeText(option.label);
      const keyText = normalizeText(option.key.replaceAll("_", " "));
      if (
        normalizedCandidate === label ||
        normalizedCandidate === keyText ||
        normalizedCandidate.includes(label) ||
        normalizedCandidate.includes(keyText)
      ) {
        matched.add(option.key);
      }
    }
  }

  return Array.from(matched);
}

function toNumberOrNull(value: string) {
  const raw = value.trim().replace(",", ".");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function sanitizeDescriptionFromImageLinks(value: string | null | undefined) {
  const lines = String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd());

  const cleaned = lines
    .map((line) => {
      const withoutLinks = line
        .replace(/https?:\/\/\S+/gi, "")
        .replace(/\s{2,}/g, " ")
        .trimEnd();

      const normalized = normalizeText(withoutLinks.replace(/^\*\s*/, ""));
      if (normalized.startsWith("equipements:") || normalized.startsWith("equipements :")) {
        const values = lineValue(withoutLinks)
          .split(/[,|]/)
          .map((item) => amenityLabel(item))
          .map((item) => item.trim())
          .filter(Boolean);
        if (!values.length) return "";
        return `Equipements: ${Array.from(new Set(values)).join(", ")}`;
      }

      return withoutLinks;
    })
    .filter((line) => {
      const normalized = normalizeText(line.replace(/^\*\s*/, ""));
      if (!line.trim()) return false;
      if (normalized.startsWith("photos:") || normalized.startsWith("photos :")) return false;
      if (normalized.startsWith("liens photos/videos") || normalized.startsWith("liens photos videos")) return false;
      if (normalized.startsWith("liens photos") || normalized.startsWith("liens videos")) return false;
      return true;
    });

  return cleaned.join("\n");
}

function buildDescription(input: {
  title: string;
  propertyType: string;
  transactionType: string;
  commune: string;
  district: string;
  address: string;
  price: string;
  surface: string;
  rooms: string;
  baths: string;
  commission: string;
  amenities: AmenityKey[];
}) {
  const typeLabel =
    CATEGORY_OPTIONS.find((option) => option.value === input.propertyType)?.label || "bien";
  const txLabel =
    TRANSACTION_OPTIONS.find((option) => option.value === input.transactionType)?.label || "Location";
  const location = [input.address, input.district, input.commune].filter(Boolean).join(" - ") || "A preciser";
  const amenityLabels = AMENITY_OPTIONS.filter((option) => input.amenities.includes(option.key)).map(
    (option) => option.label
  );

  return [
    `Rostomyia Immobilier vous propose ${txLabel.toLowerCase()} ce ${typeLabel.toLowerCase()}.`,
    "",
    `Localisation: ${location}`,
    `Prix: ${input.price || "A preciser"}`,
    "",
    "Caracteristiques principales:",
    `* Surface: ${input.surface || "-"}`,
    `* Pieces: ${input.rooms || "-"}`,
    `* SDB: ${input.baths || "-"}`,
    ...(amenityLabels.length ? amenityLabels.map((label) => `* ${label}`) : []),
    input.commission ? `Frais d'agence: ${input.commission}%` : "",
  ].join("\n");
}

export default function AgencyDepositEditForm({ lead }: { lead: AgencyEditableLead }) {
  const router = useRouter();
  const supabase = createClient();
  const addInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState(lead.title ?? "");
  const [propertyType, setPropertyType] = useState(normalizeCategoryValue(lead.property_type));
  const [transactionType, setTransactionType] = useState(
    normalizeTransactionValue(lead.transaction_type ?? lead.location_type)
  );
  const [commune, setCommune] = useState(normalizeCommuneValue(lead.commune));
  const [district, setDistrict] = useState(lead.district ?? "");
  const [address, setAddress] = useState(lead.address ?? "");
  const [city, setCity] = useState(lead.city ?? "Oran");
  const [price, setPrice] = useState(lead.price != null ? String(lead.price) : "");
  const [surface, setSurface] = useState(lead.surface != null ? String(lead.surface) : "");
  const [rooms, setRooms] = useState(lead.rooms != null ? String(lead.rooms) : "");
  const [baths, setBaths] = useState(lead.baths != null ? String(lead.baths) : "");
  const [paymentTerms, setPaymentTerms] = useState(lead.payment_terms ?? "");
  const commissionFromLead = normalizeCommissionPercent(lead.commission);
  const commissionFromDetails = normalizeCommissionPercent(parseAgencyFeesFromDetails(lead.message));
  const initialAmenities = normalizeAmenities(lead.amenities);
  const [commission, setCommission] = useState(
    commissionFromLead || commissionFromDetails
  );
  const [amenities, setAmenities] = useState<AmenityKey[]>(
    initialAmenities.length > 0 ? initialAmenities : parseAmenitiesFromDetails(lead.message)
  );
  const initialDescription = sanitizeDescriptionFromImageLinks(lead.message);
  const [message, setMessage] = useState(initialDescription);
  const [savedDescription, setSavedDescription] = useState(initialDescription);
  const [lastGeneratedDescription, setLastGeneratedDescription] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>(parsePhotoLinks(lead.photo_links));
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const [quartiersByCommune, setQuartiersByCommune] = useState<string[]>([]);
  const [quartiersLoading, setQuartiersLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<"upload" | "replace" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const selectedCommune = commune.trim();
    if (!selectedCommune) {
      setQuartiersByCommune([]);
      setQuartiersLoading(false);
      return;
    }

    const controller = new AbortController();
    let active = true;

    async function load() {
      setQuartiersLoading(true);
      try {
        const res = await fetch(`/api/quartiers?commune=${encodeURIComponent(selectedCommune)}`, {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        });
        const payload = (await res.json().catch(() => null)) as QuartiersByCommuneResponse | null;
        if (!res.ok) throw new Error(payload?.error || "Chargement des quartiers impossible");
        if (!active) return;
        const names = Array.isArray(payload?.items)
          ? payload.items.map((item) => String(item.name || "").trim()).filter(Boolean)
          : [];
        setQuartiersByCommune(names);
      } catch {
        if (!active || controller.signal.aborted) return;
        setQuartiersByCommune([]);
      } finally {
        if (active) setQuartiersLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [commune]);

  const districtOptions = useMemo(() => {
    const base = quartiersByCommune.map((name) => ({ value: name, label: name }));
    if (district.trim() && !base.some((option) => normalizeText(option.value) === normalizeText(district))) {
      base.unshift({ value: district.trim(), label: `${district.trim()} (hors liste)` });
    }
    return [
      {
        value: "",
        label: !commune
          ? "Selectionner d'abord une commune"
          : quartiersLoading
            ? "Chargement..."
            : "Selectionner un quartier",
      },
      ...base,
    ];
  }, [commune, district, quartiersByCommune, quartiersLoading]);

  const activeImage = images[activeImageIndex] ?? null;
  const activeIndex = activeImage ? activeImageIndex : -1;
  const busyCurrentImage = busy === "replace";
  const hasImageOperation = busy !== null;
  const isUploadingImages = busy === "upload";
  const activeImageLabel =
    activeIndex >= 0 ? `Image ${activeIndex + 1} / ${images.length}` : "Aucune image selectionnee";
  const hasMultipleImages = images.length > 1;
  const descriptionMetrics = getDescriptionMetrics(message);
  const descriptionState = getDescriptionState(message, lastGeneratedDescription);
  const descriptionStateLabel =
    descriptionState === "empty"
      ? "vide"
      : descriptionState === "generated"
        ? "generee"
        : "personnalisee";
  const hasUnsavedDescription = hasUnsavedDescriptionChanges(message, savedDescription);
  const { isDialogOpen, stayOnPage, confirmLeave } = useUnsavedNavigationGuard({
    isDirty: hasUnsavedDescription,
    message: "Vous avez des modifications non enregistrees dans la description.",
  });

  useEffect(() => {
    if (!images.length) {
      if (activeImageIndex !== 0) setActiveImageIndex(0);
      return;
    }
    if (activeImageIndex > images.length - 1) {
      setActiveImageIndex(images.length - 1);
    }
  }, [activeImageIndex, images.length]);

  function goToImageByIndex(nextIndex: number) {
    if (!images.length) return;
    const safe = Math.max(0, Math.min(images.length - 1, nextIndex));
    setActiveImageIndex(safe);
  }

  function goPrevImage() {
    if (!hasMultipleImages) return;
    const prev = activeIndex <= 0 ? images.length - 1 : activeIndex - 1;
    goToImageByIndex(prev);
  }

  function goNextImage() {
    if (!hasMultipleImages) return;
    const next = activeIndex >= images.length - 1 ? 0 : activeIndex + 1;
    goToImageByIndex(next);
  }

  async function uploadToAgencyRequestApi(files: File[]): Promise<string[]> {
    if (!files.length) return [];

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const accessToken = session?.access_token?.trim() ?? "";

    const formData = new FormData();
    formData.append("ref", `agency-edit-${lead.id}`);
    files.forEach((file) => formData.append("files", file));

    const res = await fetch("/api/agency/request-images", {
      method: "POST",
      body: formData,
      credentials: "include",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });

    const payload = (await res.json().catch(() => null)) as
      | { urls?: unknown[]; error?: string }
      | null;
    if (!res.ok) {
      throw new Error(payload?.error || "Upload images impossible");
    }

    return Array.isArray(payload?.urls)
      ? payload.urls.map((url) => String(url ?? "").trim()).filter(Boolean)
      : [];
  }

  async function onAddImages(fileList: FileList | null) {
    const files = Array.from(fileList ?? []).filter((file) => file.type.startsWith("image/"));
    if (!files.length) return;
    setError(null);
    setSuccess(null);
    setBusy("upload");
    try {
      const urls = await uploadToAgencyRequestApi(files);
      if (!urls.length) {
        throw new Error("Aucune image valide.");
      }
      setImages((prev) => [...prev, ...urls]);
      setActiveImageIndex((prev) => (prev >= 0 ? prev : 0));
      setSuccess("Images ajoutees.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload impossible");
    } finally {
      setBusy(null);
    }
  }

  async function onReplaceImage(index: number, fileList: FileList | null) {
    const file = Array.from(fileList ?? []).find((entry) => entry.type.startsWith("image/"));
    if (!file) return;
    setError(null);
    setSuccess(null);
    setBusy("replace");
    try {
      const urls = await uploadToAgencyRequestApi([file]);
      const replacement = urls[0];
      if (!replacement) throw new Error("Remplacement impossible");
      setImages((prev) => prev.map((item, idx) => (idx === index ? replacement : item)));
      setSuccess("Image remplacee.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Remplacement impossible");
    } finally {
      setBusy(null);
    }
  }

  function onDeleteImage(index: number) {
    const confirmed = window.confirm("Supprimer cette image ?");
    if (!confirmed) return;
    setImages((prev) => prev.filter((_, idx) => idx !== index));
    setActiveImageIndex((prev) => {
      if (index === prev) return Math.max(0, prev - 1);
      if (index < prev) return prev - 1;
      return prev;
    });
  }

  function onSetCover(index: number) {
    if (index <= 0) return;
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.unshift(moved);
      return next;
    });
    setActiveImageIndex(0);
  }

  function onMoveImage(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
    setActiveImageIndex(target);
  }

  function onGenerateDescription() {
    const generated = buildDescription({
      title,
      propertyType,
      transactionType,
      commune,
      district,
      address,
      price,
      surface,
      rooms,
      baths,
      commission,
      amenities,
    });
    setMessage(generated);
    setLastGeneratedDescription(generated);
    setSuccess("Description mise a jour.");
    setError(null);
  }

  function toggleAmenity(key: AmenityKey) {
    setAmenities((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/agency/deposits/${encodeURIComponent(lead.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title,
          property_type: propertyType,
          transaction_type: transactionType,
          commune,
          district,
          address,
          city,
          price: toNumberOrNull(price),
          surface: toNumberOrNull(surface),
          rooms: toNumberOrNull(rooms),
          baths: toNumberOrNull(baths),
          payment_terms: paymentTerms || null,
          commission: commission ? `${commission}%` : null,
          amenities,
          message: sanitizeDescriptionFromImageLinks(message) || null,
          photo_links: images,
        }),
      });

      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(payload?.error || "Enregistrement impossible");
      }
      setSavedDescription(sanitizeDescriptionFromImageLinks(message));
      setSuccess("Bien mis a jour.");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative space-y-8 overflow-hidden rounded-[30px] border border-slate-200/80 bg-gradient-to-b from-white via-white to-slate-50 p-6 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.65)] animate-in fade-in-0 duration-500 md:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(60%_140%_at_50%_-20%,rgba(30,64,175,0.14),transparent)]"
      />

      <section className="relative space-y-5 rounded-3xl border border-slate-200/80 bg-white/85 p-5 shadow-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-500 md:p-6">
        <div className="space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Edit Section
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Informations du bien</h2>
            <button
              type="button"
              onClick={onSave}
              disabled={saving || hasImageOperation}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[rgb(var(--navy))] to-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Titre" required>
            <Input
              className="h-11 rounded-2xl border-0 bg-white/80 px-4 ring-1 ring-black/10"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>

          <Field label="Categorie">
            <AppDropdown
              value={propertyType}
              onValueChange={setPropertyType}
              options={[
                { value: "", label: "Selectionner une categorie" },
                ...CATEGORY_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
              ]}
            />
          </Field>

          <Field label="Transaction">
            <AppDropdown
              value={transactionType}
              onValueChange={setTransactionType}
              options={[
                { value: "", label: "Selectionner une transaction" },
                ...TRANSACTION_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
              ]}
            />
          </Field>

          <Field label="Commune (Oran)">
            <AppDropdown
              value={commune}
              onValueChange={(value) => {
                setCommune(value);
                setDistrict("");
              }}
              options={[
                { value: "", label: "Selectionner une commune" },
                ...ORAN_COMMUNES.map((item) => ({ value: item, label: item })),
              ]}
            />
          </Field>

          <div className="space-y-2.5">
            <div className="text-[13px] font-semibold tracking-wide text-[rgb(var(--navy))]">Quartier</div>
            <AppDropdown
              value={district}
              onValueChange={setDistrict}
              options={districtOptions}
              disabled={!commune}
              searchable
              searchPlaceholder="Rechercher un quartier..."
            />
            {commune && !quartiersLoading && districtOptions.length <= 1 ? (
              <p className="text-xs font-medium text-amber-700">Aucun quartier configure pour cette commune.</p>
            ) : null}
          </div>

          <Field label="Detail adresse">
            <Input
              className="h-11 rounded-2xl border-0 bg-white/80 px-4 ring-1 ring-black/10"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </Field>

          <Field label="Ville">
            <Input
              className="h-11 rounded-2xl border-0 bg-white/80 px-4 ring-1 ring-black/10"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </Field>

          <Field label="Prix">
            <Input
              className="h-11 rounded-2xl border-0 bg-white/80 px-4 ring-1 ring-black/10"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>

          <Field label="Surface (m2)">
            <Input
              className="h-11 rounded-2xl border-0 bg-white/80 px-4 ring-1 ring-black/10"
              value={surface}
              onChange={(e) => setSurface(e.target.value)}
            />
          </Field>

          <Field label="Pieces">
            <Input
              className="h-11 rounded-2xl border-0 bg-white/80 px-4 ring-1 ring-black/10"
              value={rooms}
              onChange={(e) => setRooms(e.target.value)}
            />
          </Field>

          <Field label="Salles de bain">
            <Input
              className="h-11 rounded-2xl border-0 bg-white/80 px-4 ring-1 ring-black/10"
              value={baths}
              onChange={(e) => setBaths(e.target.value)}
            />
          </Field>

          <Field label="Paiement">
            <Input
              className="h-11 rounded-2xl border-0 bg-white/80 px-4 ring-1 ring-black/10"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
            />
          </Field>

          <Field label="Frais d'agence">
            <Input
              className="h-11 rounded-2xl border-0 bg-white/80 px-4 ring-1 ring-black/10"
              type="number"
              inputMode="numeric"
              min={1}
              max={5}
              step={1}
              value={commission}
              onChange={(e) => {
                const next = e.target.value.replace(/[^\d]/g, "");
                if (!next) {
                  setCommission("");
                  return;
                }
                const parsed = Number(next);
                if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) return;
                setCommission(String(parsed));
              }}
              placeholder="1 a 5 (%)"
            />
          </Field>
        </div>
      </section>

      <section className="relative space-y-4 rounded-3xl border border-slate-200/80 bg-white/85 p-5 shadow-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:70ms] md:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-slate-900">Equipements / points forts</div>
          <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
            {amenities.length} selectionne(s)
          </span>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          {AMENITY_OPTIONS.map((opt) => {
            const checked = amenities.includes(opt.key);
            return (
              <label
                key={opt.key}
                className={[
                  "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
                  checked
                    ? "border-slate-800/25 bg-slate-100 text-slate-900"
                    : "border-slate-200 bg-white hover:bg-slate-50",
                ].join(" ")}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleAmenity(opt.key)}
                />
                {opt.label}
              </label>
            );
          })}
        </div>
      </section>

      <section className="relative space-y-4 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:120ms] md:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[radial-gradient(65%_125%_at_50%_-20%,rgba(30,64,175,0.16),transparent)]"
        />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Description</div>
            <p className="text-xs text-slate-600">Regenerer puis ajuster le texte final avant enregistrement.</p>
          </div>
          <button
            type="button"
            onClick={onGenerateDescription}
            disabled={saving || hasImageOperation}
            className="rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
          >
            Mettre a jour description
          </button>
        </div>

        <div className="relative flex flex-wrap gap-2">
          <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">
            {descriptionMetrics.lineCount} ligne(s)
          </span>
          <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">
            {descriptionMetrics.wordCount} mot(s)
          </span>
          <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">
            {descriptionMetrics.charCount} caractere(s)
          </span>
          <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">
            Etat: {descriptionStateLabel}
          </span>
        </div>

        <label className="relative block space-y-2.5">
          <div className="text-[13px] font-semibold tracking-wide text-[rgb(var(--navy))]">Texte du bien</div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-black/5">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-52 w-full resize-y border-0 bg-transparent px-4 py-4 font-serif text-[15px] leading-7 text-slate-800 outline-none focus:ring-2 focus:ring-slate-300"
              placeholder="Description du bien..."
            />
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-2 text-[11px] font-medium text-slate-600">
              <span>Texte libre: vous pouvez modifier chaque ligne.</span>
              <span>Etat: {message.trim() ? "renseigne" : "vide"}</span>
            </div>
          </div>
        </label>
      </section>

      <section className="relative space-y-5 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:170ms] md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Images existantes</div>
            <div className="text-xs text-slate-500">
              Supprimer, remplacer, choisir la cover et reordonner.
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                {activeImageLabel}
              </span>
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                Cover: {images.length > 0 ? "definie" : "non definie"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
              {images.length} image(s)
            </div>
            <button
              type="button"
              disabled={!!busy || saving}
              onClick={() => addInputRef.current?.click()}
              className="rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
            >
              Ajouter images
            </button>
            <input
              ref={addInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                void onAddImages(e.currentTarget.files);
                e.currentTarget.value = "";
              }}
            />
          </div>
        </div>

        {images.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            Aucune image actuellement. Utilisez le bouton Ajouter images.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="space-y-3">
              <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {activeImage ? (
                  <div className="relative aspect-[16/10]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeImage}
                      alt="Image du bien"
                      className="absolute inset-0 h-full w-full object-contain object-center"
                    />
                    {hasMultipleImages ? (
                      <>
                        <button
                          type="button"
                          onClick={goPrevImage}
                          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-xl bg-black/60 px-3 py-2 text-sm font-semibold text-white transition hover:bg-black/75"
                          aria-label="Image precedente"
                        >
                          {"<"}
                        </button>
                        <button
                          type="button"
                          onClick={goNextImage}
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl bg-black/60 px-3 py-2 text-sm font-semibold text-white transition hover:bg-black/75"
                          aria-label="Image suivante"
                        >
                          {">"}
                        </button>
                      </>
                    ) : null}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
                      {activeIndex + 1} / {images.length}
                    </div>
                    <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
                      {activeIndex === 0 ? "COVER" : `Image ${activeIndex + 1}`}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Galerie images
                </div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-7">
                  {images.map((url, idx) => (
                    <button
                      key={`${url}-${idx}`}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={[
                        "relative aspect-[4/3] overflow-hidden rounded-xl border bg-white transition",
                        activeImageIndex === idx
                          ? "ring-2 ring-slate-900 ring-offset-1"
                          : "border-slate-200 hover:-translate-y-0.5 hover:opacity-90",
                      ].join(" ")}
                      title={`Image ${idx + 1}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Image ${idx + 1}`} className="h-full w-full object-contain object-center" />
                      <span className="absolute bottom-1 right-1 rounded-md bg-black/60 px-1 py-0.5 text-[10px] font-semibold text-white">
                        {idx + 1}
                      </span>
                      {idx === 0 ? (
                        <span className="absolute left-1 top-1 rounded-lg bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          COVER
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-slate-900">Actions image</div>
                {activeImage ? (
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                    {activeIndex === 0 ? "Cover active" : "Image standard"}
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={!activeImage || activeIndex <= 0 || !!busy}
                  onClick={() => onMoveImage(activeIndex, -1)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Deplacer gauche
                </button>
                <button
                  type="button"
                  disabled={!activeImage || activeIndex >= images.length - 1 || !!busy}
                  onClick={() => onMoveImage(activeIndex, 1)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Deplacer droite
                </button>
                <button
                  type="button"
                  disabled={!activeImage || activeIndex === 0 || !!busy}
                  onClick={() => onSetCover(activeIndex)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Definir cover
                </button>
                <label className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
                  Remplacer
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (activeIndex >= 0) void onReplaceImage(activeIndex, e.currentTarget.files);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  disabled={!activeImage || !!busy}
                  onClick={() => activeIndex >= 0 && onDeleteImage(activeIndex)}
                  className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-50 sm:col-span-2"
                >
                  Supprimer
                </button>
              </div>

              {busyCurrentImage ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  Mise a jour image en cours...
                </div>
              ) : null}
              {isUploadingImages ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  Upload images en cours...
                </div>
              ) : null}
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/85 p-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:220ms] sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || hasImageOperation}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[rgb(var(--navy))] to-slate-800 px-6 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
          {saving
            ? "Enregistrement..."
            : hasImageOperation
              ? "Operation image en cours..."
              : "Enregistrer les modifications"}
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 animate-in fade-in-0 zoom-in-95">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 animate-in fade-in-0 zoom-in-95">
          {success}
        </div>
      ) : null}
      <UnsavedDescriptionModal
        open={isDialogOpen}
        onStay={stayOnPage}
        onLeave={confirmLeave}
      />
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2.5">
      <div className="text-[13px] font-semibold tracking-wide text-[rgb(var(--navy))]">
        {label} {required ? <span className="text-red-600">*</span> : null}
      </div>
      {children}
    </label>
  );
}
