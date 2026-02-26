import { nativeCardClass, nativeCtaClass } from "./native-studio";
import type { AgencyStorefrontData } from "./storefront-data";
import type { AgencyNativeStudioSection } from "@/lib/agency-storefront-puck";

type NativeStudioBlocksProps = {
  data: AgencyStorefrontData;
  section: AgencyNativeStudioSection;
  className?: string;
};

function toLineItems(value: string, maxItems = 8) {
  return String(value ?? "")
    .split(/\r?\n/g)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

export default function NativeStudioBlocks({ data, section, className = "" }: NativeStudioBlocksProps) {
  const blocks = data.nativeStudio.blocks.filter((block) => block.section === section);
  if (blocks.length === 0) return null;

  const cardClass = nativeCardClass(data.nativeStudio);
  const ctaClass = nativeCtaClass(data.nativeStudio);

  return (
    <div className={`mt-4 space-y-3 ${className}`.trim()}>
      {blocks.map((block) => (
        <article key={block.id} className={cardClass}>
          {block.image_url ? (
            <div className="mb-3 overflow-hidden rounded-xl border border-black/10 bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={block.image_url}
                alt={block.image_alt || block.title || "Bloc"}
                className="h-40 w-full object-cover"
              />
            </div>
          ) : null}
          {block.title ? (
            <h3 className="text-base font-bold" style={{ color: data.brandPrimaryColor }}>
              {block.title}
            </h3>
          ) : null}

          {block.type === "list" ? (
            <ul className="mt-2 space-y-1.5 text-sm text-black/75">
              {toLineItems(block.body).map((item) => (
                <li key={`${block.id}-${item}`} className="flex items-start gap-2">
                  <span
                    className="mt-1 inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: data.brandAccentColor }}
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : block.body ? (
            <p className="mt-2 whitespace-pre-line text-sm text-black/75">{block.body}</p>
          ) : null}

          {block.type === "cta" && block.cta_label && block.cta_href ? (
            <a
              href={block.cta_href}
              target={block.cta_href.startsWith("http") ? "_blank" : undefined}
              rel={block.cta_href.startsWith("http") ? "noreferrer" : undefined}
              className={`mt-3 inline-flex h-10 items-center rounded-xl px-3.5 text-sm font-semibold ${ctaClass}`}
              style={
                data.nativeStudio.cta_style === "outline"
                  ? { borderColor: data.brandPrimaryColor, color: data.brandPrimaryColor }
                  : { backgroundColor: data.brandPrimaryColor }
              }
            >
              {block.cta_label}
            </a>
          ) : null}
        </article>
      ))}
    </div>
  );
}
