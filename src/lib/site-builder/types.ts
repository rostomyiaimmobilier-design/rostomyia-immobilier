import { type SectionType } from "@prisma/client";
import { z } from "zod";

const featureItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().optional().default("sparkles"),
});

const projectItemSchema = z.object({
  title: z.string().min(1),
  category: z.string().optional().default("Project"),
  description: z.string().optional().default(""),
  imageUrl: z.string().optional().default("/images/agencies_section.png"),
  imageAlt: z.string().optional().default("Project image"),
  imageId: z.string().optional(),
  href: z.string().optional().default("#"),
});

const testimonialItemSchema = z.object({
  name: z.string().min(1),
  role: z.string().optional().default("Client"),
  quote: z.string().min(1),
  avatarUrl: z.string().optional().default("/images/logo_rostomyia.PNG"),
});

export const heroSectionSchema = z.object({
  badge: z.string().optional().default("Premium Agency"),
  headline: z.string().min(1),
  subheadline: z.string().min(1),
  ctaLabel: z.string().optional().default("Get Started"),
  ctaHref: z.string().optional().default("/site/contact"),
  imageUrl: z.string().optional().default("/images/hero-oran.jpg"),
  imageAlt: z.string().optional().default("Hero image"),
  imageId: z.string().optional(),
  imageFocalX: z.number().min(0).max(100).optional().default(50),
  imageFocalY: z.number().min(0).max(100).optional().default(50),
});

export const featuresSectionSchema = z.object({
  headline: z.string().min(1),
  intro: z.string().optional().default(""),
  items: z.array(featureItemSchema).default([]),
});

export const servicesSectionSchema = z.object({
  headline: z.string().min(1),
  intro: z.string().optional().default(""),
  services: z.array(z.string().min(1)).default([]),
});

export const projectsSectionSchema = z.object({
  headline: z.string().min(1),
  intro: z.string().optional().default(""),
  items: z.array(projectItemSchema).default([]),
});

export const testimonialsSectionSchema = z.object({
  headline: z.string().min(1),
  intro: z.string().optional().default(""),
  items: z.array(testimonialItemSchema).default([]),
});

export const ctaSectionSchema = z.object({
  headline: z.string().min(1),
  subheadline: z.string().optional().default(""),
  buttonLabel: z.string().optional().default("Contact Us"),
  buttonHref: z.string().optional().default("/site/contact"),
});

export const contactSectionSchema = z.object({
  headline: z.string().min(1),
  intro: z.string().optional().default(""),
  email: z.string().optional().default("hello@example.com"),
  phone: z.string().optional().default("+213 000 00 00 00"),
  address: z.string().optional().default("Oran, Algeria"),
  submitLabel: z.string().optional().default("Send message"),
});

export type HeroSectionContent = z.infer<typeof heroSectionSchema>;
export type FeaturesSectionContent = z.infer<typeof featuresSectionSchema>;
export type ServicesSectionContent = z.infer<typeof servicesSectionSchema>;
export type ProjectsSectionContent = z.infer<typeof projectsSectionSchema>;
export type TestimonialsSectionContent = z.infer<typeof testimonialsSectionSchema>;
export type CtaSectionContent = z.infer<typeof ctaSectionSchema>;
export type ContactSectionContent = z.infer<typeof contactSectionSchema>;

export type SectionContentByType = {
  HERO: HeroSectionContent;
  FEATURES: FeaturesSectionContent;
  SERVICES: ServicesSectionContent;
  PROJECTS: ProjectsSectionContent;
  TESTIMONIALS: TestimonialsSectionContent;
  CTA: CtaSectionContent;
  CONTACT: ContactSectionContent;
};

export const SECTION_SCHEMAS: Record<SectionType, z.ZodTypeAny> = {
  HERO: heroSectionSchema,
  FEATURES: featuresSectionSchema,
  SERVICES: servicesSectionSchema,
  PROJECTS: projectsSectionSchema,
  TESTIMONIALS: testimonialsSectionSchema,
  CTA: ctaSectionSchema,
  CONTACT: contactSectionSchema,
};

export const SECTION_TYPE_OPTIONS: Array<{ type: SectionType; label: string }> = [
  { type: "HERO", label: "Hero" },
  { type: "FEATURES", label: "Features" },
  { type: "SERVICES", label: "Services" },
  { type: "PROJECTS", label: "Projects" },
  { type: "TESTIMONIALS", label: "Testimonials" },
  { type: "CTA", label: "CTA" },
  { type: "CONTACT", label: "Contact" },
];

export function parseSectionContent<T extends SectionType>(
  type: T,
  value: unknown,
  fallback: SectionContentByType[T]
): SectionContentByType[T] {
  const schema = SECTION_SCHEMAS[type];
  const parsed = schema.safeParse(value);
  if (parsed.success) {
    return parsed.data as SectionContentByType[T];
  }
  return fallback;
}

export function normalizeSectionContent(type: SectionType, value: unknown): unknown {
  const schema = SECTION_SCHEMAS[type];
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;
  return null;
}
