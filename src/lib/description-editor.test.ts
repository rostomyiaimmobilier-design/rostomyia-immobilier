import { describe, expect, it } from "vitest";
import {
  getDescriptionMetrics,
  getDescriptionState,
  hasUnsavedDescriptionChanges,
} from "./description-editor";

describe("description editor helpers", () => {
  it("returns empty state and zero metrics for blank content", () => {
    const text = " \n  ";
    expect(getDescriptionState(text, null)).toBe("empty");
    expect(getDescriptionMetrics(text)).toEqual({
      lineCount: 0,
      wordCount: 0,
      charCount: 4,
    });
  });

  it("returns generated state when content matches generated text", () => {
    const generated = "Ligne 1\nLigne 2";
    expect(getDescriptionState(generated, generated)).toBe("generated");
    expect(getDescriptionMetrics(generated)).toEqual({
      lineCount: 2,
      wordCount: 4,
      charCount: 15,
    });
  });

  it("returns manual state when content differs from generated text", () => {
    const generated = "Texte genere";
    const manual = "Texte genere modifie par agent";
    expect(getDescriptionState(manual, generated)).toBe("manual");
  });

  it("detects unsaved changes and ignores line-ending differences", () => {
    expect(hasUnsavedDescriptionChanges("A\r\nB", "A\nB")).toBe(false);
    expect(hasUnsavedDescriptionChanges("A\nB", "A\nC")).toBe(true);
  });
});
