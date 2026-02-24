import { describe, expect, it } from "vitest";
import {
  addIsoDaysUtc,
  deriveReservedUntilForDate,
  findFirstOverlappingRange,
  isDateRangeOverlap,
  type ReservationRange,
} from "./reservations-logic";

describe("reservations-logic", () => {
  it("adds UTC days without timezone drift", () => {
    expect(addIsoDaysUtc("2026-02-23", 1)).toBe("2026-02-24");
    expect(addIsoDaysUtc("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("detects overlap using [start, end) semantics", () => {
    expect(isDateRangeOverlap("2026-02-23", "2026-02-25", "2026-02-24", "2026-02-26")).toBe(true);
    expect(isDateRangeOverlap("2026-02-23", "2026-02-25", "2026-02-25", "2026-02-27")).toBe(false);
    expect(isDateRangeOverlap("2026-02-25", "2026-02-27", "2026-02-23", "2026-02-25")).toBe(false);
  });

  it("returns first conflicting blocked range", () => {
    const ranges: ReservationRange[] = [
      { check_in_date: "2026-02-26", check_out_date: "2026-02-28" },
      { check_in_date: "2026-03-02", check_out_date: "2026-03-04" },
    ];
    const conflict = findFirstOverlappingRange(ranges, "2026-02-27", "2026-03-01");
    expect(conflict).not.toBeNull();
    expect(conflict?.check_in_date).toBe("2026-02-26");
    expect(conflict?.check_out_date).toBe("2026-02-28");
  });

  it("derives reserved_until for current day only when occupied", () => {
    const ranges: ReservationRange[] = [
      { check_in_date: "2026-02-24", check_out_date: "2026-02-25" },
      { check_in_date: "2026-02-23", check_out_date: "2026-02-26" },
    ];
    expect(deriveReservedUntilForDate(ranges, "2026-02-23")).toBe("2026-02-26");
    expect(deriveReservedUntilForDate(ranges, "2026-02-22")).toBeNull();
  });
});
