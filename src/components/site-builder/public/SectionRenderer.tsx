import type { Section } from "@prisma/client";
import { defaultSectionContent } from "@/lib/site-builder/defaults";
import { parseSectionContent } from "@/lib/site-builder/types";
import HeroSection from "@/components/site-builder/public/sections/HeroSection";
import FeaturesSection from "@/components/site-builder/public/sections/FeaturesSection";
import ServicesSection from "@/components/site-builder/public/sections/ServicesSection";
import ProjectsSection from "@/components/site-builder/public/sections/ProjectsSection";
import TestimonialsSection from "@/components/site-builder/public/sections/TestimonialsSection";
import CtaSection from "@/components/site-builder/public/sections/CtaSection";
import ContactSection from "@/components/site-builder/public/sections/ContactSection";

export default function SectionRenderer({
  sections,
  pageSlug,
}: {
  sections: Section[];
  pageSlug?: string;
}) {
  return (
    <>
      {sections.map((section) => {
        if (section.type === "HERO") {
          const content = parseSectionContent("HERO", section.content, defaultSectionContent("HERO"));
          return <HeroSection key={section.id} content={content} />;
        }

        if (section.type === "FEATURES") {
          const content = parseSectionContent("FEATURES", section.content, defaultSectionContent("FEATURES"));
          return <FeaturesSection key={section.id} content={content} />;
        }

        if (section.type === "SERVICES") {
          const content = parseSectionContent("SERVICES", section.content, defaultSectionContent("SERVICES"));
          return <ServicesSection key={section.id} content={content} />;
        }

        if (section.type === "PROJECTS") {
          const content = parseSectionContent("PROJECTS", section.content, defaultSectionContent("PROJECTS"));
          return <ProjectsSection key={section.id} content={content} />;
        }

        if (section.type === "TESTIMONIALS") {
          const content = parseSectionContent("TESTIMONIALS", section.content, defaultSectionContent("TESTIMONIALS"));
          return <TestimonialsSection key={section.id} content={content} />;
        }

        if (section.type === "CTA") {
          const content = parseSectionContent("CTA", section.content, defaultSectionContent("CTA"));
          return <CtaSection key={section.id} content={content} />;
        }

        const content = parseSectionContent("CONTACT", section.content, defaultSectionContent("CONTACT"));
        return <ContactSection key={section.id} content={content} pageSlug={pageSlug} />;
      })}
    </>
  );
}
