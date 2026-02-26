import Link from "next/link";
import type { CtaSectionContent } from "@/lib/site-builder/types";
import Reveal from "@/components/site-builder/public/Reveal";

export default function CtaSection({ content }: { content: CtaSectionContent }) {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <Reveal className="mx-auto w-full max-w-7xl rounded-3xl bg-slate-900 p-10 text-white shadow-[0_24px_64px_-20px_rgba(2,6,23,0.55)]">
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div className="space-y-3">
            <h2
              data-select-kind="slot"
              data-select-id="cta-headline"
              data-select-type="headline"
              data-select-path="cta.headline"
              data-slot="text"
              className="text-3xl font-semibold leading-tight"
            >
              {content.headline}
            </h2>
            {content.subheadline ? (
              <p
                data-select-kind="slot"
                data-select-id="cta-subheadline"
                data-select-type="subheadline"
                data-select-path="cta.subheadline"
                data-slot="text"
                className="max-w-2xl text-slate-300"
              >
                {content.subheadline}
              </p>
            ) : null}
          </div>
          <Link
            href={content.buttonHref || "/site/contact"}
            data-select-kind="component"
            data-select-id="cta-button"
            data-select-type="button"
            data-select-path="cta"
            data-slot="container"
            className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            <span
              data-select-kind="slot"
              data-select-id="cta-button-text"
              data-select-type="button-label"
              data-select-path="cta.text"
              data-slot="text"
            >
              {content.buttonLabel || "Contact us"}
            </span>
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
