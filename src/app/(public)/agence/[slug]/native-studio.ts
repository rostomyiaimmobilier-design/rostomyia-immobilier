import type { AgencyNativeStudioPayload } from "@/lib/agency-storefront-puck";

function radiusClass(radius: AgencyNativeStudioPayload["card_radius"]) {
  if (radius === "md") return "rounded-xl";
  if (radius === "full") return "rounded-[1.75rem]";
  return "rounded-2xl";
}

function buttonRadiusClass(radius: AgencyNativeStudioPayload["button_radius"]) {
  if (radius === "md") return "rounded-lg";
  if (radius === "full") return "rounded-full";
  return "rounded-xl";
}

function typographyScaleClass(value: AgencyNativeStudioPayload["design_tokens"]["typography_scale"]) {
  if (value === "sm") return "text-[15px] leading-relaxed";
  if (value === "lg") return "text-[17px] leading-relaxed";
  return "text-base leading-relaxed";
}

function sectionSpacingScaleClass(value: AgencyNativeStudioPayload["section_spacing"]) {
  if (value === "compact") return "space-y-4";
  if (value === "relaxed") return "space-y-8";
  return "space-y-6";
}

export function nativeContainerClass(studio: AgencyNativeStudioPayload) {
  if (studio.design_tokens.container_width === "narrow") return "max-w-6xl";
  if (studio.design_tokens.container_width === "wide") return "max-w-[88rem]";
  return "max-w-7xl";
}

export function nativeTypographyClass(studio: AgencyNativeStudioPayload) {
  const mobile = typographyScaleClass(studio.responsive_overrides.mobile.typography_scale);
  const tablet = typographyScaleClass(studio.responsive_overrides.tablet.typography_scale);
  const desktop = typographyScaleClass(studio.responsive_overrides.desktop.typography_scale);
  return `${mobile} md:${tablet.replaceAll(" ", " md:")} lg:${desktop.replaceAll(" ", " lg:")}`;
}

export function nativeHeadingScaleClass(studio: AgencyNativeStudioPayload) {
  if (studio.design_tokens.typography_scale === "sm") return "text-2xl md:text-[2rem]";
  if (studio.design_tokens.typography_scale === "lg") return "text-3xl md:text-[2.35rem]";
  return "text-[1.75rem] md:text-[2.1rem]";
}

export function nativeHeroHeightClass(studio: AgencyNativeStudioPayload) {
  if (studio.hero_variant === "compact") return "h-[300px]";
  if (studio.hero_variant === "immersive") return "h-[500px]";
  return "h-[390px]";
}

export function nativeSectionHeroHeightClass(studio: AgencyNativeStudioPayload) {
  if (studio.hero_variant === "compact") return "h-[260px]";
  if (studio.hero_variant === "immersive") return "h-[400px]";
  return "h-[320px]";
}

export function nativeCardClass(studio: AgencyNativeStudioPayload) {
  const surface =
    studio.section_surface === "flat"
      ? "border border-slate-200 bg-white shadow-none"
      : studio.design_system.shadow_intensity === "soft"
        ? "border border-slate-200 bg-white shadow-[0_12px_28px_-24px_rgba(15,23,42,0.42)]"
        : studio.design_system.shadow_intensity === "strong"
          ? "border border-slate-200 bg-white shadow-[0_30px_60px_-24px_rgba(15,23,42,0.62)]"
          : "border border-slate-200 bg-white shadow-[0_22px_48px_-28px_rgba(15,23,42,0.55)]";
  const density = studio.card_density === "compact" ? "p-4" : "p-7";
  return `${surface} ${radiusClass(studio.card_radius)} ${density}`;
}

export function nativeMarketplaceGridClass(studio: AgencyNativeStudioPayload) {
  return studio.marketplace_columns === "2" ? "grid gap-4 sm:grid-cols-2" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";
}

export function nativeCtaClass(studio: AgencyNativeStudioPayload) {
  if (studio.cta_style === "outline") {
    return `${buttonRadiusClass(studio.button_radius)} border-2 bg-white text-slate-900 hover:bg-slate-50`;
  }
  return `${buttonRadiusClass(studio.button_radius)} border border-transparent text-white shadow-sm hover:opacity-95`;
}

export function nativeSectionSpacingClass(studio: AgencyNativeStudioPayload) {
  const mobile = sectionSpacingScaleClass(studio.responsive_overrides.mobile.section_spacing);
  const tablet = sectionSpacingScaleClass(studio.responsive_overrides.tablet.section_spacing);
  const desktop = sectionSpacingScaleClass(studio.responsive_overrides.desktop.section_spacing);
  return `${mobile} md:${tablet} lg:${desktop}`;
}

export function nativeFontVars(studio: AgencyNativeStudioPayload) {
  const bodyFont =
    studio.design_system.body_font === "inter"
      ? "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
      : studio.design_system.body_font === "poppins"
        ? "Poppins, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
        : "Manrope, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";
  const headingFont =
    studio.design_system.heading_font === "montserrat"
      ? "Montserrat, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
      : studio.design_system.heading_font === "lora"
        ? "Lora, ui-serif, Georgia, Cambria, serif"
        : "Playfair Display, ui-serif, Georgia, Cambria, serif";
  return {
    bodyFont,
    headingFont,
  };
}

export function nativeImageObjectPosition(x: number, y: number) {
  const px = Number.isFinite(x) ? Math.min(100, Math.max(0, x)) : 50;
  const py = Number.isFinite(y) ? Math.min(100, Math.max(0, y)) : 50;
  return `${px}% ${py}%`;
}
