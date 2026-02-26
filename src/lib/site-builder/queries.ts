import { type Page, type Prisma, type Section, type SiteSettings, type NavItem } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureDefaults, defaultSectionContent } from "@/lib/site-builder/defaults";
import { parseSectionContent, type SectionContentByType } from "@/lib/site-builder/types";

export type PageWithSections = Page & { sections: Section[] };

export async function getSiteShellData() {
  await ensureDefaults();

  const [siteSettings, navItems] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "default" } }),
    prisma.navItem.findMany({ where: { isHidden: false }, orderBy: { order: "asc" } }),
  ]);

  return {
    siteSettings,
    navItems,
  };
}

export async function getPublishedPageBySlug(slug: string) {
  await ensureDefaults();

  return prisma.page.findFirst({
    where: {
      slug,
      isPublished: true,
    },
    include: {
      sections: {
        where: { isHidden: false },
        orderBy: { order: "asc" },
      },
    },
  });
}

export async function getPageBySlugForAdmin(slug: string) {
  await ensureDefaults();

  return prisma.page.findUnique({
    where: { slug },
    include: {
      sections: {
        orderBy: { order: "asc" },
      },
    },
  });
}

export async function getPageByIdForAdmin(id: string) {
  await ensureDefaults();

  return prisma.page.findUnique({
    where: { id },
    include: {
      sections: {
        orderBy: { order: "asc" },
      },
    },
  });
}

export async function getAllPagesForAdmin() {
  await ensureDefaults();

  return prisma.page.findMany({
    orderBy: { order: "asc" },
    include: {
      sections: {
        orderBy: { order: "asc" },
      },
      navItem: true,
    },
  });
}

export async function getAllMediaForAdmin() {
  return prisma.media.findMany({ orderBy: { createdAt: "desc" } });
}

export type ParsedSection = Section & {
  parsedContent: SectionContentByType[Section["type"]];
};

export function parseSection(section: Section): ParsedSection {
  const fallback = defaultSectionContent(section.type);
  const parsedContent = parseSectionContent(section.type, section.content, fallback as never);

  return {
    ...section,
    parsedContent,
  };
}

export function safeJson<T>(value: Prisma.JsonValue | null, fallback: T): T {
  if (!value) return fallback;
  return value as T;
}

export type FooterColumn = {
  title: string;
  links: Array<{ label: string; href: string }>;
};

export type SocialLink = {
  label: string;
  href: string;
};

export function getFooterColumns(settings: SiteSettings | null): FooterColumn[] {
  const columns = settings?.footerColumns as FooterColumn[] | null | undefined;
  if (!Array.isArray(columns)) return [];
  return columns;
}

export function getSocialLinks(settings: SiteSettings | null): SocialLink[] {
  const socials = settings?.socials as SocialLink[] | null | undefined;
  if (!Array.isArray(socials)) return [];
  return socials;
}

export function pageHrefFromNav(navItem: NavItem) {
  return navItem.href || "/site";
}
