"use client";

import Link from "next/link";
import { useMemo, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Building2, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/components/LanguageProvider";
import { toUiErrorMessage } from "@/lib/ui-errors";

const copy = {
  fr: {
    badge: "Connexion agence",
    title: "Accedez a votre dashboard partenaire",
    desc: "Connectez-vous pour deposer vos biens, suivre les validations et piloter vos demandes.",
    email: "Email",
    password: "Mot de passe",
    submit: "Se connecter",
    loading: "Connexion...",
    noAccount: "Pas encore de compte ?",
    signup: "Inscription agence",
    notAgencyError: "Ce compte n'est pas un compte agence.",
    pendingError:
      "Compte en attente d'activation. Confirmez votre email puis patientez pour validation admin.",
    suspendedError: "Ce compte agence est suspendu. Contactez le support Rostomyia.",
    sideBadge: "Espace securise",
    sideTitle: "Un acces reserve aux agences partenaires",
    sidePoints: [
      "Depots centralises depuis un seul espace.",
      "Validation backoffice avant publication.",
      "Suivi de statut simple et transparent.",
    ],
  },
  ar: {
    badge: "دخول الوكالة",
    title: "ادخل إلى لوحة الوكالة",
    desc: "سجّل الدخول لإيداع العقارات، متابعة التحقق، وإدارة طلباتك بسهولة.",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    submit: "تسجيل الدخول",
    loading: "جارٍ تسجيل الدخول...",
    noAccount: "ليس لديك حساب بعد؟",
    signup: "تسجيل الوكالة",
    notAgencyError: "هذا الحساب ليس حساب وكالة.",
    pendingError: "الحساب قيد التفعيل. يرجى تأكيد البريد الإلكتروني وانتظار موافقة الإدارة.",
    suspendedError: "حساب الوكالة موقوف. يرجى التواصل مع الدعم.",
    sideBadge: "وصول آمن",
    sideTitle: "دخول مخصص لوكالاتنا الشريكة",
    sidePoints: [
      "إيداع العقارات من مساحة واحدة.",
      "تحقق مكتبي قبل النشر.",
      "متابعة حالة الطلبات بوضوح.",
    ],
  },
} as const;

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
        className={`h-12 w-full rounded-2xl border border-[rgb(var(--navy))]/14 bg-[linear-gradient(180deg,#fff,rgba(248,250,252,0.95))] px-3.5 pl-10 text-sm font-medium text-black/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] outline-none transition placeholder:text-black/35 focus:border-[rgb(var(--navy))]/45 focus:ring-4 focus:ring-[rgb(var(--gold))]/16 ${className}`}
      />
    </div>
  );
}

function detectAccountType(
  user: { user_metadata?: Record<string, unknown> | null; app_metadata?: Record<string, unknown> | null } | null
) {
  const userMeta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const appMeta = (user?.app_metadata ?? {}) as Record<string, unknown>;
  const candidates = [
    userMeta.account_type,
    userMeta.role,
    appMeta.account_type,
    appMeta.role,
    Array.isArray(appMeta.roles) ? appMeta.roles[0] : null,
  ];
  for (const candidate of candidates) {
    const role = String(candidate ?? "").trim().toLowerCase();
    if (role === "agency" || role === "admin" || role === "admin_read_only" || role === "super_admin") {
      return role;
    }
  }
  if (String(userMeta.agency_status ?? "").trim() || String(userMeta.agency_name ?? "").trim()) {
    return "agency";
  }
  return "user";
}

export default function AgencyLoginPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang, dir } = useLang();
  const isArabic = lang === "ar";
  const t = copy[lang];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const initialStatus = searchParams.get("status");
  const [errorMsg, setErrorMsg] = useState<string | null>(
    initialStatus === "pending" ? t.pendingError : initialStatus === "suspended" ? t.suspendedError : null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setLoading(false);
      setErrorMsg(toUiErrorMessage(error.message, { lang, context: "auth" }));
      return;
    }

    const meta = (data.user?.user_metadata as { agency_status?: string } | undefined) ?? {};
    const accountType = detectAccountType(
      (data.user ?? null) as { user_metadata?: Record<string, unknown> | null; app_metadata?: Record<string, unknown> | null } | null
    );
    const status = String(meta.agency_status ?? "pending").toLowerCase();
    if (accountType !== "agency") {
      await supabase.auth.signOut();
      setLoading(false);
      setErrorMsg(t.notAgencyError);
      return;
    }

    if (status === "suspended") {
      await supabase.auth.signOut();
      setLoading(false);
      setErrorMsg(t.suspendedError);
      return;
    }

    if (status !== "active") {
      setLoading(false);
      router.push("/agency/onboarding?status=pending");
      router.refresh();
      return;
    }

    router.push("/agency/dashboard");
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

      <section className="relative mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/84 p-7 shadow-sm backdrop-blur md:p-8">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-10 -top-10 h-44 w-44 rounded-full bg-[rgb(var(--gold))]/15 blur-3xl" />
            <div className="absolute right-0 top-8 h-40 w-40 rounded-full bg-[rgb(var(--navy))]/10 blur-3xl" />
          </div>

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--gold))]/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
              <Building2 size={13} />
              {t.badge}
            </div>
            <h1 className={`${isArabic ? "font-arabic-luxury leading-[1.25]" : ""} mt-4 text-2xl font-bold text-[rgb(var(--navy))] md:text-3xl`}>
              {t.title}
            </h1>
            <p className="mt-2 text-sm text-black/65">{t.desc}</p>

            <form onSubmit={handleSubmit} className="mt-6">
              <div className="space-y-4">
                <label className="grid gap-1.5 text-sm">
                  <span className="block font-medium text-black/70">{t.email}</span>
                  <PremiumInput
                    icon={<Mail size={15} />}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </label>

                <label className="grid gap-1.5 text-sm">
                  <span className="block font-medium text-black/70">{t.password}</span>
                  <PremiumInput
                    icon={<LockKeyhole size={15} />}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </label>
              </div>

              {errorMsg ? <div className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{errorMsg}</div> : null}

              <button
                type="submit"
                disabled={loading}
                className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[rgb(var(--navy))] text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
              >
                {loading ? t.loading : t.submit}
                {!loading ? <ArrowRight size={15} className={dir === "rtl" ? "rotate-180" : ""} /> : null}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-black/65">
              {t.noAccount}{" "}
              <Link href="/agency/signup" className="font-semibold text-[rgb(var(--navy))] hover:underline">
                {t.signup}
              </Link>
            </p>
          </div>
        </article>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-black/10 bg-[rgb(var(--navy))] p-6 text-white shadow-sm md:p-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]">
              <ShieldCheck size={13} />
              {t.sideBadge}
            </div>
            <h2 className="mt-4 text-xl font-extrabold md:text-2xl">{t.sideTitle}</h2>
            <div className="mt-4 space-y-3">
              {t.sidePoints.map((point) => (
                <div key={point} className="flex items-start gap-2.5 rounded-2xl border border-white/15 bg-white/10 p-3 text-sm text-white/90">
                  <Sparkles size={15} className="mt-0.5 shrink-0" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

