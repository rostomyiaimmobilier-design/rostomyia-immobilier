"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QuartiersManagerModal from "@/components/admin/QuartiersManagerModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminQuartiers } from "@/hooks/use-admin-quartiers";
import { DEFAULT_ORAN_QUARTIERS, ORAN_COMMUNES } from "@/lib/oran-locations";
import AppDropdown from "@/components/ui/app-dropdown";
import { propertyImageUrl } from "@/lib/property-image-url";
import UnsavedDescriptionModal from "@/components/admin/UnsavedDescriptionModal";
import { useUnsavedNavigationGuard } from "@/hooks/use-unsaved-navigation-guard";
import {
  getDescriptionMetrics,
  getDescriptionState,
  hasUnsavedDescriptionChanges,
} from "@/lib/description-editor";

const APARTMENT_TYPES = [
  "Studio",
  "F2",
  "F3",
  "F4",
  "F5",
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
];
const ORAN_QUARTIER_LOOKUP = DEFAULT_ORAN_QUARTIERS;

type TransactionType =
  | "Vente"
  | "par_mois"
  | "six_mois"
  | "douze_mois"
  | "par_nuit"
  | "court_sejour";

const TRANSACTION_OPTIONS: Array<{ value: TransactionType; label: string }> = [
  { value: "Vente", label: "Vente" },
  { value: "par_mois", label: "Location / par mois" },
  { value: "six_mois", label: "Location / 6 mois" },
  { value: "douze_mois", label: "Location / 12 mois" },
  { value: "par_nuit", label: "Location / par nuit" },
  { value: "court_sejour", label: "Location / court sejour" },
];

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
const AMENITY_KEY_BY_ALIAS = new Map<string, AmenityKey>(
  AMENITY_OPTIONS.flatMap((option) => [
    [normalizeText(option.key), option.key],
    [normalizeText(option.label), option.key],
  ])
);

type ExistingImage = {
  id: string;
  path: string;
  sort: number;
  is_cover: boolean;
};

type EditProperty = {
  id: string;
  ref: string;
  title: string | null;
  type: string | null;
  locationType: string | null;
  category: string | null;
  apartmentType: string | null;
  price: string | null;
  ownerPhone: string | null;
  location: string | null;
  beds: number | null;
  baths: number | null;
  area: number | null;
  description: string | null;
  amenities: string[];
  images: ExistingImage[];
};

type FormState = {
  title: string;
  transactionType: TransactionType;
  category: string;
  apartmentType: string;
  price: string;
  ownerPhone: string;
  commune: string;
  quartier: string;
  locationDetail: string;
  beds: string;
  baths: string;
  area: string;
  description: string;
  amenities: AmenityKey[];
};

function normalizeText(value: string) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function matchNormalizedValue<T extends string>(values: readonly T[], candidate: string) {
  const normalizedCandidate = normalizeText(candidate);
  return values.find((value) => normalizeText(value) === normalizedCandidate) ?? null;
}

function buildLocation(commune: string, quartier: string, detail: string) {
  const c = commune.trim();
  const q = quartier.trim();
  const d = detail.trim();
  const parts = [c, q].filter(Boolean);

  if (d && normalizeText(d) !== normalizeText(q)) {
    parts.push(d);
  }

  return parts.join(" - ");
}

