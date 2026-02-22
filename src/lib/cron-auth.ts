const CRON_HEADER_CANDIDATES = [
  "authorization",
  "x-cron-secret",
  "x-recommendations-secret",
] as const;

function parseBearerToken(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.toLowerCase().startsWith("bearer ")) {
    return trimmed.slice(7).trim();
  }
  return trimmed;
}

export function isCronSecretValid(request: Request): boolean {
  const expected = String(process.env.CRON_SECRET ?? "").trim();
  if (!expected) return false;

  for (const header of CRON_HEADER_CANDIDATES) {
    const raw = request.headers.get(header);
    if (!raw) continue;
    const candidate = parseBearerToken(raw);
    if (candidate && candidate === expected) {
      return true;
    }
  }

  return false;
}
