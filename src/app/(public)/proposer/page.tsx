"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  Camera,
  CheckCircle2,
  Clapperboard,
  Loader2,
  ShieldCheck,
  Sparkles,
  Video,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/components/LanguageProvider";
import { toUiErrorMessage } from "@/lib/ui-errors";
import AppDropdown from "@/components/ui/app-dropdown";

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

type OwnerLeadPayloadBundle = {
  richPayload: Record<string, unknown>;
  fallbackPayload: Record<string, unknown>;
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
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<"name" | "phone" | "email" | "commune" | "price" | "consent", string>>
  >({});
  const [toast, setToast] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [lastPayloadBundle, setLastPayloadBundle] = useState<OwnerLeadPayloadBundle | null>(null);
  const isSubmitting = submitStatus === "loading";

  const isArabic = lang === "ar";
  const mediaStudioCard =
    lang === "ar"
      ? {
          title: "تغطية إعلامية احترافية لعقارك",
          intro: "فريق روستوميا يتكفل بالتصوير الفوتوغرافي وتصوير الفيديو بجودة عالية قبل النشر.",
          items: [
            "تصوير فوتوغرافي بزوايا احترافية",
            "فيديو walkthrough داخل العقار",
            "تجهيز المحتوى للنشر والتحويل",
          ],
        }
      : {
          title: "Couverture media professionnelle de votre bien",
          intro:
            "L'equipe Rostomyia prend en charge le shooting photo et video HD de votre bien avant publication.",
          items: [
            "Shooting photo avec cadrage pro",
            "Video walkthrough du bien",
            "Contenu prepare pour diffusion et conversion",
          ],
        };
  const mediaStudioIcons = [Camera, Video, Clapperboard] as const;
  const retryLabel = isArabic ? "اعادة المحاولة" : "Reessayer";
  const invalidPhoneLabel = isArabic ? "رقم الهاتف غير صالح" : "Telephone invalide";
  const invalidEmailLabel = isArabic ? "Email غير صالح" : "Email invalide";
  const invalidPriceLabel = isArabic ? "سعر غير صالح" : "Prix invalide";
  const sentToastLabel = isArabic ? "تم ارسال الطلب بنجاح" : "Demande envoyee avec succes";
  const errorToastLabel = isArabic ? "تعذر الارسال. حاول مرة اخرى" : "Erreur d'envoi. Merci de reessayer";
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
    if (
      key === "name" ||
      key === "phone" ||
      key === "email" ||
      key === "commune" ||
      key === "price" ||
      key === "consent"
    ) {
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  function toggleLegalDoc(value: string) {
    setForm((prev) => {
      const next = prev.legalDocs.includes(value)
        ? prev.legalDocs.filter((x) => x !== value)
        : [...prev.legalDocs, value];
      return { ...prev, legalDocs: next };
    });
  }

  async function submitOwnerLead(payloads: OwnerLeadPayloadBundle) {
    setSubmitStatus("loading");
    setSubmitError("");

    const { error } = await supabase.from("owner_leads").insert(payloads.richPayload);

    if (error && isMissingColumnError(error.message)) {
      const fallback = await supabase.from("owner_leads").insert(payloads.fallbackPayload);
      if (fallback.error) {
        setSubmitStatus("error");
        setSubmitError(toUiErrorMessage(fallback.error.message || t.error, { lang, context: "submit" }));
        setToast({ kind: "error", text: errorToastLabel });
        setTimeout(() => setToast(null), 3200);
        return;
      }

      setSubmitStatus("success");
      setToast({ kind: "ok", text: sentToastLabel });
      setTimeout(() => setToast(null), 2600);
      return;
    }

    if (error) {
      setSubmitStatus("error");
      setSubmitError(toUiErrorMessage(error.message || t.error, { lang, context: "submit" }));
      setToast({ kind: "error", text: errorToastLabel });
      setTimeout(() => setToast(null), 3200);
      return;
    }

    setSubmitStatus("success");
    setToast({ kind: "ok", text: sentToastLabel });
    setTimeout(() => setToast(null), 2600);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const nextErrors: Partial<Record<"name" | "phone" | "email" | "commune" | "price" | "consent", string>> = {};
    if (!form.name.trim()) nextErrors.name = t.required;
    if (!form.phone.trim()) nextErrors.phone = t.required;
    if (form.phone.trim() && !/^[+\d\s().-]{8,20}$/.test(form.phone.trim())) nextErrors.phone = invalidPhoneLabel;
    if (!form.commune.trim()) nextErrors.commune = t.required;
    if (!form.price.trim()) nextErrors.price = t.required;
    if (form.price.trim()) {
      const parsed = parseOptionalNumber(form.price);
      if (parsed == null || parsed <= 0) nextErrors.price = invalidPriceLabel;
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = invalidEmailLabel;
    }
    if (!form.consent) nextErrors.consent = t.consent;

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setSubmitStatus("error");
      setSubmitError(t.required);
      return;
    }

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

    const fallbackPayload = {
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
    };

    const payloadBundle: OwnerLeadPayloadBundle = { richPayload, fallbackPayload };
    setLastPayloadBundle(payloadBundle);
    await submitOwnerLead(payloadBundle);
  }

  if (submitStatus === "success") {
    return (
      <main
        dir={dir}
        className={`${isArabic ? "font-arabic-luxury" : ""} min-h-screen bg-[rgb(var(--brand-bg))] px-4 py-16`}
      >
        <div className="mx-auto max-w-2xl rounded-3xl border border-emerald-200 bg-white p-10 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            {isArabic ? "تم الاستلام" : "Demande recue"}
          </p>
          <h1 className={`${isArabic ? "font-arabic-luxury" : ""} mt-3 text-3xl font-bold text-slate-900`}>
            {t.badge}
          </h1>
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
    <main
      dir={dir}
      className={`${isArabic ? "font-arabic-luxury" : ""} relative min-h-screen overflow-hidden bg-[rgb(var(--brand-bg))] px-4 py-10 md:py-14`}
    >
      {toast ? (
        <div
          className={`fixed right-4 top-20 z-50 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm shadow-md ${
            toast.kind === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {toast.kind === "ok" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.text}
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-36 -top-36 h-[440px] w-[440px] rounded-full bg-[rgb(var(--gold))] opacity-20 blur-3xl" />
        <div className="absolute right-0 top-16 h-[360px] w-[360px] rounded-full bg-[rgb(var(--navy))] opacity-10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl">
        <div className="rounded-3xl border border-black/10 bg-white/75 p-7 shadow-sm backdrop-blur md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--navy))]">{t.badge}</p>
          <h1
            className={`${isArabic ? "font-arabic-luxury leading-[1.25]" : ""} mt-3 text-3xl font-extrabold text-[rgb(var(--navy))] md:text-4xl`}
          >
            {t.title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-black/65">{t.subtitle}</p>
          <div className="relative mt-4 overflow-hidden rounded-2xl border border-[rgb(var(--gold))]/35 bg-[linear-gradient(130deg,rgba(255,255,255,0.86),rgba(248,244,235,0.92))] p-4 shadow-sm md:p-5">
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[rgb(var(--gold))]/20 blur-2xl" />
            <div className="pointer-events-none absolute -left-8 -bottom-10 h-24 w-24 rounded-full bg-[rgb(var(--navy))]/10 blur-2xl" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))]/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--navy))]/80">
                <BadgeCheck size={14} />
                {isArabic ? "خدمة مدمجة" : "Service inclus"}
              </div>
              <h3 className="mt-2 text-base font-bold text-[rgb(var(--navy))] md:text-lg">{mediaStudioCard.title}</h3>
              <p className="mt-1.5 max-w-3xl text-sm text-black/70">{mediaStudioCard.intro}</p>

              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {mediaStudioCard.items.map((item, idx) => {
                  const Icon = mediaStudioIcons[idx] ?? Camera;
                  return (
                    <div
                      key={item}
                      className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/88 px-3 py-2 text-xs text-[rgb(var(--navy))] shadow-[0_1px_1px_rgba(2,6,23,0.03)]"
                    >
                      <Icon size={14} className="text-[rgb(var(--gold))]" />
                      <span>{item}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <HighlightCard
              icon={<Sparkles size={15} />}
              title={isArabic ? "تقييم سريع" : "Validation rapide"}
              text={isArabic ? "فريقنا يراجع الطلب بسرعة." : "Notre equipe traite chaque demande rapidement."}
            />
            <HighlightCard
              icon={<ShieldCheck size={15} />}
              title={isArabic ? "بياناتك محمية" : "Donnees protegees"}
              text={isArabic ? "معلوماتك للاستخدام المهني فقط." : "Vos informations sont utilisees uniquement pour le dossier."}
            />
            <HighlightCard
              icon={<CheckCircle2 size={15} />}
              title={isArabic ? "متابعة شخصية" : "Suivi personalise"}
              text={isArabic ? "نتصل بك قبل النشر." : "Nous vous contactons avant toute publication."}
            />
          </div>

          <div className="relative mt-8">
            <form
              aria-busy={isSubmitting}
              className={`space-y-6 transition ${isSubmitting ? "pointer-events-none opacity-65" : ""}`}
              onSubmit={handleSubmit}
            >
            <FormSection title={t.ownerBlock}>
              <Field
                label={isArabic ? "الاسم الكامل" : "Nom complet"}
                required
                value={form.name}
                onChange={(v) => updateField("name", v)}
                placeholder={isArabic ? "الاسم كما في الوثائق" : "Ex: Ahmed Benali"}
                error={fieldErrors.name}
              />
              <Field
                label={isArabic ? "الهاتف" : "Telephone"}
                required
                value={form.phone}
                onChange={(v) => updateField("phone", v)}
                placeholder="+213..."
                error={fieldErrors.phone}
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
                error={fieldErrors.email}
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
                value="Oran"
                readOnly
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
                error={fieldErrors.commune}
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
                error={fieldErrors.price}
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
                      className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 shadow-sm transition hover:border-[rgb(var(--gold))]/35 hover:bg-[rgb(var(--gold))]/10"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-black/20 accent-[rgb(var(--navy))]"
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

            <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm transition hover:border-[rgb(var(--gold))]/35 hover:bg-[rgb(var(--gold))]/10">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-black/20 accent-[rgb(var(--navy))]"
                checked={form.consent}
                onChange={(e) => updateField("consent", e.target.checked)}
              />
              <span>{t.consent}</span>
            </label>
            {fieldErrors.consent ? <p className="text-xs text-red-600">{fieldErrors.consent}</p> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[rgb(var(--navy))] px-6 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
              {isSubmitting ? t.sending : t.submit}
            </button>

            {submitStatus === "error" && (
              <div className={`rounded-2xl border px-4 py-3 text-sm ${statusTone(submitStatus)}`}>
                <p>{submitError || t.error}</p>
                {lastPayloadBundle ? (
                  <button
                    type="button"
                    onClick={() => submitOwnerLead(lastPayloadBundle)}
                    className="mt-2 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    <AlertCircle size={14} />
                    {retryLabel}
                  </button>
                ) : null}
              </div>
            )}
            </form>

            {isSubmitting && (
              <div className="absolute inset-0 z-10 grid place-items-center rounded-3xl bg-white/55 backdrop-blur-[2px]">
                <div className="inline-flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-medium text-[rgb(var(--navy))] shadow-sm">
                  <Loader2 size={16} className="animate-spin" />
                  {t.sending}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function HighlightCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/80 p-3 shadow-sm">
      <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--navy))]">
        {icon}
        {title}
      </div>
      <p className="mt-1.5 text-xs text-black/65">{text}</p>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-black/10 bg-white/80 p-4 shadow-sm md:p-5">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-black/55">{title}</h2>
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
  error,
  type = "text",
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange?: (next: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="group space-y-2 text-sm">
      <span className="inline-flex items-center gap-1 font-semibold text-[rgb(var(--navy))]/85">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      <div
        className={`rounded-2xl border shadow-[0_1px_1px_rgba(2,6,23,0.03)] transition duration-200 ${
          readOnly
            ? "border-black/10 bg-black/[0.03]"
            : error
            ? "border-red-300 bg-white/95 group-focus-within:border-red-400"
            : "border-black/10 bg-white/95 group-focus-within:border-[rgb(var(--gold))]/65 group-focus-within:shadow-[0_0_0_3px_rgba(201,167,98,0.22)]"
        }`}
      >
        <input
          type={type}
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className={`h-12 w-full rounded-2xl border-0 bg-transparent px-3.5 text-sm outline-none placeholder:text-black/40 ${
            readOnly ? "cursor-not-allowed text-black/55" : "text-[rgb(var(--navy))]"
          }`}
        />
      </div>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required,
  error,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
  error?: string;
}) {
  return (
    <label className="group space-y-2 text-sm">
      <span className="inline-flex items-center gap-1 font-semibold text-[rgb(var(--navy))]/85">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      <AppDropdown
        value={value}
        onValueChange={onChange}
        options={options}
        triggerClassName={`h-12 rounded-2xl ${
          error
            ? "border-red-300 focus-visible:border-red-400 focus-visible:ring-red-200/70"
            : "focus-visible:border-[rgb(var(--gold))]/65 focus-visible:ring-[rgb(var(--gold))]/35"
        }`}
      />
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
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
    <label className="group space-y-2 text-sm md:col-span-2">
      <span className="inline-flex items-center gap-1 font-semibold text-[rgb(var(--navy))]/85">{label}</span>
      <div className="rounded-2xl border border-black/10 bg-white/95 shadow-[0_1px_1px_rgba(2,6,23,0.03)] transition duration-200 group-focus-within:border-[rgb(var(--gold))]/65 group-focus-within:shadow-[0_0_0_3px_rgba(201,167,98,0.22)]">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-32 w-full rounded-2xl border-0 bg-transparent px-3.5 py-3 text-sm text-[rgb(var(--navy))] outline-none placeholder:text-black/40"
        />
      </div>
    </label>
  );
}

