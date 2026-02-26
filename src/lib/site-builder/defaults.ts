import { type Prisma, type SectionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SectionContentByType } from "@/lib/site-builder/types";

export const DEFAULT_SITE_SETTINGS: Prisma.SiteSettingsCreateInput = {
  id: "default",
  brandName: "Atelier Prime",
  primaryColor: "#0f172a",
  secondaryColor: "#f8fafc",
  accentColor: "#d4af37",
  headingFont: "Cormorant Garamond",
  bodyFont: "Manrope",
  socials: [
    { label: "Instagram", href: "https://instagram.com" },
    { label: "LinkedIn", href: "https://linkedin.com" },
    { label: "Behance", href: "https://behance.net" },
  ],
  footerColumns: [
    {
      title: "Studio",
      links: [
        { label: "About", href: "/site/about" },
        { label: "Services", href: "/site/services" },
        { label: "Projects", href: "/site/projects" },
      ],
    },
    {
      title: "Support",
      links: [
        { label: "Contact", href: "/site/contact" },
        { label: "Privacy", href: "#" },
        { label: "Terms", href: "#" },
      ],
    },
  ],
  copyrightText: "© Atelier Prime. All rights reserved.",
};

const BASE_SECTION_DEFAULTS: { [K in SectionType]: SectionContentByType[K] } = {
  HERO: {
    badge: "Premium digital studio",
    headline: "Crafting premium web experiences that convert.",
    subheadline: "We design, build and scale digital products for modern brands.",
    ctaLabel: "Book a strategy call",
    ctaHref: "/site/contact",
    imageUrl: "/images/hero-oran.jpg",
    imageAlt: "Premium hero visual",
    imageFocalX: 50,
    imageFocalY: 50,
  },
  FEATURES: {
    headline: "Why brands choose us",
    intro: "A process focused on speed, quality and measurable outcomes.",
    items: [
      { title: "Strategy-first", description: "Data-informed decisions before pixels.", icon: "target" },
      { title: "Premium execution", description: "High-end UI with flawless interactions.", icon: "gem" },
      { title: "Growth-oriented", description: "Built for conversion and long-term scale.", icon: "trending-up" },
    ],
  },
  SERVICES: {
    headline: "Services",
    intro: "Flexible collaboration from sprint to full product partnership.",
    services: ["Brand strategy", "Website design", "Full-stack development", "Conversion optimization"],
  },
  PROJECTS: {
    headline: "Featured projects",
    intro: "Selected launches for agencies, startups and premium brands.",
    items: [
      {
        title: "Nova Atelier",
        category: "Luxury Ecommerce",
        description: "A refined commerce experience with premium storytelling.",
        imageUrl: "/images/agencies_section.png",
        imageAlt: "Project visual",
        href: "#",
      },
      {
        title: "Atria Partners",
        category: "Corporate Website",
        description: "Corporate positioning website focused on trust and lead generation.",
        imageUrl: "/images/agencies_section.png",
        imageAlt: "Project visual",
        href: "#",
      },
    ],
  },
  TESTIMONIALS: {
    headline: "What clients say",
    intro: "Long-term partnerships built on trust and outcomes.",
    items: [
      {
        name: "Sarah M.",
        role: "Marketing Director",
        quote: "They transformed our website into a premium sales machine.",
        avatarUrl: "/images/logo_rostomyia.PNG",
      },
      {
        name: "Karim B.",
        role: "Founder",
        quote: "Clean process, fast execution, and outstanding design quality.",
        avatarUrl: "/images/logo_rostomyia.PNG",
      },
    ],
  },
  CTA: {
    headline: "Ready to elevate your digital presence?",
    subheadline: "Let us build a premium website tailored to your goals.",
    buttonLabel: "Start your project",
    buttonHref: "/site/contact",
  },
  CONTACT: {
    headline: "Let us talk",
    intro: "Share your goals and we will get back within 24 hours.",
    email: "hello@atelierprime.com",
    phone: "+213 000 00 00 00",
    address: "Oran, Algeria",
    submitLabel: "Send request",
  },
};

export function defaultSectionContent<T extends SectionType>(type: T): SectionContentByType[T] {
  return BASE_SECTION_DEFAULTS[type] as SectionContentByType[T];
}

type DefaultSectionConfig = {
  type: SectionType;
  content: Prisma.InputJsonValue;
};

type DefaultPageConfig = {
  slug: string;
  title: string;
  seoTitle: string;
  seoDesc: string;
  order: number;
  isPublished: boolean;
  sections: DefaultSectionConfig[];
};

function jsonContent<T extends SectionType>(type: T): Prisma.InputJsonValue {
  return defaultSectionContent(type) as unknown as Prisma.InputJsonValue;
}

