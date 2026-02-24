import { NextResponse } from "next/server";
import { hasAdminAccess } from "@/lib/admin-auth";
import { DEFAULT_ORAN_QUARTIERS } from "@/lib/oran-locations";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type QuartierRow = {
  id: string;
  name: string;
  commune: string | null;
  sort_order: number | null;
  is_active: boolean | null;
};

type OwnerLeadDistrictRow = {
  commune: string | null;
  district: string | null;
};

type PropertyLocationRow = {
  location: string | null;
};

function normalizeName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeLookupKey(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

function parseError(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function isMissingTableError(message: string | undefined) {
  const m = String(message ?? "").toLowerCase();
  return m.includes("app_quartiers") && (m.includes("does not exist") || m.includes("relation"));
}

function isActiveAgencyAccount(metadata: Record<string, unknown> | null | undefined) {
  const meta = metadata ?? {};
  const accountType = String(meta.account_type ?? "").toLowerCase().trim();
  const agencyStatus = String(meta.agency_status ?? "").toLowerCase().trim();
  return accountType === "agency" && agencyStatus === "active";
}

function fallbackItems() {
  return DEFAULT_ORAN_QUARTIERS.map((name, idx) => ({
    id: `fallback-${idx + 1}`,
    name,
    commune: "Oran" as string | null,
  }));
}

function formatRows(rows: QuartierRow[]) {
  const normalized = rows
    .filter((row) => row.is_active !== false)
    .map((row) => ({
      id: String(row.id),
      name: normalizeName(String(row.name)),
      commune: row.commune ? String(row.commune) : null,
      sort: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : 0,
    }))
    .sort((a, b) => {
      if (a.sort !== b.sort) return a.sort - b.sort;
      return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
    });

  return normalized.map((item) => ({
    id: item.id,
    name: item.name,
    commune: item.commune,
  }));
}

function splitLocationTokens(value: string | null | undefined) {
  return String(value ?? "")
    .split(/[-,|/]/g)
    .map((token) => normalizeName(token))
    .filter(Boolean);
}

function pickQuartierFromLocation(location: string | null | undefined, commune: string) {
  const tokens = splitLocationTokens(location);
  if (!tokens.length) return "";

  const communeNorm = normalizeLookupKey(commune);
  const tokenNorms = tokens.map((token) => normalizeLookupKey(token));
  const communeIndex = tokenNorms.findIndex((token) => token === communeNorm);
  if (communeIndex < 0) return "";

  const after = tokens[communeIndex + 1] ?? "";
  if (after && normalizeLookupKey(after) !== communeNorm) return after;
  const before = tokens[communeIndex - 1] ?? "";
  if (before && normalizeLookupKey(before) !== communeNorm) return before;
  return "";
}

async function deriveQuartiersForCommuneFromDb(
  admin: ReturnType<typeof supabaseAdmin>,
  commune: string
) {
  const communeNorm = normalizeLookupKey(commune);
  const derived = new Map<string, { id: string; name: string; commune: string }>();

  try {
    const ownerLeadsResult = await admin
      .from("owner_leads")
      .select("commune, district")
      .not("district", "is", null)
      .limit(1200);

    if (!ownerLeadsResult.error) {
      const rows = (ownerLeadsResult.data ?? []) as OwnerLeadDistrictRow[];
      rows.forEach((row) => {
        const rowCommuneNorm = normalizeLookupKey(row.commune);
        if (!rowCommuneNorm || rowCommuneNorm !== communeNorm) return;
        const district = normalizeName(String(row.district ?? ""));
        if (!district || normalizeLookupKey(district) === communeNorm) return;
        const key = normalizeLookupKey(district);
        if (!key || derived.has(key)) return;
        derived.set(key, {
          id: `derived-owner-${key}`,
          name: district,
          commune: normalizeName(commune),
        });
      });
    }
  } catch {
    // Non-blocking source.
  }

  try {
    const propertiesResult = await admin
      .from("properties")
      .select("location")
      .not("location", "is", null)
      .limit(2000);

    if (!propertiesResult.error) {
      const rows = (propertiesResult.data ?? []) as PropertyLocationRow[];
      rows.forEach((row) => {
        const quartier = pickQuartierFromLocation(row.location, commune);
        if (!quartier) return;
        const quartierNorm = normalizeLookupKey(quartier);
        if (!quartierNorm || quartierNorm === communeNorm || derived.has(quartierNorm)) return;
        derived.set(quartierNorm, {
          id: `derived-prop-${quartierNorm}`,
          name: quartier,
          commune: normalizeName(commune),
        });
      });
    }
  } catch {
    // Non-blocking source.
  }

  return Array.from(derived.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "fr", { sensitivity: "base" })
  );
}

async function ensureReadableAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const isAdmin = await hasAdminAccess(supabase, user);
  if (isAdmin || isActiveAgencyAccount(user.user_metadata as Record<string, unknown> | undefined)) {
    return { error: null };
  }

  return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
}

async function selectActiveRows(admin: ReturnType<typeof supabaseAdmin>) {
  return admin
    .from("app_quartiers")
    .select("id, name, commune, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
}

export async function GET(req: Request) {
  const guard = await ensureReadableAccount();
  if (guard.error) return guard.error;

  try {
    const requestUrl = new URL(req.url);
    const communeFilterRaw = normalizeName(requestUrl.searchParams.get("commune") || "");
    const communeFilterNorm = normalizeLookupKey(communeFilterRaw);
    const admin = supabaseAdmin();
    const rowsResult = await selectActiveRows(admin);

    if (communeFilterNorm) {
      if (!rowsResult.error) {
        const scopedRows = formatRows((rowsResult.data ?? []) as QuartierRow[]).filter(
          (item) => normalizeLookupKey(item.commune) === communeFilterNorm
        );
        if (scopedRows.length > 0) {
          return NextResponse.json({
            items: scopedRows,
            managed: true,
          });
        }
      }

      const derivedItems = await deriveQuartiersForCommuneFromDb(admin, communeFilterRaw);
      return NextResponse.json({
        items: derivedItems,
        managed: false,
        warning:
          derivedItems.length > 0
            ? "Quartiers derives depuis owner_leads/properties pour cette commune."
            : "Aucun quartier configure pour cette commune.",
      });
    }

    if (rowsResult.error) {
      if (isMissingTableError(rowsResult.error.message)) {
        return NextResponse.json({
          items: fallbackItems(),
          managed: false,
          warning: "Table app_quartiers absente. Lancez la migration pour activer la gestion persistante.",
        });
      }
      return NextResponse.json({ error: rowsResult.error.message }, { status: 400 });
    }

    const items = formatRows((rowsResult.data ?? []) as QuartierRow[]);
    if (items.length > 0) {
      return NextResponse.json({
        items,
        managed: true,
      });
    }

    return NextResponse.json({
      items: fallbackItems(),
      managed: false,
      warning: "Aucun quartier configure. Affichage de la liste par defaut.",
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: parseError(err, "Unable to list quartiers") }, { status: 400 });
  }
}
