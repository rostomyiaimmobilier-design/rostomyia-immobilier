import { defaultSectionContent } from "@/lib/site-builder/defaults";
import { parseSectionContent } from "@/lib/site-builder/types";
import HeroSection from "@/components/site-builder/public/sections/HeroSection";
import FeaturesSection from "@/components/site-builder/public/sections/FeaturesSection";
import ServicesSection from "@/components/site-builder/public/sections/ServicesSection";
import ProjectsSection from "@/components/site-builder/public/sections/ProjectsSection";
import TestimonialsSection from "@/components/site-builder/public/sections/TestimonialsSection";
import CtaSection from "@/components/site-builder/public/sections/CtaSection";
import AgencyContactSection from "./AgencyContactSection";
import AgencyPreviewSectionOverlay from "./AgencyPreviewSectionOverlay";
import type { AgencyHomeSection } from "./agency-home-sections";
import type { AgencyStorefrontData } from "./storefront-data";

export default function AgencyHomeSectionRenderer({
  sections,
  data,
  editablePreview = false,
}: {
  sections: AgencyHomeSection[];
  data: AgencyStorefrontData;
  editablePreview?: boolean;
}) {
  return (
    <>
      {sections.map((section) => {
        if (section.type === "HERO") {
          const content = parseSectionContent("HERO", section.content, defaultSectionContent("HERO"));
          return (
            <AgencyPreviewSectionOverlay key={section.id} editable={editablePreview} section="hero" label="Hero">
              <HeroSection content={content} />
            </AgencyPreviewSectionOverlay>
          );
        }

        if (section.type === "FEATURES") {
          const content = parseSectionContent(
            "FEATURES",
            section.content,
            defaultSectionContent("FEATURES")
          );
          return (
            <AgencyPreviewSectionOverlay key={section.id} editable={editablePreview} section="about" label="About">
              <FeaturesSection content={content} />
            </AgencyPreviewSectionOverlay>
          );
        }

        if (section.type === "SERVICES") {
          const content = parseSectionContent(
            "SERVICES",
            section.content,
            defaultSectionContent("SERVICES")
          );
          return (
            <AgencyPreviewSectionOverlay
              key={section.id}
              editable={editablePreview}
              section="services"
              label="Services"
            >
              <ServicesSection content={content} />
            </AgencyPreviewSectionOverlay>
          );
        }

        if (section.type === "PROJECTS") {
          const content = parseSectionContent(
            "PROJECTS",
            section.content,
            defaultSectionContent("PROJECTS")
          );
          return (
            <AgencyPreviewSectionOverlay
              key={section.id}
              editable={editablePreview}
              section="marketplace"
              label="Marketplace"
            >
              <ProjectsSection content={content} />
            </AgencyPreviewSectionOverlay>
          );
        }

        if (section.type === "TESTIMONIALS") {
          const content = parseSectionContent(
            "TESTIMONIALS",
            section.content,
            defaultSectionContent("TESTIMONIALS")
          );
          return (
            <AgencyPreviewSectionOverlay
              key={section.id}
              editable={editablePreview}
              section="testimonials"
              label="Testimonials"
            >
              <TestimonialsSection content={content} />
            </AgencyPreviewSectionOverlay>
          );
        }

        if (section.type === "CTA") {
          const content = parseSectionContent("CTA", section.content, defaultSectionContent("CTA"));
          return (
            <AgencyPreviewSectionOverlay key={section.id} editable={editablePreview} section="cta" label="CTA">
              <CtaSection content={content} />
            </AgencyPreviewSectionOverlay>
          );
        }

        if (section.type === "CONTACT") {
          const content = parseSectionContent(
            "CONTACT",
            section.content,
            defaultSectionContent("CONTACT")
          );
          return (
            <AgencyPreviewSectionOverlay
              key={section.id}
              editable={editablePreview}
              section="contact"
              label="Contact"
            >
              <AgencyContactSection content={content} data={data} />
            </AgencyPreviewSectionOverlay>
          );
        }

        return null;
      })}
    </>
  );
}