function parseLocationParts(rawLocation: string | null | undefined) {
  const tokens = String(rawLocation ?? "")
    .split("-")
    .map((token) => token.trim())
    .filter(Boolean);

  if (!tokens.length) {
    return {
      commune: "",
      quartier: "",
      locationDetail: "",
    };
  }

  let commune = "";
  let remainingTokens = [...tokens];

  const communeIndex = tokens.findIndex((token) => matchNormalizedValue(ORAN_COMMUNES, token) !== null);
  if (communeIndex >= 0) {
    commune = matchNormalizedValue(ORAN_COMMUNES, tokens[communeIndex]) ?? "";
    remainingTokens = tokens.filter((_, idx) => idx !== communeIndex);
  }

  let quartier = "";
  let locationDetail = "";

  if (remainingTokens.length) {
    const quartierIndex = remainingTokens.findIndex(
      (token) => matchNormalizedValue(ORAN_QUARTIER_LOOKUP, token) !== null
    );

    if (quartierIndex >= 0) {
      quartier = matchNormalizedValue(ORAN_QUARTIER_LOOKUP, remainingTokens[quartierIndex]) ?? "";
      locationDetail = remainingTokens
        .filter((_, idx) => idx !== quartierIndex)
        .join(" - ");
    } else {
      locationDetail = remainingTokens.join(" - ");
    }
  }

  if (!quartier && !locationDetail && tokens.length === 1) {
    const directQuartier = matchNormalizedValue(ORAN_QUARTIER_LOOKUP, tokens[0]);
    if (directQuartier) {
      quartier = directQuartier;
    } else {
      locationDetail = tokens[0];
    }
  }

  return {
    commune,
    quartier,
    locationDetail,
  };
}

function normalizeStoredTransactionType(
  locationType: string | null | undefined,
  baseType: string | null | undefined
): TransactionType {
  const normalized = normalizeText(locationType || "");
  if (normalized) {
    if (normalized.includes("vente") || normalized.includes("sale")) return "Vente";
    if (normalized.includes("par_nuit") || normalized.includes("par nuit") || normalized.includes("par nuite")) {
      return "par_nuit";
    }
    if (normalized.includes("court_sejour") || normalized.includes("court sejour")) {
      return "court_sejour";
    }
    if (normalized.includes("douze_mois") || normalized.includes("douze mois") || normalized.includes("12 mois")) {
      return "douze_mois";
    }
    if (normalized.includes("six_mois") || normalized.includes("six mois") || normalized.includes("6 mois")) {
      return "six_mois";
    }
    if (normalized.includes("par_mois") || normalized.includes("par mois")) return "par_mois";
    if (normalized.includes("location") || normalized.includes("louer") || normalized.includes("rent")) {
      return "par_mois";
    }
  }

  return normalizeText(baseType || "").includes("vente") ? "Vente" : "par_mois";
}

function transactionTypeToStorageValue(transactionType: TransactionType): string {
  if (transactionType === "Vente") return "vente";
  return transactionType;
}

function toOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function digitsOnly(raw: string) {
  return (raw || "").replace(/\D/g, "");
}

function toAmenityKey(value: string): AmenityKey | null {
  const key = AMENITY_KEY_BY_ALIAS.get(normalizeText(value));
  return key ?? null;
}

function normalizeAmenities(raw: unknown): AmenityKey[] {
  if (!Array.isArray(raw)) return [];
  const cleaned = raw
    .map((x) => (typeof x === "string" ? toAmenityKey(x) : null))
    .filter((x): x is AmenityKey => x !== null);
  return Array.from(new Set(cleaned));
}

