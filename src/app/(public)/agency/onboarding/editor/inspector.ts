import { z } from "zod";

export type EditorSelectionKind = "page" | "section" | "component";

export type EditorSelectionState = {
  selectedKind: EditorSelectionKind;
  selectedId: string;
  selectedPath: string[];
};

export type EditorSelectionAction =
  | { type: "select-page"; pageId?: string }
  | { type: "select-section"; sectionId: string; path?: string[] }
  | { type: "select-component"; componentId: string; path?: string[] }
  | { type: "clear" };

export const DEFAULT_SELECTION_STATE: EditorSelectionState = {
  selectedKind: "page",
  selectedId: "home",
  selectedPath: [],
};

export function selectionReducer(
  _state: EditorSelectionState,
  action: EditorSelectionAction
): EditorSelectionState {
  if (action.type === "select-page") {
    return {
      selectedKind: "page",
      selectedId: action.pageId || "home",
      selectedPath: [],
    };
  }
  if (action.type === "select-section") {
    return {
      selectedKind: "section",
      selectedId: action.sectionId,
      selectedPath: action.path || [],
    };
  }
  if (action.type === "select-component") {
    return {
      selectedKind: "component",
      selectedId: action.componentId,
      selectedPath: action.path || [],
    };
  }
  return DEFAULT_SELECTION_STATE;
}

export type InspectorFieldType =
  | "text"
  | "textarea"
  | "number"
  | "slider"
  | "toggle"
  | "select"
  | "color"
  | "link"
  | "image"
  | "array";

export type InspectorFieldOption = {
  value: string;
  label: string;
};

export type InspectorFieldSchema = {
  key: string;
  type: InspectorFieldType;
  label: string;
  placeholder?: string;
  options?: InspectorFieldOption[];
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  description?: string;
};

export type InspectorGroupSchema = {
  label: string;
  fields: InspectorFieldSchema[];
};

export type InspectorSchema = {
  title: string;
  groups: InspectorGroupSchema[];
};

function normalizeSegments(path: string | string[]) {
  if (Array.isArray(path)) return path.filter(Boolean);
  return String(path)
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export function getByPath(source: unknown, path: string | string[]) {
  const segments = normalizeSegments(path);
  let current = source as unknown;
  for (const segment of segments) {
    if (current == null || typeof current !== "object") return undefined;
    if (!(segment in (current as Record<string, unknown>))) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

export function setByPath<T>(source: T, path: string | string[], value: unknown): T {
  const segments = normalizeSegments(path);
  if (segments.length === 0) return source;

  const clone = Array.isArray(source)
    ? ([...source] as unknown as Record<string, unknown>)
    : ({ ...(source as Record<string, unknown>) } as Record<string, unknown>);

  let current: Record<string, unknown> = clone;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]!;
    const isLast = index === segments.length - 1;
    if (isLast) {
      current[segment] = value;
      break;
    }

    const nextValue = current[segment];
    if (nextValue == null || typeof nextValue !== "object") {
      current[segment] = {};
    } else if (Array.isArray(nextValue)) {
      current[segment] = [...nextValue];
    } else {
      current[segment] = { ...(nextValue as Record<string, unknown>) };
    }
    current = current[segment] as Record<string, unknown>;
  }

  return clone as T;
}

const safeLinkSchema = z
  .string()
  .trim()
  .refine((value) => !value || /^https?:\/\//i.test(value) || /^\//.test(value) || /^mailto:/i.test(value) || /^tel:/i.test(value), {
    message: "Lien invalide.",
  });

const safeImageSchema = z
  .string()
  .trim()
  .refine((value) => !value || /^https?:\/\//i.test(value) || /^\//.test(value), {
    message: "URL image invalide.",
  });

export const inspectorValidators = {
  page: z.object({
    slug: z.string().trim().min(3, "Slug min 3 caracteres."),
    seoTitle: z.string().trim().min(10, "SEO title trop court.").max(80, "SEO title trop long."),
    seoDescription: z.string().trim().min(30, "SEO description trop courte.").max(200, "SEO description trop longue."),
  }),
  hero: z.object({
    headline: z.string().trim().min(1, "Titre hero requis."),
    subheadline: z.string().trim().min(1, "Tagline requise."),
    ctaLabel: z.string().trim().min(1, "Label CTA requis."),
    ctaHref: safeLinkSchema,
    imageUrl: safeImageSchema,
    imageAlt: z.string().trim().max(140, "Alt trop long."),
    imageFocalX: z.number().min(0).max(100),
    imageFocalY: z.number().min(0).max(100),
  }),
  section: z.object({
    title: z.string().trim().min(1, "Titre requis."),
    intro: z.string().trim().min(1, "Description requise."),
    image_url: safeImageSchema,
    image_alt: z.string().trim().max(140, "Alt trop long."),
    image_focal_x: z.number().min(0).max(100),
    image_focal_y: z.number().min(0).max(100),
  }),
  featureItem: z.object({
    label: z.string().trim().min(1, "Texte requis."),
  }),
  galleryItem: z.object({
    title: z.string().trim().min(1, "Titre requis."),
    body: z.string().trim().min(1, "Description requise."),
    image_url: safeImageSchema,
    image_alt: z.string().trim().max(140, "Alt trop long."),
    cta_href: safeLinkSchema,
  }),
};

export function zodErrorsToMap(error: z.ZodError): Record<string, string> {
  const output: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "root";
    if (!output[key]) output[key] = issue.message;
  }
  return output;
}

