"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Globe2,
  ImagePlus,
  KeyRound,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Trash2,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/components/LanguageProvider";
import { ORAN_COMMUNES } from "@/lib/oran-locations";
import { toUiErrorMessage } from "@/lib/ui-errors";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AgencySignupForm = {
  agencyName: string;
  managerName: string;
  phone: string;
  whatsapp: string;
  city: string;
  address: string;
  website: string;
  serviceAreas: string[];
  yearsExperience: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
};

type UploadedAgencyLogo = {
  path: string;
  url: string;
};

type SignupUserLike = {
  identities?: Array<unknown> | null;
  user_metadata?: Record<string, unknown> | null;
} | null;

const MAX_LOGO_MB = 6;
const MAX_LOGO_BYTES = MAX_LOGO_MB * 1024 * 1024;

const INITIAL_FORM: AgencySignupForm = {
  agencyName: "",
  managerName: "",
  phone: "",
  whatsapp: "",
  city: "",
  address: "",
  website: "",
  serviceAreas: [],
  yearsExperience: "",
  email: "",
  password: "",
  confirmPassword: "",
  acceptTerms: false,
};

const copy = {
  fr: {
    badge: "Inscription agence",
    title: "Creez votre compte partenaire",
    desc: "Completez votre fiche agence pour activer un compte professionnel complet.",
    requiredHint: "Champs obligatoires",
    optionalHint: "Champs optionnels",
    sectionIdentity: "Identite agence",
    sectionContact: "Contact et couverture",
    sectionAccount: "Acces compte",
    agencyName: "Nom de l'agence *",
    managerName: "Nom du responsable *",
    logoLabel: "Logo agence",
    logoHint: "PNG/JPG/WEBP - max 6 MB",
    logoPick: "Choisir le logo",
    logoReplace: "Remplacer",
    logoRemove: "Retirer",
    logoTooLargeError: "Logo trop volumineux (max 6 MB).",
    logoInvalidTypeError: "Format de logo invalide. Utilisez une image.",
    logoUploadError: "Upload du logo impossible pour le moment.",
    phone: "Telephone principal *",
    whatsapp: "WhatsApp",
    city: "Ville *",
    address: "Adresse *",
    website: "Site web",
    serviceAreas: "Zones de couverture",
    serviceAreasPlaceholder: "Selectionner une ou plusieurs communes",
    serviceAreasSelected: "Zones selectionnees",
    serviceAreasEmpty: "Aucune zone selectionnee",
    serviceAreasSearch: "Rechercher une commune...",
    serviceAreasNoResults: "Aucun resultat",
    yearsExperience: "Annees d'experience",
    email: "Email de connexion *",
    password: "Mot de passe *",
    confirmPassword: "Confirmation mot de passe *",
    terms:
      "Je confirme l'exactitude des informations fournies et j'accepte le traitement de ces donnees pour la gestion de mon compte agence.",
    submit: "Creer mon compte agence",
    loading: "Creation...",
    hasAccount: "Vous avez deja un compte ?",
    login: "Connexion agence",
    passwordMinError: "Le mot de passe doit contenir au moins 6 caracteres.",
    confirmError: "La confirmation du mot de passe ne correspond pas.",
    requiredError: "Veuillez remplir tous les champs obligatoires.",
    invalidPhone: "Numero de telephone invalide.",
    termsError: "Veuillez accepter la confirmation des informations.",
    duplicateEmailError: "Ce compte existe deja. Connectez-vous ou reinitialisez votre mot de passe.",
    successMsg: "Compte cree. Verifiez votre email puis connectez-vous.",
    sideBadge: "Dossier agence",
    sideTitle: "Informations demandees pour activer votre profil pro",
    sidePoints: [
      "Coordonnees de contact agence",
      "Presence locale et adresse professionnelle",
      "Perimetre d'activite de l'agence",
    ],
    nextStepsTitle: "Apres inscription",
    nextSteps: [
      "Confirmez votre email",
      "Connectez-vous a votre dashboard",
      "Deposez votre premier bien",
    ],
  },
  ar: {
    badge: "تسجيل الوكالة",
    title: "أنشئ حساب وكالتك",
    desc: "أكمل ملف الوكالة لتفعيل حساب مهني متكامل.",
    requiredHint: "الحقول الإلزامية",
    optionalHint: "الحقول الاختيارية",
    sectionIdentity: "هوية الوكالة",
    sectionContact: "الاتصال والتغطية",
    sectionAccount: "بيانات الدخول",
    agencyName: "اسم الوكالة *",
    managerName: "اسم المسؤول *",
    logoLabel: "شعار الوكالة",
    logoHint: "PNG/JPG/WEBP - الحد الاقصى 6 MB",
    logoPick: "اختيار الشعار",
    logoReplace: "استبدال",
    logoRemove: "حذف",
    logoTooLargeError: "حجم الشعار كبير جدا (الحد الاقصى 6 MB).",
    logoInvalidTypeError: "صيغة الشعار غير صالحة. استخدم صورة.",
    logoUploadError: "تعذر رفع الشعار حاليا.",
    phone: "الهاتف الرئيسي *",
    whatsapp: "واتساب",
    city: "المدينة *",
    address: "العنوان *",
    website: "الموقع الإلكتروني",
    serviceAreas: "مناطق التغطية",
    serviceAreasPlaceholder: "اختر بلدية أو أكثر",
    serviceAreasSelected: "المناطق المحددة",
    serviceAreasEmpty: "لا توجد مناطق محددة",
    serviceAreasSearch: "ابحث عن بلدية...",
    serviceAreasNoResults: "لا توجد نتائج",
    yearsExperience: "سنوات الخبرة",
    email: "بريد تسجيل الدخول *",
    password: "كلمة المرور *",
    confirmPassword: "تأكيد كلمة المرور *",
    terms:
      "أؤكد صحة المعلومات المقدمة وأوافق على معالجة هذه البيانات لأغراض إدارة حساب الوكالة.",
    submit: "إنشاء حساب الوكالة",
    loading: "جاري الإنشاء...",
    hasAccount: "لديك حساب بالفعل؟",
    login: "دخول الوكالة",
    passwordMinError: "يجب أن تحتوي كلمة المرور على 6 أحرف على الأقل.",
    confirmError: "تأكيد كلمة المرور غير مطابق.",
    requiredError: "يرجى ملء جميع الحقول الإلزامية.",
    invalidPhone: "رقم الهاتف غير صالح.",
    termsError: "يرجى الموافقة على تأكيد المعلومات.",
    duplicateEmailError: "هذا الحساب موجود بالفعل. يرجى تسجيل الدخول.",
    successMsg: "تم إنشاء الحساب. تحقق من بريدك الإلكتروني ثم قم بتسجيل الدخول.",
    sideBadge: "ملف الوكالة",
    sideTitle: "البيانات المطلوبة لتفعيل حسابك المهني",
    sidePoints: [
      "بيانات الاتصال الرسمية للوكالة",
      "المدينة والعنوان المهني",
      "نطاق النشاط ومناطق التغطية",
    ],
    nextStepsTitle: "بعد التسجيل",
    nextSteps: [
      "تأكيد البريد الإلكتروني",
      "تسجيل الدخول إلى لوحة الوكالة",
      "إيداع أول عقار",
    ],
  },
} as const;

