import { ExternalLink } from "lucide-react";
import { normalizeAgencyWebstudioPayload } from "@/lib/agency-storefront-puck";
import type { AgencyStorefrontData } from "./storefront-data";

type StorefrontWebstudioContentProps = {
  data: AgencyStorefrontData;
};

export default function StorefrontWebstudioContent({ data }: StorefrontWebstudioContentProps) {
  const payload = normalizeAgencyWebstudioPayload(data.builderPayload);
  const publishedUrl = /^https?:\/\//i.test(payload.published_url) ? payload.published_url : "";

  if (!publishedUrl) {
    return (
      <article className="rounded-3xl border border-dashed border-black/15 bg-white/85 p-6 text-sm text-black/60">
        Aucun lien Webstudio publie n&apos;est configure.
      </article>
    );
  }

  if (!payload.embed) {
    return (
      <article className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-sm">
        <p className="text-sm text-black/65">
          Ce site vitrine est gere via Webstudio.
        </p>
        <a
          href={publishedUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold text-[rgb(var(--navy))] hover:bg-black/5"
        >
          <ExternalLink size={14} />
          Ouvrir le site Webstudio
        </a>
      </article>
    );
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
      <iframe
        src={publishedUrl}
        title={payload.site_name || `${data.agencyName} - Webstudio`}
        loading="lazy"
        className="h-[78vh] min-h-[560px] w-full border-0"
      />
    </article>
  );
}
