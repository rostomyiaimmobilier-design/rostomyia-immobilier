"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ImagePicker from "@/components/admin/ImagePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ORAN_COMMUNES = [
  "Oran",
  "Bir El Djir",
  "Es Senia",
  "Arzew",
  "Ain El Turk",
  "Mers El Kebir",
  "Bethioua",
  "Gdyel",
  "Marsa El Hadjadj",
  "El Ancor",
  "Oued Tlelat",
  "Tafraoui",
  "Sidi Chami",
  "Boufatis",
  "Bousfer",
  "Boutlelis",
  "Ain El Kerma",
  "Hassi Bounif",
  "Hassi Ben Okba",
  "Ben Freha",
  "Hassi Mefsoukh",
];

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
  { value: "Location", label: "Location" },
  { value: "par_mois", label: "Location / par mois" },
  { value: "six_mois", label: "Location / 6 mois" },
  { value: "douze_mois", label: "Location / 12 mois" },
  { value: "par_nuit", label: "Location / par nuit" },
  { value: "court_sejour", label: "Location / court sejour" },
];

const AMENITY_OPTIONS = [
  { key: "residence_fermee", label: "Residence fermee" },
  { key: "parking_sous_sol", label: "Parking sous-sol" },
  { key: "box", label: "Box" },
  { key: "luxe", label: "Luxe" },
  { key: "haut_standing", label: "Haut standing" },
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

const TYPE_LABELS: Record<string, string> = {
  appartement: "Appartement",
  villa: "Villa",
  terrain: "Terrain",
  local: "Local",
  bureau: "Bureau",
};

const TITLE_AMENITY_KEYS = new Set(["parking_sous_sol", "box", "luxe", "haut_standing"]);

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
  locationDetail: string;
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

function buildLocation(commune: string, detail: string) {
  const c = commune.trim();
  const d = detail.trim();
  if (!c && !d) return "";
  if (!c) return d;
  if (!d) return c;
  return `${c} - ${d}`;
}

function inferRoomLine(apartmentType: string) {
  const m = apartmentType.match(/^[FT](\d+)$/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 1) return null;
  return `${apartmentType} (salon + ${n - 1} chambre${n - 1 > 1 ? "s" : ""})`;
}

function generateTitle(form: FormState) {
  const parts: string[] = [];
  const typeLabel = form.type ? TYPE_LABELS[form.type] ?? form.type : "";

  if (typeLabel) {
    if (form.type === "appartement" && form.apartmentType) {
      parts.push(`${typeLabel} ${form.apartmentType}`);
    } else {
      parts.push(typeLabel);
    }
  }

  if (form.commune.trim()) parts.push(form.commune.trim());
  if (form.residenceName.trim()) parts.push(`Residence ${form.residenceName.trim()}`);

  const titleAmenities = AMENITY_OPTIONS
    .filter((x) => TITLE_AMENITY_KEYS.has(x.key) && form.amenities.includes(x.key))
    .map((x) => x.label);

  if (titleAmenities.length) parts.push(titleAmenities.join(" | "));

  return parts.join(" - ");
}

function generateDescription(form: FormState) {
  const location = buildLocation(form.commune, form.locationDetail);
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

  const introParts = [
    `L'agence Rostomyia Immobilier vous propose ${isLocationTransaction(form.transactionType) ? "a la location" : "a la vente"}${locationModeSuffix} un ${labelType}`,
    form.neverHabited ? "neuf jamais habite" : "",
    form.floor ? `situe au ${form.floor}e etage` : "",
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
    form.floor ? `Etage : ${form.floor}e` : null,
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

export default function NewPropertyForm({ initialRef }: NewPropertyFormProps) {
  const router = useRouter();

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
    locationDetail: "",
    residenceName: "",
    promotionName: "",
    deliveryYear: "",
    floor: "",
    neverHabited: false,
    paymentTerms: "",
    agencyFees: "1 mois",
    amenities: [],
    beds: "",
    baths: "",
    area: "",
    description: "",
  });

  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { autoTitle, type, apartmentType, commune, residenceName, amenities } = form;

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
  }, [autoTitle, type, apartmentType, commune, residenceName, amenities]);

  function toggleAmenity(key: string) {
    setForm((s) => ({
      ...s,
      amenities: s.amenities.includes(key)
        ? s.amenities.filter((x) => x !== key)
        : [...s.amenities, key],
    }));
  }

  function handleGenerateDescription() {
    setForm((s) => ({ ...s, description: generateDescription(s) }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const submittedRef = form.ref.trim() || generateRef();
      const location = buildLocation(form.commune, form.locationDetail);
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
          category: form.type ? form.type.trim() : null,
          apartment_type: form.apartmentType ? form.apartmentType.trim() : null,
          price: form.price.trim() || null,
          location: location || null,
          beds: form.beds ? Number(form.beds) : null,
          baths: form.baths ? Number(form.baths) : null,
          area: form.area ? Number(form.area) : null,
          description,
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

          setError(errMsg);
          setLoading(false);
          return;
        }
      }

      router.push(`/biens/${propertyRef}`);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-7 rounded-[28px] bg-white/70 p-6 backdrop-blur md:p-8">
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
          <select
            className="h-11 w-full rounded-2xl border-0 bg-white/80 px-4 text-sm ring-1 ring-black/10 outline-none"
            value={form.transactionType}
            onChange={(e) =>
              setForm((s) => ({ ...s, transactionType: e.target.value as TransactionType }))
            }
          >
            {TRANSACTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Categorie">
          <select
            className="h-11 w-full rounded-2xl border-0 bg-white/80 px-4 text-sm ring-1 ring-black/10 outline-none"
            value={form.type}
            onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}
          >
            <option value="">--</option>
            <option value="appartement">Appartement</option>
            <option value="villa">Villa</option>
            <option value="terrain">Terrain</option>
            <option value="local">Local</option>
            <option value="bureau">Bureau</option>
          </select>
        </Field>

        {form.type === "appartement" && (
          <Field label="Type d'appartement (F/T)">
            <select
              className="h-11 w-full rounded-2xl border-0 bg-white/80 px-4 text-sm ring-1 ring-black/10 outline-none"
              value={form.apartmentType}
              onChange={(e) => setForm((s) => ({ ...s, apartmentType: e.target.value }))}
            >
              <option value="">--</option>
              {APARTMENT_TYPES.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
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

        <Field label="Commune (Oran)" required>
          <select
            className="h-11 w-full rounded-2xl border-0 bg-white/80 px-4 text-sm ring-1 ring-black/10 outline-none"
            value={form.commune}
            onChange={(e) => setForm((s) => ({ ...s, commune: e.target.value }))}
            required
          >
            <option value="">Selectionner une commune</option>
            {ORAN_COMMUNES.map((commune) => (
              <option key={commune} value={commune}>
                {commune}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Quartier / detail adresse">
          <Input
            className="h-11 rounded-2xl border-0 bg-white/80 px-4 ring-1 ring-black/10"
            value={form.locationDetail}
            onChange={(e) => setForm((s) => ({ ...s, locationDetail: e.target.value }))}
            placeholder="Ex: Hai Sabah, residence, point de repere..."
          />
        </Field>

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
            className="h-11 rounded-2xl border-0 bg-white/80 px-4 ring-1 ring-black/10"
            value={form.paymentTerms}
            onChange={(e) => setForm((s) => ({ ...s, paymentTerms: e.target.value }))}
            placeholder="Par annee (avance 12 mois - acte notarie)"
          />
        </Field>

        <Field label="Frais d'agence">
          <Input
            className="h-11 rounded-2xl border-0 bg-white/80 px-4 ring-1 ring-black/10"
            value={form.agencyFees}
            onChange={(e) => setForm((s) => ({ ...s, agencyFees: e.target.value }))}
            placeholder="1 mois"
          />
        </Field>
      </div>

      <div className="grid gap-3 rounded-2xl bg-white/65 p-4 md:grid-cols-3">
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

      <div className="rounded-2xl bg-white/65 p-4">
        <div className="mb-3 text-sm font-medium text-[rgb(var(--navy))]">Equipements / points forts</div>
        <div className="grid gap-2 md:grid-cols-3">
          {AMENITY_OPTIONS.map((opt) => (
            <label key={opt.key} className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={form.amenities.includes(opt.key)}
                onChange={() => toggleAmenity(opt.key)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <Field label="Description">
        <textarea
          className="min-h-44 w-full rounded-2xl border-0 bg-white/80 p-4 text-sm ring-1 ring-black/10 outline-none"
          value={form.description}
          onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
          placeholder="Description generee ou personnalisee..."
        />
      </Field>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-2xl border-black/15 bg-white/80"
          onClick={handleGenerateDescription}
        >
          Generer la description automatiquement
        </Button>

        <Button
          type="submit"
          disabled={loading}
          className="h-11 rounded-2xl bg-[rgb(var(--navy))] text-white hover:opacity-95"
        >
          {loading ? "Creation..." : "Creer le bien"}
        </Button>
      </div>

      <ImagePicker value={files} onChange={setFiles} maxFiles={20} />

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <p className="text-xs text-slate-500">
        Le texte se genere a partir des champs saisis. Vous pouvez ensuite le modifier librement.
      </p>
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
    <label className="space-y-2">
      <div className="text-sm font-medium text-[rgb(var(--navy))]">
        {label} {required ? <span className="text-red-600">*</span> : null}
      </div>
      {children}
    </label>
  );
}
