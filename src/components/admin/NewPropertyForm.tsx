"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ImagePicker from "@/components/admin/ImagePicker";
import QuartiersManagerModal from "@/components/admin/QuartiersManagerModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminQuartiers } from "@/hooks/use-admin-quartiers";
import { ORAN_COMMUNES } from "@/lib/oran-locations";
import { createClient } from "@/lib/supabase/client";
import { toUiErrorMessage } from "@/lib/ui-errors";
import AppDropdown from "@/components/ui/app-dropdown";
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

const VILLA_FLOOR_OPTIONS = ["R+1", "R+2", "R+3", "R+4", "R+5", "R+6"] as const;

type TransactionType =
  | "Vente"
  | "Location"
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

const TYPE_LABELS: Record<string, string> = {
  appartement: "Appartement",
  villa: "Villa",
  terrain: "Terrain",
  local: "Local",
  bureau: "Bureau",
};

const TITLE_AMENITY_KEYS = new Set([
  "parking_sous_sol",
  "box",
  "luxe",
  "haut_standing",
  "piscine",
  "jardin",
  "terrasse",
  "domotique",
]);

type FormState = {
  ref: string;
  title: string;
  autoTitle: boolean;
  type: string;
  transactionType: TransactionType;
  apartmentType: string;
  suiteParentale: boolean;
  price: string;
  commune: string;
  quartier: string;
  locationDetail: string;
  ownerPhone: string;
  residenceName: string;
  promotionName: string;
  deliveryYear: string;
  floor: string;
  neverHabited: boolean;
  paymentTerms: string;
  agencyFees: string;
  amenities: string[];
  beds: string;
  baths: string;
  area: string;
  description: string;
};

type NewPropertyFormProps = {
  initialRef?: string;
  ownerLeadId?: string;
  submissionMode?: "create" | "request";
};

type AgencyRequestImageUploadResult = {
  paths: string[];
  urls: string[];
};

function isLocationTransaction(transactionType: TransactionType) {
  return transactionType !== "Vente";
}

function transactionTypeLabel(transactionType: TransactionType) {
  return TRANSACTION_OPTIONS.find((x) => x.value === transactionType)?.label ?? transactionType;
}

function transactionTypeToStorageValue(transactionType: TransactionType): string {
  if (transactionType === "Vente") return "vente";
  if (transactionType === "Location") return "location";
  return transactionType;
}

function defaultAgencyFees(transactionType: TransactionType) {
  if (transactionType === "par_nuit" || transactionType === "court_sejour") return "";
  return transactionType === "Vente" ? "1%" : "1 mois";
}

function isAgencyFeesLockedTransaction(transactionType: TransactionType) {
  return transactionType === "six_mois" || transactionType === "douze_mois";
}

function isSaleTransaction(transactionType: TransactionType) {
  return transactionType === "Vente";
}

function isShortStayTransaction(transactionType: TransactionType) {
  return transactionType === "par_nuit" || transactionType === "court_sejour";
}

function agencyFeesPlaceholder(transactionType: TransactionType) {
  if (isSaleTransaction(transactionType)) return "1% a 5%";
  if (isShortStayTransaction(transactionType)) return "Montant fixe (DZD), ex: 2000";
  return defaultAgencyFees(transactionType);
}

function parseSaleAgencyPercent(raw: string) {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n)) return null;
  const clamped = Math.min(5, Math.max(1, Math.round(n)));
  return clamped;
}

