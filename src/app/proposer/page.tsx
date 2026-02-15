"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/components/LanguageProvider";

type Intent = "vente" | "location";
type TransactionType =
  | "vente"
  | "location"
  | "par_mois"
  | "six_mois"
  | "douze_mois"
  | "par_nuit"
  | "court_sejour";
type PropertyType = "appartement" | "villa" | "terrain" | "local" | "bureau";
type FurnishingType = "meuble" | "vide" | "equipe" | "semi_equipe";
type PropertyCondition = "neuf" | "tres_bon" | "bon" | "a_renover";
type Availability = "immediate" | "moins_3_mois" | "plus_3_mois";
type ContactMethod = "phone" | "whatsapp" | "email";

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

const PROPERTY_OPTIONS: Array<{ value: PropertyType; fr: string; ar: string }> = [
  { value: "appartement", fr: "Appartement", ar: "شقة" },
  { value: "villa", fr: "Villa", ar: "فيلا" },
  { value: "terrain", fr: "Terrain", ar: "ارض" },
  { value: "local", fr: "Local commercial", ar: "محل تجاري" },
  { value: "bureau", fr: "Bureau", ar: "مكتب" },
];

const TRANSACTION_OPTIONS: Array<{ value: TransactionType; fr: string; ar: string }> = [
  { value: "vente", fr: "Vente", ar: "بيع" },
  { value: "location", fr: "Location", ar: "كراء" },
  { value: "par_mois", fr: "Location / par mois", ar: "كراء / بالشهر" },
  { value: "six_mois", fr: "Location / 6 mois", ar: "كراء / 6 اشهر" },
  { value: "douze_mois", fr: "Location / 12 mois", ar: "كراء / 12 شهر" },
  { value: "par_nuit", fr: "Location / par nuit", ar: "كراء / بالليلة" },
  { value: "court_sejour", fr: "Location / court sejour", ar: "كراء / اقامة قصيرة" },
];

const FURNISHING_OPTIONS: Array<{ value: FurnishingType; fr: string; ar: string }> = [
  { value: "meuble", fr: "Meuble", ar: "مفروش" },
  { value: "vide", fr: "Vide", ar: "فارغ" },
  { value: "equipe", fr: "Equipe", ar: "مجهز" },
  { value: "semi_equipe", fr: "Semi equipe", ar: "نصف مجهز" },
];

const CONDITION_OPTIONS: Array<{ value: PropertyCondition; fr: string; ar: string }> = [
  { value: "neuf", fr: "Neuf", ar: "جديد" },
  { value: "tres_bon", fr: "Tres bon etat", ar: "حالة ممتازة" },
  { value: "bon", fr: "Bon etat", ar: "حالة جيدة" },
  { value: "a_renover", fr: "A renover", ar: "يحتاج ترميم" },
];

const AVAILABILITY_OPTIONS: Array<{ value: Availability; fr: string; ar: string }> = [
  { value: "immediate", fr: "Disponible immediatement", ar: "متوفر فورا" },
  { value: "moins_3_mois", fr: "Disponible sous 1-3 mois", ar: "متوفر خلال 1-3 اشهر" },
  { value: "plus_3_mois", fr: "Disponible apres 3 mois", ar: "متوفر بعد 3 اشهر" },
];

const CONTACT_OPTIONS: Array<{ value: ContactMethod; fr: string; ar: string }> = [
  { value: "phone", fr: "Appel", ar: "اتصال" },
  { value: "whatsapp", fr: "WhatsApp", ar: "واتساب" },
  { value: "email", fr: "Email", ar: "ايميل" },
];

const LEGAL_DOC_OPTIONS = [
  { value: "acte_notarie", fr: "Acte notarie", ar: "عقد موثق" },
  { value: "livret_foncier", fr: "Livret foncier", ar: "دفتر عقاري" },
  { value: "permis_construire", fr: "Permis de construire", ar: "رخصة بناء" },
  { value: "decision_attribution", fr: "Decision d'attribution", ar: "قرار استفادة" },
  { value: "contrat_location", fr: "Contrat de location", ar: "عقد ايجار" },
  { value: "autre", fr: "Autre document", ar: "وثيقة اخرى" },
] as const;

