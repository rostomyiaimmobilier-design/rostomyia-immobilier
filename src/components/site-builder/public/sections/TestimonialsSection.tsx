import Image from "next/image";
import type { TestimonialsSectionContent } from "@/lib/site-builder/types";
import Reveal from "@/components/site-builder/public/Reveal";

export default function TestimonialsSection({ content }: { content: TestimonialsSectionContent }) {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-10">
        <Reveal className="space-y-4 text-center">
          <h2
            data-select-kind="slot"
            data-select-id="testimonials-headline"
            data-select-type="headline"
            data-select-path="testimonials.title"
            data-slot="text"
            className="text-3xl font-semibold text-slate-900 sm:text-4xl"
          >
            {content.headline}
          </h2>
          {content.intro ? (
            <p
              data-select-kind="slot"
              data-select-id="testimonials-intro"
              data-select-type="intro"
              data-select-path="testimonials.intro"
              data-slot="text"
              className="mx-auto max-w-2xl text-slate-600"
            >
              {content.intro}
            </p>
          ) : null}
        </Reveal>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {content.items.map((item, index) => (
            <Reveal key={`${item.name}-${index}`} delay={index * 0.05}>
              <blockquote
                data-select-kind="component"
                data-select-id={`highlight-item-${index}`}
                data-select-type="highlight-card"
                data-select-path={`highlightsItems.${index}`}
                data-slot="container"
                className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <p
                  data-select-kind="slot"
                  data-select-id={`highlight-item-${index}-quote`}
                  data-select-type="quote"
                  data-select-path={`highlightsItems.${index}.label`}
                  data-slot="text"
                  className="text-sm leading-relaxed text-slate-700"
                >
                  “{item.quote}”
                </p>
                <footer className="mt-6 flex items-center gap-3">
                  <div className="relative h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                    <Image
                      src={item.avatarUrl || "/images/logo_rostomyia.PNG"}
                      alt={item.name}
                      fill
                      data-select-kind="slot"
                      data-select-id={`highlight-item-${index}-avatar`}
                      data-select-type="avatar"
                      data-select-path={`highlightsItems.${index}.image`}
                      data-slot="image"
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                  <div>
                    <p
                      data-select-kind="slot"
                      data-select-id={`highlight-item-${index}-name`}
                      data-select-type="name"
                      data-select-path={`highlightsItems.${index}.name`}
                      data-slot="text"
                      className="text-sm font-semibold text-slate-900"
                    >
                      {item.name}
                    </p>
                    <p
                      data-select-kind="slot"
                      data-select-id={`highlight-item-${index}-role`}
                      data-select-type="role"
                      data-select-path={`highlightsItems.${index}.role`}
                      data-slot="text"
                      className="text-xs text-slate-500"
                    >
                      {item.role}
                    </p>
                  </div>
                </footer>
              </blockquote>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
