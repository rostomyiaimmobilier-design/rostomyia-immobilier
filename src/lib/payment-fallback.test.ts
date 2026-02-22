import { describe, expect, it } from "vitest";
import { formatPaymentLabel, paymentFromLocationType } from "./payment-fallback";

describe("payment fallback", () => {
  it("maps monthly location type to duration label", () => {
    expect(paymentFromLocationType("par_mois", false)).toBe("par mois");
  });

  it("maps six months location type to duration label", () => {
    expect(paymentFromLocationType("six_mois", false)).toBe("6 mois");
  });

  it("returns undefined label when no payment and no location type", () => {
    expect(
      formatPaymentLabel({
        rawPayment: "",
        locationType: null,
        undefinedLabel: "A preciser",
        isArabic: false,
      })
    ).toBe("A preciser");
  });

  it("uses location type when payment is undefined", () => {
    expect(
      formatPaymentLabel({
        rawPayment: "A preciser",
        locationType: "par_nuit",
        undefinedLabel: "A preciser",
        isArabic: false,
      })
    ).toBe("par nuit");
  });

  it("keeps explicit payment terms when provided", () => {
    expect(
      formatPaymentLabel({
        rawPayment: "3 mois",
        locationType: "par_mois",
        undefinedLabel: "A preciser",
        isArabic: false,
      })
    ).toBe("3 mois");
  });

  it("adds duration hint when payment is explicit avance", () => {
    expect(
      formatPaymentLabel({
        rawPayment: "Avance",
        locationType: null,
        undefinedLabel: "A preciser",
        isArabic: false,
      })
    ).toBe("duree a preciser");
  });

  it("adds duration hint when location type fallback is generic location", () => {
    expect(
      formatPaymentLabel({
        rawPayment: "A preciser",
        locationType: "location",
        undefinedLabel: "A preciser",
        isArabic: false,
      })
    ).toBe("duree a preciser");
  });
});