type FormState = {
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  preferredContactMethod: ContactMethod;
  intent: Intent;
  transactionType: TransactionType;
  propertyType: PropertyType;
  title: string;
  city: string;
  commune: string;
  district: string;
  address: string;
  price: string;
  surface: string;
  floor: string;
  furnishingType: FurnishingType;
  propertyCondition: PropertyCondition;
  availability: Availability;
  legalDocs: string[];
  paymentTerms: string;
  photoLinks: string;
  message: string;
  consent: boolean;
};

function parseOptionalNumber(input: string): number | null {
  const cleaned = (input || "").replace(/\s+/g, "").replace(",", ".");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function isMissingColumnError(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return m.includes("column") && m.includes("does not exist");
}

function statusTone(status: "idle" | "loading" | "success" | "error") {
  if (status === "success") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "error") return "border-red-200 bg-red-50 text-red-700";
  if (status === "loading") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-transparent";
}

export default function SubmitPropertyPage() {
  const supabase = createClient();
  const { lang, dir } = useLang();

  const t =
    lang === "ar"
      ? {
          badge: "عرض عقارك",
          title: "ارسل تفاصيل عقارك للمراجعة",
          subtitle: "فريقنا يراجع الطلب ثم يتواصل معك قبل النشر.",
          ownerBlock: "معلومات المالك",
          propertyBlock: "معلومات العقار",
          comfortBlock: "الحالة والتوفر",
          extraBlock: "تفاصيل اضافية",
          submit: "ارسال الطلب",
          sending: "جاري الارسال...",
          success: "تم ارسال طلبك بنجاح. سنتواصل معك قريبا.",
          error: "تعذر ارسال الطلب حاليا. حاول مرة اخرى.",
          required: "هذا الحقل مطلوب",
          consent: "اوافق على استعمال بياناتي لغرض دراسة الطلب والتواصل.",
        }
      : {
          badge: "Proposer un bien",
          title: "Envoyez les informations de votre bien pour validation",
          subtitle: "Notre equipe etudie votre demande puis vous contacte avant publication.",
          ownerBlock: "Informations proprietaire",
          propertyBlock: "Informations du bien",
          comfortBlock: "Etat et disponibilite",
          extraBlock: "Details complementaires",
          submit: "Envoyer au backoffice",
          sending: "Envoi en cours...",
          success: "Votre demande a bien ete envoyee. Nous vous contacterons rapidement.",
          error: "Impossible d'envoyer pour le moment. Merci de reessayer.",
          required: "Champ obligatoire",
          consent: "J'accepte l'utilisation de mes donnees pour l'etude de ma demande.",
        };

  const [form, setForm] = useState<FormState>({
    name: "",
    phone: "",
    whatsapp: "",
    email: "",
    preferredContactMethod: "phone",
    intent: "vente",
    transactionType: "vente",
    propertyType: "appartement",
    title: "",
    city: "Oran",
    commune: "",
    district: "",
    address: "",
    price: "",
    surface: "",
    floor: "",
    furnishingType: "vide",
    propertyCondition: "bon",
    availability: "immediate",
    legalDocs: [],
    paymentTerms: "",
    photoLinks: "",
    message: "",
    consent: false,
  });

  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState<string>("");

  const isArabic = lang === "ar";
  const transactionOptions = useMemo(
    () =>
      TRANSACTION_OPTIONS.filter((x) => {
        if (form.intent === "vente") return x.value === "vente";
        return x.value !== "vente";
      }),
    [form.intent]
  );

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleLegalDoc(value: string) {
    setForm((prev) => {
      const next = prev.legalDocs.includes(value)
        ? prev.legalDocs.filter((x) => x !== value)
        : [...prev.legalDocs, value];
      return { ...prev, legalDocs: next };
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.consent) {
      setSubmitStatus("error");
      setSubmitError(t.consent);
      return;
    }

    if (!form.name.trim() || !form.phone.trim() || !form.commune.trim() || !form.price.trim()) {
      setSubmitStatus("error");
      setSubmitError(t.required);
      return;
    }

    setSubmitStatus("loading");
    setSubmitError("");

    const priceNumber = parseOptionalNumber(form.price);
    const surfaceNumber = parseOptionalNumber(form.surface);
    const floorNumber = parseOptionalNumber(form.floor);
    const legalDocsText = form.legalDocs
      .map((value) => LEGAL_DOC_OPTIONS.find((x) => x.value === value)?.fr ?? value)
      .join(", ");

    const richPayload = {
      lang,
      status: "new",
      name: form.name.trim(),
      phone: form.phone.trim(),
      whatsapp: form.whatsapp.trim() || null,
      email: form.email.trim() || null,
      preferred_contact_method: form.preferredContactMethod,
      intent: form.intent,
      property_type: form.propertyType,
      transaction_type: form.transactionType,
      location_type: form.transactionType,
      title: form.title.trim() || null,
      city: form.city.trim() || "Oran",
      commune: form.commune.trim(),
      district: form.district.trim() || null,
      address: form.address.trim() || null,
      price: priceNumber,
      surface: surfaceNumber,
      floor: floorNumber,
      furnishing_type: form.furnishingType,
      property_condition: form.propertyCondition,
      availability: form.availability,
      legal_docs: legalDocsText || null,
      payment_terms: form.paymentTerms.trim() || null,
      photo_links: form.photoLinks.trim() || null,
      message: form.message.trim() || null,
    };

    const { error } = await supabase.from("owner_leads").insert(richPayload);

    if (error && isMissingColumnError(error.message)) {
      const legacyDetails = [
        form.message.trim(),
        `transaction: ${form.transactionType}`,
        `commune: ${form.commune}`,
        form.address.trim() ? `adresse: ${form.address.trim()}` : "",
        legalDocsText ? `documents: ${legalDocsText}` : "",
        form.furnishingType ? `ameublement: ${form.furnishingType}` : "",
        form.paymentTerms.trim() ? `paiement: ${form.paymentTerms.trim()}` : "",
        form.photoLinks.trim() ? `photos: ${form.photoLinks.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const fallback = await supabase.from("owner_leads").insert({
        lang,
        status: "new",
        intent: form.intent,
        property_type: form.propertyType,
        city: form.city.trim() || "Oran",
        district: form.district.trim() || form.commune.trim(),
        price: priceNumber,
        surface: surfaceNumber,
        name: form.name.trim(),
        phone: form.phone.trim(),
        message: legacyDetails || null,
      });

      if (fallback.error) {
        setSubmitStatus("error");
        setSubmitError(fallback.error.message || t.error);
        return;
      }

      setSubmitStatus("success");
      return;
    }

    if (error) {
      setSubmitStatus("error");
      setSubmitError(error.message || t.error);
      return;
    }

    setSubmitStatus("success");
  }

  if (submitStatus === "success") {
    return (
      <main dir={dir} className="min-h-screen bg-[rgb(var(--brand-bg))] px-4 py-16">
        <div className="mx-auto max-w-2xl rounded-3xl border border-emerald-200 bg-white p-10 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            {isArabic ? "تم الاستلام" : "Demande recue"}
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">{t.badge}</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-slate-600">{t.success}</p>
          <Link
            href="/biens"
            className="mt-8 inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:opacity-95"
          >
            {isArabic ? "العودة الى العقارات" : "Voir les biens"}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main dir={dir} className="relative min-h-screen overflow-hidden bg-[rgb(var(--brand-bg))] px-4 py-10 md:py-14">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-36 -top-36 h-[440px] w-[440px] rounded-full bg-[rgb(var(--gold))] opacity-20 blur-3xl" />
        <div className="absolute right-0 top-16 h-[360px] w-[360px] rounded-full bg-[rgb(var(--navy))] opacity-10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl">
        <div className="rounded-3xl border border-black/10 bg-white/75 p-7 shadow-sm backdrop-blur md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--navy))]">{t.badge}</p>
          <h1 className="mt-3 text-3xl font-extrabold text-[rgb(var(--navy))] md:text-4xl">{t.title}</h1>
          <p className="mt-3 max-w-3xl text-sm text-black/65">{t.subtitle}</p>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <FormSection title={t.ownerBlock}>
              <Field
                label={isArabic ? "الاسم الكامل" : "Nom complet"}
                required
                value={form.name}
                onChange={(v) => updateField("name", v)}
                placeholder={isArabic ? "الاسم كما في الوثائق" : "Ex: Ahmed Benali"}
              />
              <Field
                label={isArabic ? "الهاتف" : "Telephone"}
                required
                value={form.phone}
                onChange={(v) => updateField("phone", v)}
                placeholder="+213..."
              />
              <Field
                label="WhatsApp"
                value={form.whatsapp}
                onChange={(v) => updateField("whatsapp", v)}
                placeholder="+213..."
              />
              <Field
                label="Email"
                type="email"
                value={form.email}
                onChange={(v) => updateField("email", v)}
                placeholder="client@email.com"
              />
              <SelectField
                label={isArabic ? "وسيلة الاتصال المفضلة" : "Moyen de contact prefere"}
                value={form.preferredContactMethod}
                onChange={(v) => updateField("preferredContactMethod", v as ContactMethod)}
                options={CONTACT_OPTIONS.map((x) => ({
                  value: x.value,
                  label: isArabic ? x.ar : x.fr,
                }))}
              />
            </FormSection>

            <FormSection title={t.propertyBlock}>
              <SelectField
                label={isArabic ? "الهدف" : "Objectif"}
                required
                value={form.intent}
                onChange={(v) => {
                  const nextIntent = v as Intent;
                  updateField("intent", nextIntent);
                  updateField("transactionType", nextIntent === "vente" ? "vente" : "location");
                }}
                options={[
                  { value: "vente", label: isArabic ? "بيع" : "Vente" },
                  { value: "location", label: isArabic ? "كراء" : "Location" },
                ]}
              />
              <SelectField
                label={isArabic ? "نوع المعاملة" : "Type de transaction"}
                value={form.transactionType}
                onChange={(v) => updateField("transactionType", v as TransactionType)}
                options={transactionOptions.map((x) => ({
                  value: x.value,
                  label: isArabic ? x.ar : x.fr,
                }))}
              />
              <SelectField
                label={isArabic ? "نوع العقار" : "Categorie du bien"}
                required
                value={form.propertyType}
                onChange={(v) => updateField("propertyType", v as PropertyType)}
                options={PROPERTY_OPTIONS.map((x) => ({
                  value: x.value,
                  label: isArabic ? x.ar : x.fr,
                }))}
              />
              <Field
                label={isArabic ? "عنوان مختصر" : "Titre court du bien"}
                value={form.title}
                onChange={(v) => updateField("title", v)}
                placeholder={isArabic ? "مثال: شقة F4 كاناستيل" : "Ex: F4 Canastel"}
              />
              <Field
                label={isArabic ? "المدينة" : "Ville"}
                required
                value={form.city}
                onChange={(v) => updateField("city", v)}
                placeholder="Oran"
              />
              <SelectField
                label={isArabic ? "البلدية" : "Commune"}
                required
                value={form.commune}
                onChange={(v) => updateField("commune", v)}
                options={[
                  { value: "", label: isArabic ? "اختر بلدية" : "Selectionner une commune" },
                  ...ORAN_COMMUNES.map((c) => ({ value: c, label: c })),
                ]}
              />
              <Field
                label={isArabic ? "الحي" : "Quartier"}
                value={form.district}
                onChange={(v) => updateField("district", v)}
                placeholder={isArabic ? "مثال: كاناستيل" : "Ex: Canastel"}
              />
              <Field
                label={isArabic ? "العنوان الدقيق" : "Adresse detaillee"}
                value={form.address}
                onChange={(v) => updateField("address", v)}
                placeholder={isArabic ? "اقامة، معلم قريب..." : "Residence, repere, rue..."}
              />
              <Field
                label={isArabic ? "السعر المطلوب (دج)" : "Prix demande (DZD)"}
                required
                value={form.price}
                onChange={(v) => updateField("price", v)}
                placeholder="12 000 000"
              />
              <Field
                label={isArabic ? "المساحة (م2)" : "Surface (m2)"}
                value={form.surface}
                onChange={(v) => updateField("surface", v)}
                placeholder="124"
              />
              <Field
                label={isArabic ? "الطابق" : "Etage"}
                value={form.floor}
                onChange={(v) => updateField("floor", v)}
                placeholder="3"
              />
            </FormSection>

            <FormSection title={t.comfortBlock}>
              <SelectField
                label={isArabic ? "حالة التأثيث" : "Etat d'ameublement"}
                value={form.furnishingType}
                onChange={(v) => updateField("furnishingType", v as FurnishingType)}
                options={FURNISHING_OPTIONS.map((x) => ({
                  value: x.value,
                  label: isArabic ? x.ar : x.fr,
                }))}
              />
              <SelectField
                label={isArabic ? "حالة العقار" : "Etat du bien"}
                value={form.propertyCondition}
                onChange={(v) => updateField("propertyCondition", v as PropertyCondition)}
                options={CONDITION_OPTIONS.map((x) => ({
                  value: x.value,
                  label: isArabic ? x.ar : x.fr,
                }))}
              />
              <SelectField
                label={isArabic ? "التوفر" : "Disponibilite"}
                value={form.availability}
                onChange={(v) => updateField("availability", v as Availability)}
                options={AVAILABILITY_OPTIONS.map((x) => ({
                  value: x.value,
                  label: isArabic ? x.ar : x.fr,
                }))}
              />
              <label className="space-y-1.5 text-sm md:col-span-2">
                <span className="font-medium text-black/70">
                  {isArabic ? "الوثائق القانونية" : "Documents legaux disponibles"}
                </span>
                <div className="grid gap-2 md:grid-cols-2">
                  {LEGAL_DOC_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        checked={form.legalDocs.includes(option.value)}
                        onChange={() => toggleLegalDoc(option.value)}
                      />
                      <span>{isArabic ? option.ar : option.fr}</span>
                    </label>
                  ))}
                </div>
              </label>
              <Field
                label={isArabic ? "شروط الدفع" : "Conditions de paiement"}
                value={form.paymentTerms}
                onChange={(v) => updateField("paymentTerms", v)}
                placeholder={isArabic ? "دفعة اولى، تسهيلات..." : "Cash, cheque, avance, echeancier..."}
              />
            </FormSection>

            <FormSection title={t.extraBlock}>
              <TextareaField
                label={isArabic ? "روابط صور/فيديو (اختياري)" : "Liens photos/videos (optionnel)"}
                value={form.photoLinks}
                onChange={(v) => updateField("photoLinks", v)}
                placeholder={
                  isArabic
                    ? "ضع روابط Google Drive او Dropbox او WhatsApp..."
                    : "Collez les liens Drive/Dropbox/WhatsApp..."
                }
              />
              <TextareaField
                label={isArabic ? "وصف مفصل" : "Description detaillee"}
                value={form.message}
                onChange={(v) => updateField("message", v)}
                placeholder={
                  isArabic
                    ? "كلما كانت التفاصيل اكثر، كانت المراجعة اسرع."
                    : "Donnez un maximum d'infos: voisinage, points forts, etc."
                }
              />
            </FormSection>

            <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.consent}
                onChange={(e) => updateField("consent", e.target.checked)}
              />
              <span>{t.consent}</span>
            </label>

            <button
              type="submit"
              disabled={submitStatus === "loading"}
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[rgb(var(--navy))] px-6 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
            >
              {submitStatus === "loading" ? t.sending : t.submit}
            </button>

            {(submitStatus === "loading" || submitStatus === "error") && (
              <div className={`rounded-2xl border px-4 py-3 text-sm ${statusTone(submitStatus)}`}>
                {submitStatus === "loading" ? t.sending : submitError || t.error}
              </div>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white/70 p-4 md:p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-black/60">{title}</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="space-y-1.5 text-sm">
      <span className="font-medium text-black/70">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 outline-none ring-[rgb(var(--navy))]/20 focus:ring"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
}) {
  return (
    <label className="space-y-1.5 text-sm">
      <span className="font-medium text-black/70">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 outline-none ring-[rgb(var(--navy))]/20 focus:ring"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="space-y-1.5 text-sm md:col-span-2">
      <span className="font-medium text-black/70">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-28 w-full rounded-xl border border-black/10 bg-white px-3 py-2 outline-none ring-[rgb(var(--navy))]/20 focus:ring"
      />
    </label>
  );
}
