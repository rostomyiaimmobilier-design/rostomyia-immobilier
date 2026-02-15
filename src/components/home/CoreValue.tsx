"use client";

import Image from "next/image";
import { motion } from "framer-motion";

type Lang = "fr" | "ar";

type Copy = {
  badge: string;
  title: string;
  intro: string;
  metrics: { v: string; l: string }[];
  missionTitle: string;
  mission: string;
  problemKicker: string;
  problemsTitle: string;
  problems: string[];
  trifectaTitle: string;
  trifectaSub: string;
  pillars: { t: string; d: string; image?: string }[];
  auditTitle: string;
  auditLead: string;
  auditItems: string[];
};

const copy: Record<Lang, Copy> = {
  fr: {
    badge: "Modele Validation-First",
    title: "Un moteur de confiance pour l'immobilier algerien",
    intro:
      "Rostomyia ferme le fosse de confiance et de transaction grace aux visites 360 verifiees, au matching intelligent et aux paiements securises a distance.",
    metrics: [
      { v: "100%", l: "biens verifies" },
      { v: "360", l: "visite immersive" },
      { v: "Top 5", l: "match instantane" },
    ],
    missionTitle: "Notre mission",
    mission:
      "Revolutionner le marche immobilier algerien avec une place de marche Validation-First: des biens verifies, une transparence technique complete, et la possibilite de reserver depuis l'etranger en toute certitude.",
    problemKicker: "Contexte",
    problemsTitle: "Le fosse Confiance & Transaction",
    problems: [
      "Deficit de confiance: trop d'annonces sont obsoletes, trompeuses ou non verifiees.",
      "Barriere distance: la diaspora depend souvent de relais informels peu fiables.",
      "Fatigue de recherche: des heures perdues dans des annonces non pertinentes.",
      "Friction transactionnelle: difficile de bloquer un bien sans presence physique.",
    ],
    trifectaTitle: "La Trifecta PropTech",
    trifectaSub:
      "Trois leviers technologiques qui transforment la recherche, la decision et la reservation.",
    pillars: [
      {
        t: "Experience 360 Home-Sitting",
        d: "Visites immersives haute definition pour comprendre l'espace comme si vous y etiez, depuis Paris, Londres ou Oran.",
        image: "/images/experience-360-homesitting.jpg",
      },
      {
        t: "PropMatch AI",
        d: "Analyse de plus de 100 points de donnees pour generer instantanement une selection des 5 biens les plus pertinents.",
        image: "/images/propmatch-ai.jpg",
      },
      {
        t: "Paiements digitaux securises",
        d: "CIB/Edahabia pour le local, solutions internationales pour la diaspora, avec reservation instantanee et depot de garantie numerique sequestre.",
        image: "/images/paiements-digitaux-securises.jpg",
      },
    ],
    auditTitle: "Audit Technique Diaspora-Verified",
    auditLead:
      "Chaque annonce integre un dossier de verification factuel, lisible et actionnable.",
    auditItems: [
      "Verification de propriete, situation legale et documents cles",
      "Coherence plans, surfaces, dimensions et distribution des pieces",
      "Etat technique: reseaux, finitions, points de vigilance batiment",
      "Lecture terrain: accessibilite, nuisances, contraintes d'usage",
    ],
  },
  ar: {
    badge: "نموذج Validation-First",
    title: "منظومة ثقة جديدة للعقار في الجزائر",
    intro:
      "روستوميا تغلق فجوة الثقة والمعاملات عبر جولات 360 موثقة، مطابقة ذكية، ومدفوعات رقمية آمنة عن بعد.",
    metrics: [
      { v: "100%", l: "عقارات موثقة" },
      { v: "360", l: "جولة غامرة" },
      { v: "Top 5", l: "مطابقة فورية" },
    ],
    missionTitle: "رسالتنا",
    mission:
      "إعادة تشكيل السوق العقاري الجزائري من خلال منصة Validation-First: عقارات موثقة، شفافية تقنية كاملة، وإمكانية الحجز من الخارج بثقة عالية.",
    problemKicker: "السياق",
    problemsTitle: "فجوة الثقة والمعاملات",
    problems: [
      "ضعف الثقة: عدد كبير من الإعلانات غير محدث أو غير موثق أو مضلل.",
      "حاجز المسافة: الجالية تعتمد على وسطاء غير موثوقين للتحقق من العقار.",
      "إرهاق البحث: ساعات طويلة تضيع بين عروض غير مناسبة.",
      "صعوبة إتمام الصفقة: لا توجد طريقة سهلة لتثبيت العقار عن بعد.",
    ],
    trifectaTitle: "ثلاثية القيمة PropTech",
    trifectaSub: "ثلاث ركائز تقنية تعيد بناء تجربة البحث واتخاذ القرار والحجز.",
    pillars: [
      {
        t: "تجربة 360 من المنزل",
        d: "جولات افتراضية عالية الجودة تمنح فهما كاملا للمساحة دون الحاجة للحضور الفعلي.",
        image: "/images/experience-360-homesitting.jpg",
      },
      {
        t: "PropMatch AI",
        d: "تحليل اكثر من 100 نقطة بيانات لتقديم قائمة قصيرة تضم افضل 5 عقارات مناسبة بشكل فوري.",
        image: "/images/propmatch-ai.jpg",
      },
      {
        t: "مدفوعات رقمية آمنة",
        d: "تكامل CIB و Edahabia محليا مع حلول دولية للجالية للحجز الفوري مع إيداع ضمان رقمي محجوز.",
        image: "/images/paiements-digitaux-securises.jpg",
      },
    ],
    auditTitle: "تدقيق تقني Diaspora-Verified",
    auditLead: "كل إعلان يتضمن تقرير تحقق تقني واضح يساعد على القرار بثقة.",
    auditItems: [
      "التحقق من الملكية والوضع القانوني والوثائق الأساسية",
      "مطابقة المخططات والمساحات وأبعاد الغرف",
      "تقييم الحالة التقنية: الشبكات والتشطيبات ومؤشرات المبنى",
      "تحليل البيئة المحيطة: الوصول، الإزعاج، والقيود العملية",
    ],
  },
};

