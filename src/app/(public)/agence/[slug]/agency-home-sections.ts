import type { SectionType } from "@prisma/client";
import type {
  ContactSectionContent,
  CtaSectionContent,
  FeaturesSectionContent,
  HeroSectionContent,
  ProjectsSectionContent,
  ServicesSectionContent,
  TestimonialsSectionContent,
} from "@/lib/site-builder/types";
import type { AgencyStorefrontData } from "./storefront-data";

export type AgencyHomeSection = {
  id: string;
  type: SectionType;
  content: unknown;
};

function firstNonEmpty(values: string[]) {
  return values.find((value) => String(value || "").trim()) || "";
}

export function buildAgencyHomeSections(data: AgencyStorefrontData): AgencyHomeSection[] {
  const sections: AgencyHomeSection[] = [];
  const defaultContactHref = `/agence/${data.slug}/contact`;
  const defaultMarketplaceHref = `/agence/${data.slug}/marketplace`;
  const nativeContent = data.nativeStudio.page_content;
  const nativeBlocks = data.nativeStudio.blocks;

  const heroContent: HeroSectionContent = {
    badge: data.agencyTagline || "Vitrine agence",
    headline: data.heroTitle || data.agencyName,
    subheadline:
      firstNonEmpty([data.heroSubtitle, data.agencyDescription, data.agencyTagline]) ||
      `${data.agencyName} - agence immobiliere premium.`,
    ctaLabel: data.ctaLabel || "Nous contacter",
    ctaHref: data.ctaHref || defaultContactHref,
    imageUrl: data.coverUrl || data.logoUrl || "/images/hero-oran.jpg",
    imageAlt: data.nativeStudio.hero_image_alt || data.agencyName,
    imageFocalX: data.nativeStudio.hero_image_focal_x,
    imageFocalY: data.nativeStudio.hero_image_focal_y,
  };
  sections.push({ id: `${data.slug}-hero`, type: "HERO", content: heroContent });

  const highlightItems = data.highlights.slice(0, 6).map((item, index) => ({
    title: item,
    description: item,
    icon: ["sparkles", "target", "gem", "trending-up", "shield", "star"][index] || "sparkles",
  }));
  const fallbackFeatureItems = [
    data.serviceAreas ? { title: "Zones couvertes", description: data.serviceAreas, icon: "map" } : null,
    data.languagesSpoken
      ? { title: "Langues", description: data.languagesSpoken, icon: "languages" }
      : null,
    data.businessHours
      ? { title: "Horaires", description: data.businessHours, icon: "clock" }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (data.showHighlightsSection || data.agencyDescription) {
    const featuresContent: FeaturesSectionContent = {
      headline: firstNonEmpty([nativeContent.about.title, data.aboutTitle, "A propos"]),
      intro: firstNonEmpty([nativeContent.about.intro, data.agencyDescription, data.agencyTagline]),
      items: highlightItems.length > 0 ? highlightItems : fallbackFeatureItems,
    };
    if (featuresContent.items.length > 0 || featuresContent.intro) {
      sections.push({ id: `${data.slug}-features`, type: "FEATURES", content: featuresContent });
    }
  }

  if (data.showServicesSection) {
    const servicesContent: ServicesSectionContent = {
      headline: firstNonEmpty([nativeContent.services.title, "Services"]),
      intro: firstNonEmpty([
        nativeContent.services.intro,
        data.agencyTagline,
        "Nos expertises pour vos projets immobiliers.",
      ]),
      services:
        data.services.length > 0
          ? data.services
          : ["Vente immobiliere", "Location immobiliere", "Accompagnement investisseur"],
    };
    sections.push({ id: `${data.slug}-services`, type: "SERVICES", content: servicesContent });
  }

  if (data.showMarketplaceSection) {
    const nativeGalleryItems = nativeBlocks
      .filter((block) => block.section === "marketplace")
      .map((block, index) => ({
        title: block.title || `Bien ${index + 1}`,
        category: block.type === "cta" ? "CTA" : "Selection",
        description: block.body || "",
        imageUrl: block.image_url || data.coverUrl || "/images/agencies_section.png",
        imageAlt: block.image_alt || block.title || "Bien immobilier",
        href: block.cta_href || defaultMarketplaceHref,
      }));
    const projectsContent: ProjectsSectionContent = {
      headline: firstNonEmpty([nativeContent.marketplace.title, data.marketplaceTitle, "Marketplace"]),
      intro: firstNonEmpty([
        nativeContent.marketplace.intro,
        `Decouvrez ${Math.max(nativeGalleryItems.length, data.marketplace.length)} bien(s) disponible(s).`,
      ]),
      items:
        nativeGalleryItems.length > 0
          ? nativeGalleryItems
          : data.marketplace.length > 0
          ? data.marketplace.slice(0, 8).map((item) => ({
              title: item.title || "Bien immobilier",
              category: item.transaction || "Immobilier",
              description: [item.location, item.price].filter(Boolean).join(" - "),
              imageUrl: item.imageUrl || data.coverUrl || "/images/agencies_section.png",
              imageAlt: item.title || "Bien immobilier",
              href: item.ref ? `/biens?ref=${encodeURIComponent(item.ref)}` : defaultMarketplaceHref,
            }))
          : [
              {
                title: "Catalogue en cours de mise a jour",
                category: "Marketplace",
                description: "Contactez l'agence pour recevoir les derniers biens disponibles.",
                imageUrl: data.coverUrl || "/images/agencies_section.png",
                imageAlt: data.agencyName,
                href: defaultMarketplaceHref,
              },
            ],
    };
    sections.push({ id: `${data.slug}-projects`, type: "PROJECTS", content: projectsContent });
  }

  if (data.highlights.length > 0) {
    const testimonialsContent: TestimonialsSectionContent = {
      headline: "Points forts",
      intro: "Les engagements qui definissent notre agence.",
      items: data.highlights.slice(0, 3).map((item, index) => ({
        name: `Engagement ${index + 1}`,
        role: data.agencyName,
        quote: item,
        avatarUrl: data.logoUrl || "/images/logo_rostomyia.PNG",
      })),
    };
    sections.push({
      id: `${data.slug}-testimonials`,
      type: "TESTIMONIALS",
      content: testimonialsContent,
    });
  }

  const ctaContent: CtaSectionContent = {
    headline: data.heroTitle || `Parlons de votre projet immobilier`,
    subheadline:
      firstNonEmpty([data.heroSubtitle, data.agencyTagline]) ||
      "Nous vous accompagnons de la prospection a la signature.",
    buttonLabel: data.ctaLabel || "Nous contacter",
    buttonHref: data.ctaHref || defaultContactHref,
  };
  sections.push({ id: `${data.slug}-cta`, type: "CTA", content: ctaContent });

  if (data.showContactSection) {
    const contactContent: ContactSectionContent = {
      headline: firstNonEmpty([nativeContent.contact.title, "Contact"]),
      intro: firstNonEmpty([nativeContent.contact.intro, "Recevez une reponse rapide de notre equipe."]),
      email: data.contactEmail,
      phone: data.contactPhone || data.agencyWhatsapp,
      address: firstNonEmpty([data.agencyAddress, data.agencyCity]),
      submitLabel: "Envoyer",
    };
    sections.push({ id: `${data.slug}-contact`, type: "CONTACT", content: contactContent });
  }

  return sections;
}