export const DEFAULT_PAGES: DefaultPageConfig[] = [
  {
    slug: "home",
    title: "Home",
    seoTitle: "Atelier Prime - Premium Digital Agency",
    seoDesc: "Premium agency template powered by a visual CMS builder.",
    order: 0,
    isPublished: true,
    sections: [
      { type: "HERO", content: jsonContent("HERO") },
      { type: "FEATURES", content: jsonContent("FEATURES") },
      { type: "SERVICES", content: jsonContent("SERVICES") },
      { type: "PROJECTS", content: jsonContent("PROJECTS") },
      { type: "TESTIMONIALS", content: jsonContent("TESTIMONIALS") },
      { type: "CTA", content: jsonContent("CTA") },
      { type: "CONTACT", content: jsonContent("CONTACT") },
    ],
  },
  {
    slug: "about",
    title: "About",
    seoTitle: "About - Atelier Prime",
    seoDesc: "Learn more about our team and methodology.",
    order: 1,
    isPublished: true,
    sections: [
      {
        type: "HERO",
        content: {
          ...(defaultSectionContent("HERO") as object),
          headline: "About our studio",
          ctaLabel: "See services",
          ctaHref: "/site/services",
        } as Prisma.InputJsonValue,
      },
      { type: "FEATURES", content: jsonContent("FEATURES") },
      { type: "CTA", content: jsonContent("CTA") },
    ],
  },
  {
    slug: "services",
    title: "Services",
    seoTitle: "Services - Atelier Prime",
    seoDesc: "Discover our high-end digital services.",
    order: 2,
    isPublished: true,
    sections: [
      {
        type: "HERO",
        content: {
          ...(defaultSectionContent("HERO") as object),
          headline: "Services built for growth",
        } as Prisma.InputJsonValue,
      },
      { type: "SERVICES", content: jsonContent("SERVICES") },
      { type: "CTA", content: jsonContent("CTA") },
    ],
  },
  {
    slug: "projects",
    title: "Projects",
    seoTitle: "Projects - Atelier Prime",
    seoDesc: "Explore selected premium website projects.",
    order: 3,
    isPublished: true,
    sections: [
      {
        type: "HERO",
        content: {
          ...(defaultSectionContent("HERO") as object),
          headline: "Selected projects",
        } as Prisma.InputJsonValue,
      },
      { type: "PROJECTS", content: jsonContent("PROJECTS") },
      { type: "TESTIMONIALS", content: jsonContent("TESTIMONIALS") },
      { type: "CTA", content: jsonContent("CTA") },
    ],
  },
  {
    slug: "contact",
    title: "Contact",
    seoTitle: "Contact - Atelier Prime",
    seoDesc: "Get in touch with our team.",
    order: 4,
    isPublished: true,
    sections: [
      {
        type: "HERO",
        content: {
          ...(defaultSectionContent("HERO") as object),
          headline: "Contact our team",
        } as Prisma.InputJsonValue,
      },
      { type: "CONTACT", content: jsonContent("CONTACT") },
      { type: "CTA", content: jsonContent("CTA") },
    ],
  },
];

function pageHrefFromSlug(slug: string) {
  return slug === "home" ? "/site" : `/site/${slug}`;
}

export async function ensureDefaults() {
  await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: {},
    create: DEFAULT_SITE_SETTINGS,
  });

  for (const pageConfig of DEFAULT_PAGES) {
    const page = await prisma.page.upsert({
      where: { slug: pageConfig.slug },
      update: {
        title: pageConfig.title,
        order: pageConfig.order,
        isPublished: pageConfig.isPublished,
        seoTitle: pageConfig.seoTitle,
        seoDesc: pageConfig.seoDesc,
      },
      create: {
        slug: pageConfig.slug,
        title: pageConfig.title,
        seoTitle: pageConfig.seoTitle,
        seoDesc: pageConfig.seoDesc,
        isPublished: pageConfig.isPublished,
        order: pageConfig.order,
      },
    });

    const sections = await prisma.section.findMany({
      where: { pageId: page.id },
      orderBy: { order: "asc" },
    });

    if (sections.length === 0) {
      await prisma.section.createMany({
        data: pageConfig.sections.map((sectionConfig, index) => ({
          pageId: page.id,
          type: sectionConfig.type,
          order: index,
          content: sectionConfig.content,
          isHidden: false,
        })),
      });
    } else {
      let maxOrder = sections[sections.length - 1]?.order ?? 0;
      for (const sectionConfig of pageConfig.sections) {
        const exists = sections.some((section) => section.type === sectionConfig.type);
        if (exists) continue;
        maxOrder += 1;
        await prisma.section.create({
          data: {
            pageId: page.id,
            type: sectionConfig.type,
            order: maxOrder,
            content: sectionConfig.content,
            isHidden: false,
          },
        });
      }
    }

    await prisma.navItem.upsert({
      where: { pageId: page.id },
      update: {
        label: page.title,
        href: pageHrefFromSlug(page.slug),
        order: page.order,
      },
      create: {
        label: page.title,
        href: pageHrefFromSlug(page.slug),
        order: page.order,
        pageId: page.id,
      },
    });
  }

  const pages = await prisma.page.findMany({ orderBy: { order: "asc" } });
  for (const page of pages) {
    const nav = await prisma.navItem.findUnique({ where: { pageId: page.id } });
    if (nav) continue;

    await prisma.navItem.create({
      data: {
        label: page.title,
        href: pageHrefFromSlug(page.slug),
        order: page.order,
        pageId: page.id,
      },
    });
  }
}

export function getPageHref(slug: string) {
  return pageHrefFromSlug(slug);
}
