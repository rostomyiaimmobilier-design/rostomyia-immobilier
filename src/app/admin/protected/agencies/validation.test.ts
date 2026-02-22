import { describe, expect, it } from "vitest";
import {
  canTransitionStatus,
  getActivationMissingFields,
  isValidEmail,
  isValidPhone,
  normalizeServiceAreas,
  normalizeStatus,
  parseOptionalInt,
} from "./validation";

describe("agencies validation helpers", () => {
  it("normalizes status safely", () => {
    expect(normalizeStatus("ACTIVE")).toBe("active");
    expect(normalizeStatus("suspended")).toBe("suspended");
    expect(normalizeStatus("unknown")).toBe("pending");
  });

  it("validates email format", () => {
    expect(isValidEmail("agency@example.com")).toBe(true);
    expect(isValidEmail("bad-email")).toBe(false);
  });

  it("validates phone format", () => {
    expect(isValidPhone("+213 555 11 22 33")).toBe(true);
    expect(isValidPhone("123")).toBe(false);
  });

  it("blocks active to pending transition", () => {
    expect(canTransitionStatus("active", "pending")).toBe(false);
    expect(canTransitionStatus("active", "suspended")).toBe(true);
    expect(canTransitionStatus("pending", "active")).toBe(true);
  });

  it("extracts missing activation fields", () => {
    const missing = getActivationMissingFields({
      agency_name: "My Agency",
      agency_manager_name: "",
      agency_phone: "+213555",
      agency_city: null,
      agency_address: "Oran",
    });

    expect(missing).toEqual(["Responsable", "Ville"]);
  });

  it("normalizes service areas and optional ints", () => {
    expect(normalizeServiceAreas("Oran, , Bir El Djir ,Es Senia")).toBe("Oran, Bir El Djir, Es Senia");
    expect(parseOptionalInt("12.9")).toBe(12);
    expect(parseOptionalInt("")).toBeNull();
  });
});

