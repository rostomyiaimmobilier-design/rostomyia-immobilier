export function normalizeFold(input?: string | null) {
  return (input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function hasPaymentUnit(raw: string) {
  const n = normalizeFold(raw);
  return (
    /\bmois\b/.test(n) ||
    /\bmonth(s)?\b/.test(n) ||
    n.includes("mensuel") ||
    n.includes("شهري") ||
    n.includes("nuit") ||
    n.includes("jour") ||
    n.includes("sejour")
  );
}

export function isUndefinedPaymentValue(raw: string | null | undefined, undefinedLabel: string) {
  const n = normalizeFold(String(raw ?? "").trim());
  if (!n) return true;

  return (
    n === normalizeFold(undefinedLabel) ||
    n.includes("a definir") ||
    n.includes("a preciser") ||
    n.includes("non defini") ||
    n.includes("non precise") ||
    n.includes("a convenir") ||
    n.includes("selon accord") ||
    n.includes("غير محدد")
  );
}

export function paymentFromLocationType(raw?: string | null, isArabic = false) {
  const n = normalizeFold(raw);
  if (!n) return null;

  if (n.includes("par_mois") || n.includes("par mois") || n.includes("mensuel")) {
    return isArabic ? "تسبيق + شهري" : "par mois";
  }
  if (n.includes("six_mois") || n.includes("six mois") || n.includes("6 mois") || n.includes("6mois")) {
    return isArabic ? "تسبيق + 6 أشهر" : "6 mois";
  }
  if (
    n.includes("douze_mois") ||
    n.includes("douze mois") ||
    n.includes("12 mois") ||
    n.includes("12mois") ||
    n.includes("annuel")
  ) {
    return isArabic ? "تسبيق + 12 شهر" : "12 mois";
  }
  if (n.includes("par_nuit") || n.includes("par nuit") || n.includes("nuit")) {
    return isArabic ? "تسبيق + بالليلة" : "par nuit";
  }
  if (n.includes("court_sejour") || n.includes("court sejour") || n.includes("sejour")) {
    return isArabic ? "تسبيق + إقامة قصيرة" : "court sejour";
  }
  if (n === "location" || n.includes("location")) {
    return isArabic ? "تسبيق" : "duree a preciser";
  }
  if (n === "vente" || n.includes("vente")) {
    return isArabic ? "بيع" : "Vente";
  }
  return null;
}

export function formatPaymentLabel({
  rawPayment,
  locationType,
  undefinedLabel,
  isArabic = false,
}: {
  rawPayment: string | null | undefined;
  locationType?: string | null;
  undefinedLabel: string;
  isArabic?: boolean;
}) {
  const payment = String(rawPayment ?? "").trim();
  const paymentNorm = normalizeFold(payment);
  const durationOnlyFallback = isArabic ? "المدة غير محددة" : "duree a preciser";

  const fromExplicitType = paymentFromLocationType(payment, isArabic);
  if (fromExplicitType) return fromExplicitType;

  if (paymentNorm === "avance") {
    const fromLocationType = paymentFromLocationType(locationType, isArabic);
    return fromLocationType ?? durationOnlyFallback;
  }

  if (isUndefinedPaymentValue(payment, undefinedLabel)) {
    const fromLocationType = paymentFromLocationType(locationType, isArabic);
    return fromLocationType ?? undefinedLabel;
  }

  if (hasPaymentUnit(payment)) return payment;
  if (/^\d+(?:[.,]\d+)?$/.test(payment.replace(/\s+/g, ""))) return `${payment} mois`;
  return payment;
}

