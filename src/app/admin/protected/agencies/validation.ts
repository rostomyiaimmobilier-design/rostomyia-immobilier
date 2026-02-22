export type AgencyStatus = "pending" | "active" | "suspended";

export function normalizeText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

export function normalizeServiceAreas(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .join(", ");
}

export function parseOptionalInt(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const n = Number(text);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.trunc(n));
}

export function normalizeStatus(value: unknown): AgencyStatus {
  const s = String(value ?? "").trim().toLowerCase();
  if (s === "suspended") return "suspended";
  if (s === "active") return "active";
  return "pending";
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string) {
  return /^[+\d\s().-]{8,20}$/.test(phone);
}

export function getActivationMissingFields(meta: Record<string, unknown>) {
  const required: Array<[key: string, label: string]> = [
    ["agency_name", "Nom agence"],
    ["agency_manager_name", "Responsable"],
    ["agency_phone", "Telephone"],
    ["agency_city", "Ville"],
    ["agency_address", "Adresse"],
  ];

  return required
    .filter(([key]) => String(meta[key] ?? "").trim().length === 0)
    .map(([, label]) => label);
}

export function canTransitionStatus(current: AgencyStatus, next: AgencyStatus) {
  if (current === "active" && next === "pending") return false;
  return true;
}