export default function CoreValue({ lang }: { lang: Lang }) {
  const t = copy[lang];
  const missionImage = "/images/hero-oran.jpg";
  const auditImage = "/images/logo_rostomyiaV.PNG";

  return (
    <section className="mx-auto max-w-7xl px-4 py-18 md:py-24">
      <div className="space-y-8">
        <article className="relative overflow-hidden rounded-[34px] bg-[radial-gradient(circle_at_10%_20%,rgba(186,154,92,0.28),transparent_36%),linear-gradient(130deg,rgba(10,18,35,0.98),rgba(15,28,53,0.94))] p-6 md:p-10">
          <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-[rgb(var(--gold))]/25 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="grid gap-6 md:grid-cols-2 md:items-center">
            <div>
              <span className="inline-flex rounded-full bg-white/14 px-3 py-1 text-xs tracking-[0.18em] text-white/85">
                {t.badge}
              </span>
              <h2 className="font-display mt-4 text-4xl leading-[0.95] tracking-tight text-white md:text-6xl">
                {t.title}
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/75 md:text-base">{t.intro}</p>

              <div className="mt-5 grid grid-cols-3 gap-2">
                {t.metrics.map((m) => (
                  <div key={m.l} className="rounded-xl bg-white/12 px-3 py-2 backdrop-blur">
                    <div className="text-sm font-semibold text-white">{m.v}</div>
                    <div className="text-[11px] text-white/72">{m.l}</div>
                  </div>
                ))}
              </div>

              <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-white/88">{t.missionTitle}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/78">{t.mission}</p>
            </div>

            <div className="relative aspect-[5/4] overflow-hidden rounded-2xl bg-black/5">
              <Image src={missionImage} alt="Oran" fill className="object-cover" sizes="(max-width: 768px) 100vw, 40vw" />
              <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,18,35,0.45),transparent_60%)]" />
              <div className="absolute bottom-3 left-3 rounded-xl bg-white/82 px-3 py-2 text-xs text-[rgb(var(--navy))] backdrop-blur">
                Validation, visualisation, reservation
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-[28px] bg-white/60 p-6 backdrop-blur md:p-8">
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <p className="text-xs uppercase tracking-[0.15em] text-[rgb(var(--navy))]/65">{t.problemKicker}</p>
              <h3 className="font-display mt-2 text-2xl text-[rgb(var(--navy))] md:text-3xl">{t.problemsTitle}</h3>
            </div>
            <ul className="space-y-2 lg:col-span-3">
              {t.problems.map((x, i) => (
                <li key={x} className="rounded-xl bg-white/62 px-3 py-2 text-sm leading-relaxed text-black/70">
                  <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[rgb(var(--navy))]/10 text-[11px] font-semibold text-[rgb(var(--navy))]">
                    {i + 1}
                  </span>
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </article>

        <article className="rounded-[30px] bg-white/58 p-6 backdrop-blur md:p-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="grid gap-6 lg:grid-cols-12"
          >
            <div className="lg:col-span-8">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative overflow-hidden rounded-2xl bg-[linear-gradient(120deg,rgba(10,18,35,0.96),rgba(18,34,66,0.92))] p-5 md:p-6"
              >
                <motion.div
                  animate={{ x: [0, 12, 0], y: [0, -8, 0] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                  className="pointer-events-none absolute -top-16 -right-16 h-36 w-36 rounded-full bg-[rgb(var(--gold))]/30 blur-2xl"
                />
                <div className="pointer-events-none absolute left-0 top-0 h-full w-1 bg-[rgb(var(--gold))]" />
                <h3 className="font-display relative text-2xl text-white md:text-3xl">{t.trifectaTitle}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-white/75">{t.trifectaSub}</p>
              </motion.div>

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.15 }}
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.08 } },
                }}
                className="mt-5 grid gap-5 md:grid-cols-3"
              >
                {t.pillars.map((x, idx) => (
                  <motion.div
                    key={x.t}
                    variants={{
                      hidden: { opacity: 0, y: 20, scale: 0.98 },
                      visible: { opacity: 1, y: 0, scale: 1 },
                    }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    whileHover={{ y: -8, scale: 1.015 }}
                    className={`group rounded-2xl p-4 ${x.image ? "bg-[rgb(var(--navy))]/92 text-white" : "bg-white/60"}`}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                          x.image
                            ? "bg-white/16 text-white"
                            : "bg-[rgb(var(--navy))]/10 text-[rgb(var(--navy))]"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span
                        className={`text-[11px] uppercase tracking-[0.14em] ${
                          x.image ? "text-white/70" : "text-[rgb(var(--navy))]/60"
                        }`}
                      >
                        Step
                      </span>
                    </div>
                    {x.image ? (
                      <div className="relative mt-2 aspect-[4/3] overflow-hidden rounded-xl bg-black/5">
                        <Image src={x.image} alt={x.t} fill className="object-cover transition-transform duration-700 group-hover:scale-[1.05]" sizes="(max-width: 768px) 100vw, 20vw" />
                        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,18,35,0.35),transparent_60%)]" />
                      </div>
                    ) : null}
                    <h4 className={`mt-2 text-sm font-semibold ${x.image ? "text-white" : "text-[rgb(var(--navy))]"}`}>{x.t}</h4>
                    <p className={`mt-2 text-sm leading-relaxed ${x.image ? "text-white/78" : "text-black/68"}`}>{x.d}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 22 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.12 }}
              className="relative overflow-hidden rounded-2xl bg-black/5 lg:col-span-4"
            >
              <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.5, ease: "easeOut" }} className="absolute inset-0">
                <Image
                  src="/images/discovery-to-reservation-workflow.jpg"
                  alt={lang === "ar" ? "من البحث إلى الحجز" : "From discovery to reservation"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 28vw"
                />
              </motion.div>
              <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,18,35,0.55),rgba(10,18,35,0.05)_55%)]" />
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.45, ease: "easeOut", delay: 0.22 }}
                className="absolute inset-x-3 bottom-3 rounded-xl bg-white/84 p-3 text-sm leading-relaxed text-[rgb(var(--navy))] backdrop-blur"
              >
                {lang === "ar"
                  ? "من البحث إلى الحجز: تجربة واحدة مترابطة، موثقة، وسريعة."
                  : "From discovery to reservation: one continuous, verified, and fast workflow."}
              </motion.div>
            </motion.div>
          </motion.div>
        </article>

        <article className="rounded-[28px] bg-white/60 p-6 backdrop-blur md:p-8">
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <h3 className="font-display text-2xl text-[rgb(var(--navy))] md:text-3xl">{t.auditTitle}</h3>
              <p className="mt-2 text-sm leading-relaxed text-black/65">{t.auditLead}</p>
              <div className="mt-4 grid gap-2">
                {t.auditItems.map((x) => (
                  <div key={x} className="rounded-xl bg-white/62 px-3 py-2 text-sm text-black/70">
                    {x}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-black/5">
              <Image src={auditImage} alt="Audit" fill className="object-contain p-6" sizes="(max-width: 768px) 100vw, 40vw" />
              <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,18,35,0.42),transparent_62%)]" />
              <div className="absolute bottom-3 right-3 rounded-xl bg-white/78 px-3 py-2 text-xs text-[rgb(var(--navy))] backdrop-blur">
                {lang === "ar" ? "تدقيق تقني موثق" : "Technical audit, documented"}
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
