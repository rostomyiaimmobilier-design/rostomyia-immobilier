"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Clock3, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/components/LanguageProvider";
import { toUiErrorMessage } from "@/lib/ui-errors";

const copy = {
  fr: {
    badge: "Demande recue",
    title: "Votre demande est en cours de traitement",
    desc: "Confirmez votre email avec le code OTP pour finaliser la creation du compte agence.",
    otpTitle: "Confirmation OTP",
    otpDesc: "Saisissez le code recu par email. Vous pouvez renvoyer un nouveau code si necessaire.",
    email: "Email",
    otp: "Code OTP",
    sendOtp: "Renvoyer OTP",
    sendOtpLoading: "Envoi...",
    verifyOtp: "Verifier et finaliser",
    verifyOtpLoading: "Verification...",
    otpSent: "Code OTP envoye par email.",
    otpNeedEmail: "Entrez votre email pour recevoir le code OTP.",
    otpNeedCode: "Entrez le code OTP recu par email.",
    otpNoAccount: "Aucun compte agence en attente n'est trouve avec cet email.",
    otpNotAgency: "Ce compte n'est pas un compte agence.",
    otpAlreadyConfirmed: "Cet email est deja confirme. Connectez-vous directement a votre espace agence.",
    otpResendFailed: "Impossible d'envoyer le code OTP pour le moment.",
    otpHintLatest: "Utilisez le dernier code recu. Un renvoi OTP invalide les anciens codes.",
    otpSuccess: "Email confirme. Finalisation de votre inscription...",
    stepsTitle: "Prochaines etapes",
    steps: [
      "Verification interne de votre profil agence",
      "Validation du compte par notre equipe",
      "Connexion a votre espace agence",
    ],
    onboarding: "Configurer ma vitrine",
    login: "Connexion agence",
    back: "Retour espace agence",
    note: "Pensez a verifier aussi votre dossier spam/indesirables.",
    notAgencyError: "Ce compte n'est pas un compte agence. Cette adresse email est deja liee a un autre type de compte.",
    adminError: "Ce compte administrateur doit se connecter via /admin/login.",
  },
  ar: {
    badge: "Talab maqboul",
    title: "Talabok qayd al moualaja",
    desc: "Akkid al email b ramz OTP li ikmal insha hesab al wakala.",
    otpTitle: "Taqid OTP",
    otpDesc: "Adkhol ramz al marour al marsal ila al email. Yumkin i3adat irsal ramz jadid.",
    email: "Al email",
    otp: "Ramz OTP",
    sendOtp: "I3adat irsal OTP",
    sendOtpLoading: "Yoursal...",
    verifyOtp: "Taqid wa ikmal",
    verifyOtpLoading: "Jari at-tahaqquq...",
    otpSent: "Tam irsal ramz OTP ila al email.",
    otpNeedEmail: "Adkhol al email li istikbal ramz OTP.",
    otpNeedCode: "Adkhol ramz OTP al mosal ila al email.",
    otpNoAccount: "La yojad hesab wakala qayd attaqid bihada al barid.",
    otpNotAgency: "هذا الحساب ليس حساب وكالة.",
    otpAlreadyConfirmed: "تم تأكيد هذا البريد مسبقا. قم بتسجيل الدخول مباشرة.",
    otpResendFailed: "تعذر إرسال رمز OTP حاليا.",
    otpHintLatest: "Ista3mil akhir ramz tamsalouh. i3adat irsal OTP tulghi ar-roumouz al qadima.",
    otpSuccess: "Tam taqid al email. Jari ikmal at-tasjil...",
    stepsTitle: "Al khatawat al qadima",
    steps: [
      "Mourajaa dakhlia li malaf al wakala",
      "Taf3il al hesab min taraf al idara",
      "Dkhoul ila fadaa al wakala",
    ],
    onboarding: "Iidad al vitrine",
    login: "Dkhoul al wakala",
    back: "Rojou ila fadaa al wakalat",
    note: "Tafakad majald spam/indesirables aydaan.",
    notAgencyError: "Hada al hesab laysa hesab wakala. hadha al email marbout bi naw3 hisab akhar.",
    adminError: "Hada hesab idari. istaamil /admin/login.",
  },
} as const;

function getAccountType(
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

  if (String(userMeta.agency_status ?? "").trim()) return "agency";
  if (String(userMeta.agency_name ?? "").trim()) return "agency";

  return "";
}

