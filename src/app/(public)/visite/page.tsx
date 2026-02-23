"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Home,
  Loader2,
  MessageSquare,
  Phone,
  ShieldCheck,
  Sparkles,
  User2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/components/LanguageProvider";
import { toUiErrorMessage } from "@/lib/ui-errors";

function toOptionalText(v: FormDataEntryValue | null): string | null {
  const s = String(v || "").trim();
  return s ? s : null;
}

function FieldShell({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{icon}</div>
      {children}
    </div>
  );
}

type ViewingPayload = {
  property_ref: string | null;
  name: string | null;
  phone: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  message: string | null;
  lang: "fr" | "ar";
  status: "new";
};

export default function VisitePage() {
  const supabase = useMemo(() => createClient(), []);
  const { lang, dir } = useLang();
  const searchParams = useSearchParams();
  const prefilledRef = (searchParams.get("ref") || "").trim();
  const t =
    lang === "ar"
      ? {
          sendError: "تعذر الارسال حاليا.",
          retry: "اعادة المحاولة",
          sending: "جار الارسال...",
          invalidName: "الاسم مطلوب.",
          invalidPhone: "رقم الهاتف غير صالح.",
          invalidDate: "التاريخ يجب ان يكون اليوم او بعده.",
          sentToast: "تم ارسال الطلب بنجاح.",
          errorToast: "تعذر الارسال. حاول مرة اخرى.",
          sentTitle: "تم ارسال طلب الزيارة",
          sentMessage: "شكرا. سنتواصل معك بسرعة لتأكيد الموعد.",
          backListings: "العودة الى العقارات",
          premium: "خدمة فاخرة",
          title: "حجز زيارة",
          subtitle: "طلب سريع وبسيط. نتصل بك لتأكيد افضل توقيت للزيارة.",
          quickCheck: "تحقق سريع",
          check1: "تاكيد عبر اتصال او واتساب",
          check2: "اقتراح مواعيد مناسبة",
          check3: "مرافقة ميدانية من روستوميا",
          infoTitle: "معلوماتك",
          infoSubtitle: "املأ النموذج وسنتواصل معك بسرعة.",
          refPlaceholder: "مرجع العقار (اختياري)",
          namePlaceholder: "الاسم الكامل",
          phonePlaceholder: "الهاتف",
          slotPlaceholder: "التوقيت المفضل (مثال: 14h-16h)",
          messagePlaceholder: "معلومات اضافية (الدخول، التوفر...)",
          submit: "ارسال الطلب",
          illustrationAlt: "رسم توضيحي للزيارة",
        }
      : {
          sendError: "Erreur: impossible d'envoyer.",
          retry: "Reessayer",
          sending: "Envoi en cours...",
          invalidName: "Le nom est obligatoire.",
          invalidPhone: "Numero de telephone invalide.",
          invalidDate: "La date doit etre aujourd'hui ou plus tard.",
          sentToast: "Demande envoyee avec succes.",
          errorToast: "Envoi impossible. Reessayez.",
          sentTitle: "Visite demandee",
          sentMessage: "Merci. Notre equipe vous contacte rapidement pour confirmer le rendez-vous.",
          backListings: "Retour aux biens",
          premium: "Service Premium",
          title: "Programmer une visite",
          subtitle: "Demande simple et rapide. Nous vous rappelons pour confirmer le meilleur horaire de visite.",
          quickCheck: "Verification rapide",
          check1: "Confirmation par appel ou WhatsApp",
          check2: "Propositions de creneaux adaptes",
          check3: "Accompagnement sur place par Rostomyia",
          infoTitle: "Vos informations",
          infoSubtitle: "Renseignez le formulaire et nous revenons vers vous rapidement.",
          refPlaceholder: "Reference du bien (optionnel)",
          namePlaceholder: "Votre nom",
          phonePlaceholder: "Telephone",
          slotPlaceholder: "Creneau (ex: 14h-16h)",
          messagePlaceholder: "Message complementaire (acces immeuble, disponibilite, etc.)",
          submit: "Envoyer la demande",
          illustrationAlt: "Illustration visite",
        };

  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [lastPayload, setLastPayload] = useState<ViewingPayload | null>(null);
  const [nameValue, setNameValue] = useState("");
  const [phoneValue, setPhoneValue] = useState("");

  useEffect(() => {
    let alive = true;

    const applyUser = (user: {
      phone?: string | null;
      email?: string | null;
      user_metadata?: Record<string, unknown> | null;
    } | null) => {
      if (!alive || !user) return;
      const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const prefilledName = [
        userMeta.full_name,
        userMeta.username,
        userMeta.name,
        userMeta.agency_name,
      ]
        .map((x) => String(x ?? "").trim())
        .find(Boolean);
      const prefilledPhone = [
        userMeta.phone,
        userMeta.agency_phone,
        user.phone,
      ]
        .map((x) => String(x ?? "").trim())
        .find(Boolean);

      if (prefilledName) {
        setNameValue((prev) => (prev.trim() ? prev : prefilledName));
      }
      if (prefilledPhone) {
        setPhoneValue((prev) => (prev.trim() ? prev : prefilledPhone));
      }
    };

    async function prefillSignedInUser() {
      const sessionResult = await supabase.auth.getSession();
      if (!alive) return;
      const sessionUser = sessionResult.data.session?.user ?? null;
      if (sessionUser) {
        applyUser(sessionUser);
        return;
      }

      const userResult = await supabase.auth.getUser();
      if (!alive) return;
      applyUser(userResult.data.user ?? null);
    }

    prefillSignedInUser().catch(() => null);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null);
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function sendRequest(payload: ViewingPayload) {
    setIsSubmitting(true);
    setErrorMsg(null);
    const { error } = await supabase.from("viewing_requests").insert(payload);
    setIsSubmitting(false);

    if (!error) {
      setSent(true);
      setToast({ kind: "ok", text: t.sentToast });
      setTimeout(() => setToast(null), 2600);
      return;
    }

    setErrorMsg(toUiErrorMessage(error.message || t.sendError, { lang, context: "submit" }));
    setToast({ kind: "error", text: t.errorToast });
    setTimeout(() => setToast(null), 3200);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    const form = new FormData(e.currentTarget);
    const payload: ViewingPayload = {
      property_ref: toOptionalText(form.get("ref")),
      name: toOptionalText(form.get("name")),
      phone: toOptionalText(form.get("phone")),
      preferred_date: toOptionalText(form.get("date")),
      preferred_time: toOptionalText(form.get("time")),
      message: toOptionalText(form.get("message")),
      lang,
      status: "new",
    };

    const nextErrors: Record<string, string> = {};
    if (!payload.name) nextErrors.name = t.invalidName;
    if (!payload.phone || !/^[+\d\s().-]{8,20}$/.test(payload.phone)) nextErrors.phone = t.invalidPhone;
    if (payload.preferred_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const picked = new Date(payload.preferred_date);
      if (Number.isFinite(picked.getTime()) && picked < today) {
        nextErrors.date = t.invalidDate;
      }
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLastPayload(payload);
    await sendRequest(payload);
  }

  if (sent) {
    return (
      <main dir={dir} className="relative min-h-screen overflow-hidden bg-[rgb(var(--brand-bg))] px-4 py-16">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-28 top-0 h-72 w-72 rounded-full bg-[rgb(var(--gold))]/25 blur-3xl" />
          <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-[rgb(var(--navy))]/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-2xl rounded-3xl border border-emerald-200 bg-white/90 p-10 text-center shadow-sm backdrop-blur">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <CheckCircle2 size={26} />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold text-[rgb(var(--navy))]">{t.sentTitle}</h1>
          <p className="mt-3 text-sm text-black/65">
            {t.sentMessage}
          </p>
          <Link
            href="/biens"
            className="mt-7 inline-flex items-center justify-center rounded-2xl bg-[rgb(var(--navy))] px-5 py-3 text-sm font-semibold text-white hover:opacity-95"
          >
            {t.backListings}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main dir={dir} className="relative min-h-screen overflow-hidden bg-[rgb(var(--brand-bg))] px-4 py-10 md:py-14">
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
        <div className="absolute -left-32 -top-16 h-80 w-80 rounded-full bg-[rgb(var(--gold))]/22 blur-3xl" />
        <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-[rgb(var(--navy))]/12 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-6 md:grid-cols-[1.05fr_0.95fr]">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="rounded-3xl border border-black/10 bg-white/70 p-7 shadow-sm backdrop-blur md:p-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--gold))]/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
            <Sparkles size={14} />
            {t.premium}
          </div>

          <h1 className="mt-4 text-3xl font-extrabold text-[rgb(var(--navy))] md:text-4xl">{t.title}</h1>
          <p className="mt-3 text-sm text-black/65">
            {t.subtitle}
          </p>

          <div className="mt-6 rounded-2xl bg-[rgb(var(--navy))]/95 p-4 text-white ring-1 ring-black/10">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/75">
              <ShieldCheck size={14} className="text-[rgb(var(--gold))]" />
              {t.quickCheck}
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-[rgb(var(--gold))]" />
                {t.check1}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-[rgb(var(--gold))]" />
                {t.check2}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-[rgb(var(--gold))]" />
                {t.check3}
              </li>
            </ul>
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-black/10 bg-white/85 p-4">
            <svg viewBox="0 0 520 220" className="h-full w-full" role="img" aria-label={t.illustrationAlt}>
              <defs>
                <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgb(var(--gold))" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="rgb(var(--gold))" stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="navyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgb(var(--navy))" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#0f2238" stopOpacity="1" />
                </linearGradient>
              </defs>
              <rect x="0" y="0" width="520" height="220" rx="24" fill="#f8fafc" />
              <circle cx="80" cy="32" r="26" fill="url(#goldGrad)" />
              <circle cx="470" cy="186" r="38" fill="url(#goldGrad)" />
              <rect x="44" y="102" width="210" height="88" rx="10" fill="url(#navyGrad)" />
              <polygon points="36,106 149,34 264,106" fill="rgb(var(--navy))" />
              <rect x="124" y="132" width="46" height="58" rx="7" fill="#fff" opacity="0.9" />
              <rect x="72" y="132" width="30" height="26" rx="5" fill="#fff" opacity="0.9" />
              <rect x="188" y="132" width="30" height="26" rx="5" fill="#fff" opacity="0.9" />
              <rect x="300" y="46" width="178" height="130" rx="14" fill="white" stroke="#dbe3ee" strokeWidth="2" />
              <rect x="300" y="46" width="178" height="28" rx="14" fill="rgb(var(--navy))" />
              <rect x="323" y="95" width="30" height="30" rx="6" fill="rgb(var(--gold))" />
              <rect x="367" y="95" width="30" height="30" rx="6" fill="#dbe3ee" />
              <rect x="411" y="95" width="30" height="30" rx="6" fill="#dbe3ee" />
              <rect x="323" y="133" width="118" height="10" rx="5" fill="#e2e8f0" />
              <rect x="323" y="150" width="85" height="10" rx="5" fill="#e2e8f0" />
            </svg>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="rounded-3xl border border-black/10 bg-white/80 p-7 shadow-sm backdrop-blur md:p-8"
        >
          <h2 className="text-xl font-bold text-[rgb(var(--navy))]">{t.infoTitle}</h2>
          <p className="mt-2 text-sm text-black/60">{t.infoSubtitle}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <FieldShell icon={<Home size={16} />}>
              <input
                name="ref"
                placeholder={t.refPlaceholder}
                className="h-12 w-full rounded-2xl border border-black/10 bg-white px-11 text-sm outline-none ring-0 transition focus:border-[rgb(var(--gold))]/70"
                defaultValue={prefilledRef}
              />
            </FieldShell>

            <FieldShell icon={<User2 size={16} />}>
              <input
                name="name"
                placeholder={t.namePlaceholder}
                className="h-12 w-full rounded-2xl border border-black/10 bg-white px-11 text-sm outline-none ring-0 transition focus:border-[rgb(var(--gold))]/70"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                required
              />
            </FieldShell>
            {fieldErrors.name ? <p className="text-xs text-red-600">{fieldErrors.name}</p> : null}

            <FieldShell icon={<Phone size={16} />}>
              <input
                name="phone"
                placeholder={t.phonePlaceholder}
                className="h-12 w-full rounded-2xl border border-black/10 bg-white px-11 text-sm outline-none ring-0 transition focus:border-[rgb(var(--gold))]/70"
                value={phoneValue}
                onChange={(e) => setPhoneValue(e.target.value)}
                required
              />
            </FieldShell>
            {fieldErrors.phone ? <p className="text-xs text-red-600">{fieldErrors.phone}</p> : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FieldShell icon={<CalendarDays size={16} />}>
                <input
                  type="date"
                  name="date"
                  className="h-12 w-full rounded-2xl border border-black/10 bg-white px-11 text-sm outline-none ring-0 transition focus:border-[rgb(var(--gold))]/70"
                />
              </FieldShell>
              <FieldShell icon={<Clock3 size={16} />}>
                <input
                  name="time"
                  placeholder={t.slotPlaceholder}
                  className="h-12 w-full rounded-2xl border border-black/10 bg-white px-11 text-sm outline-none ring-0 transition focus:border-[rgb(var(--gold))]/70"
                />
              </FieldShell>
            </div>
            {fieldErrors.date ? <p className="text-xs text-red-600">{fieldErrors.date}</p> : null}

            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-4 text-slate-500">
                <MessageSquare size={16} />
              </div>
              <textarea
                name="message"
                placeholder={t.messagePlaceholder}
                className="w-full rounded-2xl border border-black/10 bg-white px-11 py-3 text-sm outline-none transition focus:border-[rgb(var(--gold))]/70"
                rows={4}
              />
            </div>

            {errorMsg ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <p>{errorMsg}</p>
                {lastPayload ? (
                  <button
                    type="button"
                    onClick={() => sendRequest(lastPayload)}
                    className="mt-2 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    <AlertCircle size={14} />
                    {t.retry}
                  </button>
                ) : null}
              </div>
            ) : null}

            <button
              disabled={isSubmitting}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[rgb(var(--navy))] text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CalendarDays size={16} />}
              {isSubmitting ? t.sending : t.submit}
            </button>
          </form>
        </motion.section>
      </div>
    </main>
  );
}
