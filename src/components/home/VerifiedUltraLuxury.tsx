"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";

export default function VerifiedUltraLuxury() {
  const score = 9.4;

  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) =>
    latest.toFixed(1)
  );

  useEffect(() => {
    const controls = animate(motionValue, score, {
      duration: 2.2,
      ease: "easeOut",
    });
    return controls.stop;
  }, [motionValue]);

  return (
    <section className="relative mx-auto max-w-6xl px-6 py-28">

      {/* Ambient Gold Glow */}
      <div className="pointer-events-none absolute inset-0 flex justify-center">
        <div className="h-[420px] w-[420px] rounded-full bg-[rgb(var(--gold))]/20 blur-[120px] animate-pulse" />
      </div>

      <div className="grid items-center gap-20 md:grid-cols-2 relative">

        {/* LEFT CONTENT */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-5xl font-light tracking-wide text-[rgb(var(--navy))]">
            Rostomyia Verified™
          </h2>

          <p className="mt-6 text-lg text-black/60 leading-relaxed max-w-xl">
            Un standard privé combinant expertise humaine et intelligence artificielle.
            Chaque bien est validé selon un protocole exclusif avant publication.
          </p>

          <div className="mt-14 space-y-8">

            <Feature
              title="Dossier Juridique Certifié"
              text="Propriété validée, documents authentifiés, situation légale vérifiée."
            />

            <Feature
              title="Analyse IA Prédictive"
              text="Comparaison marché en temps réel et détection d’anomalies."
            />

            <Feature
              title="AI Trust Score"
              text="42 points de contrôle internes pour mesurer la fiabilité."
            />

            <Feature
              title="Publication Restreinte"
              text="Moins de 38% des biens obtiennent le label Verified™."
            />

          </div>

          <button className="mt-16 inline-flex items-center gap-3 rounded-full bg-[rgb(var(--navy))] px-10 py-4 text-white text-sm tracking-wider shadow-2xl transition hover:opacity-90">
            Voir les biens 100% vérifiés
          </button>
        </motion.div>

        {/* RIGHT CARD */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
          whileHover={{ rotateX: 3, rotateY: -3 }}
          className="relative perspective-1000"
        >
          <div className="relative rounded-3xl border border-white/20 bg-white/60 backdrop-blur-2xl p-12 shadow-[0_50px_150px_rgba(0,0,0,0.1)] transition-all duration-500">

            {/* Gold shimmer border */}
            <div className="absolute inset-0 rounded-3xl border border-[rgb(var(--gold))]/30 pointer-events-none" />

            <div className="text-xs tracking-widest uppercase text-black/50">
              Rostomyia Verified™
            </div>

            <div className="mt-10">
              <div className="text-xs text-black/40">AI Trust Score</div>

              <div className="mt-2 text-6xl font-light text-[rgb(var(--navy))]">
  <motion.span>{rounded}</motion.span>
  <span className="text-2xl text-black/40"> / 10</span>
</div>
            </div>

            <div className="mt-10 space-y-4 text-sm text-black/70">
              <Item text="Documents validés" />
              <Item text="Prix conforme marché" />
              <Item text="Analyse IA effectuée" />
              <Item text="Dossier complet" />
            </div>

            <div className="mt-12 border-t border-black/10 pt-4 text-xs text-black/50">
              Statut : Certifié
            </div>

            {/* Subtle Gold Glow Pulse */}
            <div className="absolute -inset-4 rounded-3xl bg-[rgb(var(--gold))]/10 blur-3xl opacity-40 animate-pulse pointer-events-none" />

          </div>
        </motion.div>

      </div>
    </section>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h4 className="text-base font-semibold text-[rgb(var(--navy))]">
        {title}
      </h4>
      <p className="mt-2 text-sm text-black/60">
        {text}
      </p>
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
