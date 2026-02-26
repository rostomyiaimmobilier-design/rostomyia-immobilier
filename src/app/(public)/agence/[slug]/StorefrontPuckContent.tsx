import { Render as PuckRender } from "@puckeditor/core/rsc";
import {
  agencyStorefrontPuckConfig,
  filterAgencyPuckDataByPage,
  normalizeAgencyPuckData,
  type AgencyStorefrontPage,
} from "@/lib/agency-storefront-puck";
import type { AgencyStorefrontData } from "./storefront-data";

type StorefrontPuckContentProps = {
  data: AgencyStorefrontData;
  page: AgencyStorefrontPage;
  emptyMessage?: string;
};

export default function StorefrontPuckContent({
  data,
  page,
  emptyMessage = "Aucun bloc visuel n'est configure pour cette page.",
}: StorefrontPuckContentProps) {
  const normalized = normalizeAgencyPuckData(data.builderPayload);
  if (!normalized) return null;

  const scoped = filterAgencyPuckDataByPage(normalized, page);
  const hasBlocks = Array.isArray(scoped.content) && scoped.content.length > 0;

  if (!hasBlocks) {
    return (
      <article className="rounded-3xl border border-dashed border-black/15 bg-white/85 p-6 text-sm text-black/60">
        {emptyMessage}
      </article>
    );
  }

  return (
    <article className="space-y-5 rounded-3xl border border-black/10 bg-white/80 p-4 shadow-sm md:p-6">
      <PuckRender config={agencyStorefrontPuckConfig} data={scoped} />
    </article>
  );
}
