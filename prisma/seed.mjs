import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultSiteSettings = {
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

function sectionDefaults(type) {
  if (type === "HERO") {
    return {
      badge: "Premium digital studio",
      headline: "Crafting premium web experiences that convert.",
      subheadline: "We design, build and scale digital products for modern brands.",
      ctaLabel: "Book a strategy call",
      ctaHref: "/site/contact",
      imageUrl: "/images/hero-oran.jpg",
      imageAlt: "Premium hero visual",
    };
  }

  if (type === "FEATURES") {
    return {
      headline: "Why brands choose us",
      intro: "A process focused on speed, quality and measurable outcomes.",
      items: [
        { title: "Strategy-first", description: "Data-informed decisions before pixels.", icon: "target" },
        { title: "Premium execution", description: "High-end UI with flawless interactions.", icon: "gem" },
        { title: "Growth-oriented", description: "Built for conversion and long-term scale.", icon: "trending-up" },
      ],
    };
  }

  if (type === "SERVICES") {
    return {
      headline: "Services",
      intro: "Flexible collaboration from sprint to full product partnership.",
      services: ["Brand strategy", "Website design", "Full-stack development", "Conversion optimization"],
    };
  }

  if (type === "PROJECTS") {
    return {
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
    };
  }

  if (type === "TESTIMONIALS") {
    return {
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
    };
  }

  if (type === "CTA") {
    return {
      headline: "Ready to elevate your digital presence?",
      subheadline: "Let us build a premium website tailored to your goals.",
      buttonLabel: "Start your project",
      buttonHref: "/site/contact",
    };
  }

  return {
    headline: "Let us talk",
    intro: "Share your goals and we will get back within 24 hours.",
    email: "hello@atelierprime.com",
    phone: "+213 000 00 00 00",
    address: "Oran, Algeria",
    submitLabel: "Send request",
  };
}

const defaultPages = [
  {
    slug: "home",
    title: "Home",
    seoTitle: "Atelier Prime - Premium Digital Agency",
    seoDesc: "Premium agency template powered by a visual CMS builder.",
    isPublished: true,
    order: 0,
    sections: ["HERO", "FEATURES", "SERVICES", "PROJECTS", "TESTIMONIALS", "CTA", "CONTACT"],
  },
  {
    slug: "about",
    title: "About",
    seoTitle: "About - Atelier Prime",
    seoDesc: "Learn more about our team and methodology.",
    isPublished: true,
    order: 1,
    sections: ["HERO", "FEATURES", "CTA"],
  },
  {
    slug: "services",
    title: "Services",
    seoTitle: "Services - Atelier Prime",
    seoDesc: "Discover our high-end digital services.",
    isPublished: true,
    order: 2,
    sections: ["HERO", "SERVICES", "CTA"],
  },
  {
    slug: "projects",
    title: "Projects",
    seoTitle: "Projects - Atelier Prime",
    seoDesc: "Explore selected premium website projects.",
    isPublished: true,
    order: 3,
    sections: ["HERO", "PROJECTS", "TESTIMONIALS", "CTA"],
  },
  {
    slug: "contact",
    title: "Contact",
    seoTitle: "Contact - Atelier Prime",
    seoDesc: "Get in touch with our team.",
    isPublished: true,
    order: 4,
    sections: ["HERO", "CONTACT", "CTA"],
  },
];

function pageHref(slug) {
  return slug === "home" ? "/site" : `/site/${slug}`;
}

async function main() {
  await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: {},
    create: defaultSiteSettings,
  });

  for (const pageConfig of defaultPages) {
    const page = await prisma.page.upsert({
      where: { slug: pageConfig.slug },
      update: {
        title: pageConfig.title,
        seoTitle: pageConfig.seoTitle,
        seoDesc: pageConfig.seoDesc,
        isPublished: pageConfig.isPublished,
        order: pageConfig.order,
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

    const existingSections = await prisma.section.findMany({
      where: { pageId: page.id },
      orderBy: { order: "asc" },
    });

    if (existingSections.length === 0) {
      await prisma.section.createMany({
        data: pageConfig.sections.map((type, index) => ({
          pageId: page.id,
          type,
          order: index,
          isHidden: false,
          content: sectionDefaults(type),
        })),
      });
    }

    await prisma.navItem.upsert({
      where: { pageId: page.id },
      update: {
        label: page.title,
        href: pageHref(page.slug),
        order: page.order,
      },
      create: {
        label: page.title,
        href: pageHref(page.slug),
        order: page.order,
        pageId: page.id,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
