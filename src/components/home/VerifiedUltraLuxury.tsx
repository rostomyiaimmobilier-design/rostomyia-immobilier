"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";
import type { Lang } from "@/lib/i18n";

const copy: Record<
  Lang,
  {
    heading: string;
    description: string;
    features: Array<{ title: string; text: string }>;
    cta: string;
    scoreLabel: string;
    checks: string[];
    status: string;
  }
> = {
  fr: {
    heading: "Rostomyia Verified™",
    description:
      "Un standard prive combinant expertise humaine et intelligence artificielle. Chaque bien est valide selon un protocole exclusif avant publication.",
    features: [
      {
        title: "Dossier Juridique Certifie",
        text: "Propriete validee, documents authentifies, situation legale verifiee.",
      },
      {
        title: "Analyse IA Predictive",
        text: "Comparaison marche en temps reel et detection d'anomalies.",
      },
      {
        title: "AI Trust Score",
        text: "42 points de controle internes pour mesurer la fiabilite.",
      },
      {
        title: "Publication Restreinte",
        text: "Moins de 38% des biens obtiennent le label Verified™.",
      },
    ],
    cta: "Voir les biens 100% verifies",
    scoreLabel: "AI Trust Score",
    checks: [
      "Documents valides",
      "Prix conforme au marche",
      "Analyse IA effectuee",
      "Dossier complet",
    ],
    status: "Statut : Certifie",
  },
  ar: {
    heading: "Rostomyia Verified™",
    description:
      "معيار خاص يجمع بين الخبرة البشرية والذكاء الاصطناعي. كل عقار يتم التحقق منه وفق بروتوكول حصري قبل النشر.",
    features: [
      {
        title: "ملف قانوني موثق",
        text: "ملكية موثقة، وثائق مصادق عليها، ووضعية قانونية مؤكدة.",
      },
      {
        title: "تحليل تنبؤي بالذكاء الاصطناعي",
        text: "مقارنة السوق في الوقت الحقيقي واكتشاف الشذوذ.",
      },
      {
        title: "مؤشر الثقة بالذكاء الاصطناعي",
        text: "42 نقطة تدقيق داخلية لقياس الموثوقية.",
      },
      {
        title: "نشر انتقائي",
        text: "أقل من 38% من العقارات تحصل على علامة Verified™.",
      },
    ],
    cta: "عرض العقارات الموثقة 100%",
    scoreLabel: "مؤشر الثقة بالذكاء الاصطناعي",
    checks: [
      "وثائق موثقة",
      "سعر مطابق للسوق",
      "تحليل ذكاء اصطناعي مكتمل",
      "ملف مكتمل",
    ],
    status: "الحالة: موثق",
  },
};

export default function VerifiedUltraLuxury({ lang }: { lang: Lang }) {
  const score = 9.4;
  const t = copy[lang];

  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => latest.toFixed(1));

  useEffect(() => {
    const controls = animate(motionValue, score, {
      duration: 2.2,
      ease: "easeOut",
    });
    return controls.stop;
  }, [motionValue]);

  return (
    <section className="relative mx-auto max-w-6xl px-6 py-28">
      <div className="pointer-events-none absolute inset-0 flex justify-center">
        <div className="h-[420px] w-[420px] animate-pulse rounded-full bg-[rgb(var(--gold))]/20 blur-[120px]" />
      </div>

      <div className="relative grid items-center gap-20 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-5xl font-light tracking-wide text-[rgb(var(--navy))]">{t.heading}</h2>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-black/60">{t.description}</p>

          <div className="mt-14 space-y-8">
            {t.features.map((feature) => (
              <Feature key={feature.title} title={feature.title} text={feature.text} />
            ))}
          </div>

          <button className="mt-16 inline-flex items-center gap-3 bg-[rgb(var(--navy))] px-10 py-4 text-sm tracking-wider text-white shadow-2xl transition hover:opacity-90">
            {t.cta}
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
          whileHover={{ rotateX: 3, rotateY: -3 }}
          className="relative perspective-1000"
        >
          <div className="relative rounded-3xl border border-white/20 bg-white/60 p-12 shadow-[0_50px_150px_rgba(0,0,0,0.1)] backdrop-blur-2xl transition-all duration-500">
            <div className="pointer-events-none absolute inset-0 rounded-3xl border border-[rgb(var(--gold))]/30" />

            <div className="text-xs uppercase tracking-widest text-black/50">{t.heading}</div>

            <div className="mt-10">
              <div className="text-xs text-black/40">{t.scoreLabel}</div>

              <div className="mt-2 text-6xl font-light text-[rgb(var(--navy))]">
                <motion.span>{rounded}</motion.span>
                <span className="text-2xl text-black/40"> / 10</span>
              </div>
            </div>

            <div className="mt-10 space-y-4 text-sm text-black/70">
              {t.checks.map((item) => (
                <Item key={item} text={item} />
              ))}
            </div>

            <div className="mt-12 border-t border-black/10 pt-4 text-xs text-black/50">{t.status}</div>

            <div className="pointer-events-none absolute -inset-4 animate-pulse rounded-3xl bg-[rgb(var(--gold))]/10 opacity-40 blur-3xl" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h4 className="text-base font-semibold text-[rgb(var(--navy))]">{title}</h4>
      <p className="mt-2 text-sm text-black/60">{text}</p>
    </div>
  );
}

function Item({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-2 w-2 rounded-full bg-[rgb(var(--gold))]" />
      <span>{text}</span>
    </div>
  );
}
