"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Handshake,
  Layers3,
  LogIn,
  Megaphone,
  ShieldCheck,
  Sparkles,
  Target,
  UserPlus,
  Users,
} from "lucide-react";
import { useLang } from "@/components/LanguageProvider";

const WHY_JOIN_ICONS = [Megaphone, ShieldCheck, Layers3] as const;
const SERVICES_ICONS = [Handshake, Clock3, CheckCircle2] as const;
const PROFILES_ICONS = [Building2, Users, Target] as const;
const COMMITMENTS_ICONS = [ShieldCheck, FileCheck2, Sparkles] as const;
const AGENCY_IMAGES = [
  "/images/hero-oran.jpg",
  "/images/experience-360-homesitting.jpg",
  "/images/discovery-to-reservation-workflow.jpg",
] as const;

const copy = {
  fr: {
    badge: "Espace agence",
    heroTitle: "Boostez votre portefeuille immobilier avec Rostomyia",
    heroDesc:
      "Un espace dedie aux agences pour deposer des biens, accelerer la validation, et convertir plus vite avec une vitrine premium.",
    heroImageAlt: "Partenariat immobilier a Oran",
    login: "Connexion agence",
    signup: "Inscription agence",
    whyBadge: "Pourquoi nous rejoindre",
    whyTitle: "Un partenariat agence orienté performance",
    whyJoin: [
      {
        title: "Audience qualifiee",
        description: "Exposez vos mandats a des acheteurs et locataires deja engages dans un projet immobilier.",
      },
      {
        title: "Confiance de marche",
        description: "Chaque depot est verifie par le backoffice avant publication pour proteger votre image.",
      },
      {
        title: "Pilotage simplifie",
        description: "Deposez vos biens, suivez les statuts et centralisez vos echanges depuis une seule interface.",
      },
    ],
    kpis: [
      { value: "+320", label: "agences actives" },
      { value: "<48h", label: "delai moyen de validation" },
      { value: "+1.8M", label: "vues mensuelles d'annonces" },
    ],
    visualsTitle: "Notre accompagnement en image",
    visualsDesc: "Une collaboration terrain, digitale et operationnelle pour chaque agence partenaire.",
    visuals: [
      {
        title: "Couverture locale forte",
        description: "Une visibilite ancree sur Oran et ses zones cles.",
      },
      {
        title: "Presentation premium",
        description: "Des experiences media qui renforcent l'attractivite des biens.",
      },
      {
        title: "Workflow structure",
        description: "Un flux clair de depot, controle et publication.",
      },
    ],
    servicesTitle: "Nos services pour les partenaires",
    servicesDesc: "Une approche complete pour mieux vendre et louer vos biens.",
    services: [
      {
        title: "Mise en valeur commerciale",
        description: "Vos biens sont presentes avec un positionnement clair selon la cible et la transaction.",
      },
      {
        title: "Traitement operationnel rapide",
        description: "Un flux de verification structuré pour publier plus vite les annonces conformes.",
      },
      {
        title: "Suivi centralise",
        description: "Historique des depots, statuts et remarques de validation dans le meme espace.",
      },
    ],
    profilesTitle: "Pour qui",
    profilesDesc: "Le programme agence est concu pour differents profils immobiliers.",
    profiles: [
      {
        title: "Agences locales",
        description: "Diffusez votre portefeuille et augmentez votre volume de prises de contact qualifiees.",
      },
      {
        title: "Promoteurs partenaires",
        description: "Mettez en avant vos programmes et organisez vos depots par phase de commercialisation.",
      },
      {
        title: "Agences diaspora",
        description: "Touchez une clientele locale et internationale sur un meme canal digital.",
      },
    ],
    processTitle: "Comment ca marche",
    processDesc: "Un workflow simple pour integrer rapidement vos mandats.",
    steps: [
      "Creation du compte agence",
      "Depot des biens via le dashboard",
      "Validation puis publication",
    ],
    processAsideTitle: "Backoffice dedie",
    processAsideDesc: "Notre equipe controle les depots et vous accompagne jusqu'a publication.",
    processAsidePoints: [
      "Validation documentaire",
      "Verification de coherences",
      "Support operationnel continu",
    ],
    commitmentsTitle: "Nos engagements",
    commitmentsDesc: "Un cadre de collaboration stable pour faire grandir votre activite.",
    commitments: [
      {
        title: "Qualite editoriale",
        description: "Des annonces plus claires et plus fiables pour ameliorer la conversion.",
      },
      {
        title: "Transparence des statuts",
        description: "Vous savez a tout moment ou en est chaque depot.",
      },
      {
        title: "Evolution continue",
        description: "Le portail agence evolue avec vos besoins terrain.",
      },
    ],
    faqTitle: "Questions frequentes",
    faqs: [
      {
        q: "Qui peut s'inscrire sur l'espace agence ?",
        a: "Les agences immobilieres et partenaires professionnels souhaitant deposer des biens via Rostomyia.",
      },
      {
        q: "Combien de temps prend la validation ?",
        a: "La plupart des depots sont traites rapidement. Le delai depend de la completude du dossier.",
      },
      {
        q: "Puis-je suivre l'etat de mes depots ?",
        a: "Oui. Votre dashboard affiche les statuts et permet de suivre l'avancement de chaque demande.",
      },
      {
        q: "Comment commencer ?",
        a: "Creez un compte agence, connectez-vous puis deposez votre premier bien.",
      },
    ],
    finalTitle: "Pret a rejoindre le reseau Rostomyia ?",
    finalDesc: "Creez votre compte agence ou connectez-vous pour lancer vos depots des maintenant.",
    joinNow: "Rejoindre maintenant",
  },
  ar: {
    badge: "فضاء الوكالات",
    heroTitle: "طوّر محفظة وكالتك العقارية مع Rostomyia",
    heroDesc:
      "مساحة مخصصة للوكالات لإيداع العقارات، تسريع التحقق، وتحقيق نتائج أفضل عبر واجهة عرض احترافية.",
    heroImageAlt: "شراكة عقارية في وهران",
    login: "دخول الوكالة",
    signup: "تسجيل الوكالة",
    whyBadge: "لماذا تنضم إلينا",
    whyTitle: "شراكة وكالات مبنية على الأداء",
    whyJoin: [
      {
        title: "جمهور مؤهل",
        description: "اعرض عروضك أمام مشترين ومستأجرين لديهم نية فعلية لإتمام العملية.",
      },
      {
        title: "ثقة في السوق",
        description: "كل إيداع يمر عبر التحقق المكتبي قبل النشر للحفاظ على مصداقية الإعلانات.",
      },
      {
        title: "إدارة أسهل",
        description: "أودِع عقاراتك، تابع الحالات، وأدر التواصل من لوحة واحدة.",
      },
    ],
    kpis: [
      { value: "+320", label: "وكالة نشطة" },
      { value: "<48h", label: "متوسط وقت التحقق" },
      { value: "+1.8M", label: "مشاهدة شهرية للإعلانات" },
    ],
    visualsTitle: "الخدمة بالأرقام والصور",
    visualsDesc: "تعاون ميداني ورقمي وتشغيلي لمرافقة كل وكالة شريكة.",
    visuals: [
      {
        title: "حضور محلي قوي",
        description: "ظهور عقاري فعّال في وهران والمناطق المحورية.",
      },
      {
        title: "عرض بصري احترافي",
        description: "تجربة عرض حديثة تعزز جاذبية العقارات المعروضة.",
      },
      {
        title: "مسار عمل منظم",
        description: "إيداع، تحقق، ونشر ضمن دورة واضحة وسريعة.",
      },
    ],
    servicesTitle: "خدماتنا للشركاء",
    servicesDesc: "منهج متكامل لمساعدتك على البيع والكراء بكفاءة أعلى.",
    services: [
      {
        title: "إبراز تجاري أفضل",
        description: "نقدم عقاراتك بطريقة واضحة حسب الفئة المستهدفة ونوع العملية.",
      },
      {
        title: "معالجة تشغيلية سريعة",
        description: "مسار تحقق منظم لنشر الإعلانات المطابقة في وقت أقصر.",
      },
      {
        title: "متابعة مركزية",
        description: "سجل الإيداعات والحالات وملاحظات التحقق في نفس الفضاء.",
      },
    ],
    profilesTitle: "لمن هذا البرنامج",
    profilesDesc: "برنامج الوكالات مناسب لعدة فاعلين في القطاع العقاري.",
    profiles: [
      {
        title: "الوكالات المحلية",
        description: "وسّع انتشار محفظتك وارفع حجم طلبات التواصل المؤهلة.",
      },
      {
        title: "المطورون الشركاء",
        description: "اعرض برامجك العقارية ونظّم الإيداعات حسب مراحل التسويق.",
      },
      {
        title: "وكالات الجالية",
        description: "الوصول إلى عملاء محليين ودوليين عبر قناة رقمية واحدة.",
      },
    ],
    processTitle: "كيف يعمل النظام",
    processDesc: "خطوات بسيطة لإدماج عقاراتك بسرعة.",
    steps: [
      "إنشاء حساب الوكالة",
      "إيداع العقارات عبر لوحة الوكالة",
      "التحقق ثم النشر",
    ],
    processAsideTitle: "فريق تحقق مخصص",
    processAsideDesc: "فريقنا يراجع الإيداعات ويرافقك حتى مرحلة النشر.",
    processAsidePoints: [
      "مراجعة الوثائق",
      "التحقق من الاتساق",
      "دعم تشغيلي مستمر",
    ],
    commitmentsTitle: "التزاماتنا معكم",
    commitmentsDesc: "إطار تعاون واضح يساعد وكالتك على النمو بثبات.",
    commitments: [
      {
        title: "جودة تحريرية",
        description: "إعلانات أكثر وضوحاً ومصداقية لتحسين معدلات التحويل.",
      },
      {
        title: "شفافية في الحالات",
        description: "تعرف دائماً حالة كل إيداع بشكل مباشر.",
      },
      {
        title: "تطوير مستمر",
        description: "نطوّر فضاء الوكالات باستمرار وفق احتياجات السوق.",
      },
    ],
    faqTitle: "الأسئلة الشائعة",
    faqs: [
      {
        q: "من يمكنه التسجيل في فضاء الوكالات؟",
        a: "الوكالات العقارية والشركاء المهنيون الراغبون في إيداع العقارات عبر Rostomyia.",
      },
      {
        q: "كم يستغرق التحقق من الإيداع؟",
        a: "يتم معالجة أغلب الإيداعات بسرعة، ويعتمد ذلك على اكتمال الملف.",
      },
      {
        q: "هل يمكنني متابعة حالة الإيداعات؟",
        a: "نعم. لوحة الوكالة تعرض الحالات وتطور كل طلب بشكل واضح.",
      },
      {
        q: "كيف أبدأ؟",
        a: "أنشئ حساب وكالة، ثم سجّل الدخول وابدأ بإيداع أول عقار.",
      },
    ],
    finalTitle: "جاهز للانضمام إلى شبكة Rostomyia؟",
    finalDesc: "أنشئ حساب وكالتك أو سجّل الدخول وابدأ إيداع العقارات الآن.",
    joinNow: "انضم الآن",
  },
} as const;

