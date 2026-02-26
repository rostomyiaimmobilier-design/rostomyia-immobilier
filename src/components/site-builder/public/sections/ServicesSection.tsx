import type { ServicesSectionContent } from "@/lib/site-builder/types";
import Reveal from "@/components/site-builder/public/Reveal";

export default function ServicesSection({ content }: { content: ServicesSectionContent }) {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-10 rounded-3xl border border-slate-200 bg-white p-8 lg:grid-cols-[1fr_1.2fr] lg:p-10">
        <Reveal className="space-y-4">
          <h2
            data-select-kind="slot"
            data-select-id="services-headline"
            data-select-type="headline"
            data-select-path="services.title"
            data-slot="text"
            className="text-3xl font-semibold text-slate-900"
          >
            {content.headline}
          </h2>
          {content.intro ? (
            <p
              data-select-kind="slot"
              data-select-id="services-intro"
              data-select-type="intro"
              data-select-path="services.intro"
              data-slot="text"
              className="text-slate-600"
            >
              {content.intro}
            </p>
          ) : null}
        </Reveal>
        <div className="grid gap-3 sm:grid-cols-2">
          {content.services.map((service, index) => (
            <Reveal key={`${service}-${index}`} delay={index * 0.05}>
              <div
                data-select-kind="component"
                data-select-id={`services-item-${index}`}
                data-select-type="service-card"
                data-select-path={`servicesItems.${index}`}
                data-slot="container"
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-800"
              >
                <span
                  data-select-kind="slot"
                  data-select-id={`services-item-${index}-text`}
                  data-select-type="label"
                  data-select-path={`servicesItems.${index}.label`}
                  data-slot="text"
                >
                  {service}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
