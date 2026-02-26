import type { AgencyStorefrontPage } from "@/lib/agency-storefront-puck";
import StorefrontPuckContent from "./StorefrontPuckContent";
import type { AgencyStorefrontData } from "./storefront-data";
import StorefrontWebstudioContent from "./StorefrontWebstudioContent";

type StorefrontBuilderContentProps = {
  data: AgencyStorefrontData;
  page: AgencyStorefrontPage;
  emptyMessage?: string;
};

export default function StorefrontBuilderContent({
  data,
  page,
  emptyMessage,
}: StorefrontBuilderContentProps) {
  if (data.builderType === "puck") {
    return <StorefrontPuckContent data={data} page={page} emptyMessage={emptyMessage} />;
  }

  if (data.builderType === "webstudio") {
    return <StorefrontWebstudioContent data={data} />;
  }

  return null;
}