export default function AgencyHomePage() {
  const { lang, dir } = useLang();
  const t = copy[lang];

  return (
    <main dir={dir} className="relative min-h-screen overflow-hidden bg-[rgb(var(--brand-bg))] px-4 py-12 md:py-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 -top-24 h-80 w-80 rounded-full bg-[rgb(var(--gold))]/20 blur-3xl" />
        <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-[rgb(var(--navy))]/12 blur-3xl" />
      </div>

      <section className="relative mx-auto max-w-6xl space-y-5">
        <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <article className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/85 p-8 shadow-sm backdrop-blur md:p-10">
            <Image
              src="/images/agencies_section.png"
              alt={t.heroImageAlt}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-white/88 to-white/78" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--gold))]/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--navy))]">
                <Building2 size={14} />
                {t.badge}
              </div>

              <h1 className="mt-4 text-3xl font-extrabold text-[rgb(var(--navy))] md:text-4xl">{t.heroTitle}</h1>
              <p className="mt-3 max-w-2xl text-sm text-black/65">{t.heroDesc}</p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <Link
                  href="/agency/login"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
                >
                  <LogIn size={16} />
                  {t.login}
                </Link>
                <Link
                  href="/agency/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[rgb(var(--navy))] px-4 py-3 text-sm font-semibold text-white hover:opacity-95"
                >
                  <UserPlus size={16} />
                  {t.signup}
                </Link>
              </div>
            </div>
          </article>

          <aside className="rounded-3xl border border-black/10 bg-[rgb(var(--navy))] p-6 text-white shadow-sm md:p-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]">
              <Sparkles size={13} />
              {t.whyBadge}
            </div>
            <h2 className="mt-4 text-2xl font-extrabold">{t.whyTitle}</h2>
            <div className="mt-5 space-y-3">
              {t.whyJoin.map((item, idx) => {
                const Icon = WHY_JOIN_ICONS[idx % WHY_JOIN_ICONS.length];
                return (
                  <div key={item.title} className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/10 p-3.5">
                    <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15">
                      <Icon size={16} />
                    </span>
                    <div>
                      <div className="text-sm font-semibold">{item.title}</div>
                      <p className="mt-1 text-xs text-white/80">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>

        <section className="grid gap-3 sm:grid-cols-3">
          {t.kpis.map((kpi) => (
            <article key={kpi.label} className="rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur">
              <div className="text-2xl font-extrabold text-[rgb(var(--navy))]">{kpi.value}</div>
              <p className="mt-1 text-xs uppercase tracking-wide text-black/55">{kpi.label}</p>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur md:p-8">
          <h2 className="text-2xl font-extrabold text-[rgb(var(--navy))]">{t.visualsTitle}</h2>
          <p className="mt-2 text-sm text-black/65">{t.visualsDesc}</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {t.visuals.map((item, idx) => (
              <article key={item.title} className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
                <div className="relative h-44 w-full">
                  <Image
                    src={AGENCY_IMAGES[idx % AGENCY_IMAGES.length]}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-base font-bold text-[rgb(var(--navy))]">{item.title}</h3>
                  <p className="mt-1 text-sm text-black/65">{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur md:p-8">
          <h2 className="text-2xl font-extrabold text-[rgb(var(--navy))]">{t.servicesTitle}</h2>
          <p className="mt-2 text-sm text-black/65">{t.servicesDesc}</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {t.services.map((service, idx) => {
              const Icon = SERVICES_ICONS[idx % SERVICES_ICONS.length];
              return (
                <article key={service.title} className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgb(var(--gold))]/25 text-[rgb(var(--navy))]">
                    <Icon size={18} />
                  </span>
                  <h3 className="mt-4 text-lg font-bold text-[rgb(var(--navy))]">{service.title}</h3>
                  <p className="mt-2 text-sm text-black/65">{service.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur md:p-8">
          <h2 className="text-2xl font-extrabold text-[rgb(var(--navy))]">{t.profilesTitle}</h2>
          <p className="mt-2 text-sm text-black/65">{t.profilesDesc}</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {t.profiles.map((profile, idx) => {
              const Icon = PROFILES_ICONS[idx % PROFILES_ICONS.length];
              return (
                <article key={profile.title} className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgb(var(--navy))]/10 text-[rgb(var(--navy))]">
                    <Icon size={18} />
                  </span>
                  <h3 className="mt-4 text-lg font-bold text-[rgb(var(--navy))]">{profile.title}</h3>
                  <p className="mt-2 text-sm text-black/65">{profile.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur md:p-8">
          <h2 className="text-2xl font-extrabold text-[rgb(var(--navy))]">{t.processTitle}</h2>
          <p className="mt-2 text-sm text-black/65">{t.processDesc}</p>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-1">
              {t.steps.map((step, idx) => (
                <div key={step} className="rounded-2xl border border-black/10 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-black/45">
                    {String(idx + 1).padStart(2, "0")}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-[rgb(var(--navy))]">{step}</p>
                </div>
              ))}
            </div>

            <aside className="rounded-3xl border border-black/10 bg-[rgb(var(--navy))] p-5 text-white">
              <h3 className="text-lg font-bold">{t.processAsideTitle}</h3>
              <p className="mt-2 text-sm text-white/80">{t.processAsideDesc}</p>
              <div className="mt-4 space-y-2.5">
                {t.processAsidePoints.map((point) => (
                  <div key={point} className="flex items-start gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/90">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
                    {point}
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur md:p-8">
          <h2 className="text-2xl font-extrabold text-[rgb(var(--navy))]">{t.commitmentsTitle}</h2>
          <p className="mt-2 text-sm text-black/65">{t.commitmentsDesc}</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {t.commitments.map((item, idx) => {
              const Icon = COMMITMENTS_ICONS[idx % COMMITMENTS_ICONS.length];
              return (
                <article key={item.title} className="rounded-2xl border border-black/10 bg-white p-4">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[rgb(var(--gold))]/25 text-[rgb(var(--navy))]">
                    <Icon size={16} />
                  </span>
                  <h3 className="mt-3 text-base font-bold text-[rgb(var(--navy))]">{item.title}</h3>
                  <p className="mt-1 text-sm text-black/65">{item.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur md:p-8">
          <h2 className="text-2xl font-extrabold text-[rgb(var(--navy))]">{t.faqTitle}</h2>
          <div className="mt-5 space-y-3">
            {t.faqs.map((faq) => (
              <details key={faq.q} className="group rounded-2xl border border-black/10 bg-white p-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-[rgb(var(--navy))]">
                  {faq.q}
                </summary>
                <p className="mt-2 text-sm text-black/65">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-black/10 bg-[rgb(var(--navy))] p-6 text-white shadow-sm md:p-8">
          <h2 className="text-2xl font-extrabold">{t.finalTitle}</h2>
          <p className="mt-2 text-sm text-white/80">{t.finalDesc}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/agency/signup"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-[rgb(var(--navy))] hover:bg-white/90"
            >
              {t.joinNow}
              <ArrowRight size={15} className={dir === "rtl" ? "rotate-180" : ""} />
            </Link>
            <Link
              href="/agency/login"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15"
            >
              <LogIn size={15} />
              {t.login}
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
