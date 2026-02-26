import type { FeaturesSectionContent } from "@/lib/site-builder/types";
import Reveal from "@/components/site-builder/public/Reveal";

export default function FeaturesSection({ content }: { content: FeaturesSectionContent }) {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-10">
        <Reveal className="space-y-4 text-center">
          <h2
            data-select-kind="slot"
            data-select-id="about-headline"
            data-select-type="headline"
            data-select-path="about.title"
            data-slot="text"
            className="text-3xl font-semibold text-slate-900 sm:text-4xl"
          >
            {content.headline}
          </h2>
          {content.intro ? (
            <p
              data-select-kind="slot"
              data-select-id="about-intro"
              data-select-type="intro"
              data-select-path="about.intro"
              data-slot="text"
              className="mx-auto max-w-2xl text-slate-600"
            >
              {content.intro}
            </p>
          ) : null}
        </Reveal>

        <div className="grid gap-5 md:grid-cols-3">
          {content.items.map((item, index) => (
            <Reveal key={`${item.title}-${index}`} delay={index * 0.05}>
              <article
                data-select-kind="component"
                data-select-id={`highlight-item-${index}`}
                data-select-type="feature-card"
                data-select-path={`highlightsItems.${index}`}
                data-slot="container"
                className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <p
                  data-select-kind="slot"
                  data-select-id={`highlight-item-${index}-icon`}
                  data-select-type="icon"
                  data-select-path={`highlightsItems.${index}.icon`}
                  data-slot="text"
                  className="mb-4 inline-flex rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-white"
                >
                  {item.icon || "feature"}
                </p>
                <h3
                  data-select-kind="slot"
                  data-select-id={`highlight-item-${index}-title`}
                  data-select-type="title"
                  data-select-path={`highlightsItems.${index}.title`}
                  data-slot="text"
                  className="text-lg font-semibold text-slate-900"
                >
                  {item.title}
                </h3>
                <p
                  data-select-kind="slot"
                  data-select-id={`highlight-item-${index}-description`}
                  data-select-type="description"
                  data-select-path={`highlightsItems.${index}.label`}
                  data-slot="text"
                  className="mt-2 text-sm leading-relaxed text-slate-600"
                >
                  {item.description}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
