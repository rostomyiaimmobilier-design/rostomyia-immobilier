"use client";

import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Clock3, Sparkles } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";

const copy = {
  fr: {
    badge: "Demande recue",
    title: "Votre demande est en cours de traitement",
    desc: "Merci. Un email de confirmation a ete envoye a votre adresse. Confirmez votre email pour finaliser l'acces, puis notre equipe traitera votre demande.",
    stepsTitle: "Prochaines etapes",
    steps: [
      "Verification interne de votre profil agence",
      "Validation du compte par notre equipe",
      "Connexion a votre espace agence",
    ],
    login: "Connexion agence",
    back: "Retour espace agence",
    note: "Pensez a verifier aussi votre dossier spam/indesirables.",
  },
  ar: {
    badge: "تم استلام الطلب",
    title: "طلبك قيد المعالجة",
    desc: "شكرا لك. تم إنشاء حساب وكالتك وإرساله إلى فريقنا للتحقق.",
    stepsTitle: "الخطوات القادمة",
    steps: [
      "مراجعة داخلية لملف الوكالة",
      "تفعيل الحساب من طرف فريقنا",
      "تسجيل الدخول إلى فضاء الوكالة",
    ],
    login: "دخول الوكالة",
    back: "العودة إلى فضاء الوكالات",
    note: "ستصلك رسالة تأكيد فور الانتهاء من معالجة الملف.",
  },
} as const;

export default function AgencySignupSuccessPage() {
  const { lang, dir } = useLang();
  const t = copy[lang];

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