export default function AgencySignupSuccessPage() {
  const { lang, dir } = useLang();
  const t = copy[lang];
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState((searchParams.get("email") ?? "").trim().toLowerCase());
  const [otp, setOtp] = useState("");
  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  async function sendOtp() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setErrorMsg(t.otpNeedEmail);
      return;
    }

    setLoadingSend(true);
    setErrorMsg(null);
    setInfoMsg(null);

    const response = await fetch("/api/agency/auth/resend-otp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: normalizedEmail,
        redirectTo: `${window.location.origin}/auth/callback`,
      }),
    });

    const payload = (await response.json().catch(() => null)) as { code?: string; error?: string } | null;

    let errorMessage: string | null = null;
    if (!response.ok) {
      const code = String(payload?.code ?? "").trim().toLowerCase();
      if (code === "account_not_found") errorMessage = t.otpNoAccount;
      else if (code === "not_agency_account") errorMessage = t.otpNotAgency;
      else if (code === "email_already_confirmed") errorMessage = t.otpAlreadyConfirmed;
      else if (payload?.error) errorMessage = toUiErrorMessage(payload.error, { lang, context: "otp" });
      else errorMessage = t.otpResendFailed;
    }

    setLoadingSend(false);

    if (errorMessage) {
      setErrorMsg(toUiErrorMessage(errorMessage, { lang, context: "otp" }));
      return;
    }

    setInfoMsg(t.otpSent);
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setErrorMsg(t.otpNeedEmail);
      return;
    }

    if (!otp.trim()) {
      setErrorMsg(t.otpNeedCode);
      return;
    }

    setLoadingVerify(true);
    setErrorMsg(null);
    setInfoMsg(null);

    const firstTry = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: otp.trim(),
      type: "email",
    });

    let data = firstTry.data;
    let error = firstTry.error;

    if (error) {
      const signupTry = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: otp.trim(),
        type: "signup",
      });
      data = signupTry.data;
      error = signupTry.error;
    }

    if (error) {
      const magicTry = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: otp.trim(),
        type: "magiclink",
      });
      data = magicTry.data;
      error = magicTry.error;
    }

    setLoadingVerify(false);

    if (error) {
      setErrorMsg(toUiErrorMessage(error.message, { lang, context: "otp" }));
      return;
    }

    const accountType = getAccountType(data.user ?? null);
    if (accountType !== "agency") {
      await supabase.auth.signOut();
      setErrorMsg(accountType === "admin" || accountType === "super_admin" ? t.adminError : t.notAgencyError);
      return;
    }

    setInfoMsg(t.otpSuccess);
    router.push("/auth/callback?next=/agency/onboarding");
    router.refresh();
  }

  return (
    <main dir={dir} className="relative min-h-screen overflow-hidden bg-[rgb(var(--brand-bg))] px-4 py-12 md:py-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-16 h-72 w-72 rounded-full bg-[rgb(var(--gold))]/20 blur-3xl" />
        <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-[rgb(var(--navy))]/12 blur-3xl" />
      </div>

      <section className="relative mx-auto grid max-w-5xl gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-black/10 bg-white/85 p-7 shadow-sm backdrop-blur md:p-9">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
            <CheckCircle2 size={14} />
            {t.badge}
          </div>

          <h1 className="mt-4 text-3xl font-extrabold text-[rgb(var(--navy))] md:text-4xl">{t.title}</h1>
          <p className="mt-3 max-w-xl text-sm text-black/65">{t.desc}</p>

          <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--navy))]">
              <Clock3 size={15} />
              {t.otpTitle}
            </h2>
            <p className="mt-2 text-sm text-black/60">{t.otpDesc}</p>
            <p className="mt-1 text-xs text-black/50">{t.otpHintLatest}</p>

            <form onSubmit={verifyOtp} className="mt-4 space-y-3">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-black/70">{t.email}</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3.5 outline-none transition focus:border-[rgb(var(--navy))]/35"
                  required
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium text-black/70">{t.otp}</span>
                <input
                  inputMode="numeric"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3.5 outline-none transition focus:border-[rgb(var(--navy))]/35"
                  required
                />
              </label>

              {errorMsg ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMsg}</div>
              ) : null}
              {infoMsg ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{infoMsg}</div>
              ) : null}

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="submit"
                  disabled={loadingVerify}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-[rgb(var(--navy))] px-4 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
                >
                  {loadingVerify ? t.verifyOtpLoading : t.verifyOtp}
                </button>
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={loadingSend}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-black/10 bg-white px-4 text-sm font-semibold text-[rgb(var(--navy))] hover:bg-black/5 disabled:opacity-60"
                >
                  {loadingSend ? t.sendOtpLoading : t.sendOtp}
                </button>
              </div>
            </form>
          </div>

          <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--navy))]">
              <Clock3 size={15} />
              {t.stepsTitle}
            </h2>
            <div className="mt-3 space-y-2.5">
              {t.steps.map((step, idx) => (
                <div key={step} className="flex items-start gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/70">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--gold))]/25 text-[11px] font-semibold text-[rgb(var(--navy))]">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-4 text-sm text-black/60">{t.note}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/agency/onboarding"
              className="inline-flex items-center gap-2 rounded-2xl border border-[rgb(var(--navy))]/20 bg-[rgb(var(--navy))]/8 px-4 py-2.5 text-sm font-semibold text-[rgb(var(--navy))] hover:bg-[rgb(var(--navy))]/12"
            >
              {t.onboarding}
            </Link>
            <Link
              href="/agency/login"
              className="inline-flex items-center gap-2 rounded-2xl bg-[rgb(var(--navy))] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95"
            >
              {t.login}
            </Link>
            <Link
              href="/agency"
              className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
            >
              {t.back}
            </Link>
          </div>
        </article>

        <aside className="overflow-hidden rounded-3xl border border-black/10 bg-white/80 shadow-sm backdrop-blur">
          <div className="relative h-full min-h-[320px]">
            <Image
              src="/images/propmatch-ai.jpg"
              alt="Agency request processing"
              fill
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgb(var(--navy))]/75 via-[rgb(var(--navy))]/30 to-transparent" />
            <div className="absolute bottom-0 p-5 text-white md:p-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]">
                <Sparkles size={13} />
                Rostomyia Partner Program
              </div>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
