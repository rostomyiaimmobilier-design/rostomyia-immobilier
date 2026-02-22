export type DescriptionState = "empty" | "generated" | "manual";

export type DescriptionMetrics = {
  lineCount: number;
  wordCount: number;
  charCount: number;
};

function normalizeDescriptionValue(value: string | null | undefined) {
  return String(value ?? "").replace(/\r\n/g, "\n");
}

export function getDescriptionMetrics(description: string): DescriptionMetrics {
  const normalized = normalizeDescriptionValue(description);
  const lineCount = normalized
    .split("\n")
    .filter((line) => line.trim().length > 0).length;
  const trimmed = normalized.trim();
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;

  return {
    lineCount,
    wordCount,
    charCount: normalized.length,
  };
}

export function getDescriptionState(
  description: string,
  lastGeneratedDescription: string | null | undefined
): DescriptionState {
  const current = normalizeDescriptionValue(description).trim();
  if (!current) return "empty";

  const generated = normalizeDescriptionValue(lastGeneratedDescription).trim();
  if (generated && current === generated) return "generated";

  return "manual";
}

export function hasUnsavedDescriptionChanges(
  currentDescription: string,
  savedDescription: string | null | undefined
) {
  return normalizeDescriptionValue(currentDescription) !== normalizeDescriptionValue(savedDescription);
}
