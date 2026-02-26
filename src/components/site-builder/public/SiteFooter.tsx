import type { SiteSettings } from "@prisma/client";
import PremiumFooter from "@/components/site-builder/public/PremiumFooter";
import { getFooterColumns, getSocialLinks } from "@/lib/site-builder/queries";

export default function SiteFooter({ settings }: { settings: SiteSettings | null }) {
  const columns = getFooterColumns(settings);
  const socials = getSocialLinks(settings);

  return (
    <PremiumFooter
      brandName={settings?.brandName || "Atelier Prime"}
      logoUrl={settings?.logoUrl}
      description="Premium websites and digital experiences with a visual CMS builder that keeps your team fast."
      columns={columns}
      socials={socials}
      copyrightText={settings?.copyrightText || "(c) Atelier Prime. All rights reserved."}
    />
  );
}
