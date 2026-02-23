"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, KeyRound, MapPin, Sparkles, UserPlus, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/components/LanguageProvider";
import { toUiErrorMessage } from "@/lib/ui-errors";

type AgencySignupForm = {
  agencyName: string;
  managerName: string;
  phone: string;
  whatsapp: string;
  city: string;
  address: string;
  website: string;
  serviceAreas: string;
  yearsExperience: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
};

const INITIAL_FORM: AgencySignupForm = {
  agencyName: "",
  managerName: "",
  phone: "",
  whatsapp: "",
  city: "",
  address: "",
  website: "",
  serviceAreas: "",
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
    phone: "Telephone principal *",
    whatsapp: "WhatsApp",
    city: "Ville *",
    address: "Adresse *",
    website: "Site web",
    serviceAreas: "Zones de couverture",
    serviceAreasPlaceholder: "Oran, Bir El Djir, Es Senia",
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
    phone: "الهاتف الرئيسي *",
    whatsapp: "واتساب",
    city: "المدينة *",
    address: "العنوان *",
    website: "الموقع الإلكتروني",
    serviceAreas: "مناطق التغطية",
    serviceAreasPlaceholder: "وهران، بئر الجير، السانية",
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

function normalizeServiceAreas(raw: string) {
  return raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
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

  function updateField<K extends keyof AgencySignupForm>(key: K, value: AgencySignupForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
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
          agency_manager_name: form.managerName.trim(),
          agency_phone: form.phone.trim(),
          agency_whatsapp: form.whatsapp.trim() || null,
          agency_city: form.city.trim(),
          agency_address: form.address.trim(),
          agency_website: form.website.trim() || null,
          agency_service_areas: serviceAreasText || null,
          agency_years_experience: yearsExperience,
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

    if (data.session) {
      setLoading(false);
      router.push("/agency/signup/success");
      router.refresh();
      return;
    }

    setLoading(false);
    router.push("/agency/signup/success");
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
                    <input
                      type="text"
                      value={form.agencyName}
                      onChange={(e) => updateField("agencyName", e.target.value)}
                      required
                      className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3.5 outline-none focus:border-[rgb(var(--navy))]/35"
                    />
                  </label>

                  <label className="space-y-3 text-sm">
                    <span className="mb-2 block font-medium text-black/70">{t.managerName}</span>
                    <input
                      type="text"
                      value={form.managerName}
                      onChange={(e) => updateField("managerName", e.target.value)}
                      required
                      className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3.5 outline-none focus:border-[rgb(var(--navy))]/35"
                    />
                  </label>
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
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      required
                      className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3.5 outline-none focus:border-[rgb(var(--navy))]/35"
                    />
                  </label>

                  <label className="space-y-3 text-sm">
                    <span className="mb-2 block font-medium text-black/70">{t.whatsapp}</span>
                    <input
                      type="tel"
                      value={form.whatsapp}
                      onChange={(e) => updateField("whatsapp", e.target.value)}
                      className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3.5 outline-none focus:border-[rgb(var(--navy))]/35"
                    />
                  </label>

                  <label className="space-y-3 text-sm">
                    <span className="mb-2 block font-medium text-black/70">{t.city}</span>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      required
                      className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3.5 outline-none focus:border-[rgb(var(--navy))]/35"
                    />
                  </label>

                  <label className="space-y-3 text-sm">
                    <span className="mb-2 block font-medium text-black/70">{t.address}</span>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => updateField("address", e.target.value)}
                      required
                      className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3.5 outline-none focus:border-[rgb(var(--navy))]/35"
                    />
                  </label>

                  <label className="space-y-3 text-sm">
                    <span className="mb-2 block font-medium text-black/70">{t.website}</span>
                    <input
                      type="text"
                      value={form.website}
                      onChange={(e) => updateField("website", e.target.value)}
                      className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3.5 outline-none focus:border-[rgb(var(--navy))]/35"
                    />
                  </label>

                  <label className="space-y-3 text-sm">
                    <span className="mb-2 block font-medium text-black/70">{t.yearsExperience}</span>
                    <input
                      type="number"
                      min={0}
                      value={form.yearsExperience}
                      onChange={(e) => updateField("yearsExperience", e.target.value)}
                      className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3.5 outline-none focus:border-[rgb(var(--navy))]/35"
                    />
                  </label>

                  <label className="space-y-3 text-sm md:col-span-2">
                    <span className="mb-2 block font-medium text-black/70">{t.serviceAreas}</span>
                    <input
                      type="text"
                      value={form.serviceAreas}
                      onChange={(e) => updateField("serviceAreas", e.target.value)}
                      placeholder={t.serviceAreasPlaceholder}
                      className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3.5 outline-none focus:border-[rgb(var(--navy))]/35"
                    />
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
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      required
                      className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3.5 outline-none focus:border-[rgb(var(--navy))]/35"
                    />
                  </label>

                  <label className="space-y-3 text-sm">
                    <span className="mb-2 block font-medium text-black/70">{t.password}</span>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => updateField("password", e.target.value)}
                      required
                      className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3.5 outline-none focus:border-[rgb(var(--navy))]/35"
                    />
                  </label>

                  <label className="space-y-3 text-sm">
                    <span className="mb-2 block font-medium text-black/70">{t.confirmPassword}</span>
                    <input
                      type="password"
                      value={form.confirmPassword}
                      onChange={(e) => updateField("confirmPassword", e.target.value)}
                      required
                      className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3.5 outline-none focus:border-[rgb(var(--navy))]/35"
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