function parseAmenitiesFromDescription(description: string | null | undefined): AmenityKey[] {
  const lines = String(description ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const candidates: string[] = [];

  for (const line of lines) {
    const cleanedLine = line.replace(/^\*\s*/, "").trim();
    if (!cleanedLine) continue;

    candidates.push(cleanedLine);

    const normalized = normalizeText(cleanedLine);
    if (normalized.startsWith("equipements:") || normalized.startsWith("equipements :")) {
      const values = cleanedLine
        .split(":")
        .slice(1)
        .join(":")
        .split(/[,|]/)
        .map((x) => x.trim())
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
      const keyAsText = normalizeText(option.key.replaceAll("_", " "));
      if (
        normalizedCandidate === label ||
        normalizedCandidate === keyAsText ||
        normalizedCandidate.includes(label)
      ) {
        matched.add(option.key);
      }
    }
  }

  return Array.from(matched);
}

function transactionTypeLabel(transactionType: TransactionType) {
  return TRANSACTION_OPTIONS.find((x) => x.value === transactionType)?.label ?? transactionType;
}

function propertyLabel(category: string, apartmentType: string) {
  const normalizedCategory = normalizeText(category);
  if (normalizedCategory === "appartement") {
    return apartmentType.trim() ? `appartement ${apartmentType.trim()}` : "appartement";
  }
  if (normalizedCategory === "villa") return "villa";
  if (normalizedCategory === "terrain") return "terrain";
  if (normalizedCategory === "local") return "local";
  if (normalizedCategory === "bureau") return "bureau";
  return "bien immobilier";
}

function generateDescriptionFromForm(form: FormState) {
  const txLabel = transactionTypeLabel(form.transactionType);
  const typeLabel = propertyLabel(form.category, form.apartmentType);
  const amenityLabels = AMENITY_OPTIONS.filter((x) => form.amenities.includes(x.key)).map((x) => x.label);
  const location = buildLocation(form.commune, form.quartier, form.locationDetail);

  const details = [
    form.area.trim() ? `Surface: ${form.area.trim()} m2` : null,
    form.beds.trim() ? `Chambres: ${form.beds.trim()}` : null,
    form.baths.trim() ? `Salles de bain: ${form.baths.trim()}` : null,
    ...amenityLabels,
  ].filter(Boolean) as string[];

  return [
    `Rostomyia Immobilier vous propose ${form.transactionType === "Vente" ? "a la vente" : "a la location"} ce ${typeLabel}.`,
    "",
    `Localisation: ${location || "A preciser"}`,
    `Transaction: ${txLabel}`,
    `Prix: ${form.price.trim() || "A preciser"}`,
    "",
    "Caracteristiques principales :",
    ...(details.length ? details.map((item) => `* ${item}`) : ["* A preciser"]),
  ].join("\n");
}

function normalizeExistingImages(images: ExistingImage[]) {
  const sorted = [...images]
    .map((img, idx) => ({
      id: String(img.id),
      path: String(img.path),
      sort: Number.isFinite(Number(img.sort)) ? Number(img.sort) : idx,
      is_cover: Boolean(img.is_cover),
    }))
    .sort((a, b) => a.sort - b.sort);

  const hasCover = sorted.some((x) => x.is_cover);
  return sorted.map((img, idx) => ({
    ...img,
    sort: idx,
    is_cover: hasCover ? img.is_cover : idx === 0,
  }));
}

function swapImagePosition(images: ExistingImage[], from: number, to: number) {
  if (to < 0 || to >= images.length) return images;
  const next = [...images];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next.map((img, idx) => ({ ...img, sort: idx }));
}

function imageUrl(path: string) {
  return (
    propertyImageUrl(path, { width: 1200, quality: 78 }) ||
    propertyImageUrl(path) ||
    ""
  );
}

async function readErrorMessage(res: Response, fallback: string) {
  try {
    const json = (await res.json()) as { error?: string };
    return json?.error || fallback;
  } catch {
    return fallback;
  }
}

export default function EditPropertyForm({ property }: { property: EditProperty }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savedDescription, setSavedDescription] = useState(property.description ?? "");
  const [lastGeneratedDescription, setLastGeneratedDescription] = useState<string | null>(null);

  const [existingImages, setExistingImages] = useState<ExistingImage[]>(
    normalizeExistingImages(property.images ?? [])
  );
  const [activeImageId, setActiveImageId] = useState<string | null>(existingImages[0]?.id ?? null);
  const [imageBusy, setImageBusy] = useState<{
    id: string | null;
    action: "delete" | "replace" | "cover" | "reorder" | "upload" | null;
  }>({ id: null, action: null });
  const addImagesInputRef = useRef<HTMLInputElement | null>(null);

  const activeImage = useMemo(
    () => existingImages.find((img) => img.id === activeImageId) ?? existingImages[0] ?? null,
    [activeImageId, existingImages]
  );

  useEffect(() => {
    if (!existingImages.length) {
      setActiveImageId(null);
      return;
    }
    if (!activeImageId || !existingImages.some((img) => img.id === activeImageId)) {
      setActiveImageId(existingImages[0].id);
    }
  }, [existingImages, activeImageId]);

  useEffect(() => {
    setExistingImages(normalizeExistingImages(property.images ?? []));
  }, [property.images]);

  useEffect(() => {
    setSavedDescription(property.description ?? "");
    setLastGeneratedDescription(null);
  }, [property.id, property.description]);

  const initialAmenities = normalizeAmenities(property.amenities);
  const initialLocation = parseLocationParts(property.location);
  const {
    quartiers,
    loading: quartiersLoading,
    saving: quartiersSaving,
    managed: quartiersManaged,
    warning: quartiersWarning,
    error: quartiersError,
    refreshQuartiers,
    addQuartier,
    updateQuartier,
    removeQuartier,
  } = useAdminQuartiers();

  const [form, setForm] = useState<FormState>({
    title: property.title ?? "",
    transactionType: normalizeStoredTransactionType(property.locationType, property.type),
    category: property.category ?? "",
    apartmentType: property.apartmentType ?? "",
    price: property.price ?? "",
    ownerPhone: digitsOnly(property.ownerPhone ?? ""),
    commune: initialLocation.commune,
    quartier: initialLocation.quartier,
    locationDetail: initialLocation.locationDetail,
    beds: property.beds != null ? String(property.beds) : "",
    baths: property.baths != null ? String(property.baths) : "",
    area: property.area != null ? String(property.area) : "",
    description: property.description ?? "",
    amenities:
      initialAmenities.length > 0
        ? initialAmenities
        : parseAmenitiesFromDescription(property.description),
  });
  const quartierOptions = useMemo(() => {
    const byCommune = form.commune
      ? quartiers.filter((item) => {
          const itemCommune = String(item.commune ?? "").trim().toLowerCase();
          const selectedCommune = form.commune.trim().toLowerCase();
          return !itemCommune || itemCommune === selectedCommune;
        })
      : quartiers;

    const baseOptions = byCommune.map((item) => ({
      value: item.name,
      label: form.commune ? item.name : `${item.name}${item.commune ? ` - ${item.commune}` : ""}`,
    }));

    if (form.quartier && !baseOptions.some((option) => option.value === form.quartier)) {
      baseOptions.unshift({
        value: form.quartier,
        label: `${form.quartier} (hors liste)`,
      });
    }

    return [
      { value: "", label: quartiersLoading ? "Chargement..." : "Selectionner un quartier" },
      ...baseOptions,
    ];
  }, [form.commune, form.quartier, quartiers, quartiersLoading]);

  function toggleAmenity(key: AmenityKey) {
    setForm((s) => ({
      ...s,
      amenities: s.amenities.includes(key)
        ? s.amenities.filter((x) => x !== key)
        : [...s.amenities, key],
    }));
  }

  function onUpdateDescription() {
    const generated = generateDescriptionFromForm(form);
    setForm((s) => ({ ...s, description: generated }));
    setLastGeneratedDescription(generated);
    setSuccess("Description mise a jour.");
    setError(null);
  }

  async function persistImagesPatch(payload: Record<string, unknown>) {
    const res = await fetch("/api/admin/property-images", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, "Impossible de mettre a jour les images."));
    }
  }

  async function onSetCover(imageId: string) {
    setError(null);
    setSuccess(null);
    setImageBusy({ id: imageId, action: "cover" });
    try {
      await persistImagesPatch({
        propertyId: property.id,
        coverImageId: imageId,
      });

      setExistingImages((prev) =>
        prev.map((img) => ({
          ...img,
          is_cover: img.id === imageId,
        }))
      );
      setSuccess("Image cover mise a jour.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Operation impossible.");
    } finally {
      setImageBusy({ id: null, action: null });
    }
  }

  async function onMoveImage(currentIndex: number, delta: number) {
    const nextIndex = currentIndex + delta;
    if (nextIndex < 0 || nextIndex >= existingImages.length) return;

    setError(null);
    setSuccess(null);
    const targetId = existingImages[currentIndex]?.id ?? null;
    setImageBusy({ id: targetId, action: "reorder" });

    const reordered = swapImagePosition(existingImages, currentIndex, nextIndex);
    try {
      await persistImagesPatch({
        propertyId: property.id,
        orderedImageIds: reordered.map((img) => img.id),
      });
      setExistingImages(reordered);
      setActiveImageId(reordered[nextIndex]?.id ?? null);
      setSuccess("Ordre des images mis a jour.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Operation impossible.");
    } finally {
      setImageBusy({ id: null, action: null });
    }
  }

  async function onDeleteImage(imageId: string) {
    const confirmed = window.confirm("Supprimer cette image ?");
    if (!confirmed) return;

    setError(null);
    setSuccess(null);
    setImageBusy({ id: imageId, action: "delete" });
    try {
      const res = await fetch("/api/admin/property-images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ imageId }),
      });
      if (!res.ok) throw new Error(await readErrorMessage(res, "Suppression impossible."));

      setExistingImages((prev) => normalizeExistingImages(prev.filter((img) => img.id !== imageId)));
      setSuccess("Image supprimee.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Operation impossible.");
    } finally {
      setImageBusy({ id: null, action: null });
    }
  }

  async function onReplaceImage(imageId: string, file: File) {
    if (!file) return;

    setError(null);
    setSuccess(null);
    setImageBusy({ id: imageId, action: "replace" });
    try {
      const formData = new FormData();
      formData.append("imageId", imageId);
      formData.append("ref", property.ref);
      formData.append("file", file);

      const res = await fetch("/api/admin/property-images", {
        method: "PUT",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) throw new Error(await readErrorMessage(res, "Remplacement impossible."));
      const payload = (await res.json()) as { path?: string };
      const newPath = String(payload.path ?? "").trim();
      if (!newPath) throw new Error("Path image invalide.");

      setExistingImages((prev) =>
        prev.map((img) => (img.id === imageId ? { ...img, path: newPath } : img))
      );
      setSuccess("Image remplacee.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Operation impossible.");
    } finally {
      setImageBusy({ id: null, action: null });
    }
  }

  async function onAddImages(fileList: FileList | null) {
    const pickedFiles = Array.from(fileList ?? []).filter((file) => file.type.startsWith("image/"));
    if (!pickedFiles.length) return;

    setError(null);
    setSuccess(null);
    setImageBusy({ id: null, action: "upload" });
    try {
      const formData = new FormData();
      formData.append("propertyId", property.id);
      formData.append("ref", property.ref);
      pickedFiles.forEach((file) => formData.append("files", file));

      const res = await fetch("/api/admin/property-images", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error(await readErrorMessage(res, "Ajout des images impossible."));

      setSuccess("Images ajoutees.");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Operation impossible.");
    } finally {
      setImageBusy({ id: null, action: null });
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (hasImageOperation) {
      setError("Attendez la fin de l'operation image en cours avant d'enregistrer.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const dbType = form.transactionType === "Vente" ? "Vente" : "Location";
      const locationType = transactionTypeToStorageValue(form.transactionType);
      const location = buildLocation(form.commune, form.quartier, form.locationDetail);

      const res = await fetch(`/api/admin/properties/${property.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: form.title.trim(),
          type: dbType,
          location_type: locationType,
          category: form.category.trim() || null,
          apartment_type: form.apartmentType.trim() || null,
          price: form.price.trim() || null,
          owner_phone: digitsOnly(form.ownerPhone) || null,
          location: location || null,
          beds: toOptionalNumber(form.beds),
          baths: toOptionalNumber(form.baths),
          area: toOptionalNumber(form.area),
          description: form.description.trim() || null,
          amenities: form.amenities,
        }),
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "Failed to update property"));
      }

      setSuccess("Bien mis a jour.");
      setSavedDescription(form.description);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const activeIndex = activeImage ? existingImages.findIndex((img) => img.id === activeImage.id) : -1;
  const busyCurrentImage =
    activeImage && imageBusy.id === activeImage.id && imageBusy.action !== null;
  const hasImageOperation = imageBusy.action !== null;
  const isUploadingImages = imageBusy.action === "upload";
  const activeImageLabel =
    activeIndex >= 0
      ? `Image ${activeIndex + 1} / ${existingImages.length}`
      : "Aucune image selectionnee";
  const hasMultipleImages = existingImages.length > 1;
  const descriptionMetrics = getDescriptionMetrics(form.description);
  const descriptionState = getDescriptionState(form.description, lastGeneratedDescription);
  const descriptionStateLabel =
    descriptionState === "empty"
      ? "vide"
      : descriptionState === "generated"
        ? "generee"
        : "personnalisee";
  const hasUnsavedDescription = hasUnsavedDescriptionChanges(form.description, savedDescription);
  const { isDialogOpen, stayOnPage, confirmLeave } = useUnsavedNavigationGuard({
    isDirty: hasUnsavedDescription,
    message: "Vous avez des modifications non enregistrees dans la description.",
  });

  function goToImageByIndex(nextIndex: number) {
    if (!existingImages.length) return;
    const safe = Math.max(0, Math.min(existingImages.length - 1, nextIndex));
    setActiveImageId(existingImages[safe]?.id ?? null);
  }

  function goPrevImage() {
    if (!hasMultipleImages) return;
    const prev = activeIndex <= 0 ? existingImages.length - 1 : activeIndex - 1;
    goToImageByIndex(prev);
  }

  function goNextImage() {
    if (!hasMultipleImages) return;
    const next = activeIndex >= existingImages.length - 1 ? 0 : activeIndex + 1;
    goToImageByIndex(next);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="relative space-y-8 overflow-hidden rounded-[30px] border border-slate-200/80 bg-gradient-to-b from-white via-white to-slate-50 p-6 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.65)] animate-in fade-in-0 duration-500 md:p-8"
    >
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
            <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
              Ref: {property.ref}
            </span>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
        <Field label="Ref">
          <Input
            className="h-11 rounded-2xl border-0 bg-white/80 px-4 ring-1 ring-black/10"
            value={property.ref}
            readOnly
          />
        </Field>

        <Field label="Titre" required>
          <Input
            className="h-11 rounded-2xl border-0 bg-white/80 px-4 ring-1 ring-black/10"
            value={form.title}
            onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
            required
            placeholder="Appartement F3..."
          />
        </Field>

        <Field label="Transaction" required>
          <AppDropdown
            value={form.transactionType}
            onValueChange={(value) =>
              setForm((s) => ({ ...s, transactionType: value as TransactionType }))
            }
            options={TRANSACTION_OPTIONS}
          />
        </Field>

        <Field label="Categorie">
          <AppDropdown
            value={form.category}
            onValueChange={(value) => setForm((s) => ({ ...s, category: value }))}
            options={[
              { value: "", label: "--" },
              { value: "appartement", label: "Appartement" },
              { value: "villa", label: "Villa" },
              { value: "terrain", label: "Terrain" },
              { value: "local", label: "Local" },
              { value: "bureau", label: "Bureau" },
            ]}
          />
        </Field>

        <Field label="Commune (Oran)">
          <AppDropdown
            value={form.commune}
            onValueChange={(value) => setForm((s) => ({ ...s, commune: value }))}
            options={[
              { value: "", label: "Selectionner une commune" },
              ...ORAN_COMMUNES.map((commune) => ({ value: commune, label: commune })),
            ]}
          />
        </Field>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[13px] font-semibold tracking-wide text-[rgb(var(--navy))]">
              Quartier
            </div>
            <QuartiersManagerModal
              quartiers={quartiers}
              loading={quartiersLoading}
              saving={quartiersSaving}
              managed={quartiersManaged}
              warning={quartiersWarning}
              error={quartiersError}
              onRefresh={refreshQuartiers}
              onAdd={addQuartier}
              onUpdate={updateQuartier}
              onDelete={removeQuartier}
            />
          </div>
          <AppDropdown
            value={form.quartier}
            onValueChange={(value) => setForm((s) => ({ ...s, quartier: value }))}
            options={quartierOptions}
            disabled={quartiersLoading && quartierOptions.length <= 1}
          />
          {quartiersError ? (
            <p className="text-xs font-medium text-amber-700">{quartiersError}</p>
          ) : null}
        </div>

        {form.category === "appartement" && (
          <Field label="Type d'appartement (F/T)">
            <AppDropdown
              value={form.apartmentType}
              onValueChange={(value) => setForm((s) => ({ ...s, apartmentType: value }))}
              options={[
                { value: "", label: "--" },
                ...APARTMENT_TYPES.map((x) => ({ value: x, label: x })),
              ]}
            />
          </Field>
        )}

        <Field label="Prix">
          <Input
            className="h-11 rounded-2xl border-0 bg-white/80 px-4 ring-1 ring-black/10"
            value={form.price}
            onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
            placeholder="12 000 000 DA"
          />
        </Field>

        <Field label="Telephone proprietaire">
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="h-11 rounded-2xl border-0 bg-white/80 px-4 ring-1 ring-black/10"
            value={form.ownerPhone}
            onChange={(e) => setForm((s) => ({ ...s, ownerPhone: digitsOnly(e.target.value) }))}
            placeholder="0555123456"
          />
        </Field>

        <Field label="Detail adresse">
          <Input
            className="h-11 rounded-2xl border-0 bg-white/80 px-4 ring-1 ring-black/10"
            value={form.locationDetail}
            onChange={(e) => setForm((s) => ({ ...s, locationDetail: e.target.value }))}
            placeholder="Ex: residence, point de repere..."
          />
        </Field>

        <Field label="Surface (m2)">
          <Input
            type="number"
            className="h-11 rounded-2xl border-0 bg-white/80 px-4 ring-1 ring-black/10"
            value={form.area}
            onChange={(e) => setForm((s) => ({ ...s, area: e.target.value }))}
            placeholder="124"
          />
        </Field>

        <Field label="Chambres">
          <Input
            type="number"
            className="h-11 rounded-2xl border-0 bg-white/80 px-4 ring-1 ring-black/10"
            value={form.beds}
            onChange={(e) => setForm((s) => ({ ...s, beds: e.target.value }))}
            placeholder="3"
          />
        </Field>

        <Field label="Salles de bain">
          <Input
            type="number"
            className="h-11 rounded-2xl border-0 bg-white/80 px-4 ring-1 ring-black/10"
            value={form.baths}
            onChange={(e) => setForm((s) => ({ ...s, baths: e.target.value }))}
            placeholder="2"
          />
        </Field>
        </div>
      </section>

      <section className="relative space-y-4 rounded-3xl border border-slate-200/80 bg-white/85 p-5 shadow-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:70ms] md:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-slate-900">Equipements / points forts</div>
          <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
            {form.amenities.length} selectionne(s)
          </span>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          {AMENITY_OPTIONS.map((opt) => {
            const checked = form.amenities.includes(opt.key);
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
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Description
            </div>
            <p className="text-xs text-slate-600">
              Regenerer puis ajuster le texte final avant enregistrement.
            </p>
          </div>
          <button
            type="button"
            onClick={onUpdateDescription}
            disabled={loading || hasImageOperation}
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
          <div className="text-[13px] font-semibold tracking-wide text-[rgb(var(--navy))]">
            Texte du bien
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-black/5">
            <textarea
              className="min-h-52 w-full resize-y border-0 bg-transparent px-4 py-4 text-sm leading-6 text-slate-800 outline-none focus:ring-2 focus:ring-slate-300"
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              placeholder="Description du bien..."
            />
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-2 text-[11px] font-medium text-slate-600">
              <span>Texte libre: vous pouvez modifier chaque ligne.</span>
              <span>Etat: {form.description.trim() ? "renseigne" : "vide"}</span>
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
                Cover: {existingImages.some((img) => img.is_cover) ? "definie" : "non definie"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
              {existingImages.length} image(s)
            </div>
            <button
              type="button"
              disabled={!!imageBusy.action || loading}
              onClick={() => addImagesInputRef.current?.click()}
              className="rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
            >
              Ajouter images
            </button>
            <input
              ref={addImagesInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                onAddImages(e.currentTarget.files);
                e.currentTarget.value = "";
              }}
            />
          </div>
        </div>

        {existingImages.length === 0 ? (
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
                      src={imageUrl(activeImage.path)}
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
                      {activeIndex + 1} / {existingImages.length}
                    </div>
                    <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
                      {activeImage.is_cover ? "COVER" : `Image ${activeIndex + 1}`}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Galerie images
                </div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-7">
                  {existingImages.map((img, idx) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setActiveImageId(img.id)}
                      className={[
                        "relative aspect-[4/3] overflow-hidden rounded-xl border bg-white transition",
                        activeImageId === img.id
                          ? "ring-2 ring-slate-900 ring-offset-1"
                          : "border-slate-200 hover:-translate-y-0.5 hover:opacity-90",
                      ].join(" ")}
                      title={`Image ${idx + 1}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl(img.path)} alt={`Image ${idx + 1}`} className="h-full w-full object-contain object-center" />
                      <span className="absolute bottom-1 right-1 rounded-md bg-black/60 px-1 py-0.5 text-[10px] font-semibold text-white">
                        {idx + 1}
                      </span>
                      {img.is_cover ? (
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
                    {activeImage.is_cover ? "Cover active" : "Image standard"}
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={!activeImage || activeIndex <= 0 || !!imageBusy.action}
                  onClick={() => onMoveImage(activeIndex, -1)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Deplacer gauche
                </button>
                <button
                  type="button"
                  disabled={!activeImage || activeIndex >= existingImages.length - 1 || !!imageBusy.action}
                  onClick={() => onMoveImage(activeIndex, 1)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Deplacer droite
                </button>
                <button
                  type="button"
                  disabled={!activeImage || activeImage.is_cover || !!imageBusy.action}
                  onClick={() => activeImage && onSetCover(activeImage.id)}
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
                      const file = e.target.files?.[0];
                      if (file && activeImage) onReplaceImage(activeImage.id, file);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  disabled={!activeImage || !!imageBusy.action}
                  onClick={() => activeImage && onDeleteImage(activeImage.id)}
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

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/85 p-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:220ms] sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/admin/protected"
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Retour au tableau
        </Link>

        <Button
          type="submit"
          disabled={loading || hasImageOperation}
          className="h-11 rounded-2xl bg-gradient-to-r from-[rgb(var(--navy))] to-slate-800 px-6 text-white shadow-sm transition hover:opacity-95"
        >
          {loading
            ? "Mise a jour..."
            : hasImageOperation
              ? "Operation image en cours..."
              : "Enregistrer les modifications"}
        </Button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 animate-in fade-in-0 zoom-in-95">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 animate-in fade-in-0 zoom-in-95">
          {success}
        </div>
      )}
      <UnsavedDescriptionModal
        open={isDialogOpen}
        onStay={stayOnPage}
        onLeave={confirmLeave}
      />
    </form>
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
