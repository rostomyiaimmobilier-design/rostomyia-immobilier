import Image from "next/image";
import Link from "next/link";
import type { HeroSectionContent } from "@/lib/site-builder/types";
import Reveal from "@/components/site-builder/public/Reveal";

export default function HeroSection({ content }: { content: HeroSectionContent }) {
  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
        <Reveal className="space-y-6">
          {content.badge ? (
            <span
              data-select-kind="slot"
              data-select-id="hero-badge"
              data-select-type="badge"
              data-select-path="hero.badge"
              data-slot="text"
              className="inline-flex rounded-full border border-amber-300 bg-amber-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-900"
            >
              {content.badge}
            </span>
          ) : null}
          <h1
            data-select-kind="slot"
            data-select-id="hero-headline"
            data-select-type="headline"
            data-select-path="hero.headline"
            data-slot="text"
            className="text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl"
          >
            {content.headline}
          </h1>
          <p
            data-select-kind="slot"
            data-select-id="hero-subheadline"
            data-select-type="subheadline"
            data-select-path="hero.subheadline"
            data-slot="text"
            className="max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg"
          >
            {content.subheadline}
          </p>
          {content.ctaLabel ? (
            <Link
              href={content.ctaHref || "/site/contact"}
              data-select-kind="component"
              data-select-id="hero-cta"
              data-select-type="button"
              data-select-path="cta"
              data-slot="container"
              className="inline-flex rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <span
                data-select-kind="slot"
                data-select-id="hero-cta-text"
                data-select-type="button-label"
                data-select-path="cta.text"
                data-slot="text"
              >
                {content.ctaLabel}
              </span>
            </Link>
          ) : null}
        </Reveal>

        <Reveal delay={0.1}>
          <div
            data-select-kind="component"
            data-select-id="hero-image"
            data-select-type="hero-image"
            data-select-path="hero.image"
            data-slot="image"
            className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_30px_60px_-30px_rgba(15,23,42,0.45)]"
          >
            <Image
              src={content.imageUrl || "/images/hero-oran.jpg"}
              alt={content.imageAlt || "Hero image"}
              fill
              data-select-kind="slot"
              data-select-id="hero-image-src"
              data-select-type="image"
              data-select-path="hero.image.src"
              data-slot="image"
              className="object-cover"
              style={{ objectPosition: `${content.imageFocalX ?? 50}% ${content.imageFocalY ?? 50}%` }}
              sizes="(max-width: 1024px) 100vw, 52vw"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