function parseOptionalNumber(raw: string) {
  const cleaned = (raw || "").replace(/\s+/g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function digitsOnly(raw: string) {
  return (raw || "").replace(/\D/g, "");
}

function isMissingColumnError(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("column") && m.includes("does not exist");
}

function defaultPaymentTerms(transactionType: TransactionType) {
  if (transactionType === "Vente") return "Comptant ou echeancier selon accord";
  if (transactionType === "Location") return "Mensuel";
  if (transactionType === "par_mois") return "Par mois";
  if (transactionType === "six_mois") return "6 mois";
  if (transactionType === "douze_mois") return "12 mois";
  if (transactionType === "par_nuit") return "Par nuit";
  return "Court sejour";
}

function buildLocation(commune: string, quartier: string, detail: string) {
  const c = commune.trim();
  const q = quartier.trim();
  const d = detail.trim();
  const parts = [c, q].filter(Boolean);

  if (d && d.toLowerCase() !== q.toLowerCase()) {
    parts.push(d);
  }

  return parts.join(" - ");
}

function inferRoomLine(apartmentType: string) {
  const m = apartmentType.match(/^[FT](\d+)$/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 1) return null;
  return `${apartmentType} (salon + ${n - 1} chambre${n - 1 > 1 ? "s" : ""})`;
}

function formatFloorForText(floor: string) {
  const trimmed = floor.trim();
  if (!trimmed) return "";
  if (/^\d+$/.test(trimmed)) return `${trimmed}e`;
  return trimmed;
}

function generateTitle(form: FormState) {
  const parts: string[] = [];
  const typeLabel = form.type ? TYPE_LABELS[form.type] ?? form.type : "";
  const floorLabel = formatFloorForText(form.floor);
  const areaLabel = form.area.trim() ? `${form.area.trim()} m2` : "";

  if (typeLabel) {
    if (form.type === "appartement" && form.apartmentType) {
      parts.push(`${typeLabel} ${form.apartmentType}`);
    } else {
      parts.push(typeLabel);
    }
  }

  if (form.commune.trim()) parts.push(form.commune.trim());
  if (form.residenceName.trim()) parts.push(`Residence ${form.residenceName.trim()}`);
  if (form.type === "villa" && floorLabel) parts.push(floorLabel);
  if (form.type === "villa" && areaLabel) parts.push(areaLabel);

  const titleAmenities = AMENITY_OPTIONS
    .filter((x) => TITLE_AMENITY_KEYS.has(x.key) && form.amenities.includes(x.key))
    .map((x) => x.label);

  if (titleAmenities.length) parts.push(titleAmenities.join(" | "));

  return parts.join(" - ");
}

function generateDescription(form: FormState) {
  const location = buildLocation(form.commune, form.quartier, form.locationDetail);
  const transactionLabel = transactionTypeLabel(form.transactionType);
  const locationModeSuffix =
    form.transactionType === "Location" || form.transactionType === "Vente"
      ? ""
      : ` (${transactionLabel})`;
  const labelType =
    form.type === "appartement" && form.apartmentType
      ? `appartement ${form.apartmentType}`
      : form.type
      ? `bien ${form.type}`
      : "bien immobilier";

  const residenceBlock = [form.residenceName, form.promotionName].filter(Boolean).join(" - ");
  const floorLabel = formatFloorForText(form.floor);

  const introParts = [
    `L'agence Rostomyia Immobilier vous propose ${isLocationTransaction(form.transactionType) ? "a la location" : "a la vente"}${locationModeSuffix} un ${labelType}`,
    form.neverHabited ? "neuf jamais habite" : "",
    floorLabel ? `situe au ${floorLabel} etage` : "",
    residenceBlock ? `au sein de ${residenceBlock}` : "",
    form.deliveryYear ? `livre en ${form.deliveryYear}` : "",
  ].filter(Boolean);

  const roomLine = inferRoomLine(form.apartmentType);
  const selectedAmenities = AMENITY_OPTIONS.filter((x) => form.amenities.includes(x.key)).map((x) => x.label);

  const features = [
    form.type === "appartement" && form.apartmentType ? `Type : ${form.apartmentType}` : null,
    isLocationTransaction(form.transactionType) ? `Modalite : ${transactionLabel}` : null,
    roomLine ? `Configuration : ${roomLine}` : null,
    form.area ? `Superficie : ${form.area} m2` : null,
    floorLabel ? `Etage : ${floorLabel}` : null,
    form.suiteParentale ? "Suite parentale" : null,
    ...selectedAmenities,
  ].filter(Boolean) as string[];

  const finalPriceLabel = isLocationTransaction(form.transactionType) ? "Loyer" : "Prix";

  return [
    `${introParts.join(", ")}.`,
    "",
    "Un bien ideal pour une famille a la recherche de confort, de modernite et de securite.",
    "",
    "Caractéristiques principales :",
    ...features.map((f) => `* ${f}`),
    "",
    "Emplacement :",
    location || "* A preciser",
    "",
    `${finalPriceLabel} : ${form.price || "A preciser"}`,
    `Paiement : ${form.paymentTerms || "A preciser"}`,
    `Frais d'agence : ${form.agencyFees || "A preciser"} - Rostomyia Immobilier`,
  ].join("\n");
}

export default function NewPropertyForm({
  initialRef,
  ownerLeadId,
  submissionMode = "create",
}: NewPropertyFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const isRequestMode = submissionMode === "request";

  const [form, setForm] = useState<FormState>({
    ref: "",
    title: "",
    autoTitle: true,
    type: "",
    transactionType: "Vente",
    apartmentType: "",
    suiteParentale: false,
    price: "",
    commune: "",
    quartier: "",
    locationDetail: "",
    ownerPhone: "",
    residenceName: "",
    promotionName: "",
    deliveryYear: "",
    floor: "",
    neverHabited: false,
    paymentTerms: defaultPaymentTerms("Vente"),
    agencyFees: defaultAgencyFees("Vente"),
    amenities: [],
    beds: "",
    baths: "",
    area: "",
    description: "",
  });

  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [savedDescription, setSavedDescription] = useState("");
  const [lastGeneratedDescription, setLastGeneratedDescription] = useState<string | null>(null);
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
  const { autoTitle, type, apartmentType, commune, residenceName, amenities, floor, area } = form;
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
  const quartierErrorLabel = useMemo(() => {
    if (!quartiersError) return null;
    if (isRequestMode && /(forbidden|unauthorized|permission denied)/i.test(quartiersError)) {
      return null;
    }
    return quartiersError;
  }, [isRequestMode, quartiersError]);

  function generateRef() {
    const ts = Date.now().toString().slice(-6);
    const rand = Math.floor(100 + Math.random() * 900).toString();
    return `OR-${ts}${rand}`;
  }

  useEffect(() => {
    setForm((s) => ({ ...s, ref: initialRef || generateRef() }));
  }, [initialRef]);

  useEffect(() => {
    if (!autoTitle) return;
    setForm((s) => {
      const nextTitle = generateTitle(s);
      return s.autoTitle && s.title !== nextTitle ? { ...s, title: nextTitle } : s;
    });
  }, [autoTitle, type, apartmentType, commune, residenceName, amenities, floor, area]);

  function toggleAmenity(key: string) {
    setForm((s) => ({
      ...s,
      amenities: s.amenities.includes(key)
        ? s.amenities.filter((x) => x !== key)
        : [...s.amenities, key],
    }));
  }

  function handleGenerateDescription() {
    const generated = generateDescription(form);
    setForm((s) => ({ ...s, description: generated }));
    setLastGeneratedDescription(generated);
  }

  async function uploadAgencyRequestImages(ref: string): Promise<AgencyRequestImageUploadResult> {
    if (!files.length) return { paths: [], urls: [] };

    const formData = new FormData();
    formData.append("ref", ref);
    files.forEach((file) => formData.append("files", file));

    const res = await fetch("/api/agency/request-images", {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      const message =
        payload && typeof payload === "object" && "error" in payload
          ? String(payload.error)
          : "Impossible de televerser les photos";
      throw new Error(message);
    }

    const paths =
      payload && typeof payload === "object" && Array.isArray(payload.paths)
        ? (payload.paths as unknown[]).filter((item): item is string => typeof item === "string")
        : [];
    const urls =
      payload && typeof payload === "object" && Array.isArray(payload.urls)
        ? (payload.urls as unknown[]).filter((item): item is string => typeof item === "string")
        : [];

    return { paths, urls };
  }

  async function submitThirdPartyRequest() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userMeta = (user?.user_metadata ?? {}) as {
      agency_name?: string;
      company_name?: string;
      full_name?: string;
      agency_manager_name?: string;
      agency_phone?: string;
      phone?: string;
    };
    const agencyName =
      userMeta.agency_name || userMeta.company_name || userMeta.agency_manager_name || userMeta.full_name || user?.email || "Agence partenaire";
    const agencyPhone = userMeta.agency_phone?.trim() || userMeta.phone?.trim() || user?.phone?.trim() || "-";
    const agencyEmail = user?.email?.trim() || null;
    const submittedRef = form.ref.trim() || generateRef();
    const uploaded = await uploadAgencyRequestImages(submittedRef);
    const uploadedLinksText = uploaded.urls.length ? uploaded.urls.join("\n") : "";

    const location = buildLocation(form.commune, form.quartier, form.locationDetail);
    const description = form.description.trim() || generateDescription(form);
    const locationType = transactionTypeToStorageValue(form.transactionType);
    const priceNumber = parseOptionalNumber(form.price);
    const surfaceNumber = parseOptionalNumber(form.area);
    const bathsNumber = parseOptionalNumber(form.baths);
    const bedsNumber = parseOptionalNumber(form.beds);

    const details = [
      `Ref interne: ${form.ref || "-"}`,
      `Type transaction: ${transactionTypeLabel(form.transactionType)}`,
      `Categorie: ${form.type || "-"}`,
      form.apartmentType ? `Type appartement: ${form.apartmentType}` : "",
      form.floor ? `Etage: ${form.floor}` : "",
      form.deliveryYear ? `Livraison: ${form.deliveryYear}` : "",
      form.paymentTerms ? `Paiement: ${form.paymentTerms}` : "",
      form.agencyFees ? `Frais d'agence: ${form.agencyFees}` : "",
      form.amenities.length ? `Equipements: ${form.amenities.join(", ")}` : "",
      uploadedLinksText ? `Photos: ${uploadedLinksText}` : "",
      "",
      description,
    ]
      .filter(Boolean)
      .join("\n");

    const richPayload = {
      lang: "fr",
      status: "new",
      intent: "agency_deposit",
      property_type: form.type || null,
      transaction_type: locationType,
      location_type: locationType,
      title: form.title.trim() || null,
      city: "Oran",
      commune: form.commune.trim() || null,
      district: form.quartier.trim() || null,
      address: location || null,
      price: priceNumber,
      surface: surfaceNumber,
      rooms: bedsNumber,
      baths: bathsNumber,
      payment_terms: form.paymentTerms.trim() || null,
      residence_name: form.residenceName.trim() || null,
      name: agencyName,
      phone: agencyPhone,
      email: agencyEmail,
      photo_links: uploadedLinksText || null,
      message: details || null,
    };

    const fallbackPayload = {
      lang: "fr",
      status: "new",
      intent: "agency_deposit",
      property_type: form.type || null,
      city: "Oran",
      district: form.quartier.trim() || form.locationDetail.trim() || form.commune.trim() || null,
      price: priceNumber,
      surface: surfaceNumber,
      name: agencyName,
      phone: agencyPhone,
      message: details || null,
    };

    const { error: richError } = await supabase.from("owner_leads").insert(richPayload);

    if (richError && isMissingColumnError(richError.message)) {
      const fallback = await supabase.from("owner_leads").insert(fallbackPayload);
      if (fallback.error) throw new Error(fallback.error.message || "Impossible d'envoyer la demande");
      return;
    }

    if (richError) throw new Error(richError.message || "Impossible d'envoyer la demande");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRequestMode) {
        await submitThirdPartyRequest();
        setSavedDescription(form.description);
        setRequestSubmitted(true);
        return;
      }

      const submittedRef = form.ref.trim() || generateRef();
      const location = buildLocation(form.commune, form.quartier, form.locationDetail);
      const description = form.description.trim() || generateDescription(form);
      const dbType = form.transactionType === "Vente" ? "Vente" : "Location";
      const locationType = transactionTypeToStorageValue(form.transactionType);

      const res = await fetch("/api/admin/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ref: submittedRef,
          title: form.title.trim(),
          type: dbType,
          location_type: locationType,
          owner_lead_id: ownerLeadId ?? null,
          category: form.type ? form.type.trim() : null,
          apartment_type: form.apartmentType ? form.apartmentType.trim() : null,
          price: form.price.trim() || null,
          location: location || null,
          owner_phone: digitsOnly(form.ownerPhone) || null,
          beds: form.beds ? Number(form.beds) : null,
          baths: form.baths ? Number(form.baths) : null,
          area: form.area ? Number(form.area) : null,
          description,
          amenities: form.amenities,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to create property");

      const { id: propertyId, ref: propertyRef } = data as {
        id: string;
        ref: string;
      };

      if (files.length) {
        const formData = new FormData();
        formData.append("propertyId", propertyId);
        formData.append("ref", propertyRef);
        files.forEach((f) => formData.append("files", f));

        const imgRes = await fetch("/api/admin/property-images", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!imgRes.ok) {
          let errMsg = "Failed to upload images";
          try {
            const parsed = await imgRes.json();
            errMsg = parsed?.error ?? JSON.stringify(parsed) ?? errMsg;
          } catch {
            const txt = await imgRes.text().catch(() => null);
            if (txt) errMsg = txt;
          }

          setError(toUiErrorMessage(errMsg, { context: "submit" }));
          setLoading(false);
          return;
        }
      }

      router.push(`/biens/${propertyRef}`);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(toUiErrorMessage(message, { context: "submit" }));
    } finally {
      setLoading(false);
    }
  }

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

  if (isRequestMode && requestSubmitted) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-2xl font-bold text-[rgb(var(--navy))]">Demande envoyee</h2>
        <p className="mt-2 text-sm text-black/65">
          Votre depot agence a ete transmis au backoffice pour validation avant publication.
        </p>
      </div>
    );
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
            {isRequestMode ? "Depot Section" : "Creation Section"}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {isRequestMode ? "Depot agence" : "Informations du bien"}
            </h2>
            <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
              Ref: {form.ref}
            </span>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
        <Field label="Ref" required>
          <Input
            className="h-11 rounded-2xl border-0 bg-white/80 px-4 ring-1 ring-black/10"
            value={form.ref}
            readOnly
            placeholder="OR-001"
          />
        </Field>

        <Field label="Titre" required>
          <div>
            <Input
              className="h-11 rounded-2xl border-0 bg-white/80 px-4 ring-1 ring-black/10"
              value={form.title}
              onChange={(e) => setForm((s) => ({ ...s, title: e.target.value, autoTitle: false }))}
              required
              placeholder="Appartement F3..."
            />
            <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.autoTitle}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      autoTitle: e.target.checked,
                      title: e.target.checked ? generateTitle(s) : s.title,
                    }))
                  }
                />
                Titre auto (categorie + commune + residence + points forts)
              </label>
              <button
                type="button"
                className="rounded-lg bg-black/5 px-2 py-1 hover:bg-black/10"
                onClick={() =>
                  setForm((s) => ({
                    ...s,
                    autoTitle: true,
                    title: generateTitle(s),
                  }))
                }
              >
                Regenerer
              </button>
            </div>
          </div>
        </Field>

        <Field label="Transaction" required>
          <AppDropdown
            value={form.transactionType}
            onValueChange={(value) =>
              setForm((s) => {
                const nextTransaction = value as TransactionType;
                const nextAgencyDefault = defaultAgencyFees(nextTransaction);
                const nextPaymentDefault = defaultPaymentTerms(nextTransaction);

                return {
                  ...s,
                  transactionType: nextTransaction,
                  agencyFees: nextAgencyDefault,
                  paymentTerms: nextPaymentDefault,
                };
              })
            }
            options={TRANSACTION_OPTIONS}
          />
        </Field>

        <Field label="Categorie">
          <AppDropdown
            value={form.type}
            onValueChange={(value) =>
              setForm((s) => {
                const nextType = value;
                if (nextType !== "appartement") {
                  return {
                    ...s,
                    type: nextType,
                    apartmentType: "",
                    residenceName: "",
                    promotionName: "",
                    deliveryYear: "",
                    floor: "",
                  };
                }
                return { ...s, type: nextType };
              })
            }
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

        <Field label="Commune (Oran)" required>
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
            {!isRequestMode ? (
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
            ) : null}
          </div>
          <AppDropdown
            value={form.quartier}
            onValueChange={(value) => setForm((s) => ({ ...s, quartier: value }))}
            options={quartierOptions}
            disabled={quartiersLoading && quartierOptions.length <= 1}
            searchable={isRequestMode}
            searchPlaceholder="Rechercher un quartier..."
            noResultsLabel="Aucun quartier trouve"
          />
          {quartierErrorLabel ? (
            <p className="text-xs font-medium text-amber-700">{quartierErrorLabel}</p>
          ) : null}
        </div>

        {form.type === "appartement" && (
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
            placeholder={isLocationTransaction(form.transactionType) ? "75 000 DA / mois" : "12 000 000 DA"}
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

        {!isRequestMode ? (
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
        ) : null}

        {form.type === "appartement" && (
          <>
            <Field label="Residence / immeuble">
              <Input
                className="h-11 rounded-2xl border-0 bg-white/80 px-4 ring-1 ring-black/10"
                value={form.residenceName}
                onChange={(e) => setForm((s) => ({ ...s, residenceName: e.target.value }))}
                placeholder="Ex: Residence L'Etourneau"
              />
            </Field>

            <Field label="Promotion">
              <Input
                className="h-11 rounded-2xl border-0 bg-white/80 px-4 ring-1 ring-black/10"
                value={form.promotionName}
                onChange={(e) => setForm((s) => ({ ...s, promotionName: e.target.value }))}
                placeholder="Ex: Promotion Argoss"
              />
            </Field>

            <Field label="Annee de livraison">
              <Input
                type="number"
                className="h-11 rounded-2xl border-0 bg-white/80 px-4 ring-1 ring-black/10"
                value={form.deliveryYear}
                onChange={(e) => setForm((s) => ({ ...s, deliveryYear: e.target.value }))}
                placeholder="2025"
              />
            </Field>

            <Field label="Etage">
              <Input
                type="number"
                className="h-11 rounded-2xl border-0 bg-white/80 px-4 ring-1 ring-black/10"
                value={form.floor}
                onChange={(e) => setForm((s) => ({ ...s, floor: e.target.value }))}
                placeholder="13"
              />
            </Field>
          </>
        )}

        {form.type === "villa" && (
          <Field label="Etage (villa)">
            <AppDropdown
              value={form.floor}
              onValueChange={(value) => setForm((s) => ({ ...s, floor: value }))}
              options={[
                { value: "", label: "Selectionner" },
                ...VILLA_FLOOR_OPTIONS.map((floorOption) => ({ value: floorOption, label: floorOption })),
              ]}
            />
          </Field>
        )}

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

        <Field label="Paiement">
          <Input
            className="h-11 rounded-2xl border-0 bg-black/[0.03] px-4 text-black/55 ring-1 ring-black/10"
            value={form.paymentTerms}
            readOnly
            placeholder={defaultPaymentTerms(form.transactionType)}
          />
        </Field>

        <Field
          label={
            isSaleTransaction(form.transactionType)
              ? "Frais d'agence (%)"
              : isShortStayTransaction(form.transactionType)
              ? "Frais d'agence (DZD, ajoute au prix)"
              : "Frais d'agence"
          }
        >
          <Input
            className={`h-11 rounded-2xl border-0 px-4 ring-1 ring-black/10 ${
              isAgencyFeesLockedTransaction(form.transactionType)
                ? "bg-black/[0.03] text-black/55"
                : "bg-white/80"
            }`}
            type={isShortStayTransaction(form.transactionType) || isSaleTransaction(form.transactionType) ? "number" : "text"}
            inputMode={isShortStayTransaction(form.transactionType) || isSaleTransaction(form.transactionType) ? "numeric" : undefined}
            min={isShortStayTransaction(form.transactionType) ? 0 : isSaleTransaction(form.transactionType) ? 1 : undefined}
            max={isSaleTransaction(form.transactionType) ? 5 : undefined}
            step={isShortStayTransaction(form.transactionType) || isSaleTransaction(form.transactionType) ? 1 : undefined}
            value={
              isSaleTransaction(form.transactionType)
                ? String(parseSaleAgencyPercent(form.agencyFees) ?? "")
                : form.agencyFees
            }
            onChange={(e) =>
              setForm((s) => ({
                ...s,
                agencyFees: isShortStayTransaction(s.transactionType)
                  ? e.target.value.replace(/[^\d]/g, "")
                  : isSaleTransaction(s.transactionType)
                  ? (() => {
                      const next = parseSaleAgencyPercent(e.target.value);
                      return next == null ? "" : `${next}%`;
                    })()
                  : e.target.value,
              }))
            }
            readOnly={isAgencyFeesLockedTransaction(form.transactionType)}
            placeholder={agencyFeesPlaceholder(form.transactionType)}
          />
        </Field>
        </div>
      </section>

      <section className="relative rounded-3xl border border-slate-200/80 bg-white/85 p-5 shadow-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:70ms] md:p-6">
        <div className="grid gap-3 md:grid-cols-2">
        <label className="flex items-center gap-2 text-sm text-[rgb(var(--navy))]">
          <input
            type="checkbox"
            checked={form.suiteParentale}
            onChange={(e) => setForm((s) => ({ ...s, suiteParentale: e.target.checked }))}
          />
          Suite parentale
        </label>
        <label className="flex items-center gap-2 text-sm text-[rgb(var(--navy))]">
          <input
            type="checkbox"
            checked={form.neverHabited}
            onChange={(e) => setForm((s) => ({ ...s, neverHabited: e.target.checked }))}
          />
          Jamais habite
        </label>
        </div>
      </section>

      <section className="relative space-y-4 rounded-3xl border border-slate-200/80 bg-white/85 p-5 shadow-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:120ms] md:p-6">
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

      <section className="relative space-y-4 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:170ms] md:p-6">
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
              {isRequestMode
                ? "Generez une base puis adaptez le texte final pour la validation backoffice."
                : "Generez une base puis personnalisez le texte final avant publication."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerateDescription}
            disabled={loading}
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
              placeholder="Description generee ou personnalisee..."
            />
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-2 text-[11px] font-medium text-slate-600">
              <span>Texte libre: vous pouvez modifier chaque ligne.</span>
              <span>Etat: {form.description.trim() ? "renseigne" : "vide"}</span>
            </div>
          </div>
        </label>
      </section>

      <ImagePicker
        value={files}
        onChange={setFiles}
        maxFiles={20}
        title="Images du bien"
        subtitle={
          isRequestMode
            ? "Ajoutez et organisez les images pour le depot a valider."
            : "Ajoutez et organisez les images avant la creation."
        }
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/85 p-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-500 [animation-delay:220ms] sm:flex-row sm:items-center sm:justify-between">
        {!isRequestMode ? (
          <Link
            href="/admin/protected"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Retour au tableau
          </Link>
        ) : (
          <div />
        )}

        <Button
          type="submit"
          disabled={loading}
          className="h-11 rounded-2xl bg-gradient-to-r from-[rgb(var(--navy))] to-slate-800 px-6 text-white shadow-sm transition hover:opacity-95"
        >
          {loading ? (isRequestMode ? "Envoi..." : "Creation...") : isRequestMode ? "Envoyer pour validation" : "Creer le bien"}
        </Button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 animate-in fade-in-0 zoom-in-95">
          {error}
        </div>
      )}

      <p className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-xs text-slate-500">
        Le texte se genere a partir des champs saisis. Vous pouvez ensuite le modifier librement.
      </p>
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
