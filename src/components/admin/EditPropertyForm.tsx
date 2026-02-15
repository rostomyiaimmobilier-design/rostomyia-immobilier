"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ImagePicker from "@/components/admin/ImagePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

type EditProperty = {
  id: string;
  ref: string;
  title: string | null;
  type: string | null;
  locationType: string | null;
  category: string | null;
  apartmentType: string | null;
  price: string | null;
  location: string | null;
  beds: number | null;
  baths: number | null;
  area: number | null;
  description: string | null;
};

type FormState = {
  title: string;
  transactionType: TransactionType;
  category: string;
  apartmentType: string;
  price: string;
  location: string;
  beds: string;
  baths: string;
  area: string;
  description: string;
};

function normalizeText(value: string) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
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
      return "Location";
    }
  }

  return normalizeText(baseType || "").includes("vente") ? "Vente" : "Location";
}

function transactionTypeToStorageValue(transactionType: TransactionType): string {
  if (transactionType === "Vente") return "vente";
  if (transactionType === "Location") return "location";
  return transactionType;
}

function toOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function EditPropertyForm({ property }: { property: EditProperty }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  const [form, setForm] = useState<FormState>({
    title: property.title ?? "",
    transactionType: normalizeStoredTransactionType(property.locationType, property.type),
    category: property.category ?? "",
    apartmentType: property.apartmentType ?? "",
    price: property.price ?? "",
    location: property.location ?? "",
    beds: property.beds != null ? String(property.beds) : "",
    baths: property.baths != null ? String(property.baths) : "",
    area: property.area != null ? String(property.area) : "",
    description: property.description ?? "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const dbType = form.transactionType === "Vente" ? "Vente" : "Location";
      const locationType = transactionTypeToStorageValue(form.transactionType);

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
          location: form.location.trim() || null,
          beds: toOptionalNumber(form.beds),
          baths: toOptionalNumber(form.baths),
          area: toOptionalNumber(form.area),
          description: form.description.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to update property");

      if (files.length) {
        const formData = new FormData();
        formData.append("propertyId", property.id);
        formData.append("ref", property.ref);
        files.forEach((f) => formData.append("files", f));

        const imgRes = await fetch("/api/admin/property-images", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!imgRes.ok) {
          const parsed = await imgRes.json().catch(() => null);
          throw new Error(parsed?.error ?? "Failed to upload images");
        }
      }

      setSuccess("Bien mis a jour.");
      setFiles([]);
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
            value={form.category}
            onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}
          >
            <option value="">--</option>
            <option value="appartement">Appartement</option>
            <option value="villa">Villa</option>
            <option value="terrain">Terrain</option>
            <option value="local">Local</option>
            <option value="bureau">Bureau</option>
          </select>
        </Field>

        {form.category === "appartement" && (
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
            placeholder="12 000 000 DA"
          />
        </Field>

        <Field label="Adresse / localisation">
          <Input
            className="h-11 rounded-2xl border-0 bg-white/80 px-4 ring-1 ring-black/10"
            value={form.location}
            onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))}
            placeholder="Ex: Bir El Djir - Canastel"
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

      <Field label="Description">
        <textarea
          className="min-h-44 w-full rounded-2xl border-0 bg-white/80 p-4 text-sm ring-1 ring-black/10 outline-none"
          value={form.description}
          onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
          placeholder="Description du bien..."
        />
      </Field>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/admin/protected"
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-black/15 bg-white/80 px-4 text-sm font-medium hover:bg-white"
        >
          Retour au tableau
        </Link>

        <Button
          type="submit"
          disabled={loading}
          className="h-11 rounded-2xl bg-[rgb(var(--navy))] text-white hover:opacity-95"
        >
          {loading ? "Mise a jour..." : "Enregistrer les modifications"}
        </Button>
      </div>

      <ImagePicker value={files} onChange={setFiles} maxFiles={20} />

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}
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