function toOptionalInt(raw: string) {
  const v = raw.trim();
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.trunc(n));
}

function normalizeServiceAreas(raw: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const clean = String(item ?? "").trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
}

function normalizeStorefrontSlug(input: string) {
  return String(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

type PremiumInputProps = InputHTMLAttributes<HTMLInputElement> & {
  icon: ReactNode;
};

function PremiumInput({ icon, className = "", ...props }: PremiumInputProps) {
  return (
    <div className="group relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-black/40 transition group-focus-within:text-[rgb(var(--navy))]">
        {icon}
      </span>
      <input
        {...props}
        className={`h-11 w-full rounded-2xl border border-[rgb(var(--navy))]/14 bg-[linear-gradient(180deg,#fff,rgba(248,250,252,0.95))] px-3.5 pl-10 text-[13px] font-medium text-black/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] outline-none transition placeholder:text-black/35 focus:border-[rgb(var(--navy))]/45 focus:ring-4 focus:ring-[rgb(var(--gold))]/16 ${className}`}
      />
    </div>
  );
}

export default function AgencySignupPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { lang, dir } = useLang();
  const isArabic = lang === "ar";
  const t = copy[lang];

  const [form, setForm] = useState<AgencySignupForm>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [serviceAreasSearch, setServiceAreasSearch] = useState("");

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

  function updateField<K extends keyof AgencySignupForm>(key: K, value: AgencySignupForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleServiceArea(selected: string) {
    setForm((prev) => {
      const exists = prev.serviceAreas.some((item) => item.toLowerCase() === selected.toLowerCase());
      if (exists) {
        return {
          ...prev,
          serviceAreas: prev.serviceAreas.filter((item) => item.toLowerCase() !== selected.toLowerCase()),
        };
      }
      return { ...prev, serviceAreas: [...prev.serviceAreas, selected] };
    });
  }

  function removeServiceArea(value: string) {
    setForm((prev) => ({
      ...prev,
      serviceAreas: prev.serviceAreas.filter((item) => item !== value),
    }));
  }

  const filteredCommunes = useMemo(() => {
    const q = serviceAreasSearch.trim().toLowerCase();
    if (!q) return ORAN_COMMUNES;
    return ORAN_COMMUNES.filter((commune) => commune.toLowerCase().includes(q));
  }, [serviceAreasSearch]);

  function clearLogoSelection() {
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoFile(null);
    setLogoPreviewUrl(null);
  }

  function handleLogoChange(file: File | null) {
    if (!file) {
      clearLogoSelection();
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMsg(t.logoInvalidTypeError);
      return;
    }

    if (file.size > MAX_LOGO_BYTES) {
      setErrorMsg(t.logoTooLargeError);
      return;
    }

    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    const objectUrl = URL.createObjectURL(file);
    setLogoFile(file);
    setLogoPreviewUrl(objectUrl);
    setErrorMsg(null);
  }

  async function uploadAgencyLogo(): Promise<UploadedAgencyLogo | null> {
    if (!logoFile) return null;

    const body = new FormData();
    body.append("file", logoFile);

    const response = await fetch("/api/agency/signup-logo", {
      method: "POST",
      body,
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; path?: string; url?: string }
      | null;

    if (!response.ok || !payload?.path || !payload?.url) {
      throw new Error(payload?.error || t.logoUploadError);
    }

    return {
      path: payload.path,
      url: payload.url,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const requiredValues = [
      form.agencyName.trim(),
      form.managerName.trim(),
      form.phone.trim(),
      form.city.trim(),
      form.address.trim(),
      form.email.trim(),
      form.password,
      form.confirmPassword,
    ];

    if (requiredValues.some((x) => !x)) {
      setLoading(false);
      setErrorMsg(t.requiredError);
      return;
    }

    if (!/^[+\d\s().-]{8,20}$/.test(form.phone.trim())) {
      setLoading(false);
      setErrorMsg(t.invalidPhone);
      return;
    }

    if (form.password.length < 6) {
      setLoading(false);
      setErrorMsg(t.passwordMinError);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setLoading(false);
      setErrorMsg(t.confirmError);
      return;
    }

    if (!form.acceptTerms) {
      setLoading(false);
      setErrorMsg(t.termsError);
      return;
    }

    const yearsExperience = toOptionalInt(form.yearsExperience);
    const serviceAreas = normalizeServiceAreas(form.serviceAreas);
    const serviceAreasText = serviceAreas.join(", ");
    let uploadedLogo: UploadedAgencyLogo | null = null;

    if (logoFile) {
      try {
        uploadedLogo = await uploadAgencyLogo();
      } catch (err: unknown) {
        setLoading(false);
        setErrorMsg(err instanceof Error ? err.message : t.logoUploadError);
        return;
      }
    }

    const normalizedEmail = form.email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          account_type: "agency",
          agency_status: "pending",
          // Generic keys for legacy auth/profile triggers
          full_name: form.managerName.trim(),
          phone: form.phone.trim(),
          company_name: form.agencyName.trim(),
          city: form.city.trim(),
          address: form.address.trim(),
          service_areas: serviceAreasText || null,
          years_experience: yearsExperience,
          // Agency-specific keys used by the app
          agency_name: form.agencyName.trim(),
          agency_storefront_slug: normalizeStorefrontSlug(form.agencyName),
          agency_manager_name: form.managerName.trim(),
          agency_phone: form.phone.trim(),
          agency_whatsapp: form.whatsapp.trim() || null,
          agency_city: form.city.trim(),
          agency_address: form.address.trim(),
          agency_website: form.website.trim() || null,
          agency_service_areas: serviceAreasText || null,
          agency_years_experience: yearsExperience,
          agency_logo_path: uploadedLogo?.path ?? null,
          agency_logo_url: uploadedLogo?.url ?? null,
          logo_url: uploadedLogo?.url ?? null,
          avatar_url: uploadedLogo?.url ?? null,
          agency_terms_accepted_at: new Date().toISOString(),
          profile_completed_at: new Date().toISOString(),
        },
      },
    });

    if (error) {
      setLoading(false);
      setErrorMsg(toUiErrorMessage(error.message, { lang, context: "auth" }));
      return;
    }

    const signedUpUser = (data.user ?? null) as SignupUserLike;
    const accountType = String(signedUpUser?.user_metadata?.account_type ?? "")
      .trim()
      .toLowerCase();
    const notAgencyAccount = accountType.length > 0 && accountType !== "agency";
    if (notAgencyAccount) {
      setLoading(false);
      setErrorMsg(t.duplicateEmailError);
      return;
    }

    if (data.session) {
      setLoading(false);
      router.push(`/agency/signup/success?email=${encodeURIComponent(normalizedEmail)}`);
      router.refresh();
      return;
    }

    setLoading(false);
    router.push(`/agency/signup/success?email=${encodeURIComponent(normalizedEmail)}`);
    router.refresh();
  }

  return (
    <main
      dir={dir}
      className={`${isArabic ? "font-arabic-luxury" : ""} relative min-h-screen overflow-hidden bg-[rgb(var(--brand-bg))] px-4 py-12 md:py-16`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 -top-24 h-80 w-80 rounded-full bg-[rgb(var(--gold))]/20 blur-3xl" />
        <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-[rgb(var(--navy))]/12 blur-3xl" />
      </div>

      <section className="relative mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/82 p-7 shadow-sm backdrop-blur md:p-8">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-14 -top-14 h-44 w-44 rounded-full bg-[rgb(var(--gold))]/15 blur-3xl" />
            <div className="absolute right-0 top-10 h-40 w-40 rounded-full bg-[rgb(var(--navy))]/10 blur-3xl" />
          </div>

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--gold))]/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
              <UserPlus size={13} />
              {t.badge}
            </div>
            <h1 className={`${isArabic ? "font-arabic-luxury leading-[1.25]" : ""} mt-4 text-2xl font-bold text-[rgb(var(--navy))] md:text-3xl`}>
              {t.title}
            </h1>
            <p className="mt-2 text-sm text-black/65">{t.desc}</p>

            <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide">
              <span className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-black/60">{t.requiredHint}</span>
              <span className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-black/50">{t.optionalHint}</span>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
              <section className="rounded-2xl border border-black/10 bg-white/90 p-4 md:p-5">
                <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
                  <UserRound size={14} />
                  {t.sectionIdentity}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-3 text-sm">
                    <span className="mb-2 block font-medium text-black/70">{t.agencyName}</span>
                    <PremiumInput
                      icon={<Building2 size={15} />}
                      type="text"
                      value={form.agencyName}
                      onChange={(e) => updateField("agencyName", e.target.value)}
                      required
                    />
                  </label>

                  <label className="space-y-3 text-sm">
                    <span className="mb-2 block font-medium text-black/70">{t.managerName}</span>
                    <PremiumInput
                      icon={<UserRound size={15} />}
                      type="text"
                      value={form.managerName}
                      onChange={(e) => updateField("managerName", e.target.value)}
                      required
                    />
                  </label>

                  <div className="space-y-3 text-sm md:col-span-2">
                    <span className="mb-2 block font-medium text-black/70">{t.logoLabel}</span>
                    <div className="rounded-2xl border border-dashed border-black/15 bg-white/80 p-3.5">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-black/10 bg-slate-50">
                          {logoPreviewUrl ? (
                            <Image
                              src={logoPreviewUrl}
                              alt="Agency logo preview"
                              fill
                              sizes="64px"
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-black/35">
                              <ImagePlus size={20} />
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <label
                            htmlFor="agency-logo-input"
                            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-black/10 bg-white px-3.5 text-sm font-medium text-[rgb(var(--navy))] transition hover:bg-black/5"
                          >
                            <ImagePlus size={14} />
                            {logoFile ? t.logoReplace : t.logoPick}
                          </label>
                          {logoFile ? (
                            <button
                              type="button"
                              onClick={clearLogoSelection}
                              className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 text-sm font-medium text-red-700 transition hover:bg-red-100"
                            >
                              <Trash2 size={14} />
                              {t.logoRemove}
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-black/50">{t.logoHint}</p>
                      <input
                        id="agency-logo-input"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-black/10 bg-white/90 p-4 md:p-5">
                <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
                  <MapPin size={14} />
                  {t.sectionContact}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-3 text-sm">
                    <span className="mb-2 block font-medium text-black/70">{t.phone}</span>
                    <PremiumInput
                      icon={<Phone size={15} />}
                      type="tel"
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      required
                    />
                  </label>

                  <label className="space-y-3 text-sm">
                    <span className="mb-2 block font-medium text-black/70">{t.whatsapp}</span>
                    <PremiumInput
                      icon={<Phone size={15} />}
                      type="tel"
                      value={form.whatsapp}
                      onChange={(e) => updateField("whatsapp", e.target.value)}
                    />
                  </label>

                  <label className="space-y-3 text-sm">
                    <span className="mb-2 block font-medium text-black/70">{t.city}</span>
                    <PremiumInput
                      icon={<MapPin size={15} />}
                      type="text"
                      value={form.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      required
                    />
                  </label>

                  <label className="space-y-3 text-sm">
                    <span className="mb-2 block font-medium text-black/70">{t.address}</span>
                    <PremiumInput
                      icon={<MapPin size={15} />}
                      type="text"
                      value={form.address}
                      onChange={(e) => updateField("address", e.target.value)}
                      required
                    />
                  </label>

                  <label className="space-y-3 text-sm">
                    <span className="mb-2 block font-medium text-black/70">{t.website}</span>
                    <PremiumInput
                      icon={<Globe2 size={15} />}
                      type="text"
                      value={form.website}
                      onChange={(e) => updateField("website", e.target.value)}
                    />
                  </label>

                  <label className="space-y-3 text-sm">
                    <span className="mb-2 block font-medium text-black/70">{t.yearsExperience}</span>
                    <PremiumInput
                      icon={<CalendarDays size={15} />}
                      type="number"
                      min={0}
                      value={form.yearsExperience}
                      onChange={(e) => updateField("yearsExperience", e.target.value)}
                      className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </label>

                  <label className="space-y-3 text-sm md:col-span-2">
                    <span className="mb-2 block font-medium text-black/70">{t.serviceAreas}</span>
                    <div className="space-y-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex h-11 w-full items-center justify-between rounded-2xl border border-[rgb(var(--navy))]/14 bg-[linear-gradient(180deg,#fff,rgba(248,250,252,0.95))] px-3.5 text-left text-sm font-medium text-[rgb(var(--navy))] shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] outline-none transition hover:border-[rgb(var(--navy))]/35 focus-visible:border-[rgb(var(--navy))]/45 focus-visible:ring-4 focus-visible:ring-[rgb(var(--gold))]/16"
                          >
                            <span className="truncate">
                              {form.serviceAreas.length > 0
                                ? `${form.serviceAreas.length} ${isArabic ? "محددة" : "selectionnee(s)"}`
                                : t.serviceAreasPlaceholder}
                            </span>
                            <ChevronDown size={16} className="text-black/50" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl border border-black/10 bg-white p-1">
                          <div className="px-1 pb-1">
                            <input
                              value={serviceAreasSearch}
                              onChange={(event) => setServiceAreasSearch(event.target.value)}
                              placeholder={t.serviceAreasSearch}
                              className="h-9 w-full rounded-lg border border-[rgb(var(--navy))]/14 bg-[linear-gradient(180deg,#fff,rgba(248,250,252,0.95))] px-2.5 text-sm font-medium text-[rgb(var(--navy))] outline-none transition focus:border-[rgb(var(--navy))]/45 focus:ring-2 focus:ring-[rgb(var(--gold))]/16"
                              onKeyDown={(event) => event.stopPropagation()}
                            />
                          </div>
                          {filteredCommunes.length > 0 ? (
                            filteredCommunes.map((commune) => {
                              const checked = form.serviceAreas.some(
                                (selected) => selected.toLowerCase() === commune.toLowerCase()
                              );
                              return (
                                <DropdownMenuCheckboxItem
                                  key={commune}
                                  checked={checked}
                                  onCheckedChange={() => toggleServiceArea(commune)}
                                  onSelect={(event) => event.preventDefault()}
                                  className="rounded-lg px-3 py-2 text-sm text-[rgb(var(--navy))] data-[highlighted]:bg-[rgb(var(--navy))]/7"
                                >
                                  {commune}
                                </DropdownMenuCheckboxItem>
                              );
                            })
                          ) : (
                            <div className="px-3 py-2 text-sm text-black/50">{t.serviceAreasNoResults}</div>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <div className="rounded-2xl border border-black/10 bg-white px-3 py-2.5">
                        <div className="text-xs font-semibold uppercase tracking-wide text-black/55">
                          {t.serviceAreasSelected}
                        </div>
                        {form.serviceAreas.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {form.serviceAreas.map((area) => (
                              <span
                                key={area}
                                className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--navy))]/15 bg-[rgb(var(--navy))]/6 px-2.5 py-1 text-xs font-semibold text-[rgb(var(--navy))]"
                              >
                                {area}
                                <button
                                  type="button"
                                  onClick={() => removeServiceArea(area)}
                                  className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-black/10 bg-white/80 text-black/55 hover:bg-white"
                                  aria-label={`${t.logoRemove}: ${area}`}
                                >
                                  <X size={10} />
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-1 text-xs text-black/50">{t.serviceAreasEmpty}</div>
                        )}
                      </div>
                    </div>
                  </label>
                </div>
              </section>

              <section className="rounded-2xl border border-black/10 bg-white/90 p-4 md:p-5">
                <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
                  <KeyRound size={14} />
                  {t.sectionAccount}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-3 text-sm md:col-span-2">
                    <span className="mb-2 block font-medium text-black/70">{t.email}</span>
                    <PremiumInput
                      icon={<Mail size={15} />}
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      required
                    />
                  </label>

                  <label className="space-y-3 text-sm">
                    <span className="mb-2 block font-medium text-black/70">{t.password}</span>
                    <PremiumInput
                      icon={<LockKeyhole size={15} />}
                      type="password"
                      value={form.password}
                      onChange={(e) => updateField("password", e.target.value)}
                      required
                    />
                  </label>

                  <label className="space-y-3 text-sm">
                    <span className="mb-2 block font-medium text-black/70">{t.confirmPassword}</span>
                    <PremiumInput
                      icon={<LockKeyhole size={15} />}
                      type="password"
                      value={form.confirmPassword}
                      onChange={(e) => updateField("confirmPassword", e.target.value)}
                      required
                    />
                  </label>
                </div>
              </section>

              <label className="flex items-start gap-2.5 rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm text-black/70">
                <input
                  type="checkbox"
                  checked={form.acceptTerms}
                  onChange={(e) => updateField("acceptTerms", e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-black/20"
                />
                <span>{t.terms}</span>
              </label>

              {errorMsg ? <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{errorMsg}</div> : null}
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[rgb(var(--navy))] text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
              >
                {loading ? t.loading : t.submit}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-black/65">
              {t.hasAccount}{" "}
              <Link href="/agency/login" className="font-semibold text-[rgb(var(--navy))] hover:underline">
                {t.login}
              </Link>
            </p>
          </div>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          <div className="rounded-3xl border border-black/10 bg-[rgb(var(--navy))] p-6 text-white shadow-sm md:p-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]">
              <Building2 size={13} />
              {t.sideBadge}
            </div>
            <h2 className="mt-4 text-xl font-extrabold md:text-2xl">{t.sideTitle}</h2>
            <div className="mt-4 space-y-3">
              {t.sidePoints.map((point) => (
                <div key={point} className="flex items-start gap-2.5 rounded-2xl border border-white/15 bg-white/10 p-3 text-sm text-white/90">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 inline-flex items-center gap-2 text-xs text-white/75">
              <Sparkles size={13} />
              Rostomyia Partner Program
            </div>
          </div>

          <div className="rounded-3xl border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">{t.nextStepsTitle}</h3>
            <div className="mt-3 space-y-2">
              {t.nextSteps.map((step, idx) => (
                <div key={step} className="flex items-start gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/70">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--gold))]/25 text-[11px] font-semibold text-[rgb(var(--navy))]">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}




