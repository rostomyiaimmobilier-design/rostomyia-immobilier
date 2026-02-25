import { NextResponse } from "next/server";
import { communes as dzCommunes, dairas as dzDairas, wilayas as dzWilayas } from "algeria-locations";
import { hasAdminWriteAccess } from "@/lib/admin-auth";
import { DEFAULT_ORAN_QUARTIERS } from "@/lib/oran-locations";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type AppCommuneRow = {
  code: string;
  name: string;
  name_ar: string | null;
  daira_id: number | null;
  daira_name: string | null;
  wilaya_id: number | null;
  wilaya_code: string | null;
  wilaya_name: string | null;
  is_active: boolean | null;
};

type AppQuartierRow = {
  name: string;
  commune: string | null;
  sort_order: number | null;
  is_active: boolean | null;
};

type PropertyLocationRow = {
  location: string | null;
};

function normalizeText(value: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function parseError(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function isMissingTableError(message: string | undefined, table: string) {
  const m = String(message ?? "").toLowerCase();
  return m.includes(table) && (m.includes("does not exist") || m.includes("relation"));
}

function splitLocationTokens(rawLocation: string) {
  return rawLocation
    .split(/[-,|/]/g)
    .map((x) => normalizeName(x))
    .filter(Boolean);
}

function chunkArray<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

async function ensureAdminOrError() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const canWrite = await hasAdminWriteAccess(supabase, user);
  if (!canWrite) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { error: null };
}

async function syncCommunes(admin: ReturnType<typeof supabaseAdmin>) {
  const existing = await admin
    .from("app_communes")
    .select("code")
    .eq("is_active", true);

  if (existing.error) {
    if (isMissingTableError(existing.error.message, "app_communes")) {
      throw new Error("Table app_communes absente. Lancez la migration app_communes.");
    }
    throw new Error(existing.error.message);
  }

  const existingCodes = new Set(
    ((existing.data ?? []) as Array<{ code: string | null }>)
      .map((x) => String(x.code ?? "").trim())
      .filter(Boolean)
  );

  const dairaById = new Map(dzDairas.map((daira) => [daira.id, daira]));
  const wilayaById = new Map(dzWilayas.map((wilaya) => [wilaya.id, wilaya]));

  const mappedRows = dzCommunes
    .map((commune) => {
      const daira = dairaById.get(commune.daira_id);
      const wilaya = daira ? wilayaById.get(daira.wilaya_id) : undefined;
      if (!wilaya) return null;

      return {
        code: String(commune.code),
        name: normalizeName(String(commune.name)),
        name_ar: commune.name_ar ? String(commune.name_ar) : null,
        daira_id: Number.isFinite(Number(commune.daira_id)) ? Number(commune.daira_id) : null,
        daira_name: daira ? normalizeName(String(daira.name)) : null,
        wilaya_id: Number.isFinite(Number(wilaya.id)) ? Number(wilaya.id) : null,
        wilaya_code: String(wilaya.code),
        wilaya_name: normalizeName(String(wilaya.name)),
        is_active: true,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const rowsToInsert = mappedRows.filter((row) => !existingCodes.has(row.code));
  if (!rowsToInsert.length) {
    return { inserted: 0 };
  }

  const chunks = chunkArray(rowsToInsert, 300);
  let inserted = 0;
  for (const chunk of chunks) {
    const result = await admin.from("app_communes").insert(chunk);
    if (result.error) throw new Error(result.error.message);
    inserted += chunk.length;
  }

  return { inserted };
}

async function syncQuartiers(admin: ReturnType<typeof supabaseAdmin>) {
  const communesResult = await admin
    .from("app_communes")
    .select("code, name, name_ar, daira_id, daira_name, wilaya_id, wilaya_code, wilaya_name, is_active")
    .eq("is_active", true)
    .eq("wilaya_code", "31");

  if (communesResult.error) {
    if (isMissingTableError(communesResult.error.message, "app_communes")) {
      throw new Error("Table app_communes absente. Lancez la migration app_communes.");
    }
    throw new Error(communesResult.error.message);
  }

  const oranCommunes = (communesResult.data ?? []) as AppCommuneRow[];
  const communeByNorm = new Map(
    oranCommunes.map((commune) => [normalizeText(commune.name), normalizeName(commune.name)])
  );

  const existingQuartiersResult = await admin
    .from("app_quartiers")
    .select("name, commune, sort_order, is_active")
    .eq("is_active", true);

  if (existingQuartiersResult.error) {
    if (isMissingTableError(existingQuartiersResult.error.message, "app_quartiers")) {
      throw new Error("Table app_quartiers absente. Lancez la migration app_quartiers.");
    }
    throw new Error(existingQuartiersResult.error.message);
  }

  const existingQuartiers = (existingQuartiersResult.data ?? []) as AppQuartierRow[];
  const existingKeys = new Set(
    existingQuartiers
      .filter((x) => x.is_active !== false)
      .map((x) => `${normalizeText(String(x.commune ?? "Oran"))}|${normalizeText(String(x.name))}`)
  );
  let nextSort =
    existingQuartiers.reduce((max, row) => {
      const n = Number(row.sort_order);
      return Number.isFinite(n) ? Math.max(max, n) : max;
    }, 0) + 1;

  const toInsert: Array<{ name: string; commune: string; sort_order: number; is_active: boolean }> = [];

  for (const defaultQuartier of DEFAULT_ORAN_QUARTIERS) {
    const key = `${normalizeText("Oran")}|${normalizeText(defaultQuartier)}`;
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    toInsert.push({
      name: normalizeName(defaultQuartier),
      commune: "Oran",
      sort_order: nextSort++,
      is_active: true,
    });
  }

  const propertiesResult = await admin.from("properties").select("location");
  if (propertiesResult.error) {
    if (!isMissingTableError(propertiesResult.error.message, "properties")) {
      throw new Error(propertiesResult.error.message);
    }
  } else {
    const rows = (propertiesResult.data ?? []) as PropertyLocationRow[];
    for (const row of rows) {
      const rawLocation = normalizeName(String(row.location ?? ""));
      if (!rawLocation) continue;

      const tokens = splitLocationTokens(rawLocation);
      if (!tokens.length) continue;

      let commune = "";
      for (const token of tokens) {
        const matched = communeByNorm.get(normalizeText(token));
        if (matched) {
          commune = matched;
          break;
        }
      }

      if (!commune) {
        const matched = Array.from(communeByNorm.entries()).find(([norm]) =>
          normalizeText(rawLocation).includes(norm)
        );
        commune = matched?.[1] ?? "";
      }

      if (!commune) continue;

      const quartierToken = tokens.find((token) => normalizeText(token) !== normalizeText(commune));
      const quartierName = normalizeName(quartierToken ?? "");
      if (quartierName.length < 2) continue;

      const key = `${normalizeText(commune)}|${normalizeText(quartierName)}`;
      if (existingKeys.has(key)) continue;

      existingKeys.add(key);
      toInsert.push({
        name: quartierName,
        commune,
        sort_order: nextSort++,
        is_active: true,
      });
    }
  }

  if (!toInsert.length) {
    return { inserted: 0 };
  }

  const chunks = chunkArray(toInsert, 200);
  let inserted = 0;
  for (const chunk of chunks) {
    const insertResult = await admin.from("app_quartiers").insert(chunk);
    if (insertResult.error) throw new Error(insertResult.error.message);
    inserted += chunk.length;
  }

  return { inserted };
}

export async function POST() {
  const guard = await ensureAdminOrError();
  if (guard.error) return guard.error;

  try {
    const admin = supabaseAdmin();
    const communes = await syncCommunes(admin);
    const quartiers = await syncQuartiers(admin);

    return NextResponse.json({
      ok: true,
      communes_inserted: communes.inserted,
      quartiers_inserted: quartiers.inserted,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: parseError(err, "Unable to sync Algeria locations") },
      { status: 400 }
    );
  }
}
