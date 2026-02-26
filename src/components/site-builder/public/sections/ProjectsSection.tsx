import Image from "next/image";
import Link from "next/link";
import type { ProjectsSectionContent } from "@/lib/site-builder/types";
import Reveal from "@/components/site-builder/public/Reveal";

export default function ProjectsSection({ content }: { content: ProjectsSectionContent }) {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-10">
        <Reveal className="space-y-4">
          <h2
            data-select-kind="slot"
            data-select-id="marketplace-headline"
            data-select-type="headline"
            data-select-path="marketplace.title"
            data-slot="text"
            className="text-3xl font-semibold text-slate-900 sm:text-4xl"
          >
            {content.headline}
          </h2>
          {content.intro ? (
            <p
              data-select-kind="slot"
              data-select-id="marketplace-intro"
              data-select-type="intro"
              data-select-path="marketplace.intro"
              data-slot="text"
              className="max-w-2xl text-slate-600"
            >
              {content.intro}
            </p>
          ) : null}
        </Reveal>

        <div className="grid gap-6 md:grid-cols-2">
          {content.items.map((item, index) => (
            <Reveal key={`${item.title}-${index}`} delay={index * 0.06}>
              <article
                data-select-kind="component"
                data-select-id={`gallery-item-${index}`}
                data-select-type="gallery-item"
                data-select-path={`galleryItems.${index}`}
                data-slot="container"
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div
                  data-select-kind="slot"
                  data-select-id={`gallery-item-${index}-image`}
                  data-select-type="image"
                  data-select-path={`galleryItems.${index}.image`}
                  data-slot="image"
                  className="relative aspect-[16/10]"
                >
                  <Image
                    src={item.imageUrl || "/images/agencies_section.png"}
                    alt={item.imageAlt || item.title}
                    fill
                    data-select-kind="slot"
                    data-select-id={`gallery-item-${index}-image-src`}
                    data-select-type="image-src"
                    data-select-path={`galleryItems.${index}.image_url`}
                    data-slot="image"
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
                <div className="space-y-3 p-6">
                  <span
                    data-select-kind="slot"
                    data-select-id={`gallery-item-${index}-category`}
                    data-select-type="category"
                    data-select-path={`galleryItems.${index}.category`}
                    data-slot="text"
                    className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600"
                  >
                    {item.category || "Project"}
                  </span>
                  <h3
                    data-select-kind="slot"
                    data-select-id={`gallery-item-${index}-title`}
                    data-select-type="title"
                    data-select-path={`galleryItems.${index}.title`}
                    data-slot="text"
                    className="text-xl font-semibold text-slate-900"
                  >
                    {item.title}
                  </h3>
                  {item.description ? (
                    <p
                      data-select-kind="slot"
                      data-select-id={`gallery-item-${index}-description`}
                      data-select-type="description"
                      data-select-path={`galleryItems.${index}.body`}
                      data-slot="text"
                      className="text-sm text-slate-600"
                    >
                      {item.description}
                    </p>
                  ) : null}
                  {item.href ? (
                    <Link
                      href={item.href}
                      data-select-kind="slot"
                      data-select-id={`gallery-item-${index}-link`}
                      data-select-type="button"
                      data-select-path={`galleryItems.${index}.cta_href`}
                      data-slot="link"
                      className="inline-flex text-sm font-semibold text-slate-900 hover:underline"
                    >
                      View project
                    </Link>
                  ) : null}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
